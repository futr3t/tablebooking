import { Router, Request, Response } from 'express';
import { db } from '../config/database';

const router = Router();

// Diagnostic endpoint to check widget configs
router.get('/widget-configs', async (req: Request, res: Response) => {
  try {
    const configs = await db.query(`
      SELECT 
        wc.id,
        wc.api_key,
        wc.is_enabled,
        r.name as restaurant_name,
        r.is_active as restaurant_active
      FROM widget_configs wc
      LEFT JOIN restaurants r ON r.id = wc.restaurant_id
      ORDER BY wc.created_at DESC
    `);
    
    res.json({
      success: true,
      count: configs.rowCount,
      configs: configs.rows.map(config => ({
        id: config.id,
        restaurantName: config.restaurant_name,
        apiKey: config.api_key,
        isEnabled: config.is_enabled,
        restaurantActive: config.restaurant_active
      }))
    });
  } catch (error) {
    console.error('Error in diagnostic endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fix widget config endpoint
router.post('/fix-widget-config', async (req: Request, res: Response): Promise<void> => {
  try {
    const targetApiKey = 'B946B3EC9EDBB544FD29A3AAD280E78F218E20853D5C341EFC90C0AB1358B392';
    
    // Get Sample Restaurant
    const restaurantResult = await db.query(
      "SELECT id, name FROM restaurants WHERE name = 'Sample Restaurant' LIMIT 1"
    );
    
    if (restaurantResult.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Sample Restaurant not found'
      });
      return;
    }
    
    const restaurant = restaurantResult.rows[0];
    
    // Check if config already exists
    const existingConfig = await db.query(
      'SELECT id FROM widget_configs WHERE restaurant_id = $1',
      [restaurant.id]
    );
    
    let result;
    
    if (existingConfig.rowCount > 0) {
      // Update existing
      result = await db.query(`
        UPDATE widget_configs 
        SET api_key = $1, is_enabled = true, updated_at = CURRENT_TIMESTAMP
        WHERE restaurant_id = $2
        RETURNING *
      `, [targetApiKey, restaurant.id]);
    } else {
      // Create new
      result = await db.query(`
        INSERT INTO widget_configs (
          restaurant_id, 
          api_key, 
          is_enabled, 
          theme, 
          settings
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        restaurant.id,
        targetApiKey,
        true,
        JSON.stringify({
          primaryColor: "#2E8B57",
          secondaryColor: "#F5F5DC",
          fontFamily: "Georgia, serif",
          borderRadius: "8px"
        }),
        JSON.stringify({
          showAvailableSlots: true,
          maxPartySize: 8,
          advanceBookingDays: 30,
          requirePhone: true,
          requireEmail: true,
          showSpecialRequests: true,
          confirmationMessage: "Thank you for booking with Sample Restaurant!"
        })
      ]);
    }
    
    res.json({
      success: true,
      message: existingConfig.rowCount > 0 ? 'Widget config updated' : 'Widget config created',
      config: {
        id: result.rows[0].id,
        apiKey: result.rows[0].api_key,
        restaurantName: restaurant.name
      }
    });
  } catch (error) {
    console.error('Error fixing widget config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;