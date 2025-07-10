import { Response } from 'express';
import { UserModel } from '../models/User';
import { AuthRequest, ApiResponse, UserRole } from '../types';
import { createError, asyncHandler } from '../middleware/error';
import { db } from '../config/database';
import { mapUserFromDb } from '../utils/dbMapping';
import bcrypt from 'bcryptjs';

interface UserListQuery {
  page?: string;
  limit?: string;
  role?: UserRole;
  restaurantId?: string;
  search?: string;
  isActive?: string;
}

// Get all users with pagination and filtering
export const getAllUsers = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const query = req.query as UserListQuery;
  
  // Parse pagination
  const page = parseInt(query.page || '1', 10);
  const limit = parseInt(query.limit || '10', 10);
  const offset = (page - 1) * limit;

  // Build filters
  const filters: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Super admin can see all users, others only see their restaurant's users
  if (user.role !== UserRole.SUPER_ADMIN) {
    if (!user.restaurantId) {
      throw createError('User not assigned to a restaurant', 403);
    }
    filters.push(`u.restaurant_id = $${paramIndex++}`);
    params.push(user.restaurantId);
  } else if (query.restaurantId) {
    // Super admin can filter by restaurant
    filters.push(`u.restaurant_id = $${paramIndex++}`);
    params.push(query.restaurantId);
  }

  // Role filter
  if (query.role) {
    filters.push(`u.role = $${paramIndex++}`);
    params.push(query.role);
  }

  // Active status filter
  if (query.isActive !== undefined) {
    filters.push(`u.is_active = $${paramIndex++}`);
    params.push(query.isActive === 'true');
  } else {
    // Default to active users only
    filters.push(`u.is_active = true`);
  }

  // Search filter (by email, name, or phone)
  if (query.search) {
    const searchParam = `%${query.search.toLowerCase()}%`;
    filters.push(`(
      LOWER(u.email) LIKE $${paramIndex} OR 
      LOWER(u.first_name) LIKE $${paramIndex} OR 
      LOWER(u.last_name) LIKE $${paramIndex} OR
      u.phone LIKE $${paramIndex}
    )`);
    params.push(searchParam);
    paramIndex++;
  }

  // Build final query
  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  
  // Get total count (use simpler query for count)
  const countParams = params.slice(0, paramIndex - 1); // Remove limit/offset params
  const countResult = await db.query(
    `SELECT COUNT(*) FROM users u ${whereClause}`,
    countParams
  );
  const totalItems = parseInt(countResult.rows[0].count, 10);

  // Get paginated results
  params.push(limit, offset);
  const result = await db.query(
    `SELECT u.*, r.name as restaurant_name 
     FROM users u
     LEFT JOIN restaurants r ON u.restaurant_id = r.id AND r.is_active = true
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  const users = result.rows.map(row => ({
    ...mapUserFromDb(row),
    restaurantName: row.restaurant_name
  }));

  const response: ApiResponse = {
    success: true,
    data: {
      items: users,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    },
    message: 'Users retrieved successfully'
  };

  res.json(response);
});

// Get single user by ID
export const getUser = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const requestingUser = req.user!;

  const user = await UserModel.findById(id);
  if (!user) {
    throw createError('User not found', 404);
  }

  // Check permissions
  if (requestingUser.role !== UserRole.SUPER_ADMIN && user.restaurantId !== requestingUser.restaurantId) {
    throw createError('Access denied', 403);
  }

  const response: ApiResponse = {
    success: true,
    data: user,
    message: 'User retrieved successfully'
  };

  res.json(response);
});

// Create new user (admin only)
export const createUser = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestingUser = req.user!;
  const { email, password, firstName, lastName, phone, role, restaurantId } = req.body;

  // Validate role permissions
  if (!canAssignRole(requestingUser.role, role)) {
    throw createError('Insufficient permissions to assign this role', 403);
  }

  // Check if email already exists
  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    throw createError('Email already registered', 409);
  }

  // Determine restaurant ID
  let targetRestaurantId = restaurantId;
  if (requestingUser.role !== UserRole.SUPER_ADMIN) {
    // Non-super admins can only create users for their restaurant
    targetRestaurantId = requestingUser.restaurantId;
  }

  // Super admin doesn't need restaurant assignment
  if (role === UserRole.SUPER_ADMIN) {
    targetRestaurantId = null;
  } else if (!targetRestaurantId) {
    throw createError('Restaurant ID required for non-super admin users', 400);
  }

  const newUser = await UserModel.create({
    email,
    password,
    firstName,
    lastName,
    phone,
    role,
    restaurantId: targetRestaurantId
  });

  const response: ApiResponse = {
    success: true,
    data: newUser,
    message: 'User created successfully'
  };

  res.status(201).json(response);
});

// Update user
export const updateUser = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const requestingUser = req.user!;
  const updates = req.body;

  const existingUser = await UserModel.findById(id);
  if (!existingUser) {
    throw createError('User not found', 404);
  }

  // Check permissions
  const isSelf = requestingUser.id === id;
  const isSuperAdmin = requestingUser.role === UserRole.SUPER_ADMIN;
  const isSameRestaurant = existingUser.restaurantId === requestingUser.restaurantId;

  if (!isSuperAdmin && !isSameRestaurant && !isSelf) {
    throw createError('Access denied', 403);
  }

  // Validate role change permissions
  if (updates.role && updates.role !== existingUser.role) {
    if (!canAssignRole(requestingUser.role, updates.role)) {
      throw createError('Insufficient permissions to assign this role', 403);
    }
    // Can't change your own role unless super admin
    if (isSelf && !isSuperAdmin) {
      throw createError('Cannot change your own role', 403);
    }
  }

  // Validate restaurant change
  if (updates.restaurantId !== undefined && updates.restaurantId !== existingUser.restaurantId) {
    if (!isSuperAdmin) {
      throw createError('Only super admins can reassign users to different restaurants', 403);
    }
  }

  // Update user
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.firstName !== undefined) {
    fields.push(`first_name = $${paramIndex++}`);
    values.push(updates.firstName);
  }
  if (updates.lastName !== undefined) {
    fields.push(`last_name = $${paramIndex++}`);
    values.push(updates.lastName);
  }
  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(updates.phone);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(updates.role);
  }
  if (updates.restaurantId !== undefined) {
    fields.push(`restaurant_id = $${paramIndex++}`);
    values.push(updates.restaurantId);
  }
  if (updates.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(updates.isActive);
  }
  if (updates.password) {
    const hashedPassword = await bcrypt.hash(updates.password, 12);
    fields.push(`password = $${paramIndex++}`);
    values.push(hashedPassword);
  }

  if (fields.length === 0) {
    throw createError('No valid updates provided', 400);
  }

  values.push(id);
  const result = await db.query(
    `UPDATE users 
     SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $${paramIndex} 
     RETURNING *`,
    values
  );

  const updatedUser = mapUserFromDb(result.rows[0]);

  const response: ApiResponse = {
    success: true,
    data: updatedUser,
    message: 'User updated successfully'
  };

  res.json(response);
});

// Delete user (soft delete)
export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const requestingUser = req.user!;

  if (id === requestingUser.id) {
    throw createError('Cannot delete your own account', 400);
  }

  const userToDelete = await UserModel.findById(id);
  if (!userToDelete) {
    throw createError('User not found', 404);
  }

  // Check permissions
  if (requestingUser.role !== UserRole.SUPER_ADMIN) {
    if (userToDelete.restaurantId !== requestingUser.restaurantId) {
      throw createError('Access denied', 403);
    }
    // Check role hierarchy
    if (!canManageUser(requestingUser.role, userToDelete.role)) {
      throw createError('Insufficient permissions to delete this user', 403);
    }
  }

  // Soft delete
  await db.query(
    'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  const response: ApiResponse = {
    success: true,
    message: 'User deleted successfully'
  };

  res.json(response);
});

// Helper function to check role assignment permissions
function canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, UserRole[]> = {
    [UserRole.SUPER_ADMIN]: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST, UserRole.SERVER, UserRole.CUSTOMER],
    [UserRole.OWNER]: [UserRole.MANAGER, UserRole.HOST, UserRole.SERVER, UserRole.CUSTOMER],
    [UserRole.MANAGER]: [UserRole.HOST, UserRole.SERVER, UserRole.CUSTOMER],
    [UserRole.HOST]: [UserRole.CUSTOMER],
    [UserRole.SERVER]: [UserRole.CUSTOMER],
    [UserRole.CUSTOMER]: []
  };

  return roleHierarchy[assignerRole]?.includes(targetRole) || false;
}

// Helper function to check user management permissions
function canManageUser(managerRole: UserRole, userRole: UserRole): boolean {
  const roleLevel: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 6,
    [UserRole.OWNER]: 5,
    [UserRole.MANAGER]: 4,
    [UserRole.HOST]: 3,
    [UserRole.SERVER]: 2,
    [UserRole.CUSTOMER]: 1
  };

  return roleLevel[managerRole] > roleLevel[userRole];
}