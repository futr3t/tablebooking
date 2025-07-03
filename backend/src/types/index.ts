import { Request as ExpressRequest } from 'express';

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  restaurantId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  HOST = 'host',
  SERVER = 'server',
  CUSTOMER = 'customer'
}

export interface Restaurant {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  cuisine: string;
  description?: string;
  maxCovers?: number; // NULL = unlimited, replaces old capacity limit
  timeZone: string;
  turnTimeMinutes: number; // Default time each booking lasts (includes cleanup time)
  // Removed staggerMinutes - no longer using buffer/stagger system
  defaultSlotDuration: number; // Default time slot duration
  openingHours: OpeningHours;
  bookingSettings: BookingSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpeningHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  periods?: ServicePeriod[];  // NEW: Multiple service periods per day
  // Backward compatibility - will be auto-migrated to periods format
  openTime?: string;
  closeTime?: string;
}

export interface ServicePeriod {
  name: string;                    // e.g., "Lunch", "Dinner", "Brunch", "Happy Hour"
  startTime: string;               // "HH:MM" format
  endTime: string;                 // "HH:MM" format  
  slotDurationMinutes?: number;    // Override restaurant's default slot duration
}

export interface BookingSettings {
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
  maxPartySize: number;
  slotDuration: number; // in minutes
  // Removed bufferTime - now included in booking duration
  maxConcurrentTables?: number; // Max tables that can start at same time (guest bookings only)
  maxConcurrentCovers?: number; // Max people that can start at same time (guest bookings only)
  enableWaitlist: boolean;
  requirePhone: boolean;
  requireEmail: boolean;
  autoConfirm: boolean;
  sendConfirmationEmail: boolean;
  sendConfirmationSMS: boolean;
  sendReminderEmail: boolean;
  sendReminderSMS: boolean;
  reminderHours: number;
}

export interface Table {
  id: string;
  restaurantId: string;
  number: string;
  capacity: number;
  minCapacity: number;
  maxCapacity: number;
  shape: TableShape;
  position: TablePosition;
  tableType: TableType;
  notes?: string;
  isAccessible: boolean;
  locationNotes?: string;
  isCombinable: boolean;
  priority: number; // Higher priority tables preferred for booking
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum TableShape {
  SQUARE = 'square',
  ROUND = 'round',
  RECTANGLE = 'rectangle'
}

export enum TableType {
  STANDARD = 'standard',
  BOOTH = 'booth',
  BAR = 'bar',
  HIGH_TOP = 'high_top',
  PATIO = 'patio',
  PRIVATE = 'private',
  BANQUETTE = 'banquette',
  COMMUNAL = 'communal'
}

export interface TablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}


export interface TableCombination {
  id: string;
  restaurantId: string;
  name: string; // e.g., "Tables 5+6", "Private Dining Area"
  tableIds: string[]; // Array of table IDs that can be combined
  minCapacity: number;
  maxCapacity: number;
  requiresApproval: boolean; // Staff must approve large party bookings
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkTableOperation {
  operation: 'create' | 'update' | 'delete';
  tables: Partial<Table>[];
}

export interface TableSummary {
  totalTables: number;
  totalCapacity: number;
  averageCapacity: number;
  tablesByType: Record<TableType, number>;
  accessibleTables: number;
  combinableTables: number;
}

export interface Booking {
  id: string;
  restaurantId: string;
  tableId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  partySize: number;
  bookingDate: Date;
  bookingTime: string;
  duration: number;
  status: BookingStatus;
  notes?: string;
  specialRequests?: string;
  noShowCount: number;
  isWaitlisted: boolean;
  waitlistPosition?: number;
  confirmationCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SEATED = 'seated',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export interface AuthRequest extends ExpressRequest {
  user?: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  restaurantId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BookingAvailability {
  date: string;
  timeSlots: TimeSlot[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
  tableId?: string;
  waitlistAvailable: boolean;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  confirmation: boolean;
  reminder: boolean;
  cancellation: boolean;
}

export interface ReportData {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  noShows: number;
  revenue: number;
  averagePartySize: number;
  occupancyRate: number;
  popularTimeSlots: Array<{
    time: string;
    count: number;
  }>;
}

