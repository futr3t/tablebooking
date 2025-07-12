import { db } from '../config/database';
import { Table, TableType, TableSummary, BulkTableOperation } from '../types';

export class TableModel {
  static async findById(id: string): Promise<Table | null> {
    try {
      const result = await db.query(
        'SELECT * FROM tables WHERE id = $1 AND is_active = true',
        [id]
      );
      return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding table by ID:', error);
      throw error;
    }
  }

  static async findByRestaurant(
    restaurantId: string, 
    options?: {
      includeInactive?: boolean;
      tableType?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ tables: Table[]; total: number }> {
    try {
      const conditions = ['restaurant_id = $1'];
      const values: any[] = [restaurantId];
      let paramCount = 2;

      if (!options?.includeInactive) {
        conditions.push('is_active = true');
      }

      if (options?.tableType) {
        conditions.push(`table_type = $${paramCount}`);
        values.push(options.tableType);
        paramCount++;
      }


      const whereClause = conditions.join(' AND ');
      const orderBy = 'ORDER BY priority DESC, number ASC';
      
      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total FROM tables WHERE ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      let query = `SELECT * FROM tables WHERE ${whereClause} ${orderBy}`;
      if (options?.limit) {
        const offset = ((options.page || 1) - 1) * options.limit;
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        values.push(options.limit, offset);
      }

      const result = await db.query(query, values);
      const tables = result.rows.map(row => this.mapFromDb(row));

      return { tables, total };
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
      
      return result.rows.map(row => this.mapFromDb(row));
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
      const { tables } = await this.findByRestaurant(restaurantId);
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
    position?: any;
    tableType?: string;
    notes?: string;
    locationNotes?: string;
    isCombinable?: boolean;
    priority?: number;
  }): Promise<Table> {
    try {
      const result = await db.query(`
        INSERT INTO tables (
          restaurant_id, number, capacity, min_capacity, max_capacity, 
          position, table_type, notes, 
          location_notes, is_combinable, priority
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        tableData.restaurantId,
        tableData.number,
        tableData.capacity,
        tableData.minCapacity,
        tableData.maxCapacity,
        JSON.stringify(tableData.position || {}),
        tableData.tableType || 'standard',
        tableData.notes || null,
        tableData.locationNotes || null,
        tableData.isCombinable !== false, // Default to true
        tableData.priority || 0
      ]);

      return this.mapFromDb(result.rows[0]);
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

      return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
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

  /**
   * Bulk create multiple tables
   */
  static async bulkCreate(tables: Partial<Table>[]): Promise<Table[]> {
    try {
      if (tables.length === 0) return [];

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        
        const createdTables: Table[] = [];
        for (const tableData of tables) {
          const result = await client.query(`
            INSERT INTO tables (
              restaurant_id, number, capacity, min_capacity, max_capacity, 
              position, table_type, notes, 
              location_notes, is_combinable, priority
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
          `, [
            tableData.restaurantId,
            tableData.number,
            tableData.capacity,
            tableData.minCapacity,
            tableData.maxCapacity,
            JSON.stringify(tableData.position || {}),
            tableData.tableType || 'standard',
            tableData.notes || null,
            tableData.locationNotes || null,
            tableData.isCombinable !== false,
            tableData.priority || 0
          ]);
          
          createdTables.push(this.mapFromDb(result.rows[0]));
        }
        
        await client.query('COMMIT');
        return createdTables;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error bulk creating tables:', error);
      throw error;
    }
  }

  /**
   * Get table summary statistics for a restaurant
   */
  static async getSummary(restaurantId: string): Promise<TableSummary> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_tables,
          SUM(capacity) as total_capacity,
          AVG(capacity) as average_capacity,
          COUNT(CASE WHEN is_combinable = true THEN 1 END) as combinable_tables,
          table_type,
          COUNT(*) as type_count
        FROM tables 
        WHERE restaurant_id = $1 AND is_active = true
        GROUP BY table_type
      `, [restaurantId]);

      const totalResult = await db.query(`
        SELECT 
          COUNT(*) as total_tables,
          SUM(capacity) as total_capacity,
          AVG(capacity) as average_capacity,
          COUNT(CASE WHEN is_combinable = true THEN 1 END) as combinable_tables
        FROM tables 
        WHERE restaurant_id = $1 AND is_active = true
      `, [restaurantId]);

      const totals = totalResult.rows[0];
      const tablesByType: Record<string, number> = {};
      
      result.rows.forEach(row => {
        tablesByType[row.table_type] = parseInt(row.type_count);
      });

      return {
        totalTables: parseInt(totals.total_tables) || 0,
        totalCapacity: parseInt(totals.total_capacity) || 0,
        averageCapacity: parseFloat(totals.average_capacity) || 0,
        tablesByType,
        combinableTables: parseInt(totals.combinable_tables) || 0
      };
    } catch (error) {
      console.error('Error getting table summary:', error);
      throw error;
    }
  }

  /**
   * Search tables by various criteria
   */
  static async search(
    restaurantId: string,
    searchTerm: string,
    filters?: {
      tableType?: string;
      minCapacity?: number;
      maxCapacity?: number;
    }
  ): Promise<Table[]> {
    try {
      const conditions = ['restaurant_id = $1', 'is_active = true'];
      const values: any[] = [restaurantId];
      let paramCount = 2;

      // Search in table number, notes, and location notes
      if (searchTerm) {
        conditions.push(`(
          number ILIKE $${paramCount} OR 
          notes ILIKE $${paramCount} OR 
          location_notes ILIKE $${paramCount}
        )`);
        values.push(`%${searchTerm}%`);
        paramCount++;
      }

      if (filters?.tableType) {
        conditions.push(`table_type = $${paramCount}`);
        values.push(filters.tableType);
        paramCount++;
      }

      if (filters?.minCapacity !== undefined) {
        conditions.push(`capacity >= $${paramCount}`);
        values.push(filters.minCapacity);
        paramCount++;
      }

      if (filters?.maxCapacity !== undefined) {
        conditions.push(`capacity <= $${paramCount}`);
        values.push(filters.maxCapacity);
        paramCount++;
      }


      const result = await db.query(`
        SELECT * FROM tables 
        WHERE ${conditions.join(' AND ')}
        ORDER BY priority DESC, number ASC
      `, values);

      return result.rows.map(row => this.mapFromDb(row));
    } catch (error) {
      console.error('Error searching tables:', error);
      throw error;
    }
  }

  /**
   * Find available tables for a specific time slot
   */
  static async findAvailableTablesForTimeSlot(
    restaurantId: string,
    time: string,
    partySize: number,
    date?: string,
    duration?: number
  ): Promise<Table[]> {
    try {
      // First get all suitable tables for the party size
      const suitableTables = await this.findAvailableTablesForPartySize(restaurantId, partySize);
      
      // If no date provided, return all suitable tables (backward compatibility)
      if (!date) {
        return suitableTables;
      }
      
      // Get existing bookings for the date to check conflicts
      const { BookingModel } = await import('./Booking');
      const existingBookings = await BookingModel.findByDateRange(restaurantId, date, date);
      
      // Filter out cancelled and no-show bookings
      const activeBookings = existingBookings.filter(
        booking => booking.status !== 'cancelled' && booking.status !== 'no_show'
      );
      
      // Calculate time slot boundaries
      const startMinutes = this.timeToMinutes(time);
      const endMinutes = startMinutes + (duration || 120); // Default 2 hours if no duration
      
      // Filter tables that are available (no conflicting bookings)
      const availableTables = suitableTables.filter(table => {
        const tableBookings = activeBookings.filter(booking => booking.tableId === table.id);
        
        for (const booking of tableBookings) {
          const bookingStartMinutes = this.timeToMinutes(booking.bookingTime);
          const bookingEndMinutes = bookingStartMinutes + booking.duration;
          
          // Check for overlap
          if (!(endMinutes <= bookingStartMinutes || startMinutes >= bookingEndMinutes)) {
            return false; // Table is booked during this time
          }
        }
        
        return true; // Table is available
      });
      
      return availableTables;
    } catch (error) {
      console.error('Error finding available tables for time slot:', error);
      throw error;
    }
  }

  /**
   * Convert time string (HH:MM) to minutes since midnight
   */
  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Map database row to Table interface
   */
  private static mapFromDb(row: any): Table {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      number: row.number,
      capacity: row.capacity,
      minCapacity: row.min_capacity,
      maxCapacity: row.max_capacity,
      position: row.position,
      tableType: row.table_type,
      notes: row.notes,
      locationNotes: row.location_notes,
      isCombinable: row.is_combinable,
      priority: row.priority,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}