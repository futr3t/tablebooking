import { Request, Response, NextFunction } from 'express';
import { WidgetConfigModel } from '../models/WidgetConfig';
import { ApiResponse } from '../types';

// Extend Request type to include restaurant info
interface PublicRequest extends Request {
  restaurant?: any;
  widgetConfig?: any;
}

/**
 * Middleware to validate API key and attach restaurant/widget config to request
 */
export const validateApiKey = async (req: PublicRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get API key from query parameter or header
    const apiKey = req.query.apiKey as string || req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'API key is required'
      } as ApiResponse);
      return;
    }

    // Validate API key format (64 characters, alphanumeric)
    if (typeof apiKey !== 'string' || apiKey.length !== 64 || !/^[A-Z0-9]+$/.test(apiKey)) {
      res.status(401).json({
        success: false,
        error: 'Invalid API key format'
      } as ApiResponse);
      return;
    }

    // Find widget config by API key
    const widgetConfig = await WidgetConfigModel.findByApiKey(apiKey);
    
    if (!widgetConfig) {
      res.status(401).json({
        success: false,
        error: 'Invalid API key'
      } as ApiResponse);
      return;
    }

    // Check if widget is enabled
    if (!widgetConfig.isEnabled) {
      res.status(403).json({
        success: false,
        error: 'Widget is disabled for this restaurant'
      } as ApiResponse);
      return;
    }

    // Get restaurant information
    const restaurant = await WidgetConfigModel.getRestaurantByApiKey(apiKey);
    
    if (!restaurant) {
      res.status(404).json({
        success: false,
        error: 'Restaurant not found or inactive'
      } as ApiResponse);
      return;
    }

    // Attach restaurant and widget config to request
    req.restaurant = restaurant;
    req.widgetConfig = widgetConfig;

    // Remove API key from query params to avoid it being logged
    delete req.query.apiKey;

    next();
  } catch (error) {
    console.error('Error validating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

/**
 * Rate limiting middleware specific to widget API
 * More restrictive than regular API to prevent abuse
 */
export const widgetRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // This could be enhanced with Redis-based rate limiting
  // For now, relying on the general rate limiting middleware
  next();
};

/**
 * CORS middleware specifically for widget API
 * More permissive since widgets will be embedded on various domains
 */
export const widgetCors = (req: Request, res: Response, next: NextFunction): void => {
  // Allow requests from any origin for widget API
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

/**
 * Security headers for widget API
 */
export const widgetSecurity = (req: Request, res: Response, next: NextFunction): void => {
  // Add security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  next();
};