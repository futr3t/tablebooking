import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Note: Widget.js and demo page are served from widget-embedded.ts routes

// Widget configuration API endpoints (simplified for now)
router.get('/config', async (req: any, res: any) => {
  try {
    // Return a default widget configuration for now
    const defaultConfig = {
      id: 'widget-1',
      restaurantId: req.user?.restaurantId || 'demo-restaurant',
      apiKey: 'B946B3EC9EDBB544FD29A3AAD280E78F218E20853D5C341EFC90C0AB1358B392',
      isEnabled: true,
      theme: {
        primaryColor: '#1976d2',
        secondaryColor: '#f5f5f5',
        fontFamily: 'Roboto, sans-serif',
        borderRadius: '4px'
      },
      settings: {
        showAvailableSlots: true,
        maxPartySize: 8,
        advanceBookingDays: 30,
        requirePhone: true,
        requireEmail: false,
        showSpecialRequests: true,
        confirmationMessage: 'Thank you for your reservation!'
      }
    };
    
    res.json({ success: true, data: defaultConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;