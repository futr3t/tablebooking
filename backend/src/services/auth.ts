import jwt from 'jsonwebtoken';
import { JWTPayload, User, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export class AuthService {
  static generateToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'tablebooking-api',
      audience: 'tablebooking-app'
    });
  }

  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'tablebooking-api',
        audience: 'tablebooking-app'
      }) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    return requiredRoles.includes(userRole);
  }

  static hasRestaurantAccess(userRestaurantId: string | undefined, targetRestaurantId: string): boolean {
    if (!userRestaurantId) {
      return false;
    }
    return userRestaurantId === targetRestaurantId;
  }

  static getRoleHierarchy(): Record<UserRole, number> {
    return {
      [UserRole.SUPER_ADMIN]: 100,
      [UserRole.OWNER]: 80,
      [UserRole.MANAGER]: 60,
      [UserRole.HOST]: 40,
      [UserRole.SERVER]: 20,
      [UserRole.CUSTOMER]: 10
    };
  }

  static hasHigherRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[userRole] >= hierarchy[requiredRole];
  }

  static canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[managerRole] > hierarchy[targetRole];
  }
}