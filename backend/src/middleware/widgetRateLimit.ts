/**
 * Rate limiting middleware specifically for widget endpoints
 * More restrictive than regular API to prevent abuse of embedded widgets
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

interface RateLimitStore {
  [key: string]: {
    count: number;
    windowStart: number;
  };
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore: RateLimitStore = {};
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    const entry = rateLimitStore[key];
    if (now - entry.windowStart > CLEANUP_INTERVAL) {
      delete rateLimitStore[key];
    }
  });
}, CLEANUP_INTERVAL);

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Function to generate rate limit key
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Error message when rate limit exceeded
}

/**
 * Create rate limiting middleware with custom options
 */
export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req: Request) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore[key];
    
    // Reset window if expired
    if (!entry || now - entry.windowStart > windowMs) {
      entry = {
        count: 0,
        windowStart: now
      };
      rateLimitStore[key] = entry;
    }
    
    // Check if rate limit exceeded
    if (entry.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1000)
      } as ApiResponse);
      return;
    }
    
    // Increment counter (will be decremented if request should be skipped)
    entry.count++;
    
    // Hook into response to handle skip logic
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalSend = res.send;
      res.send = function(body) {
        const shouldSkip = 
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400);
        
        if (shouldSkip && entry) {
          entry.count = Math.max(0, entry.count - 1);
        }
        
        return originalSend.call(this, body);
      };
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - entry.count).toString(),
      'X-RateLimit-Reset': new Date(entry.windowStart + windowMs).toISOString(),
      'X-RateLimit-Window': windowMs.toString()
    });
    
    next();
  };
};

/**
 * Rate limiting for widget JavaScript file requests
 * More lenient since the file might be cached by CDN
 */
export const widgetFileRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute per IP
  message: 'Too many widget file requests'
});

/**
 * Rate limiting for widget API endpoints (availability, booking, etc.)
 * More restrictive to prevent abuse
 */
export const widgetApiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute per IP
  keyGenerator: (req: Request) => {
    // Use API key + IP for rate limiting to allow multiple widgets from same IP
    const apiKey = req.query.apiKey as string || req.headers['x-api-key'] as string;
    return `${req.ip || 'unknown'}:${apiKey ? apiKey.substring(0, 8) : 'no-key'}`;
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // Don't count failed requests (e.g., validation errors)
  message: 'Too many widget API requests. Please slow down.'
});

/**
 * Rate limiting for booking creation
 * Very restrictive to prevent spam bookings
 */
export const bookingRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 3, // Max 3 booking attempts per 5 minutes per IP/API key
  keyGenerator: (req: Request) => {
    const apiKey = req.query.apiKey as string || req.headers['x-api-key'] as string;
    return `booking:${req.ip || 'unknown'}:${apiKey ? apiKey.substring(0, 8) : 'no-key'}`;
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
  message: 'Too many booking attempts. Please wait before trying again.'
});

/**
 * Rate limiting for demo page
 * Moderate restrictions since it's for demonstration
 */
export const demoRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute per IP
  message: 'Too many demo page requests'
});

/**
 * Rate limiting by API key for authenticated widget endpoints
 * Per-restaurant limits to ensure fair usage
 */
export const perApiKeyRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute per API key
  keyGenerator: (req: Request) => {
    const apiKey = req.query.apiKey as string || req.headers['x-api-key'] as string;
    return `api-key:${apiKey || 'no-key'}`;
  },
  message: 'API key rate limit exceeded. Please contact support if you need higher limits.'
});