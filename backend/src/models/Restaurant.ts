import { db } from '../config/database';
import { Restaurant } from '../types';

export class RestaurantModel {
  static async findById(id: string): Promise<Restaurant | null> {
    try {
      const result = await db.query(
        'SELECT * FROM restaurants WHERE id = $1 AND is_active = true',
        [id]
      );
      return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding restaurant by ID:', error);
      throw error;
    }
  }

  static async findByEmail(email: string): Promise<Restaurant | null> {
    try {
      const result = await db.query(
        'SELECT * FROM restaurants WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding restaurant by email:', error);
      throw error;
    }
  }

  static async findAll(): Promise<Restaurant[]> {
    try {
      const result = await db.query(
        'SELECT * FROM restaurants WHERE is_active = true ORDER BY name'
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding all restaurants:', error);
      throw error;
    }
  }

  static async create(restaurantData: {
    name: string;
    email: string;
    phone: string;
    address: string;
    cuisine?: string;
    description?: string;
    capacity?: number;
    timeZone?: string;
    openingHours?: any;
    bookingSettings?: any;
  }): Promise<Restaurant> {
    try {
      const result = await db.query(`
        INSERT INTO restaurants (
          name, email, phone, address, cuisine, description, capacity, 
          time_zone, opening_hours, booking_settings
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        restaurantData.name,
        restaurantData.email.toLowerCase(),
        restaurantData.phone,
        restaurantData.address,
        restaurantData.cuisine,
        restaurantData.description,
        restaurantData.capacity || 30,
        restaurantData.timeZone || 'UTC',
        JSON.stringify(restaurantData.openingHours || {}),
        JSON.stringify(restaurantData.bookingSettings || {})
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating restaurant:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<Restaurant>): Promise<Restaurant | null> {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Log incoming updates for debugging
      console.log('Restaurant.update called with:', {
        id,
        updates: Object.keys(updates),
        updateValues: updates
      });

      // Map field names to actual database columns
      const fieldMapping: { [key: string]: string } = {
        'maxCovers': 'max_covers',
        'turnTimeMinutes': 'turn_time_minutes',
        'defaultSlotDuration': 'default_slot_duration',
        'timeZone': 'time_zone',
        'openingHours': 'opening_hours',
        'bookingSettings': 'booking_settings'
        // Note: stagger_minutes was removed from schema
      };

      // List of fields that should be integers and need empty string sanitization
      const integerFields = ['maxCovers', 'turnTimeMinutes', 'defaultSlotDuration'];
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
          let dbFieldName: string;
          let sanitizedValue = value;
          
          // Use field mapping if available, otherwise convert to snake_case
          if (fieldMapping[key]) {
            dbFieldName = fieldMapping[key];
          } else {
            dbFieldName = this.camelToSnake(key);
          }
          
          // Sanitize empty strings to null for integer fields
          if (integerFields.includes(key) && value === '') {
            sanitizedValue = null;
            console.log(`Sanitized empty string to null for field: ${key}`);
          }
          
          // Also sanitize empty strings and fix type conversion in bookingSettings
          if (key === 'bookingSettings' && typeof value === 'object' && value !== null) {
            const numericBookingFields = ['maxConcurrentTables', 'maxConcurrentCovers', 'maxPartySize', 'maxAdvanceBookingDays', 'minAdvanceBookingHours', 'reminderHours'];
            const booleanBookingFields = ['enableWaitlist', 'requirePhone', 'requireEmail', 'autoConfirm', 'sendConfirmationEmail', 'sendConfirmationSMS', 'sendReminderEmail', 'sendReminderSMS'];
            const sanitizedBookingSettings = { ...value };
            
            // Handle numeric fields
            for (const bookingKey of numericBookingFields) {
              if (sanitizedBookingSettings[bookingKey] === '') {
                sanitizedBookingSettings[bookingKey] = null;
                console.log(`Sanitized empty string to null for bookingSettings.${bookingKey}`);
              } else if (typeof sanitizedBookingSettings[bookingKey] === 'string' && sanitizedBookingSettings[bookingKey] !== null) {
                const numVal = parseInt(sanitizedBookingSettings[bookingKey]);
                if (!isNaN(numVal)) {
                  sanitizedBookingSettings[bookingKey] = numVal;
                  console.log(`Converted string '${sanitizedBookingSettings[bookingKey]}' to number ${numVal} for bookingSettings.${bookingKey}`);
                }
              }
            }
            
            // Handle boolean fields
            for (const bookingKey of booleanBookingFields) {
              if (typeof sanitizedBookingSettings[bookingKey] === 'string') {
                sanitizedBookingSettings[bookingKey] = sanitizedBookingSettings[bookingKey] === 'true';
                console.log(`Converted string to boolean for bookingSettings.${bookingKey}`);
              }
            }
            
            sanitizedValue = sanitizedBookingSettings;
          }
          
          if (key === 'openingHours' || key === 'bookingSettings') {
            fields.push(`${dbFieldName} = $${paramCount}`);
            values.push(JSON.stringify(sanitizedValue));
          } else {
            fields.push(`${dbFieldName} = $${paramCount}`);
            values.push(sanitizedValue);
          }
          paramCount++;
        }
      }

      if (fields.length === 0) {
        console.warn('No fields to update. This might be intentional.');
        // Return the current restaurant data without updating
        const current = await this.findById(id);
        return current;
      }

      values.push(id);
      const result = await db.query(`
        UPDATE restaurants 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `, values);

      return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating restaurant:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const result = await db.query(
        'UPDATE restaurants SET is_active = false WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      throw error;
    }
  }

  static async getBookingSettings(id: string): Promise<any> {
    try {
      const result = await db.query(
        'SELECT booking_settings FROM restaurants WHERE id = $1 AND is_active = true',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].booking_settings || {};
    } catch (error) {
      console.error('Error getting booking settings:', error);
      throw error;
    }
  }

  static async getOpeningHours(id: string): Promise<any> {
    try {
      const result = await db.query(
        'SELECT opening_hours FROM restaurants WHERE id = $1 AND is_active = true',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].opening_hours || {};
    } catch (error) {
      console.error('Error getting opening hours:', error);
      throw error;
    }
  }

  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Auto-migrate opening hours from old format to new enhanced format
   * Converts { openTime, closeTime } to { periods: [{ name: "Service", startTime, endTime }] }
   */
  static async migrateOpeningHoursFormat(restaurantId: string): Promise<boolean> {
    try {
      const restaurant = await this.findById(restaurantId);
      if (!restaurant) return false;

      const openingHours = restaurant.openingHours;
      let migrationNeeded = false;
      const migratedHours: any = {};

      // Check each day for old format and convert to new format
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      for (const day of days) {
        const daySchedule = openingHours[day];
        if (daySchedule) {
          if (daySchedule.openTime && daySchedule.closeTime && !daySchedule.periods) {
            // Old format detected - convert to new format
            migratedHours[day] = {
              isOpen: daySchedule.isOpen,
              periods: daySchedule.isOpen ? [{
                name: 'Service',
                startTime: daySchedule.openTime,
                endTime: daySchedule.closeTime
              }] : []
            };
            migrationNeeded = true;
          } else {
            // Already in new format or is closed day
            migratedHours[day] = daySchedule;
          }
        } else {
          // Day not configured - set as closed
          migratedHours[day] = { isOpen: false, periods: [] };
        }
      }

      // Update restaurant with migrated opening hours if migration was needed
      if (migrationNeeded) {
        await this.update(restaurantId, { openingHours: migratedHours });
        console.log(`Migrated opening hours format for restaurant ${restaurantId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error migrating opening hours format:', error);
      return false;
    }
  }

  /**
   * Add a service period to a specific day
   */
  static async addServicePeriod(
    restaurantId: string, 
    dayOfWeek: string, 
    period: { name: string; startTime: string; endTime: string; slotDurationMinutes?: number }
  ): Promise<boolean> {
    try {
      const restaurant = await this.findById(restaurantId);
      if (!restaurant) return false;

      const openingHours = { ...restaurant.openingHours };
      
      if (!openingHours[dayOfWeek]) {
        openingHours[dayOfWeek] = { isOpen: true, periods: [] };
      }

      if (!openingHours[dayOfWeek].periods) {
        openingHours[dayOfWeek].periods = [];
      }

      // Add the new period
      openingHours[dayOfWeek].periods.push(period);
      openingHours[dayOfWeek].isOpen = true;

      // Sort periods by start time
      openingHours[dayOfWeek].periods.sort((a: any, b: any) => {
        const timeA = a.startTime.split(':').map(Number);
        const timeB = b.startTime.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });

      await this.update(restaurantId, { openingHours });
      return true;
    } catch (error) {
      console.error('Error adding service period:', error);
      return false;
    }
  }

  static mapFromDb(dbRestaurant: any): Restaurant {
    return {
      id: dbRestaurant.id,
      name: dbRestaurant.name,
      email: dbRestaurant.email,
      phone: dbRestaurant.phone,
      address: dbRestaurant.address,
      cuisine: dbRestaurant.cuisine,
      description: dbRestaurant.description,
      maxCovers: dbRestaurant.max_covers, // Fixed: use max_covers from DB
      timeZone: dbRestaurant.time_zone,
      turnTimeMinutes: dbRestaurant.turn_time_minutes || 120,
      defaultSlotDuration: dbRestaurant.default_slot_duration || 30,
      openingHours: dbRestaurant.opening_hours || {},
      bookingSettings: dbRestaurant.booking_settings || {},
      isActive: dbRestaurant.is_active,
      createdAt: dbRestaurant.created_at,
      updatedAt: dbRestaurant.updated_at
    };
  }
}