import { EnhancedAvailabilityService as AvailabilityService } from '../services/enhanced-availability';
import { RestaurantModel } from '../models/Restaurant';
import { TableModel } from '../models/Table';
import { BookingModel } from '../models/Booking';

// Mock dependencies
jest.mock('../models/Restaurant');
jest.mock('../models/Table');
jest.mock('../models/Booking');
jest.mock('../config/database');

const mockRestaurantModel = RestaurantModel as jest.Mocked<typeof RestaurantModel>;
const mockTableModel = TableModel as jest.Mocked<typeof TableModel>;
const mockBookingModel = BookingModel as jest.Mocked<typeof BookingModel>;

describe('AvailabilityService', () => {
  const mockRestaurant = {
    id: 'restaurant-1',
    name: 'Test Restaurant',
    openingHours: {
      monday: { isOpen: false },
      tuesday: { isOpen: false },
      wednesday: { isOpen: true, openTime: '17:00', closeTime: '21:00' },
      thursday: { isOpen: true, openTime: '17:00', closeTime: '21:00' },
      friday: { isOpen: true, openTime: '17:00', closeTime: '21:00' },
      saturday: { isOpen: true, openTime: '17:00', closeTime: '21:00' },
      sunday: { isOpen: true, openTime: '12:00', closeTime: '14:00' }
    },
    bookingSettings: {
      maxAdvanceBookingDays: 270,
      minAdvanceBookingHours: 2,
      slotDuration: 30,
      bufferTime: 15,
      enableWaitlist: true
    }
  };

  const mockTables = [
    {
      id: 'table-1',
      number: 'T1',
      capacity: 2,
      minCapacity: 2,
      maxCapacity: 4,
      restaurantId: 'restaurant-1',
      position: { x: 0, y: 0, width: 80, height: 80 },
      tableType: 'standard' as any,
      isCombinable: true,
      priority: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'table-2',
      number: 'T2',
      capacity: 4,
      minCapacity: 2,
      maxCapacity: 6,
      restaurantId: 'restaurant-1',
      position: { x: 100, y: 0, width: 80, height: 80 },
      tableType: 'standard' as any,
      isCombinable: true,
      priority: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'table-3',
      number: 'T3',
      capacity: 6,
      minCapacity: 4,
      maxCapacity: 8,
      restaurantId: 'restaurant-1',
      position: { x: 200, y: 0, width: 80, height: 80 },
      tableType: 'standard' as any,
      isCombinable: true,
      priority: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockRestaurantModel.findById.mockResolvedValue(mockRestaurant as any);
    mockTableModel.findAvailableTablesForPartySize.mockResolvedValue(mockTables as any);
    mockTableModel.findTableCombinationsForPartySize.mockResolvedValue([]);
    mockBookingModel.findByDateRange.mockResolvedValue([]);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
  });

  describe('checkAvailability', () => {
    it('should return empty slots for closed days', async () => {
      const result = await AvailabilityService.checkAvailability(
        'restaurant-1',
        '2024-01-01', // Monday (closed)
        2,
        120
      );

      expect(result).toEqual({
        date: '2024-01-01',
        timeSlots: []
      });
    });

    it('should generate time slots for open days', async () => {
      const result = await AvailabilityService.checkAvailability(
        'restaurant-1',
        '2024-01-03', // Wednesday (17:00-21:00)
        2,
        120
      );

      expect(result.date).toBe('2024-01-03');
      expect(result.timeSlots.length).toBeGreaterThan(0);
      
      // Should have slots from 17:00 to 19:00 (last slot that fits 2-hour booking)
      const firstSlot = result.timeSlots[0];
      const lastSlot = result.timeSlots[result.timeSlots.length - 1];
      
      expect(firstSlot.time).toBe('17:00');
      expect(lastSlot.time).toBe('19:00');
    });

    it('should respect slot duration settings', async () => {
      const result = await AvailabilityService.checkAvailability(
        'restaurant-1',
        '2024-01-03',
        2,
        120
      );

      // With 30-minute slots from 17:00 to 19:00, should have 5 slots
      // 17:00, 17:30, 18:00, 18:30, 19:00
      expect(result.timeSlots).toHaveLength(5);
      
      const times = result.timeSlots.map(slot => slot.time);
      expect(times).toEqual(['17:00', '17:30', '18:00', '18:30', '19:00']);
    });

    it('should mark slots as available when no conflicting bookings', async () => {
      const result = await AvailabilityService.checkAvailability(
        'restaurant-1',
        '2024-01-03',
        2,
        120
      );

      result.timeSlots.forEach(slot => {
        expect(slot.available).toBe(true);
        expect(slot.tableId).toBeDefined();
        expect(slot.waitlistAvailable).toBe(false);
      });
    });

    it('should mark slots as unavailable when tables are booked', async () => {
      const existingBookings = [
        {
          id: 'booking-1',
          tableId: 'table-1',
          bookingTime: '18:00',
          duration: 120,
          status: 'confirmed',
          restaurantId: 'restaurant-1',
          bookingDate: '2024-01-03'
        }
      ];

      mockBookingModel.findByDateRange.mockResolvedValue(existingBookings as any);

      const result = await AvailabilityService.checkAvailability(
        'restaurant-1',
        '2024-01-03',
        2,
        120
      );

      // Slots that overlap with 18:00-20:00 booking should check other tables
      const slot18 = result.timeSlots.find(s => s.time === '18:00');
      const slot1830 = result.timeSlots.find(s => s.time === '18:30');
      
      // Should still be available using other tables
      expect(slot18?.available).toBe(true);
      expect(slot1830?.available).toBe(true);
    });

    it('should handle buffer time correctly', async () => {
      const existingBookings = [
        {
          id: 'booking-1',
          tableId: 'table-1',
          bookingTime: '18:00',
          duration: 120,
          status: 'confirmed',
          restaurantId: 'restaurant-1',
          bookingDate: '2024-01-03'
        }
      ];

      mockBookingModel.findByDateRange.mockResolvedValue(existingBookings as any);
      
      // Mock only table-1 available for party size
      mockTableModel.findAvailableTablesForPartySize.mockResolvedValue([mockTables[0]] as any);

      const result = await AvailabilityService.checkAvailability(
        'restaurant-1',
        '2024-01-03',
        2,
        120
      );

      // With 15-minute buffer, booking at 18:00-20:00 should block:
      // 17:45-20:15, so slots at 17:30 and earlier should be available
      const slot1730 = result.timeSlots.find(s => s.time === '17:30');
      const slot18 = result.timeSlots.find(s => s.time === '18:00');
      
      expect(slot1730?.available).toBe(false); // Would end at 19:30, conflicts with buffered booking
      expect(slot18?.available).toBe(false); // Direct conflict
    });

    it('should throw error for past dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastDate = yesterday.toISOString().split('T')[0];

      await expect(
        AvailabilityService.checkAvailability('restaurant-1', pastDate, 2, 120)
      ).rejects.toThrow('Cannot book for past dates');
    });

    it('should throw error for dates too far in advance', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 300); // More than 270 days
      const futureDateStr = futureDate.toISOString().split('T')[0];

      await expect(
        AvailabilityService.checkAvailability('restaurant-1', futureDateStr, 2, 120)
      ).rejects.toThrow('Cannot book more than 270 days in advance');
    });

    it('should throw error for bookings too soon', async () => {
      const soonDate = new Date();
      soonDate.setHours(soonDate.getHours() + 1); // Only 1 hour in advance
      const soonDateStr = soonDate.toISOString().split('T')[0];

      await expect(
        AvailabilityService.checkAvailability('restaurant-1', soonDateStr, 2, 120)
      ).rejects.toThrow('Must book at least 2 hours in advance');
    });
  });

  describe('findBestTable', () => {
    it('should return smallest available table that fits party size', async () => {
      const result = await AvailabilityService.findBestTable(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        2,
        120
      );

      expect(result).toEqual(mockTables[0]); // Smallest table (capacity 2)
    });

    it('should return null when no tables available', async () => {
      mockTableModel.findAvailableTablesForPartySize.mockResolvedValue([]);

      const result = await AvailabilityService.findBestTable(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        2,
        120
      );

      expect(result).toBeNull();
    });

    it('should consider existing bookings when finding best table', async () => {
      const existingBookings = [
        {
          id: 'booking-1',
          tableId: 'table-1',
          bookingTime: '18:00',
          duration: 120,
          status: 'confirmed',
          restaurantId: 'restaurant-1',
          bookingDate: '2024-01-03'
        }
      ];

      mockBookingModel.findByDateRange.mockResolvedValue(existingBookings as any);

      const result = await AvailabilityService.findBestTable(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        2,
        120
      );

      // Should return table-2 since table-1 is booked
      expect(result).toEqual(mockTables[1]);
    });
  });

  describe('invalidateAvailabilityCache', () => {
    it('should delete all cache keys for restaurant and date', async () => {
      const mockKeys = [
        'availability:restaurant-1:2024-01-03:17:00:2',
        'availability:restaurant-1:2024-01-03:17:30:2',
        'availability:restaurant-1:2024-01-03:18:00:2'
      ];

      mockRedis.keys.mockResolvedValue(mockKeys);
      mockRedis.del.mockResolvedValue(3);

      await AvailabilityService.invalidateAvailabilityCache('restaurant-1', '2024-01-03');

      expect(mockRedis.keys).toHaveBeenCalledWith('availability:restaurant-1:2024-01-03:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...mockKeys);
    });

    it('should handle empty cache gracefully', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await AvailabilityService.invalidateAvailabilityCache('restaurant-1', '2024-01-03');

      expect(mockRedis.keys).toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle large party sizes requiring table combinations', async () => {
      mockTableModel.findAvailableTablesForPartySize.mockResolvedValue([]);
      mockTableModel.findTableCombinationsForPartySize.mockResolvedValue([
        [mockTables[0], mockTables[1]] // Combination for large party
      ]);

      const result = await AvailabilityService.checkAvailability(
        'restaurant-1',
        '2024-01-03',
        8, // Large party size
        120
      );

      expect(result.timeSlots.length).toBeGreaterThan(0);
      result.timeSlots.forEach(slot => {
        expect(slot.available).toBe(true);
      });
    });

    it('should handle Sunday brunch hours correctly', async () => {
      const result = await AvailabilityService.checkAvailability(
        'restaurant-1',
        '2024-01-07', // Sunday (12:00-14:00)
        2,
        120
      );

      expect(result.timeSlots).toHaveLength(1); // Only 12:00 slot fits 2-hour booking
      expect(result.timeSlots[0].time).toBe('12:00');
    });

    it('should handle short bookings correctly', async () => {
      const result = await AvailabilityService.checkAvailability(
        'restaurant-1',
        '2024-01-03',
        2,
        60 // 1-hour booking
      );

      // More slots should be available with shorter duration
      expect(result.timeSlots.length).toBeGreaterThan(5);
      
      const lastSlot = result.timeSlots[result.timeSlots.length - 1];
      expect(lastSlot.time).toBe('20:00'); // Can book until 20:00 for 1-hour slot
    });
  });
});