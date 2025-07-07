import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error);
  } else {
    console.error('Error:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
  }

  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
  }

  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (error.message.includes('duplicate key')) {
    statusCode = 409;
    message = 'Resource already exists';
  }

  if (error.message.includes('foreign key')) {
    statusCode = 400;
    message = 'Invalid reference';
  }

  // Log the full error for debugging
  if (statusCode >= 500) {
    console.error('Server Error Details:', {
      message: error.message,
      stack: error.stack,
      originalError: error
    });
  }

  const response: ApiResponse = {
    success: false,
    error: message
  };

  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.message = error.stack;
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  } as ApiResponse);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  return new AppError(message, statusCode);
};