import { pool } from '../config/database';
import { DietaryRequirement } from '../types';
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

export class DietaryRequirementModel {
  static async findAll(): Promise<DietaryRequirement[]> {
    const query = `
      SELECT * FROM dietary_requirements 
      WHERE is_active = true 
      ORDER BY category, name
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => toCamelCase(row));
  }

  static async findByCategory(category: string): Promise<DietaryRequirement[]> {
    const query = `
      SELECT * FROM dietary_requirements 
      WHERE category = $1 AND is_active = true 
      ORDER BY severity DESC, name
    `;
    
    const result = await pool.query(query, [category]);
    return result.rows.map(row => toCamelCase(row));
  }

  static async findById(id: string): Promise<DietaryRequirement | null> {
    const query = 'SELECT * FROM dietary_requirements WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return toCamelCase(result.rows[0]);
  }

  static async search(searchTerm: string): Promise<DietaryRequirement[]> {
    const query = `
      SELECT * FROM dietary_requirements 
      WHERE is_active = true 
        AND (
          name ILIKE $1 
          OR description ILIKE $1
          OR $2 = ANY(common_ingredients)
        )
      ORDER BY 
        CASE 
          WHEN name ILIKE $1 THEN 1 
          ELSE 2 
        END,
        category, name
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const result = await pool.query(query, [searchPattern, searchTerm.toLowerCase()]);
    return result.rows.map(row => toCamelCase(row));
  }

  static async create(data: Partial<DietaryRequirement>): Promise<DietaryRequirement> {
    const fields = toSnakeCase(data);
    const columns = Object.keys(fields);
    const values = Object.values(fields);
    const placeholders = columns.map((_, index) => `$${index + 1}`);

    const query = `
      INSERT INTO dietary_requirements (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return toCamelCase(result.rows[0]);
  }

  static async update(id: string, data: Partial<DietaryRequirement>): Promise<DietaryRequirement | null> {
    const fields = toSnakeCase(data);
    delete fields.id;
    delete fields.created_at;
    
    const columns = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');

    const query = `
      UPDATE dietary_requirements 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, ...values]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return toCamelCase(result.rows[0]);
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'UPDATE dietary_requirements SET is_active = false WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }
}