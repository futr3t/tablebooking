import { Router, Request, Response } from 'express';
import { db } from '../config/database';

const router = Router();

/**
 * Comprehensive diagnostic endpoint to debug login issues
 * GET /api/diagnostic/debug-login
 */
router.get('/debug-login', async (req: Request, res: Response) => {
  const diagnostics: any = {
    server: {
      status: 'running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'not set',
      port: process.env.PORT || 'not set'
    },
    criticalEnvironment: {
      JWT_SECRET_SET: !!process.env.JWT_SECRET,
      JWT_SECRET_LENGTH: process.env.JWT_SECRET?.length || 0,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'not set (defaults to http://localhost:3000)',
      CORS_ORIGINS_ARRAY: process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || ['http://localhost:3000']
    },
    request: {
      origin: req.headers.origin || 'no origin header',
      referer: req.headers.referer || 'no referer header',
      host: req.headers.host || 'no host header'
    },
    database: {
      connected: false,
      error: null
    },
    issues: []
  };

  // Check critical environment variables
  if (!process.env.JWT_SECRET) {
    diagnostics.issues.push({
      severity: 'CRITICAL',
      issue: 'JWT_SECRET is not set',
      solution: 'Set JWT_SECRET environment variable in Railway backend service'
    });
  }

  if (!process.env.DATABASE_URL) {
    diagnostics.issues.push({
      severity: 'CRITICAL', 
      issue: 'DATABASE_URL is not set',
      solution: 'Ensure PostgreSQL database is linked to backend service in Railway'
    });
  }

  // Check CORS configuration
  const requestOrigin = req.headers.origin;
  if (requestOrigin) {
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:3000'];
    
    if (!allowedOrigins.includes(requestOrigin)) {
      diagnostics.issues.push({
        severity: 'CRITICAL',
        issue: `CORS mismatch: Frontend origin '${requestOrigin}' not in allowed origins`,
        solution: `Set CORS_ORIGIN=${requestOrigin} in Railway backend environment variables`,
        currentAllowedOrigins: allowedOrigins
      });
    }
  }

  // Test database connection
  try {
    const result = await db.query('SELECT NOW() as time, COUNT(*) as user_count FROM users');
    diagnostics.database.connected = true;
    diagnostics.database.time = result.rows[0].time;
    diagnostics.database.userCount = result.rows[0].user_count;
    
    // Check admin user
    const adminCheck = await db.query("SELECT id, email, first_name, last_name FROM users WHERE email = 'admin@restaurant.com'");
    diagnostics.database.adminUserExists = adminCheck.rows.length > 0;
    if (adminCheck.rows.length > 0) {
      diagnostics.database.adminUser = {
        id: adminCheck.rows[0].id,
        email: adminCheck.rows[0].email,
        name: `${adminCheck.rows[0].first_name} ${adminCheck.rows[0].last_name}`
      };
    } else {
      diagnostics.issues.push({
        severity: 'WARNING',
        issue: 'Admin user (admin@restaurant.com) not found',
        solution: 'Run the setup-admin-fixed.sh script to create admin user'
      });
    }
  } catch (error: any) {
    diagnostics.database.connected = false;
    diagnostics.database.error = error.message;
    diagnostics.issues.push({
      severity: 'CRITICAL',
      issue: 'Database connection failed',
      solution: 'Check DATABASE_URL and ensure PostgreSQL is running',
      error: error.message
    });
  }

  // Add recommended Railway environment variables
  diagnostics.recommendedEnvVars = {
    backend: {
      'DATABASE_URL': '(automatically set by Railway PostgreSQL)',
      'REDIS_URL': '(optional - automatically set if Redis added)',
      'JWT_SECRET': 'your-super-secret-jwt-key-change-this',
      'JWT_EXPIRES_IN': '24h',
      'CORS_ORIGIN': 'https://your-frontend-service.railway.app',
      'NODE_ENV': 'production'
    },
    frontend: {
      'REACT_APP_API_URL': 'https://your-backend-service.railway.app/api',
      'REACT_APP_SOCKET_URL': 'https://your-backend-service.railway.app'
    }
  };

  res.json({
    success: diagnostics.issues.filter(i => i.severity === 'CRITICAL').length === 0,
    data: diagnostics,
    summary: `${diagnostics.issues.length} issues found (${diagnostics.issues.filter(i => i.severity === 'CRITICAL').length} critical)`
  });
});

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