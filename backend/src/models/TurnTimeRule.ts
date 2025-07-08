import { db } from '../config/database';

export interface TurnTimeRule {
  id: string;
  restaurantId: string;
  name?: string;
  minPartySize: number;
  maxPartySize: number;
  turnTimeMinutes: number;
  description?: string;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TurnTimeRuleModel {
  static async findByRestaurant(restaurantId: string): Promise<TurnTimeRule[]> {
    try {
      const result = await db.query(
        `SELECT * FROM turn_time_rules 
         WHERE restaurant_id = $1 AND is_active = true 
         ORDER BY priority DESC, min_party_size ASC`,
        [restaurantId]
      );
      return result.rows.map(this.mapFromDb);
    } catch (error) {
      console.error('Error finding turn time rules:', error);
      throw error;
    }
  }

  static async findById(id: string): Promise<TurnTimeRule | null> {
    try {
      const result = await db.query(
        'SELECT * FROM turn_time_rules WHERE id = $1',
        [id]
      );
      return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding turn time rule by ID:', error);
      throw error;
    }
  }

  static async create(ruleData: {
    restaurantId: string;
    name?: string;
    minPartySize: number;
    maxPartySize: number;
    turnTimeMinutes: number;
    description?: string;
    priority?: number;
  }): Promise<TurnTimeRule> {
    try {
      const result = await db.query(`
        INSERT INTO turn_time_rules (
          restaurant_id, name, min_party_size, max_party_size, 
          turn_time_minutes, description, priority
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        ruleData.restaurantId,
        ruleData.name,
        ruleData.minPartySize,
        ruleData.maxPartySize,
        ruleData.turnTimeMinutes,
        ruleData.description,
        ruleData.priority || 0
      ]);

      return this.mapFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating turn time rule:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<TurnTimeRule>): Promise<TurnTimeRule | null> {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      const fieldMapping: { [key: string]: string } = {
        'minPartySize': 'min_party_size',
        'maxPartySize': 'max_party_size',
        'turnTimeMinutes': 'turn_time_minutes',
        'isActive': 'is_active'
      };

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id' && key !== 'restaurantId' && key !== 'createdAt' && key !== 'updatedAt') {
          const dbFieldName = fieldMapping[key] || this.camelToSnake(key);
          fields.push(`${dbFieldName} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        return this.findById(id);
      }

      values.push(id);
      const result = await db.query(`
        UPDATE turn_time_rules 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating turn time rule:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const result = await db.query(
        'UPDATE turn_time_rules SET is_active = false WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting turn time rule:', error);
      throw error;
    }
  }

  static async findRuleForPartySize(restaurantId: string, partySize: number): Promise<TurnTimeRule | null> {
    try {
      const result = await db.query(
        `SELECT * FROM turn_time_rules 
         WHERE restaurant_id = $1 
         AND $2 >= min_party_size 
         AND $2 <= max_party_size 
         AND is_active = true 
         ORDER BY priority DESC, (max_party_size - min_party_size) ASC 
         LIMIT 1`,
        [restaurantId, partySize]
      );
      return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding turn time rule for party size:', error);
      throw error;
    }
  }

  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private static mapFromDb(dbRule: any): TurnTimeRule {
    return {
      id: dbRule.id,
      restaurantId: dbRule.restaurant_id,
      name: dbRule.name,
      minPartySize: dbRule.min_party_size,
      maxPartySize: dbRule.max_party_size,
      turnTimeMinutes: dbRule.turn_time_minutes,
      description: dbRule.description,
      priority: dbRule.priority,
      isActive: dbRule.is_active,
      createdAt: dbRule.created_at,
      updatedAt: dbRule.updated_at
    };
  }
}