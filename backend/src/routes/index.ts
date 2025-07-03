import { Router } from 'express';
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

const router = Router();

router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/bookings/staff', staffBookingRoutes);
router.use('/tables', tableRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/public', publicRoutes);
router.use('/widget', widgetRoutes);
router.use('/widget/public', publicWidgetRoutes); // Public widget API routes
router.use('/', widgetEmbeddedRoutes); // Root level widget routes
router.use('/diagnostic', diagnosticRoutes);
router.use('/dietary-requirements', dietaryRequirementsRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

export default router;