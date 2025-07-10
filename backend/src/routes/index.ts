import { Router } from 'express';
import { db } from '../config/database';
import authRoutes from './auth';
import bookingRoutes from './booking';
import tableRoutes from './table';
import restaurantRoutes from './restaurant';
import publicRoutes from './public';
import widgetRoutes from './widget';
import publicWidgetRoutes from './publicWidget';
import widgetEmbeddedRoutes from './widget-embedded';
import diagnosticRoutes from './diagnostic';
import staffBookingRoutes from './staffBooking';
import dietaryRequirementsRoutes from './dietaryRequirements';
import debugRoutes from './debug';
import turnTimeRulesRoutes from './turnTimeRules';
import userRoutes from './user';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bookings/staff', staffBookingRoutes);  // Must come before general bookings route
router.use('/bookings', bookingRoutes);
router.use('/tables', tableRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/users', userRoutes); // User management routes
router.use('/public', publicRoutes);
router.use('/widget', widgetRoutes);
router.use('/widget/public', publicWidgetRoutes); // Public widget API routes
router.use('/', widgetEmbeddedRoutes); // Root level widget routes
router.use('/diagnostic', diagnosticRoutes);
router.use('/dietary-requirements', dietaryRequirementsRoutes);
router.use('/debug', debugRoutes);
router.use('/turn-time-rules', turnTimeRulesRoutes);

router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: false,
        schema: {
          valid: false,
          missingColumns: [] as string[]
        }
      }
    };

    // Test database connection
    await db.query('SELECT NOW()');
    health.database.connected = true;

    // Check for required columns in restaurants table
    const requiredColumns = ['max_covers', 'stagger_minutes', 'default_slot_duration'];
    const columnCheck = await db.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name = ANY($1)
    `, [requiredColumns]);

    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    health.database.schema.missingColumns = missingColumns;
    health.database.schema.valid = missingColumns.length === 0;
    
    // Overall health status
    if (!health.database.connected || !health.database.schema.valid) {
      health.status = 'degraded';
    }

    res.json({
      success: true,
      data: health
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        error: error.message,
        database: {
          connected: false,
          schema: {
            valid: false,
            missingColumns: []
          }
        }
      }
    });
  }
});

export default router;