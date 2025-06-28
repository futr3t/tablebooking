import { Request, Response, NextFunction } from 'express';
import validator from 'validator';
import { ApiResponse } from '../types';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'date' | 'time' | 'uuid';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export const validate = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    const data = { ...req.body, ...req.query, ...req.params };

    for (const rule of rules) {
      const value = data[rule.field];
      const fieldName = rule.field;

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${fieldName} is required`);
        continue;
      }

      if (value === undefined || value === null || value === '') {
        continue;
      }

      const validationError = validateField(value, rule);
      if (validationError) {
        errors.push(`${fieldName}: ${validationError}`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: errors.join(', ')
      } as ApiResponse);
      return;
    }

    next();
  };
};

const validateField = (value: any, rule: ValidationRule): string | null => {
  if (rule.type) {
    const typeError = validateType(value, rule.type);
    if (typeError) return typeError;
  }

  if (rule.minLength !== undefined && typeof value === 'string' && value.length < rule.minLength) {
    return `must be at least ${rule.minLength} characters long`;
  }

  if (rule.maxLength !== undefined && typeof value === 'string' && value.length > rule.maxLength) {
    return `must be no more than ${rule.maxLength} characters long`;
  }

  if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
    return `must be at least ${rule.min}`;
  }

  if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
    return `must be no more than ${rule.max}`;
  }

  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    return 'has invalid format';
  }

  if (rule.custom) {
    const customResult = rule.custom(value);
    if (typeof customResult === 'string') {
      return customResult;
    }
    if (!customResult) {
      return 'is invalid';
    }
  }

  return null;
};

const validateType = (value: any, type: string): string | null => {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return 'must be a string';
      }
      break;

    case 'number':
      if (typeof value !== 'number' && !validator.isNumeric(String(value))) {
        return 'must be a number';
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean' && !validator.isBoolean(String(value))) {
        return 'must be a boolean';
      }
      break;

    case 'email':
      if (!validator.isEmail(String(value))) {
        return 'must be a valid email address';
      }
      break;

    case 'phone':
      if (!validator.isMobilePhone(String(value), 'any', { strictMode: false })) {
        return 'must be a valid phone number';
      }
      break;

    case 'date':
      if (!validator.isDate(String(value))) {
        return 'must be a valid date';
      }
      break;

    case 'time':
      if (!validator.matches(String(value), /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        return 'must be a valid time in HH:MM format';
      }
      break;

    case 'uuid':
      if (!validator.isUUID(String(value))) {
        return 'must be a valid UUID';
      }
      break;

    default:
      return null;
  }

  return null;
};

export const validateLogin = validate([
  { field: 'email', required: true, type: 'email' },
  { field: 'password', required: true, type: 'string', minLength: 6 }
]);

export const validateRegister = validate([
  { field: 'email', required: true, type: 'email' },
  { field: 'password', required: true, type: 'string', minLength: 8 },
  { field: 'firstName', required: true, type: 'string', minLength: 1, maxLength: 100 },
  { field: 'lastName', required: true, type: 'string', minLength: 1, maxLength: 100 },
  { field: 'phone', required: false, type: 'phone' }
]);

export const validateBooking = validate([
  { field: 'customerName', required: true, type: 'string', minLength: 2, maxLength: 255 },
  { field: 'customerEmail', required: false, type: 'email' },
  { field: 'customerPhone', required: false, type: 'phone' },
  { field: 'partySize', required: true, type: 'number', min: 1, max: 20 },
  { field: 'bookingDate', required: true, type: 'date' },
  { field: 'bookingTime', required: true, type: 'time' },
  { field: 'specialRequests', required: false, type: 'string', maxLength: 500 }
]);

export const validateRestaurant = validate([
  { field: 'name', required: true, type: 'string', minLength: 2, maxLength: 255 },
  { field: 'email', required: true, type: 'email' },
  { field: 'phone', required: true, type: 'phone' },
  { field: 'address', required: true, type: 'string', minLength: 10, maxLength: 500 },
  { field: 'cuisine', required: false, type: 'string', maxLength: 100 },
  { field: 'capacity', required: false, type: 'number', min: 1, max: 500 }
]);

export const validateTable = validate([
  { field: 'number', required: true, type: 'string', minLength: 1, maxLength: 10 },
  { field: 'capacity', required: true, type: 'number', min: 1, max: 20 },
  { field: 'minCapacity', required: true, type: 'number', min: 1, max: 20 },
  { field: 'maxCapacity', required: true, type: 'number', min: 1, max: 20 }
]);