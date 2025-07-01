import { Router } from 'express';
import authRoutes from './auth';
import bookingRoutes from './booking';
import publicRoutes from './public';
import widgetRoutes from './widget';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/public', publicRoutes);
router.use('/widget', widgetRoutes);

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