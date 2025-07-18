import { db } from '../config/database';
import { mapWidgetConfigFromDb, mapWidgetConfigToDb } from '../utils/dbMapping';

export interface WidgetConfig {
  id: string;
  restaurantId: string;
  apiKey: string;
  isEnabled: boolean;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    borderRadius: string;
  };
  settings: {
    showAvailableSlots: boolean;
    maxPartySize: number;
    advanceBookingDays: number;
    requirePhone: boolean;
    requireEmail: boolean;
    showSpecialRequests: boolean;
    confirmationMessage: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export class WidgetConfigModel {
  static async findByApiKey(apiKey: string): Promise<WidgetConfig | null> {
    try {
      const result = await db.query(
        'SELECT * FROM widget_configs WHERE api_key = $1 AND is_enabled = true',
        [apiKey]
      );
      return result.rows[0] ? mapWidgetConfigFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding widget config by API key:', error);
      throw error;
    }
  }

  static async findByRestaurantId(restaurantId: string): Promise<WidgetConfig | null> {
    try {
      const result = await db.query(
        'SELECT * FROM widget_configs WHERE restaurant_id = $1',
        [restaurantId]
      );
      return result.rows[0] ? mapWidgetConfigFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding widget config by restaurant ID:', error);
      throw error;
    }
  }

  static async create(data: Partial<WidgetConfig>): Promise<WidgetConfig> {
    try {
      const dbData = mapWidgetConfigToDb(data);
      const result = await db.query(`
        INSERT INTO widget_configs (
          restaurant_id, api_key, is_enabled, theme, settings
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        dbData.restaurant_id,
        dbData.api_key || await this.generateApiKey(),
        dbData.is_enabled,
        JSON.stringify(dbData.theme),
        JSON.stringify(dbData.settings)
      ]);

      return mapWidgetConfigFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating widget config:', error);
      throw error;
    }
  }

  static async update(id: string, data: Partial<WidgetConfig>): Promise<WidgetConfig | null> {
    try {
      const dbData = mapWidgetConfigToDb(data);
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (dbData.is_enabled !== undefined) {
        fields.push(`is_enabled = $${paramCount++}`);
        values.push(dbData.is_enabled);
      }
      if (dbData.theme !== undefined) {
        fields.push(`theme = $${paramCount++}`);
        values.push(JSON.stringify(dbData.theme));
      }
      if (dbData.settings !== undefined) {
        fields.push(`settings = $${paramCount++}`);
        values.push(JSON.stringify(dbData.settings));
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(id);
      
      const result = await db.query(`
        UPDATE widget_configs 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      return result.rows[0] ? mapWidgetConfigFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating widget config:', error);
      throw error;
    }
  }

  static async regenerateApiKey(restaurantId: string): Promise<string> {
    try {
      const newApiKey = await this.generateApiKey();
      
      const result = await db.query(`
        UPDATE widget_configs 
        SET api_key = $1, updated_at = CURRENT_TIMESTAMP
        WHERE restaurant_id = $2
        RETURNING api_key
      `, [newApiKey, restaurantId]);

      if (!result.rows[0]) {
        throw new Error('Widget config not found');
      }

      return result.rows[0].api_key;
    } catch (error) {
      console.error('Error regenerating API key:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const result = await db.query(
        'DELETE FROM widget_configs WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting widget config:', error);
      throw error;
    }
  }

  private static async generateApiKey(): Promise<string> {
    try {
      const result = await db.query('SELECT generate_api_key() as api_key');
      return result.rows[0].api_key;
    } catch (error) {
      console.error('Error generating API key:', error);
      throw error;
    }
  }

  static async getRestaurantByApiKey(apiKey: string): Promise<any> {
    try {
      const result = await db.query(`
        SELECT r.* 
        FROM restaurants r
        JOIN widget_configs wc ON r.id = wc.restaurant_id
        WHERE wc.api_key = $1 AND wc.is_enabled = true AND r.is_active = true
      `, [apiKey]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting restaurant by API key:', error);
      throw error;
    }
  }

  /**
   * Find widget config by restaurant ID, or create a default one if it doesn't exist
   * This method handles race conditions by using database-level UPSERT
   */
  static async findOrCreate(restaurantId: string, defaultData?: Partial<WidgetConfig>): Promise<WidgetConfig> {
    try {
      // First try to find existing config
      const existing = await this.findByRestaurantId(restaurantId);
      if (existing) {
        return existing;
      }

      // If not found, create with database-level conflict resolution
      const theme = defaultData?.theme || {
        primaryColor: '#1976d2',
        secondaryColor: '#f5f5f5',
        fontFamily: 'Roboto, sans-serif',
        borderRadius: '4px'
      };

      const settings = defaultData?.settings || {
        showAvailableSlots: true,
        maxPartySize: 8,
        advanceBookingDays: 30,
        requirePhone: true,
        requireEmail: false,
        showSpecialRequests: true,
        confirmationMessage: 'Thank you for your reservation!'
      };

      // Use INSERT ... ON CONFLICT to handle race conditions
      const result = await db.query(`
        INSERT INTO widget_configs (
          restaurant_id, api_key, is_enabled, theme, settings
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (restaurant_id) DO UPDATE SET
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        restaurantId,
        await this.generateApiKey(),
        defaultData?.isEnabled || false,
        JSON.stringify(theme),
        JSON.stringify(settings)
      ]);

      return mapWidgetConfigFromDb(result.rows[0]);
    } catch (error) {
      // If conflict happened and another process created the record,
      // try to find it again
      if (error.code === '23505') { // unique_violation
        const existing = await this.findByRestaurantId(restaurantId);
        if (existing) {
          return existing;
        }
      }
      
      console.error('Error in findOrCreate widget config:', error);
      throw error;
    }
  }
}