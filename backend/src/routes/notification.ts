import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { NotificationService, NotificationType } from '../services/notification';
import { ReminderService } from '../services/reminder';
import { BookingModel } from '../models/Booking';
import { RestaurantModel } from '../models/Restaurant';
import { UserRole } from '../types';
import { createError, asyncHandler } from '../middleware/error';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Test email notification
router.post('/test-email',
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, restaurantName = 'Test Restaurant' } = req.body;

    if (!email) {
      throw createError('Email address is required', 400);
    }

    try {
      await NotificationService.sendTestEmail(email, restaurantName);

      res.json({
        success: true,
        message: `Test email sent to ${email}`
      });
    } catch (error: any) {
      throw createError(`Failed to send test email: ${error.message}`, 500);
    }
  })
);

// Test SMS notification
router.post('/test-sms',
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { phone, restaurantName = 'Test Restaurant' } = req.body;

    if (!phone) {
      throw createError('Phone number is required', 400);
    }

    try {
      await NotificationService.sendTestSMS(phone, restaurantName);

      res.json({
        success: true,
        message: `Test SMS sent to ${phone}`
      });
    } catch (error: any) {
      throw createError(`Failed to send test SMS: ${error.message}`, 500);
    }
  })
);

// Send notification for specific booking
router.post('/booking/:bookingId/:type',
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { bookingId, type } = req.params;

    if (!Object.values(NotificationType).includes(type as NotificationType)) {
      throw createError('Invalid notification type', 400);
    }

    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw createError('Booking not found', 404);
    }

    const restaurant = await RestaurantModel.findById(booking.restaurantId);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    try {
      const result = await NotificationService.sendNotification({
        booking,
        restaurant,
        type: type as NotificationType
      });

      res.json({
        success: true,
        data: result,
        message: `Notification sent - Email: ${result.emailSent}, SMS: ${result.smsSent}`
      });
    } catch (error: any) {
      throw createError(`Failed to send notification: ${error.message}`, 500);
    }
  })
);

// Send test reminder for specific booking
router.post('/reminder/:bookingId',
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { bookingId } = req.params;

    try {
      const result = await ReminderService.sendTestReminder(bookingId);

      res.json({
        success: result.success,
        message: result.message
      });
    } catch (error: any) {
      throw createError(`Failed to send reminder: ${error.message}`, 500);
    }
  })
);

// Get notification configuration for restaurant
router.get('/config/:restaurantId',
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;

    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    const settings = restaurant.bookingSettings || {};

    res.json({
      success: true,
      data: {
        email: {
          confirmation: settings.sendConfirmationEmail !== false,
          reminder: settings.sendReminderEmail !== false,
          cancellation: settings.sendCancellationEmail !== false,
          waitlist: settings.sendWaitlistEmail !== false
        },
        sms: {
          confirmation: settings.sendConfirmationSMS === true,
          reminder: settings.sendReminderSMS === true,
          cancellation: settings.sendCancellationSMS === true,
          waitlist: settings.sendWaitlistSMS === true
        },
        reminderHours: settings.reminderHours || 24,
        configured: {
          sendgrid: !!process.env.SENDGRID_API_KEY,
          twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
        }
      }
    });
  })
);

// Update notification configuration for restaurant
router.put('/config/:restaurantId',
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const {
      sendConfirmationEmail,
      sendReminderEmail,
      sendCancellationEmail,
      sendWaitlistEmail,
      sendConfirmationSMS,
      sendReminderSMS,
      sendCancellationSMS,
      sendWaitlistSMS,
      reminderHours
    } = req.body;

    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    const currentSettings = restaurant.bookingSettings || {};
    const updatedSettings = {
      ...currentSettings,
      sendConfirmationEmail: sendConfirmationEmail !== undefined ? sendConfirmationEmail : currentSettings.sendConfirmationEmail,
      sendReminderEmail: sendReminderEmail !== undefined ? sendReminderEmail : currentSettings.sendReminderEmail,
      sendCancellationEmail: sendCancellationEmail !== undefined ? sendCancellationEmail : currentSettings.sendCancellationEmail,
      sendWaitlistEmail: sendWaitlistEmail !== undefined ? sendWaitlistEmail : currentSettings.sendWaitlistEmail,
      sendConfirmationSMS: sendConfirmationSMS !== undefined ? sendConfirmationSMS : currentSettings.sendConfirmationSMS,
      sendReminderSMS: sendReminderSMS !== undefined ? sendReminderSMS : currentSettings.sendReminderSMS,
      sendCancellationSMS: sendCancellationSMS !== undefined ? sendCancellationSMS : currentSettings.sendCancellationSMS,
      sendWaitlistSMS: sendWaitlistSMS !== undefined ? sendWaitlistSMS : currentSettings.sendWaitlistSMS,
      reminderHours: reminderHours !== undefined ? reminderHours : currentSettings.reminderHours
    };

    await RestaurantModel.update(restaurantId, { bookingSettings: updatedSettings });

    res.json({
      success: true,
      message: 'Notification settings updated',
      data: updatedSettings
    });
  })
);

export default router;
