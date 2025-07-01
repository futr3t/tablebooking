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
export const validateApiKey = async (req: PublicRequest, res: Response, next: NextFunction) => {
  console.log('validateApiKey middleware called');
  console.log('Request URL:', req.url);
  console.log('Query params:', req.query);
  
  try {
    // Get API key from query parameter or header
    const apiKey = req.query.apiKey as string || req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      } as ApiResponse);
    }

    // Validate API key format (64 characters, alphanumeric)
    if (typeof apiKey !== 'string' || apiKey.length !== 64 || !/^[A-Z0-9]+$/.test(apiKey)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key format'
      } as ApiResponse);
    }

    // Find widget config by API key
    console.log(`Looking for widget config with API key: ${apiKey}`);
    const widgetConfig = await WidgetConfigModel.findByApiKey(apiKey);
    
    if (!widgetConfig) {
      console.log('Widget config not found for API key:', apiKey);
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      } as ApiResponse);
    }
    console.log('Widget config found:', widgetConfig.id);

    // Check if widget is enabled
    if (!widgetConfig.isEnabled) {
      return res.status(403).json({
        success: false,
        error: 'Widget is disabled for this restaurant'
      } as ApiResponse);
    }

    // Get restaurant information
    const restaurant = await WidgetConfigModel.getRestaurantByApiKey(apiKey);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or inactive'
      } as ApiResponse);
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
export const widgetRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // This could be enhanced with Redis-based rate limiting
  // For now, relying on the general rate limiting middleware
  next();
};

/**
 * CORS middleware specifically for widget API
 * More permissive since widgets will be embedded on various domains
 */
export const widgetCors = (req: Request, res: Response, next: NextFunction) => {
  // Allow requests from any origin for widget API
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

/**
 * Security headers for widget API
 */
export const widgetSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  next();
};