import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import Handlebars from 'handlebars';
import { Booking, NotificationType, Restaurant } from '../types';

// Initialize services
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface NotificationData {
  booking: Booking;
  restaurant: Restaurant;
  type: NotificationType;
  customMessage?: string;
}

export class NotificationService {

  // Email Templates
  private static emailTemplates = {
    confirmation: `
      <h2>Booking Confirmation - {{restaurant.name}}</h2>
      <p>Dear {{booking.customerName}},</p>
      <p>Your reservation has been confirmed!</p>

      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3>Reservation Details</h3>
        <p><strong>Restaurant:</strong> {{restaurant.name}}</p>
        <p><strong>Date:</strong> {{formatDate booking.bookingDate}}</p>
        <p><strong>Time:</strong> {{booking.bookingTime}}</p>
        <p><strong>Party Size:</strong> {{booking.partySize}} guests</p>
        <p><strong>Confirmation Code:</strong> {{booking.confirmationCode}}</p>
        {{#if booking.specialRequests}}
        <p><strong>Special Requests:</strong> {{booking.specialRequests}}</p>
        {{/if}}
        {{#if booking.dietaryRequirements}}
        <p><strong>Dietary Requirements:</strong> {{booking.dietaryRequirements}}</p>
        {{/if}}
      </div>

      <p><strong>Restaurant Address:</strong><br>{{restaurant.address}}</p>
      <p><strong>Phone:</strong> {{restaurant.phone}}</p>

      <p>Please arrive on time. If you need to modify or cancel your reservation, please call us at {{restaurant.phone}} or use confirmation code {{booking.confirmationCode}}.</p>

      <p>Thank you for choosing {{restaurant.name}}!</p>
    `,

    reminder: `
      <h2>Reminder: Your Reservation Tomorrow - {{restaurant.name}}</h2>
      <p>Dear {{booking.customerName}},</p>
      <p>This is a friendly reminder about your reservation tomorrow.</p>

      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3>Reservation Details</h3>
        <p><strong>Date:</strong> {{formatDate booking.bookingDate}}</p>
        <p><strong>Time:</strong> {{booking.bookingTime}}</p>
        <p><strong>Party Size:</strong> {{booking.partySize}} guests</p>
        <p><strong>Confirmation Code:</strong> {{booking.confirmationCode}}</p>
      </div>

      <p>We look forward to seeing you!</p>
      <p>{{restaurant.name}} - {{restaurant.phone}}</p>
    `,

    cancellation: `
      <h2>Reservation Cancelled - {{restaurant.name}}</h2>
      <p>Dear {{booking.customerName}},</p>
      <p>Your reservation has been cancelled as requested.</p>

      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3>Cancelled Reservation</h3>
        <p><strong>Date:</strong> {{formatDate booking.bookingDate}}</p>
        <p><strong>Time:</strong> {{booking.bookingTime}}</p>
        <p><strong>Confirmation Code:</strong> {{booking.confirmationCode}}</p>
      </div>

      <p>We're sorry to see you go. We hope to welcome you back soon!</p>
      <p>{{restaurant.name}} - {{restaurant.phone}}</p>
    `,

    waitlistNotification: `
      <h2>Great News! Table Available - {{restaurant.name}}</h2>
      <p>Dear {{booking.customerName}},</p>
      <p>A table has become available for your requested time!</p>

      <div style="background: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3>Your Reservation</h3>
        <p><strong>Date:</strong> {{formatDate booking.bookingDate}}</p>
        <p><strong>Time:</strong> {{booking.bookingTime}}</p>
        <p><strong>Party Size:</strong> {{booking.partySize}} guests</p>
        <p><strong>Confirmation Code:</strong> {{booking.confirmationCode}}</p>
      </div>

      <p>Your table has been reserved! Please call {{restaurant.phone}} to confirm.</p>
      <p>{{restaurant.name}} - {{restaurant.phone}}</p>
    `
  };

  // SMS Templates
  private static smsTemplates = {
    confirmation: `{{restaurant.name}} - Reservation confirmed for {{formatDate booking.bookingDate}} at {{booking.bookingTime}} for {{booking.partySize}} guests. Confirmation: {{booking.confirmationCode}}. Address: {{restaurant.address}}`,

    reminder: `{{restaurant.name}} - Reminder: Your reservation is tomorrow {{formatDate booking.bookingDate}} at {{booking.bookingTime}} for {{booking.partySize}} guests. See you then!`,

    cancellation: `{{restaurant.name}} - Your reservation for {{formatDate booking.bookingDate}} at {{booking.bookingTime}} has been cancelled. Code: {{booking.confirmationCode}}`,

    waitlistNotification: `{{restaurant.name}} - Good news! A table is now available for {{formatDate booking.bookingDate}} at {{booking.bookingTime}}. Your reservation is confirmed! Code: {{booking.confirmationCode}}`
  };

  static async sendNotification(data: NotificationData): Promise<{
    emailSent: boolean;
    smsSent: boolean;
    errors: string[];
  }> {
    const results = {
      emailSent: false,
      smsSent: false,
      errors: [] as string[]
    };

    const { booking, restaurant, type } = data;

    // Check restaurant notification settings
    const settings = restaurant.bookingSettings || {};
    const shouldSendEmail = this.shouldSendEmail(type, settings);
    const shouldSendSMS = this.shouldSendSMS(type, settings);

    // Send Email
    if (shouldSendEmail && booking.customerEmail) {
      try {
        await this.sendEmail(data);
        results.emailSent = true;
      } catch (error: any) {
        results.errors.push(`Email failed: ${error.message}`);
        console.error('Email notification failed:', error);
      }
    }

    // Send SMS
    if (shouldSendSMS && booking.customerPhone) {
      try {
        await this.sendSMS(data);
        results.smsSent = true;
      } catch (error: any) {
        results.errors.push(`SMS failed: ${error.message}`);
        console.error('SMS notification failed:', error);
      }
    }

    return results;
  }

  private static async sendEmail(data: NotificationData): Promise<void> {
    const { booking, restaurant, type } = data;

    if (!booking.customerEmail) {
      throw new Error('No customer email provided');
    }

    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    // Compile template
    const template = Handlebars.compile(this.emailTemplates[type]);
    const html = template({ booking, restaurant });

    const msg = {
      to: booking.customerEmail,
      from: process.env.FROM_EMAIL || 'noreply@restaurant.com',
      subject: this.getEmailSubject(type, restaurant.name),
      html: html
    };

    await sgMail.send(msg);
  }

  private static async sendSMS(data: NotificationData): Promise<void> {
    const { booking, restaurant, type } = data;

    if (!booking.customerPhone) {
      throw new Error('No customer phone provided');
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    // Compile template
    const template = Handlebars.compile(this.smsTemplates[type]);
    const body = template({ booking, restaurant });

    await twilioClient.messages.create({
      body: body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: booking.customerPhone
    });
  }

  private static shouldSendEmail(type: NotificationType, settings: any): boolean {
    switch (type) {
      case NotificationType.CONFIRMATION:
        return settings.sendConfirmationEmail !== false;
      case NotificationType.REMINDER:
        return settings.sendReminderEmail !== false;
      case NotificationType.CANCELLATION:
        return settings.sendCancellationEmail !== false;
      case NotificationType.WAITLIST_NOTIFICATION:
        return settings.sendWaitlistEmail !== false;
      default:
        return false;
    }
  }

  private static shouldSendSMS(type: NotificationType, settings: any): boolean {
    switch (type) {
      case NotificationType.CONFIRMATION:
        return settings.sendConfirmationSMS === true;
      case NotificationType.REMINDER:
        return settings.sendReminderSMS === true;
      case NotificationType.CANCELLATION:
        return settings.sendCancellationSMS === true;
      case NotificationType.WAITLIST_NOTIFICATION:
        return settings.sendWaitlistSMS === true;
      default:
        return false;
    }
  }

  private static getEmailSubject(type: NotificationType, restaurantName: string): string {
    switch (type) {
      case NotificationType.CONFIRMATION:
        return `Reservation Confirmed - ${restaurantName}`;
      case NotificationType.REMINDER:
        return `Reminder: Your Reservation Tomorrow - ${restaurantName}`;
      case NotificationType.CANCELLATION:
        return `Reservation Cancelled - ${restaurantName}`;
      case NotificationType.WAITLIST_NOTIFICATION:
        return `Table Available Now - ${restaurantName}`;
      default:
        return `Notification - ${restaurantName}`;
    }
  }

  // Test notification endpoints
  static async sendTestEmail(email: string, restaurantName: string): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    const msg = {
      to: email,
      from: process.env.FROM_EMAIL || 'noreply@restaurant.com',
      subject: `Test Email - ${restaurantName}`,
      html: `
        <h2>Test Email from ${restaurantName}</h2>
        <p>This is a test email to verify your email notification configuration.</p>
        <p>If you received this, your email notifications are working correctly!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    };

    await sgMail.send(msg);
  }

  static async sendTestSMS(phone: string, restaurantName: string): Promise<void> {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    await twilioClient.messages.create({
      body: `Test SMS from ${restaurantName}. Your SMS notifications are working correctly! Sent at ${new Date().toLocaleString()}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
  }
}

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});
