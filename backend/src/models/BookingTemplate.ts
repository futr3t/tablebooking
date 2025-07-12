import { pool } from '../config/database';
import { BookingTemplate } from '../types';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

export class BookingTemplateModel {
  static async findByPhone(restaurantId: string, phone: string): Promise<BookingTemplate | null> {
    const query = `
      SELECT * FROM booking_templates 
      WHERE restaurant_id = $1 AND customer_phone = $2
    `;
    
    const result = await pool.query(query, [restaurantId, phone]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return toCamelCase(result.rows[0]);
  }

  static async findByRestaurant(restaurantId: string, limit: number = 50): Promise<BookingTemplate[]> {
    const query = `
      SELECT * FROM booking_templates 
      WHERE restaurant_id = $1
      ORDER BY total_bookings DESC, last_booking_date DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [restaurantId, limit]);
    return result.rows.map(row => toCamelCase(row));
  }

  static async searchCustomers(
    restaurantId: string, 
    searchTerm: string
  ): Promise<BookingTemplate[]> {
    const query = `
      SELECT * FROM booking_templates 
      WHERE restaurant_id = $1 
        AND (
          customer_name ILIKE $2 
          OR customer_phone ILIKE $2 
          OR customer_email ILIKE $2
        )
      ORDER BY 
        CASE 
          WHEN customer_phone LIKE $3 THEN 1
          WHEN customer_name ILIKE $3 THEN 2
          ELSE 3
        END,
        total_bookings DESC
      LIMIT 10
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const exactPattern = `${searchTerm}%`;
    const result = await pool.query(query, [restaurantId, searchPattern, exactPattern]);
    return result.rows.map(row => toCamelCase(row));
  }

  static async upsert(data: Partial<BookingTemplate>): Promise<BookingTemplate> {
    const fields = toSnakeCase(data);
    
    const query = `
      INSERT INTO booking_templates (
        restaurant_id, customer_phone, customer_name, customer_email,
        preferred_party_size, dietary_requirements, preferred_seating,
        special_requests, is_vip, notes, last_booking_date, total_bookings,
        no_show_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (restaurant_id, customer_phone)
      DO UPDATE SET
        customer_name = EXCLUDED.customer_name,
        customer_email = COALESCE(EXCLUDED.customer_email, booking_templates.customer_email),
        preferred_party_size = COALESCE(EXCLUDED.preferred_party_size, booking_templates.preferred_party_size),
        dietary_requirements = COALESCE(EXCLUDED.dietary_requirements, booking_templates.dietary_requirements),
        preferred_seating = COALESCE(EXCLUDED.preferred_seating, booking_templates.preferred_seating),
        special_requests = COALESCE(EXCLUDED.special_requests, booking_templates.special_requests),
        is_vip = COALESCE(EXCLUDED.is_vip, booking_templates.is_vip),
        notes = COALESCE(EXCLUDED.notes, booking_templates.notes),
        last_booking_date = GREATEST(EXCLUDED.last_booking_date, booking_templates.last_booking_date),
        total_bookings = booking_templates.total_bookings + 1,
        no_show_count = CASE 
          WHEN EXCLUDED.no_show_count > booking_templates.no_show_count 
          THEN EXCLUDED.no_show_count 
          ELSE booking_templates.no_show_count 
        END,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      fields.restaurant_id,
      fields.customer_phone,
      fields.customer_name,
      fields.customer_email || null,
      fields.preferred_party_size || null,
      fields.dietary_requirements || null,
      fields.preferred_seating || null,
      fields.special_requests || null,
      fields.is_vip || false,
      fields.notes || null,
      fields.last_booking_date || new Date(),
      fields.total_bookings || 1,
      fields.no_show_count || 0
    ];

    const result = await pool.query(query, values);
    return toCamelCase(result.rows[0]);
  }

  static async incrementNoShow(restaurantId: string, phone: string): Promise<void> {
    const query = `
      UPDATE booking_templates 
      SET no_show_count = no_show_count + 1
      WHERE restaurant_id = $1 AND customer_phone = $2
    `;
    
    await pool.query(query, [restaurantId, phone]);
  }

  static async getVipCustomers(restaurantId: string): Promise<BookingTemplate[]> {
    const query = `
      SELECT * FROM booking_templates 
      WHERE restaurant_id = $1 AND is_vip = true
      ORDER BY total_bookings DESC
    `;
    
    const result = await pool.query(query, [restaurantId]);
    return result.rows.map(row => toCamelCase(row));
  }

  static async getFrequentCustomers(
    restaurantId: string, 
    minBookings: number = 5
  ): Promise<BookingTemplate[]> {
    const query = `
      SELECT * FROM booking_templates 
      WHERE restaurant_id = $1 AND total_bookings >= $2
      ORDER BY total_bookings DESC
    `;
    
    const result = await pool.query(query, [restaurantId, minBookings]);
    return result.rows.map(row => toCamelCase(row));
  }

  /**
   * Create or update booking template from a booking record
   */
  static async createFromBooking(booking: any): Promise<BookingTemplate | null> {
    try {
      // Only create template if customer provided contact info
      if (!booking.customerPhone && !booking.customerEmail) {
        return null;
      }

      // Use phone as primary key, fallback to email if no phone
      const primaryContact = booking.customerPhone || booking.customerEmail;
      if (!primaryContact) {
        return null;
      }

      // Create booking template data from the booking
      const templateData = {
        restaurantId: booking.restaurantId,
        customerPhone: booking.customerPhone || primaryContact,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        preferredPartySize: booking.partySize,
        dietaryRequirements: booking.dietaryRequirements,
        preferredSeating: booking.seatingPreference,
        specialRequests: booking.internalNotes,
        isVip: booking.vipCustomer || false,
        notes: null,
        lastBookingDate: booking.bookingDate || new Date(),
        totalBookings: 1,
        noShowCount: 0
      };

      return await this.upsert(templateData);
    } catch (error) {
      console.error('Error creating booking template from booking:', error);
      return null; // Don't fail the booking if template creation fails
    }
  }
}