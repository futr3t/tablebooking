import cron from 'node-cron';
import { BookingModel } from '../models/Booking';
import { RestaurantModel } from '../models/Restaurant';
import { NotificationService, NotificationType } from './notification';
import { BookingStatus } from '../types';

export class ReminderService {
  private static isRunning = false;

  static start(): void {
    if (this.isRunning) {
      console.log('Reminder service already running');
      return;
    }

    console.log('Starting reminder service...');
    this.isRunning = true;

    // Run every hour to check for reminders
    cron.schedule('0 * * * *', async () => {
      await this.checkAndSendReminders();
    });

    // Also run at startup to catch any missed reminders
    setTimeout(() => {
      this.checkAndSendReminders();
    }, 5000);

    console.log('Reminder service started - will check every hour');
  }

  static stop(): void {
    console.log('Stopping reminder service...');
    this.isRunning = false;
  }

  private static async checkAndSendReminders(): Promise<void> {
    try {
      console.log('Checking for reminder notifications...');

      // Get all active restaurants
      const restaurants = await RestaurantModel.findAll();

      for (const restaurant of restaurants) {
        await this.processRestaurantReminders(restaurant);
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }

  private static async processRestaurantReminders(restaurant: any): Promise<void> {
    try {
      const settings = restaurant.bookingSettings || {};

      // Skip if reminders are disabled
      if (!settings.sendReminderEmail && !settings.sendReminderSMS) {
        return;
      }

      const reminderHours = settings.reminderHours || 24;

      // Calculate target date/time for reminders
      const now = new Date();
      const reminderTime = new Date(now.getTime() + (reminderHours * 60 * 60 * 1000));

      // Get bookings that need reminders
      const bookingsNeedingReminders = await this.getBookingsNeedingReminders(
        restaurant.id,
        reminderTime,
        reminderHours
      );

      console.log(`Found ${bookingsNeedingReminders.length} bookings needing reminders for ${restaurant.name}`);

      for (const booking of bookingsNeedingReminders) {
        await this.sendBookingReminder(booking, restaurant);
      }
    } catch (error) {
      console.error(`Error processing reminders for restaurant ${restaurant.id}:`, error);
    }
  }

  private static async getBookingsNeedingReminders(
    restaurantId: string,
    reminderTime: Date,
    reminderHours: number
  ): Promise<any[]> {
    try {
      // Get bookings for tomorrow (within reminder window)
      const startDate = new Date(reminderTime);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(reminderTime);
      endDate.setHours(23, 59, 59, 999);

      const bookings = await BookingModel.findByDateRange(
        restaurantId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Filter for confirmed bookings that haven't been reminded yet
      return bookings.filter(booking => {
        return booking.status === BookingStatus.CONFIRMED &&
               !booking.isWaitlisted &&
               (booking.customerEmail || booking.customerPhone) &&
               !this.hasBeenReminded(booking, reminderHours);
      });
    } catch (error) {
      console.error('Error getting bookings needing reminders:', error);
      return [];
    }
  }

  private static hasBeenReminded(booking: any, reminderHours: number): boolean {
    // Check if we've already sent a reminder for this booking
    // You could add a 'lastReminderSent' field to bookings table
    // For now, we'll use metadata field
    const metadata = booking.metadata || {};
    const lastReminder = metadata.lastReminderSent;

    if (!lastReminder) {
      return false;
    }

    const reminderDate = new Date(lastReminder);
    const now = new Date();
    const hoursSinceLastReminder = (now.getTime() - reminderDate.getTime()) / (1000 * 60 * 60);

    // Don't send another reminder if we sent one in the last 12 hours
    return hoursSinceLastReminder < 12;
  }

  private static async sendBookingReminder(booking: any, restaurant: any): Promise<void> {
    try {
      const result = await NotificationService.sendNotification({
        booking,
        restaurant,
        type: NotificationType.REMINDER
      });

      if (result.emailSent || result.smsSent) {
        // Mark that we sent a reminder
        await this.markReminderSent(booking);
        console.log(`Reminder sent for booking ${booking.confirmationCode} - Email: ${result.emailSent}, SMS: ${result.smsSent}`);
      }

      if (result.errors.length > 0) {
        console.error(`Reminder errors for booking ${booking.confirmationCode}:`, result.errors);
      }
    } catch (error) {
      console.error(`Failed to send reminder for booking ${booking.confirmationCode}:`, error);
    }
  }

  private static async markReminderSent(booking: any): Promise<void> {
    try {
      const metadata = booking.metadata || {};
      metadata.lastReminderSent = new Date().toISOString();

      await BookingModel.update(booking.id, { metadata });
    } catch (error) {
      console.error(`Failed to mark reminder sent for booking ${booking.id}:`, error);
    }
  }

  // Manual method to send test reminders
  static async sendTestReminder(bookingId: string): Promise<{ success: boolean; message: string }> {
    try {
      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      const restaurant = await RestaurantModel.findById(booking.restaurantId);
      if (!restaurant) {
        return { success: false, message: 'Restaurant not found' };
      }

      const result = await NotificationService.sendNotification({
        booking,
        restaurant,
        type: NotificationType.REMINDER
      });

      const message = `Test reminder sent - Email: ${result.emailSent}, SMS: ${result.smsSent}`;
      if (result.errors.length > 0) {
        return { success: false, message: `${message}. Errors: ${result.errors.join(', ')}` };
      }

      return { success: true, message };
    } catch (error: any) {
      return { success: false, message: `Failed to send test reminder: ${error.message}` };
    }
  }
}
