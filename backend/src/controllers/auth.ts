import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { AuthService } from '../services/auth';
import { AuthRequest, ApiResponse, UserRole } from '../types';
import { createError, asyncHandler } from '../middleware/error';

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  
  console.log('LOGIN ATTEMPT:', { 
    email, 
    hasPassword: !!password,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 100)
  });

  const user = await UserModel.findByEmail(email);
  if (!user) {
    console.log('LOGIN FAILED: User not found for email:', email);
    throw createError('Invalid email or password', 401);
  }

  console.log('USER FOUND:', { 
    id: user.id, 
    email: user.email, 
    role: user.role,
    hasPassword: !!user.password 
  });

  const isPasswordValid = await UserModel.verifyPassword(user, password);
  if (!isPasswordValid) {
    console.log('LOGIN FAILED: Invalid password for user:', email);
    throw createError('Invalid email or password', 401);
  }

  console.log('PASSWORD VALID: Generating token...');
  
  try {
    const token = AuthService.generateToken(user);
    console.log('TOKEN GENERATED: Success, length:', token?.length || 0);
  } catch (tokenError) {
    console.error('TOKEN GENERATION FAILED:', tokenError);
    throw createError('Authentication service error', 500);
  }
  
  const token = AuthService.generateToken(user);

  const userResponse = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    restaurantId: user.restaurantId
  };

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  console.log('LOGIN SUCCESS: Sending response for user:', email);
  
  res.json({
    success: true,
    data: {
      user: userResponse,
      token
    },
    message: 'Login successful'
  } as ApiResponse);
});

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, phone } = req.body;

  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    throw createError('User with this email already exists', 409);
  }

  const user = await UserModel.create({
    email,
    password,
    firstName,
    lastName,
    phone,
    role: UserRole.CUSTOMER
  });

  const token = AuthService.generateToken(user);

  const userResponse = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    restaurantId: user.restaurantId
  };

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });

  res.status(201).json({
    success: true,
    data: {
      user: userResponse,
      token
    },
    message: 'Registration successful'
  } as ApiResponse);
});

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('token');
  
  res.json({
    success: true,
    message: 'Logout successful'
  } as ApiResponse);
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw createError('User not found', 404);
  }

  const userResponse = {
    id: req.user.id,
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    phone: req.user.phone,
    role: req.user.role,
    restaurantId: req.user.restaurantId,
    createdAt: req.user.createdAt
  };

  res.json({
    success: true,
    data: userResponse
  } as ApiResponse);
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw createError('User not found', 404);
  }

  const { firstName, lastName, phone } = req.body;
  const updates: any = {};

  if (firstName) updates.firstName = firstName;
  if (lastName) updates.lastName = lastName;
  if (phone) updates.phone = phone;

  const updatedUser = await UserModel.update(req.user.id, updates);
  if (!updatedUser) {
    throw createError('Failed to update profile', 500);
  }

  const userResponse = {
    id: updatedUser.id,
    email: updatedUser.email,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    phone: updatedUser.phone,
    role: updatedUser.role,
    restaurantId: updatedUser.restaurantId
  };

  res.json({
    success: true,
    data: userResponse,
    message: 'Profile updated successfully'
  } as ApiResponse);
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw createError('User not found', 404);
  }

  const { currentPassword, newPassword } = req.body;

  const isCurrentPasswordValid = await UserModel.verifyPassword(req.user, currentPassword);
  if (!isCurrentPasswordValid) {
    throw createError('Current password is incorrect', 400);
  }

  await UserModel.update(req.user.id, { password: newPassword });

  res.json({
    success: true,
    message: 'Password changed successfully'
  } as ApiResponse);
});

export const refreshToken = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw createError('User not found', 404);
  }

  const token = AuthService.generateToken(req.user);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    data: { token },
    message: 'Token refreshed successfully'
  } as ApiResponse);
});