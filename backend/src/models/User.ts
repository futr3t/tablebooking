import { db } from '../config/database';
import { User, UserRole } from '../types';
import bcrypt from 'bcryptjs';

export class UserModel {
  static async findById(id: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async create(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: UserRole;
    restaurantId?: string;
  }): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const result = await db.query(`
        INSERT INTO users (email, password, first_name, last_name, phone, role, restaurant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        userData.email.toLowerCase(),
        hashedPassword,
        userData.firstName,
        userData.lastName,
        userData.phone,
        userData.role || UserRole.CUSTOMER,
        userData.restaurantId
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          if (key === 'password') {
            fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
            values.push(await bcrypt.hash(value as string, 12));
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
        UPDATE users 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `, values);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const result = await db.query(
        'UPDATE users SET is_active = false WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async findByRestaurant(restaurantId: string): Promise<User[]> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE restaurant_id = $1 AND is_active = true ORDER BY role, first_name',
        [restaurantId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding users by restaurant:', error);
      throw error;
    }
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}