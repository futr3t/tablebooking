/**
 * Validation middleware for widget configuration endpoints
 */

import { Request, Response, NextFunction } from 'express';

// Color validation regex (hex, rgb, rgba, hsl, color names)
const COLOR_REGEX = /^(#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})|(rgb|rgba|hsl|hsla)\([^)]+\)|[a-zA-Z]+)$/;

// Safe font family validation (no script injection)
const FONT_FAMILY_REGEX = /^[a-zA-Z0-9\s',\-"]+$/;

interface WidgetTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  borderRadius?: string;
}

interface WidgetSettings {
  maxPartySize?: number;
  requireEmail?: boolean;
  requirePhone?: boolean;
  showSpecialRequests?: boolean;
  advanceBookingDays?: number;
  minBookingHours?: number;
}

export const validateWidgetConfig = (req: Request, res: Response, next: NextFunction): void => {
  const { theme, settings } = req.body;
  const errors: string[] = [];

  // Validate theme if provided
  if (theme) {
    const validatedTheme = validateTheme(theme, errors);
    if (validatedTheme) {
      req.body.theme = validatedTheme;
    }
  }

  // Validate settings if provided
  if (settings) {
    const validatedSettings = validateSettings(settings, errors);
    if (validatedSettings) {
      req.body.settings = validatedSettings;
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
};

function validateTheme(theme: any, errors: string[]): WidgetTheme | null {
  if (typeof theme !== 'object' || theme === null) {
    errors.push('Theme must be an object');
    return null;
  }

  const validatedTheme: WidgetTheme = {};

  // Validate primary color
  if (theme.primaryColor !== undefined) {
    if (typeof theme.primaryColor !== 'string') {
      errors.push('Primary color must be a string');
    } else if (!COLOR_REGEX.test(theme.primaryColor)) {
      errors.push('Primary color must be a valid CSS color (hex, rgb, rgba, hsl, or color name)');
    } else {
      validatedTheme.primaryColor = theme.primaryColor.trim();
    }
  }

  // Validate secondary color
  if (theme.secondaryColor !== undefined) {
    if (typeof theme.secondaryColor !== 'string') {
      errors.push('Secondary color must be a string');
    } else if (!COLOR_REGEX.test(theme.secondaryColor)) {
      errors.push('Secondary color must be a valid CSS color (hex, rgb, rgba, hsl, or color name)');
    } else {
      validatedTheme.secondaryColor = theme.secondaryColor.trim();
    }
  }

  // Validate font family
  if (theme.fontFamily !== undefined) {
    if (typeof theme.fontFamily !== 'string') {
      errors.push('Font family must be a string');
    } else if (!FONT_FAMILY_REGEX.test(theme.fontFamily)) {
      errors.push('Font family contains invalid characters');
    } else if (theme.fontFamily.length > 100) {
      errors.push('Font family name is too long (max 100 characters)');
    } else {
      validatedTheme.fontFamily = theme.fontFamily.trim();
    }
  }

  // Validate border radius
  if (theme.borderRadius !== undefined) {
    if (typeof theme.borderRadius !== 'string') {
      errors.push('Border radius must be a string');
    } else if (!/^(\d+(\.\d+)?(px|em|rem|%)|0)$/.test(theme.borderRadius)) {
      errors.push('Border radius must be a valid CSS length (e.g., "8px", "0.5rem", "50%")');
    } else {
      validatedTheme.borderRadius = theme.borderRadius.trim();
    }
  }

  return validatedTheme;
}

function validateSettings(settings: any, errors: string[]): WidgetSettings | null {
  if (typeof settings !== 'object' || settings === null) {
    errors.push('Settings must be an object');
    return null;
  }

  const validatedSettings: WidgetSettings = {};

  // Validate max party size
  if (settings.maxPartySize !== undefined) {
    if (!Number.isInteger(settings.maxPartySize)) {
      errors.push('Max party size must be an integer');
    } else if (settings.maxPartySize < 1 || settings.maxPartySize > 50) {
      errors.push('Max party size must be between 1 and 50');
    } else {
      validatedSettings.maxPartySize = settings.maxPartySize;
    }
  }

  // Validate boolean settings
  const booleanSettings = ['requireEmail', 'requirePhone', 'showSpecialRequests'];
  for (const setting of booleanSettings) {
    if (settings[setting] !== undefined) {
      if (typeof settings[setting] !== 'boolean') {
        errors.push(`${setting} must be a boolean`);
      } else {
        (validatedSettings as any)[setting] = settings[setting];
      }
    }
  }

  // Validate advance booking days
  if (settings.advanceBookingDays !== undefined) {
    if (!Number.isInteger(settings.advanceBookingDays)) {
      errors.push('Advance booking days must be an integer');
    } else if (settings.advanceBookingDays < 1 || settings.advanceBookingDays > 365) {
      errors.push('Advance booking days must be between 1 and 365');
    } else {
      validatedSettings.advanceBookingDays = settings.advanceBookingDays;
    }
  }

  // Validate min booking hours
  if (settings.minBookingHours !== undefined) {
    if (!Number.isInteger(settings.minBookingHours)) {
      errors.push('Min booking hours must be an integer');
    } else if (settings.minBookingHours < 0 || settings.minBookingHours > 168) {
      errors.push('Min booking hours must be between 0 and 168 (1 week)');
    } else {
      validatedSettings.minBookingHours = settings.minBookingHours;
    }
  }

  return validatedSettings;
}

export const validateToggleWidget = (req: Request, res: Response, next: NextFunction): void => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: ['enabled must be a boolean value']
    });
    return;
  }

  next();
};

// Sanitize potentially dangerous input
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};