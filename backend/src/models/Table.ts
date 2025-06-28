import { db } from '../config/database';
import { Table } from '../types';

export class TableModel {
  static async findById(id: string): Promise<Table | null> {
    try {
      const result = await db.query(
        'SELECT * FROM tables WHERE id = $1 AND is_active = true',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding table by ID:', error);
      throw error;
    }
  }

  static async findByRestaurant(restaurantId: string): Promise<Table[]> {
    try {
      const result = await db.query(
        'SELECT * FROM tables WHERE restaurant_id = $1 AND is_active = true ORDER BY number',
        [restaurantId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding tables by restaurant:', error);
      throw error;
    }
  }

  static async findAvailableTablesForPartySize(
    restaurantId: string,
    partySize: number
  ): Promise<Table[]> {
    try {
      const result = await db.query(`
        SELECT * FROM tables 
        WHERE restaurant_id = $1 
        AND is_active = true 
        AND min_capacity <= $2 
        AND max_capacity >= $2
        ORDER BY capacity ASC
      `, [restaurantId, partySize]);
      
      return result.rows;
    } catch (error) {
      console.error('Error finding available tables for party size:', error);
      throw error;
    }
  }

  static async findTableCombinationsForPartySize(
    restaurantId: string,
    partySize: number,
    maxTables: number = 3
  ): Promise<Table[][]> {
    try {
      const tables = await this.findByRestaurant(restaurantId);
      const combinations: Table[][] = [];

      // Single table solutions (preferred)
      const singleTables = tables.filter(
        table => table.minCapacity <= partySize && table.maxCapacity >= partySize
      );
      
      for (const table of singleTables) {
        combinations.push([table]);
      }

      // Two table combinations
      if (combinations.length === 0 && maxTables >= 2) {
        for (let i = 0; i < tables.length; i++) {
          for (let j = i + 1; j < tables.length; j++) {
            const totalCapacity = tables[i].maxCapacity + tables[j].maxCapacity;
            const minCapacity = Math.max(tables[i].minCapacity, tables[j].minCapacity);
            
            if (minCapacity <= partySize && totalCapacity >= partySize) {
              combinations.push([tables[i], tables[j]]);
            }
          }
        }
      }

      // Sort by preference: fewer tables first, then by total capacity
      combinations.sort((a, b) => {
        if (a.length !== b.length) {
          return a.length - b.length;
        }
        const aTotalCapacity = a.reduce((sum, table) => sum + table.capacity, 0);
        const bTotalCapacity = b.reduce((sum, table) => sum + table.capacity, 0);
        return aTotalCapacity - bTotalCapacity;
      });

      return combinations;
    } catch (error) {
      console.error('Error finding table combinations for party size:', error);
      throw error;
    }
  }

  static async create(tableData: {
    restaurantId: string;
    number: string;
    capacity: number;
    minCapacity: number;
    maxCapacity: number;
    shape?: string;
    position?: any;
  }): Promise<Table> {
    try {
      const result = await db.query(`
        INSERT INTO tables (restaurant_id, number, capacity, min_capacity, max_capacity, shape, position)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        tableData.restaurantId,
        tableData.number,
        tableData.capacity,
        tableData.minCapacity,
        tableData.maxCapacity,
        tableData.shape || 'round',
        JSON.stringify(tableData.position || {})
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<Table>): Promise<Table | null> {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(key === 'position' ? JSON.stringify(value) : value);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(id);
      const result = await db.query(`
        UPDATE tables 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `, values);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating table:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const result = await db.query(
        'UPDATE tables SET is_active = false WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting table:', error);
      throw error;
    }
  }

  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}