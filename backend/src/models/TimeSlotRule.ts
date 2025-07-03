import { db } from '../config/database';
import { TimeSlotRule, CreateTimeSlotRuleData, UpdateTimeSlotRuleData } from '../types';

export class TimeSlotRuleModel {
  /**
   * Get all time slot rules for a restaurant
   */
  static async findByRestaurantId(restaurantId: string): Promise<TimeSlotRule[]> {
    const query = `
      SELECT 
        id,
        restaurant_id,
        name,
        day_of_week,
        start_time,
        end_time,
        slot_duration_minutes,
        max_concurrent_bookings,
        turn_time_minutes,
        is_active,
        created_at,
        updated_at
      FROM time_slot_rules 
      WHERE restaurant_id = $1 AND is_active = true
      ORDER BY day_of_week NULLS FIRST, start_time ASC
    `;
    
    const result = await db.query(query, [restaurantId]);
    return result.rows.map(this.mapFromDb);
  }

  /**
   * Get time slot rules for a specific day
   */
  static async findByRestaurantAndDay(restaurantId: string, dayOfWeek: number): Promise<TimeSlotRule[]> {
    const query = `
      SELECT 
        id,
        restaurant_id,
        name,
        day_of_week,
        start_time,
        end_time,
        slot_duration_minutes,
        max_concurrent_bookings,
        turn_time_minutes,
        is_active,
        created_at,
        updated_at
      FROM time_slot_rules 
      WHERE restaurant_id = $1 
        AND (day_of_week = $2 OR day_of_week IS NULL)
        AND is_active = true
      ORDER BY start_time ASC
    `;
    
    const result = await db.query(query, [restaurantId, dayOfWeek]);
    return result.rows.map(this.mapFromDb);
  }

  /**
   * Get a single time slot rule by ID
   */
  static async findById(id: string): Promise<TimeSlotRule | null> {
    const query = `
      SELECT 
        id,
        restaurant_id,
        name,
        day_of_week,
        start_time,
        end_time,
        slot_duration_minutes,
        max_concurrent_bookings,
        turn_time_minutes,
        is_active,
        created_at,
        updated_at
      FROM time_slot_rules 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? this.mapFromDb(result.rows[0]) : null;
  }

  /**
   * Create a new time slot rule
   */
  static async create(restaurantId: string, data: CreateTimeSlotRuleData): Promise<TimeSlotRule> {
    const query = `
      INSERT INTO time_slot_rules (
        restaurant_id,
        name,
        day_of_week,
        start_time,
        end_time,
        slot_duration_minutes,
        max_concurrent_bookings,
        turn_time_minutes,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      restaurantId,
      data.name,
      data.dayOfWeek || null,
      data.startTime,
      data.endTime,
      data.slotDurationMinutes || 30,
      data.maxConcurrentBookings || null,
      data.turnTimeMinutes || 15,
      data.isActive !== false // Default to true
    ];
    
    const result = await db.query(query, values);
    return this.mapFromDb(result.rows[0]);
  }

  /**
   * Update an existing time slot rule
   */
  static async update(id: string, data: UpdateTimeSlotRuleData): Promise<TimeSlotRule | null> {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.dayOfWeek !== undefined) {
      setClause.push(`day_of_week = $${paramCount++}`);
      values.push(data.dayOfWeek);
    }
    if (data.startTime !== undefined) {
      setClause.push(`start_time = $${paramCount++}`);
      values.push(data.startTime);
    }
    if (data.endTime !== undefined) {
      setClause.push(`end_time = $${paramCount++}`);
      values.push(data.endTime);
    }
    if (data.slotDurationMinutes !== undefined) {
      setClause.push(`slot_duration_minutes = $${paramCount++}`);
      values.push(data.slotDurationMinutes);
    }
    if (data.maxConcurrentBookings !== undefined) {
      setClause.push(`max_concurrent_bookings = $${paramCount++}`);
      values.push(data.maxConcurrentBookings);
    }
    if (data.turnTimeMinutes !== undefined) {
      setClause.push(`turn_time_minutes = $${paramCount++}`);
      values.push(data.turnTimeMinutes);
    }
    if (data.isActive !== undefined) {
      setClause.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE time_slot_rules 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows.length > 0 ? this.mapFromDb(result.rows[0]) : null;
  }

  /**
   * Delete (deactivate) a time slot rule
   */
  static async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE time_slot_rules 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Check for time conflicts when creating/updating rules
   */
  static async checkTimeConflicts(
    restaurantId: string, 
    dayOfWeek: number | null, 
    startTime: string, 
    endTime: string,
    excludeId?: string
  ): Promise<TimeSlotRule[]> {
    let query = `
      SELECT 
        id,
        restaurant_id,
        name,
        day_of_week,
        start_time,
        end_time,
        slot_duration_minutes,
        max_concurrent_bookings,
        turn_time_minutes,
        is_active,
        created_at,
        updated_at
      FROM time_slot_rules 
      WHERE restaurant_id = $1 
        AND is_active = true
        AND (day_of_week = $2 OR day_of_week IS NULL OR $2 IS NULL)
        AND (
          (start_time <= $3 AND end_time > $3) OR
          (start_time < $4 AND end_time >= $4) OR
          (start_time >= $3 AND end_time <= $4)
        )
    `;
    
    const values = [restaurantId, dayOfWeek, startTime, endTime];

    if (excludeId) {
      query += ` AND id != $5`;
      values.push(excludeId);
    }
    
    const result = await db.query(query, values);
    return result.rows.map(this.mapFromDb);
  }

  /**
   * Map database row to TimeSlotRule object
   */
  private static mapFromDb(row: any): TimeSlotRule {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      name: row.name,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      slotDurationMinutes: row.slot_duration_minutes,
      maxConcurrentBookings: row.max_concurrent_bookings,
      turnTimeMinutes: row.turn_time_minutes,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}