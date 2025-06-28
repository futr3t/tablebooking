import { Router } from 'express';
import authRoutes from './auth';
import bookingRoutes from './booking';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);

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