import { db } from '../config/database';
import { Restaurant } from '../types';

export class RestaurantModel {
  static async findById(id: string): Promise<Restaurant | null> {
    try {
      const result = await db.query(
        'SELECT * FROM restaurants WHERE id = $1 AND is_active = true',
        [id]
      );
      return result.rows[0] || null;
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

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          if (key === 'openingHours' || key === 'bookingSettings') {
            fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
            values.push(JSON.stringify(value));
          } else {
            fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
            values.push(value);
          }
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(id);
      const result = await db.query(`
        UPDATE restaurants 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `, values);

      return result.rows[0] || null;
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
}