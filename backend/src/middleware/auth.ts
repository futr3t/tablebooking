import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth';
import { UserModel } from '../models/User';
import { AuthRequest, UserRole, ApiResponse } from '../types';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      } as ApiResponse);
      return;
    }

    const payload = AuthService.verifyToken(token);
    const user = await UserModel.findById(payload.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      } as ApiResponse);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    } as ApiResponse);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
      return;
    }

    if (!AuthService.hasPermission(req.user.role, roles)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      } as ApiResponse);
      return;
    }

    next();
  };
};

export const requireRestaurantAccess = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    } as ApiResponse);
    return;
  }

  const restaurantId = req.params.restaurantId || req.body.restaurantId;

  if (!restaurantId) {
    res.status(400).json({
      success: false,
      error: 'Restaurant ID required'
    } as ApiResponse);
    return;
  }

  if (req.user.role === UserRole.SUPER_ADMIN) {
    next();
    return;
  }

  if (!AuthService.hasRestaurantAccess(req.user.restaurantId, restaurantId)) {
    res.status(403).json({
      success: false,
      error: 'Access denied to this restaurant'
    } as ApiResponse);
    return;
  }

  next();
};

export const requireOwnerOrManager = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    } as ApiResponse);
    return;
  }

  const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER];
  
  if (!AuthService.hasPermission(req.user.role, allowedRoles)) {
    res.status(403).json({
      success: false,
      error: 'Owner or manager access required'
    } as ApiResponse);
    return;
  }

  next();
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    } as ApiResponse);
    return;
  }

  if (req.user.role !== UserRole.SUPER_ADMIN) {
    res.status(403).json({
      success: false,
      error: 'Super admin access required'
    } as ApiResponse);
    return;
  }

  next();
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const payload = AuthService.verifyToken(token);
      const user = await UserModel.findById(payload.userId);
      
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return req.cookies?.token || null;
};