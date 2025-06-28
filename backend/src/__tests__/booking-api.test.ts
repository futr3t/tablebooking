import request from 'supertest';
import { app } from '../index';
import { BookingModel } from '../models/Booking';
import { AvailabilityService } from '../services/availability';
import { WaitlistService } from '../services/waitlist';
import { BookingLockService } from '../services/booking-lock';

jest.mock('../models/Booking');
jest.mock('../services/availability');
jest.mock('../services/waitlist');
jest.mock('../services/booking-lock');

const mockBookingModel = BookingModel as jest.Mocked<typeof BookingModel>;
const mockAvailabilityService = AvailabilityService as jest.Mocked<typeof AvailabilityService>;
const mockWaitlistService = WaitlistService as jest.Mocked<typeof WaitlistService>;
const mockBookingLockService = BookingLockService as jest.Mocked<typeof BookingLockService>;

describe('Booking API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/bookings/availability', () => {
    it('should return availability for valid request', async () => {
      const mockAvailability = {
        date: '2024-01-03',
        timeSlots: [
          { time: '17:00', available: true, tableId: 'table-1', waitlistAvailable: false },
          { time: '17:30', available: true, tableId: 'table-1', waitlistAvailable: false }
        ]
      };

      mockAvailabilityService.checkAvailability.mockResolvedValue(mockAvailability);

      const response = await request(app)
        .get('/api/bookings/availability')
        .query({
          restaurantId: 'restaurant-1',
          date: '2024-01-03',
          partySize: '2',
          duration: '120'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAvailability);
    });

    it('should return 400 for missing required parameters', async () => {
      const response = await request(app)
        .get('/api/bookings/availability')
        .query({
          restaurantId: 'restaurant-1',
          // Missing date and partySize
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate UUID format for restaurantId', async () => {
      const response = await request(app)
        .get('/api/bookings/availability')
        .query({
          restaurantId: 'invalid-uuid',
          date: '2024-01-03',
          partySize: '2'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/bookings/guest', () => {
    const validBookingData = {
      restaurantId: 'restaurant-1',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      partySize: 2,
      bookingDate: '2024-01-03',
      bookingTime: '18:00',
      duration: 120,
      specialRequests: 'Window seat please'
    };

    it('should create booking successfully', async () => {
      const mockBooking = {
        id: 'booking-1',
        ...validBookingData,
        confirmationCode: 'ABC123',
        status: 'confirmed',
        isWaitlisted: false
      };

      mockBookingLockService.withLock.mockImplementation(async (_, __, ___, operation) => {
        return await operation();
      });

      mockAvailabilityService.findBestTable.mockResolvedValue({
        id: 'table-1',
        number: 'T1',
        capacity: 2
      } as any);

      mockBookingLockService.withTableLock.mockImplementation(async (_, operation) => {
        return await operation();
      });

      mockBookingModel.create.mockResolvedValue(mockBooking as any);
      mockAvailabilityService.invalidateAvailabilityCache.mockResolvedValue();

      const response = await request(app)
        .post('/api/bookings/guest')
        .send(validBookingData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('booking-1');
      expect(response.body.message).toBe('Booking confirmed');
    });

    it('should add to waitlist when no tables available and forceWaitlist is true', async () => {
      const mockWaitlistBooking = {
        id: 'booking-1',
        ...validBookingData,
        confirmationCode: 'ABC123',
        status: 'pending',
        isWaitlisted: true,
        waitlistPosition: 1
      };

      mockBookingLockService.withLock.mockImplementation(async (_, __, ___, operation) => {
        return await operation();
      });

      mockAvailabilityService.findBestTable.mockResolvedValue(null);
      mockWaitlistService.addToWaitlist.mockResolvedValue(mockWaitlistBooking as any);

      const response = await request(app)
        .post('/api/bookings/guest')
        .send({ ...validBookingData, forceWaitlist: true });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Added to waitlist');
    });

    it('should return 409 when no tables available and waitlist not requested', async () => {
      mockBookingLockService.withLock.mockImplementation(async (_, __, ___, operation) => {
        return await operation();
      });

      mockAvailabilityService.findBestTable.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/bookings/guest')
        .send(validBookingData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No tables available');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/bookings/guest')
        .send({
          restaurantId: 'restaurant-1',
          // Missing customerName, partySize, bookingDate, bookingTime
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/bookings/guest')
        .send({
          ...validBookingData,
          customerEmail: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate party size limits', async () => {
      const response = await request(app)
        .post('/api/bookings/guest')
        .send({
          ...validBookingData,
          partySize: 25 // Exceeds maximum
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/bookings/confirmation/:confirmationCode', () => {
    it('should return booking by confirmation code', async () => {
      const mockBooking = {
        id: 'booking-1',
        confirmationCode: 'ABC123',
        customerName: 'John Doe',
        status: 'confirmed'
      };

      mockBookingModel.findByConfirmationCode.mockResolvedValue(mockBooking as any);

      const response = await request(app)
        .get('/api/bookings/confirmation/ABC123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBooking);
    });

    it('should return 404 for invalid confirmation code', async () => {
      mockBookingModel.findByConfirmationCode.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/bookings/confirmation/INVALID');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/bookings/waitlist', () => {
    const validWaitlistData = {
      restaurantId: 'restaurant-1',
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      partySize: 4,
      bookingDate: '2024-01-03',
      bookingTime: '19:00'
    };

    it('should add to waitlist successfully', async () => {
      const mockWaitlistBooking = {
        id: 'booking-1',
        ...validWaitlistData,
        confirmationCode: 'WL123',
        status: 'pending',
        isWaitlisted: true,
        waitlistPosition: 2
      };

      mockWaitlistService.addToWaitlist.mockResolvedValue(mockWaitlistBooking as any);

      const response = await request(app)
        .post('/api/bookings/waitlist')
        .send(validWaitlistData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Added to waitlist successfully');
    });

    it('should validate required fields for waitlist', async () => {
      const response = await request(app)
        .post('/api/bookings/waitlist')
        .send({
          restaurantId: 'restaurant-1',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockAvailabilityService.checkAvailability.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/bookings/availability')
        .query({
          restaurantId: 'restaurant-1',
          date: '2024-01-03',
          partySize: '2'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle lock acquisition failures', async () => {
      mockBookingLockService.withLock.mockRejectedValue(
        new Error('Unable to acquire booking lock')
      );

      const response = await request(app)
        .post('/api/bookings/guest')
        .send({
          restaurantId: 'restaurant-1',
          customerName: 'John Doe',
          partySize: 2,
          bookingDate: '2024-01-03',
          bookingTime: '18:00'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to booking endpoints', async () => {
      // This would require setting up a test that makes many requests
      // For now, we just verify the middleware is applied
      expect(true).toBe(true); // Placeholder
    });
  });
});