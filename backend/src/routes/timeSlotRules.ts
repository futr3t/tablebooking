import { Router } from 'express';
import { TimeSlotRuleModel } from '../models/TimeSlotRule';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { UserRole, CreateTimeSlotRuleData, UpdateTimeSlotRuleData } from '../types';

const router = Router();

/**
 * Get all time slot rules for a restaurant
 * GET /api/restaurants/:restaurantId/time-slot-rules
 */
router.get('/:restaurantId/time-slot-rules', authenticateJWT, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    // Check if user has access to this restaurant
    if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== restaurantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
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
router.get('/:restaurantId/time-slot-rules/day/:dayOfWeek', authenticateJWT, async (req, res) => {
  try {
    const { restaurantId, dayOfWeek } = req.params;
    const day = parseInt(dayOfWeek);
    
    if (isNaN(day) || day < 0 || day > 6) {
      return res.status(400).json({
        success: false,
        error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)'
      });
    }
    
    // Check if user has access to this restaurant
    if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== restaurantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
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
router.get('/time-slot-rules/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const timeSlotRule = await TimeSlotRuleModel.findById(id);
    
    if (!timeSlotRule) {
      return res.status(404).json({
        success: false,
        error: 'Time slot rule not found'
      });
    }
    
    // Check if user has access to this restaurant
    if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== timeSlotRule.restaurantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
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
  authenticateJWT, 
  requireRole([UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER]), 
  async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const data: CreateTimeSlotRuleData = req.body;
      
      // Check if user has access to this restaurant
      if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== restaurantId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Validate required fields
      if (!data.name || !data.startTime || !data.endTime) {
        return res.status(400).json({
          success: false,
          error: 'Name, start time, and end time are required'
        });
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
        return res.status(400).json({
          success: false,
          error: 'Time must be in HH:MM format'
        });
      }

      // Validate that start time is before end time
      const [startHour, startMin] = data.startTime.split(':').map(Number);
      const [endHour, endMin] = data.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (startMinutes >= endMinutes) {
        return res.status(400).json({
          success: false,
          error: 'Start time must be before end time'
        });
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
          return res.status(400).json({
            success: false,
            error: `Time slot conflicts with existing rule: ${conflicts[0].name}`,
            conflicts: conflicts.map(c => ({ id: c.id, name: c.name, startTime: c.startTime, endTime: c.endTime }))
          });
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
  authenticateJWT, 
  requireRole([UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER]), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const data: UpdateTimeSlotRuleData = req.body;
      
      // First check if the rule exists and user has access
      const existingRule = await TimeSlotRuleModel.findById(id);
      if (!existingRule) {
        return res.status(404).json({
          success: false,
          error: 'Time slot rule not found'
        });
      }
      
      if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== existingRule.restaurantId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Validate time format if provided
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (data.startTime && !timeRegex.test(data.startTime)) {
        return res.status(400).json({
          success: false,
          error: 'Start time must be in HH:MM format'
        });
      }
      if (data.endTime && !timeRegex.test(data.endTime)) {
        return res.status(400).json({
          success: false,
          error: 'End time must be in HH:MM format'
        });
      }

      // Validate that start time is before end time
      const startTime = data.startTime || existingRule.startTime;
      const endTime = data.endTime || existingRule.endTime;
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (startMinutes >= endMinutes) {
        return res.status(400).json({
          success: false,
          error: 'Start time must be before end time'
        });
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
          return res.status(400).json({
            success: false,
            error: `Time slot conflicts with existing rule: ${conflicts[0].name}`,
            conflicts: conflicts.map(c => ({ id: c.id, name: c.name, startTime: c.startTime, endTime: c.endTime }))
          });
        }
      }

      const timeSlotRule = await TimeSlotRuleModel.update(id, data);
      
      if (!timeSlotRule) {
        return res.status(404).json({
          success: false,
          error: 'Time slot rule not found'
        });
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
  authenticateJWT, 
  requireRole([UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER]), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // First check if the rule exists and user has access
      const existingRule = await TimeSlotRuleModel.findById(id);
      if (!existingRule) {
        return res.status(404).json({
          success: false,
          error: 'Time slot rule not found'
        });
      }
      
      if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId !== existingRule.restaurantId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const deleted = await TimeSlotRuleModel.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Time slot rule not found'
        });
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