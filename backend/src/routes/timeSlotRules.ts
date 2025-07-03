import { Router, Response } from 'express';
import { TimeSlotRuleModel } from '../models/TimeSlotRule';
import { authenticate } from '../middleware/auth';
import { UserRole, CreateTimeSlotRuleData, UpdateTimeSlotRuleData, AuthRequest } from '../types';

const router = Router();

/**
 * Get all time slot rules for a restaurant
 * GET /api/restaurants/:restaurantId/time-slot-rules
 */
router.get('/:restaurantId/time-slot-rules', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    
    // Check if user has access to this restaurant
    if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== restaurantId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    const timeSlotRules = await TimeSlotRuleModel.findByRestaurantId(restaurantId);
    
    res.json({
      success: true,
      data: timeSlotRules
    });
  } catch (error) {
    console.error('Error fetching time slot rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time slot rules'
    });
  }
});

/**
 * Get time slot rules for a specific day
 * GET /api/restaurants/:restaurantId/time-slot-rules/day/:dayOfWeek
 */
router.get('/:restaurantId/time-slot-rules/day/:dayOfWeek', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, dayOfWeek } = req.params;
    const day = parseInt(dayOfWeek);
    
    if (isNaN(day) || day < 0 || day > 6) {
      res.status(400).json({
        success: false,
        error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)'
      });
      return;
    }
    
    // Check if user has access to this restaurant
    if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== restaurantId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    const timeSlotRules = await TimeSlotRuleModel.findByRestaurantAndDay(restaurantId, day);
    
    res.json({
      success: true,
      data: timeSlotRules
    });
  } catch (error) {
    console.error('Error fetching time slot rules for day:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time slot rules'
    });
  }
});

/**
 * Get a single time slot rule
 * GET /api/time-slot-rules/:id
 */
router.get('/time-slot-rules/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const timeSlotRule = await TimeSlotRuleModel.findById(id);
    
    if (!timeSlotRule) {
      res.status(404).json({
        success: false,
        error: 'Time slot rule not found'
      });
      return;
    }
    
    // Check if user has access to this restaurant
    if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== timeSlotRule.restaurantId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    res.json({
      success: true,
      data: timeSlotRule
    });
  } catch (error) {
    console.error('Error fetching time slot rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time slot rule'
    });
  }
});

/**
 * Create a new time slot rule
 * POST /api/restaurants/:restaurantId/time-slot-rules
 */
router.post('/:restaurantId/time-slot-rules', 
  authenticate, 
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { restaurantId } = req.params;
      const data: CreateTimeSlotRuleData = req.body;
      
      // Check if user has access to this restaurant
      if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== restaurantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Only allow owners, managers and super admins to create rules
      if (![UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER].includes(req.user?.role!)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      // Validate required fields
      if (!data.name || !data.startTime || !data.endTime) {
        res.status(400).json({
          success: false,
          error: 'Name, start time, and end time are required'
        });
        return;
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
        res.status(400).json({
          success: false,
          error: 'Time must be in HH:MM format'
        });
        return;
      }

      // Validate that start time is before end time
      const [startHour, startMin] = data.startTime.split(':').map(Number);
      const [endHour, endMin] = data.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (startMinutes >= endMinutes) {
        res.status(400).json({
          success: false,
          error: 'Start time must be before end time'
        });
        return;
      }

      // Check for time conflicts
      if (data.dayOfWeek !== undefined) {
        const conflicts = await TimeSlotRuleModel.checkTimeConflicts(
          restaurantId, 
          data.dayOfWeek, 
          data.startTime, 
          data.endTime
        );
        
        if (conflicts.length > 0) {
          res.status(400).json({
            success: false,
            error: `Time slot conflicts with existing rule: ${conflicts[0].name}`,
            conflicts: conflicts.map(c => ({ id: c.id, name: c.name, startTime: c.startTime, endTime: c.endTime }))
          });
          return;
        }
      }

      const timeSlotRule = await TimeSlotRuleModel.create(restaurantId, data);
      
      res.status(201).json({
        success: true,
        data: timeSlotRule,
        message: 'Time slot rule created successfully'
      });
    } catch (error) {
      console.error('Error creating time slot rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create time slot rule'
      });
    }
  }
);

/**
 * Update a time slot rule
 * PUT /api/time-slot-rules/:id
 */
router.put('/time-slot-rules/:id', 
  authenticate, 
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateTimeSlotRuleData = req.body;
      
      // First check if the rule exists and user has access
      const existingRule = await TimeSlotRuleModel.findById(id);
      if (!existingRule) {
        res.status(404).json({
          success: false,
          error: 'Time slot rule not found'
        });
        return;
      }
      
      if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== existingRule.restaurantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Only allow owners, managers and super admins to update rules
      if (![UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER].includes(req.user?.role!)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      // Validate time format if provided
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (data.startTime && !timeRegex.test(data.startTime)) {
        res.status(400).json({
          success: false,
          error: 'Start time must be in HH:MM format'
        });
        return;
      }
      if (data.endTime && !timeRegex.test(data.endTime)) {
        res.status(400).json({
          success: false,
          error: 'End time must be in HH:MM format'
        });
        return;
      }

      // Validate that start time is before end time
      const startTime = data.startTime || existingRule.startTime;
      const endTime = data.endTime || existingRule.endTime;
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (startMinutes >= endMinutes) {
        res.status(400).json({
          success: false,
          error: 'Start time must be before end time'
        });
        return;
      }

      // Check for time conflicts if time or day is being changed
      if (data.startTime || data.endTime || data.dayOfWeek !== undefined) {
        const dayOfWeek = data.dayOfWeek !== undefined ? data.dayOfWeek : existingRule.dayOfWeek;
        const conflicts = await TimeSlotRuleModel.checkTimeConflicts(
          existingRule.restaurantId, 
          dayOfWeek, 
          startTime, 
          endTime,
          id // Exclude current rule from conflict check
        );
        
        if (conflicts.length > 0) {
          res.status(400).json({
            success: false,
            error: `Time slot conflicts with existing rule: ${conflicts[0].name}`,
            conflicts: conflicts.map(c => ({ id: c.id, name: c.name, startTime: c.startTime, endTime: c.endTime }))
          });
          return;
        }
      }

      const timeSlotRule = await TimeSlotRuleModel.update(id, data);
      
      if (!timeSlotRule) {
        res.status(404).json({
          success: false,
          error: 'Time slot rule not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: timeSlotRule,
        message: 'Time slot rule updated successfully'
      });
    } catch (error) {
      console.error('Error updating time slot rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update time slot rule'
      });
    }
  }
);

/**
 * Delete a time slot rule
 * DELETE /api/time-slot-rules/:id
 */
router.delete('/time-slot-rules/:id', 
  authenticate, 
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // First check if the rule exists and user has access
      const existingRule = await TimeSlotRuleModel.findById(id);
      if (!existingRule) {
        res.status(404).json({
          success: false,
          error: 'Time slot rule not found'
        });
        return;
      }
      
      if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== existingRule.restaurantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Only allow owners, managers and super admins to delete rules
      if (![UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER].includes(req.user?.role!)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      const deleted = await TimeSlotRuleModel.delete(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Time slot rule not found'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Time slot rule deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting time slot rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete time slot rule'
      });
    }
  }
);

export default router;