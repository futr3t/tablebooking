import { pool as db } from '../config/database';
import { Booking, BookingStatus, PaginatedResponse, BookingSource } from '../types';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';
import { BookingTemplateModel } from './BookingTemplate';

export class BookingModel {
  static async findById(id: string): Promise<Booking | null> {
    try {
      const result = await db.query(`
        SELECT b.*, t.number as table_number
        FROM bookings b
        LEFT JOIN tables t ON b.table_id = t.id
        WHERE b.id = $1
      `, [id]);
      
      return result.rows[0] ? toCamelCase(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding booking by ID:', error);
      throw error;
    }
  }

  static async create(bookingData: {
    restaurantId: string;
    tableId?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    partySize: number;
    bookingDate: string;
    bookingTime: string;
    duration?: number;
    notes?: string;
    specialRequests?: string;
    dietaryRequirements?: string;
    occasion?: string;
    preferredSeating?: string;
    marketingConsent?: boolean;
    source?: BookingSource;
    createdBy?: string;
    isVip?: boolean;
    internalNotes?: string;
    metadata?: any;
    isWaitlisted?: boolean;
  }): Promise<Booking> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      // Generate confirmation code
      const confirmationCode = this.generateConfirmationCode();

      const result = await client.query(`
        INSERT INTO bookings (
          restaurant_id, table_id, customer_name, customer_email, customer_phone,
          party_size, booking_date, booking_time, duration, notes, special_requests,
          dietary_requirements, occasion, preferred_seating, marketing_consent,
          source, created_by, is_vip, internal_notes, metadata,
          is_waitlisted, confirmation_code, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `, [
        bookingData.restaurantId,
        bookingData.tableId || null,
        bookingData.customerName,
        bookingData.customerEmail || null,
        bookingData.customerPhone || null,
        bookingData.partySize,
        bookingData.bookingDate,
        bookingData.bookingTime,
        bookingData.duration || 120,
        bookingData.notes || null,
        bookingData.specialRequests || null,
        bookingData.dietaryRequirements || null,
        bookingData.occasion || null,
        bookingData.preferredSeating || null,
        bookingData.marketingConsent || false,
        bookingData.source || BookingSource.PHONE,
        bookingData.createdBy || null,
        bookingData.isVip || false,
        bookingData.internalNotes || null,
        bookingData.metadata ? JSON.stringify(bookingData.metadata) : null,
        bookingData.isWaitlisted || false,
        confirmationCode,
        bookingData.isWaitlisted ? BookingStatus.PENDING : BookingStatus.CONFIRMED
      ]);

      // If waitlisted, set waitlist position
      if (bookingData.isWaitlisted) {
        const positionResult = await client.query(`
          SELECT COALESCE(MAX(waitlist_position), 0) + 1 as position
          FROM bookings 
          WHERE restaurant_id = $1 AND booking_date = $2 AND is_waitlisted = true
        `, [bookingData.restaurantId, bookingData.bookingDate]);

        await client.query(`
          UPDATE bookings SET waitlist_position = $1 WHERE id = $2
        `, [positionResult.rows[0].position, result.rows[0].id]);

        result.rows[0].waitlist_position = positionResult.rows[0].position;
      }

      await client.query('COMMIT');
      
      // Update booking template for repeat customers
      if (bookingData.customerPhone) {
        try {
          await BookingTemplateModel.upsert({
            restaurantId: bookingData.restaurantId,
            customerPhone: bookingData.customerPhone,
            customerName: bookingData.customerName,
            customerEmail: bookingData.customerEmail,
            preferredPartySize: bookingData.partySize,
            dietaryRequirements: bookingData.dietaryRequirements,
            preferredSeating: bookingData.preferredSeating,
            specialRequests: bookingData.specialRequests,
            isVip: bookingData.isVip || false,
            lastBookingDate: new Date(bookingData.bookingDate)
          });
        } catch (templateError) {
          console.error('Error updating booking template:', templateError);
          // Don't fail the booking if template update fails
        }
      }
      
      return toCamelCase(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating booking:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id: string, updates: Partial<Booking>): Promise<Booking | null> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(id);
      const result = await client.query(`
        UPDATE bookings 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating booking:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByRestaurant(
    restaurantId: string,
    filters: {
      date?: string;
      status?: BookingStatus;
      customerName?: string;
      page?: number;
      limit?: number;
      includeCancelled?: boolean;
    } = {}
  ): Promise<PaginatedResponse<Booking>> {
    try {
      const { page = 1, limit = 50, includeCancelled = false } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = ['b.restaurant_id = $1'];
      let params: any[] = [restaurantId];
      let paramCount = 2;

      // Exclude cancelled and no-show bookings by default
      if (!includeCancelled && !filters.status) {
        whereConditions.push(`b.status NOT IN ('cancelled', 'no_show')`);
      }

      if (filters.date) {
        whereConditions.push(`b.booking_date = $${paramCount}`);
        params.push(filters.date);
        paramCount++;
      }

      if (filters.status) {
        whereConditions.push(`b.status = $${paramCount}`);
        params.push(filters.status);
        paramCount++;
      }

      if (filters.customerName) {
        whereConditions.push(`b.customer_name ILIKE $${paramCount}`);
        params.push(`%${filters.customerName}%`);
        paramCount++;
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM bookings b
        WHERE ${whereConditions.join(' AND ')}
      `;
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const dataQuery = `
        SELECT b.*, t.number as table_number
        FROM bookings b
        LEFT JOIN tables t ON b.table_id = t.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY b.booking_date DESC, b.booking_time DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      
      params.push(limit, offset);
      const dataResult = await db.query(dataQuery, params);

      return {
        success: true,
        data: dataResult.rows.map(row => toCamelCase(row)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error finding bookings by restaurant:', error);
      throw error;
    }
  }

  static async findByDateRange(
    restaurantId: string,
    startDate: string,
    endDate: string,
    includeWaitlist: boolean = false
  ): Promise<Booking[]> {
    try {
      let whereConditions = [
        'b.restaurant_id = $1',
        'b.booking_date >= $2',
        'b.booking_date <= $3'
      ];

      if (!includeWaitlist) {
        whereConditions.push('b.is_waitlisted = false');
      }

      const result = await db.query(`
        SELECT b.*, t.number as table_number
        FROM bookings b
        LEFT JOIN tables t ON b.table_id = t.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY booking_date, booking_time
      `, [restaurantId, startDate, endDate]);

      return result.rows.map(row => toCamelCase(row));
    } catch (error) {
      console.error('Error finding bookings by date range:', error);
      throw error;
    }
  }

  static async findConflictingBookings(
    restaurantId: string,
    tableId: string,
    bookingDate: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<Booking[]> {
    try {
      let query = `
        SELECT * FROM bookings
        WHERE restaurant_id = $1 
        AND table_id = $2 
        AND booking_date = $3
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (booking_time <= $4 AND (booking_time + INTERVAL '1 minute' * duration) > $4) OR
          (booking_time < $5 AND (booking_time + INTERVAL '1 minute' * duration) >= $5) OR
          (booking_time >= $4 AND booking_time < $5)
        )
      `;

      let params = [restaurantId, tableId, bookingDate, startTime, endTime];

      if (excludeBookingId) {
        query += ' AND id != $6';
        params.push(excludeBookingId);
      }

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error finding conflicting bookings:', error);
      throw error;
    }
  }

  static async markNoShow(id: string): Promise<Booking | null> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      // Update booking status
      const result = await client.query(`
        UPDATE bookings 
        SET status = $1, no_show_count = no_show_count + 1
        WHERE id = $2
        RETURNING *
      `, [BookingStatus.NO_SHOW, id]);

      if (result.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = result.rows[0];

      // Process waitlist if table becomes available
      await this.processWaitlistForSlot(
        client,
        booking.restaurant_id,
        booking.booking_date,
        booking.booking_time,
        booking.table_id
      );

      await client.query('COMMIT');
      return booking;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error marking booking as no-show:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async cancel(id: string): Promise<Booking | null> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        UPDATE bookings 
        SET status = $1
        WHERE id = $2 AND status NOT IN ('completed', 'no_show')
        RETURNING *
      `, [BookingStatus.CANCELLED, id]);

      if (result.rows.length === 0) {
        return null;
      }

      const booking = result.rows[0];

      // Process waitlist if table becomes available
      if (booking.table_id) {
        await this.processWaitlistForSlot(
          client,
          booking.restaurant_id,
          booking.booking_date,
          booking.booking_time,
          booking.table_id
        );
      }

      await client.query('COMMIT');
      return booking;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error cancelling booking:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByConfirmationCode(confirmationCode: string): Promise<Booking | null> {
    try {
      const result = await db.query(`
        SELECT b.*, t.number as table_number
        FROM bookings b
        LEFT JOIN tables t ON b.table_id = t.id
        WHERE b.confirmation_code = $1
      `, [confirmationCode]);
      
      return result.rows[0] ? toCamelCase(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding booking by confirmation code:', error);
      throw error;
    }
  }

  private static async processWaitlistForSlot(
    client: any,
    restaurantId: string,
    bookingDate: string,
    bookingTime: string,
    tableId: string
  ): Promise<void> {
    // Find first waitlisted booking for this date that could use this table
    const waitlistResult = await client.query(`
      SELECT * FROM bookings
      WHERE restaurant_id = $1 
      AND booking_date = $2 
      AND is_waitlisted = true
      AND status = 'pending'
      ORDER BY waitlist_position ASC
      LIMIT 1
    `, [restaurantId, bookingDate]);

    if (waitlistResult.rows.length > 0) {
      const waitlistBooking = waitlistResult.rows[0];
      
      // Check if this table can accommodate the waitlisted party
      const tableResult = await client.query(`
        SELECT * FROM tables 
        WHERE id = $1 AND min_capacity <= $2 AND max_capacity >= $2
      `, [tableId, waitlistBooking.party_size]);

      if (tableResult.rows.length > 0) {
        // Assign table and confirm booking
        await client.query(`
          UPDATE bookings 
          SET table_id = $1, is_waitlisted = false, waitlist_position = null, status = 'confirmed'
          WHERE id = $2
        `, [tableId, waitlistBooking.id]);

        // Update waitlist positions for remaining bookings
        await client.query(`
          UPDATE bookings 
          SET waitlist_position = waitlist_position - 1
          WHERE restaurant_id = $1 
          AND booking_date = $2 
          AND is_waitlisted = true 
          AND waitlist_position > $3
        `, [restaurantId, bookingDate, waitlistBooking.waitlist_position]);
      }
    }
  }

  private static generateConfirmationCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}