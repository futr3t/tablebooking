import { Request, Response } from 'express';
import { WidgetConfigModel } from '../models/WidgetConfig';
import { ApiResponse, User } from '../types';

// Extend Request type to include user info from auth middleware
interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Get widget configuration for the authenticated user's restaurant
 */
export const getWidgetConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user || !user.restaurantId) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Restaurant association required'
      } as ApiResponse);
      return;
    }

    // Use findOrCreate to handle race conditions
    const widgetConfig = await WidgetConfigModel.findOrCreate(user.restaurantId, {
      isEnabled: false, // Start disabled by default
      theme: {
        primaryColor: '#1976d2',
        secondaryColor: '#f5f5f5',
        fontFamily: 'Roboto, sans-serif',
        borderRadius: '4px'
      },
      settings: {
        showAvailableSlots: true,
        maxPartySize: 8,
        advanceBookingDays: 30,
        requirePhone: true,
        requireEmail: false,
        showSpecialRequests: true,
        confirmationMessage: 'Thank you for your reservation!'
      }
    });

    res.json({
      success: true,
      data: widgetConfig
    } as ApiResponse);
  } catch (error) {
    console.error('Error getting widget config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

/**
 * Update widget configuration
 */
export const updateWidgetConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user || !user.restaurantId) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Restaurant association required'
      } as ApiResponse);
      return;
    }

    // Check if user has permission to modify widget settings
    if (!['super_admin', 'owner', 'manager'].includes(user.role)) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Insufficient permissions'
      } as ApiResponse);
      return;
    }

    const { isEnabled, theme, settings } = req.body;

    // Find existing config
    const existingConfig = await WidgetConfigModel.findByRestaurantId(user.restaurantId);

    if (!existingConfig) {
      res.status(404).json({
        success: false,
        error: 'Widget configuration not found'
      } as ApiResponse);
      return;
    }

    // Update the config
    const updatedConfig = await WidgetConfigModel.update(existingConfig.id, {
      isEnabled,
      theme,
      settings
    });

    if (!updatedConfig) {
      res.status(404).json({
        success: false,
        error: 'Failed to update widget configuration'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Widget configuration updated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Error updating widget config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

/**
 * Regenerate API key for the widget
 */
export const regenerateApiKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user || !user.restaurantId) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Restaurant association required'
      } as ApiResponse);
      return;
    }

    // Check if user has permission to regenerate API key
    if (!['super_admin', 'owner'].includes(user.role)) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Only owners can regenerate API keys'
      } as ApiResponse);
      return;
    }

    const newApiKey = await WidgetConfigModel.regenerateApiKey(user.restaurantId);

    res.json({
      success: true,
      data: { apiKey: newApiKey },
      message: 'API key regenerated successfully. Please update your widget installation.'
    } as ApiResponse);
  } catch (error) {
    console.error('Error regenerating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

/**
 * Toggle widget enabled/disabled status
 */
export const toggleWidget = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user || !user.restaurantId) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Restaurant association required'
      } as ApiResponse);
      return;
    }

    // Check if user has permission to toggle widget
    if (!['super_admin', 'owner', 'manager'].includes(user.role)) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Insufficient permissions'
      } as ApiResponse);
      return;
    }

    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Enabled status must be a boolean value'
      } as ApiResponse);
      return;
    }

    // Find existing config
    const existingConfig = await WidgetConfigModel.findByRestaurantId(user.restaurantId);

    if (!existingConfig) {
      res.status(404).json({
        success: false,
        error: 'Widget configuration not found'
      } as ApiResponse);
      return;
    }

    // Update the enabled status
    const updatedConfig = await WidgetConfigModel.update(existingConfig.id, {
      isEnabled: enabled
    });

    if (!updatedConfig) {
      res.status(404).json({
        success: false,
        error: 'Failed to update widget status'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: { isEnabled: updatedConfig.isEnabled },
      message: `Widget ${enabled ? 'enabled' : 'disabled'} successfully`
    } as ApiResponse);
  } catch (error) {
    console.error('Error toggling widget:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

/**
 * Get widget installation instructions and code
 */
export const getInstallationInstructions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user || !user.restaurantId) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Restaurant association required'
      } as ApiResponse);
      return;
    }

    const widgetConfig = await WidgetConfigModel.findByRestaurantId(user.restaurantId);

    if (!widgetConfig) {
      res.status(404).json({
        success: false,
        error: 'Widget configuration not found'
      } as ApiResponse);
      return;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const widgetUrl = `${baseUrl}/widget.js`; // This will be our built widget file
    
    const installationCode = `<!-- Table Booking Widget -->
<script src="${widgetUrl}"></script>
<div id="tablebooking-widget" data-api-key="${widgetConfig.apiKey}"></div>
<script>
  TablebookingWidget.init({
    containerId: 'tablebooking-widget',
    apiKey: '${widgetConfig.apiKey}'
  });
</script>`;

    const instructions = {
      htmlCode: installationCode,
      apiKey: widgetConfig.apiKey,
      widgetUrl: widgetUrl,
      isEnabled: widgetConfig.isEnabled,
      steps: [
        '1. Copy the HTML code below and paste it into your website where you want the booking widget to appear.',
        '2. Make sure the widget is enabled in your settings.',
        '3. Customize the widget appearance and settings as needed.',
        '4. Test the widget to ensure it\'s working correctly.'
      ],
      notes: [
        'The widget will automatically match your restaurant\'s theme settings.',
        'Bookings made through the widget will appear in your admin dashboard.',
        'You can disable the widget at any time without removing the code from your website.'
      ]
    };

    res.json({
      success: true,
      data: instructions
    } as ApiResponse);
  } catch (error) {
    console.error('Error getting installation instructions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};