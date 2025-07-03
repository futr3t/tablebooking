export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'owner' | 'manager' | 'host' | 'server' | 'customer';
  restaurantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface Booking {
  id: string;
  restaurantId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  partySize: number;
  bookingTime: string;
  tableId?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  specialRequests?: string;
  confirmationCode?: string;
  createdAt: string;
  updatedAt: string;
  tables?: Table[];
}

export interface Table {
  id: string;
  restaurantId: string;
  number: string;
  capacity: number;
  minCapacity: number;
  maxCapacity: number;
  shape: 'square' | 'round' | 'rectangle';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  tableType: 'standard' | 'booth' | 'bar' | 'high_top' | 'patio' | 'private' | 'banquette' | 'communal';
  notes?: string;
  isAccessible: boolean;
  locationNotes?: string;
  isCombinable: boolean;
  priority: number;
  status?: 'available' | 'occupied' | 'reserved' | 'maintenance'; // Runtime status, not stored
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  openingHours: {
    [key: string]: {
      open: string;
      close: string;
    }[];
  };
  settings: {
    bookingAdvanceDays: number;
    bookingAdvanceHours: number;
    timeSlotDuration: number;
    tableTurnTime: number;
    bufferTime: number;
    allowWaitlist: boolean;
  };
}

export interface TimeSlot {
  time: string;
  available: boolean;
  tables: number[];
}

export interface WidgetConfig {
  id: string;
  restaurantId: string;
  apiKey: string;
  isEnabled: boolean;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    borderRadius: string;
  };
  settings: {
    showAvailableSlots: boolean;
    maxPartySize: number;
    advanceBookingDays: number;
    requirePhone: boolean;
    requireEmail: boolean;
    showSpecialRequests: boolean;
    confirmationMessage: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface InstallationInstructions {
  htmlCode: string;
  apiKey: string;
  widgetUrl: string;
  isEnabled: boolean;
  steps: string[];
  notes: string[];
}

export interface TimeSlotRule {
  id: string;
  restaurantId: string;
  name: string;
  dayOfWeek?: number; // 0=Sunday, 1=Monday, etc. NULL = applies to all days
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxConcurrentBookings?: number;
  turnTimeMinutes?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TableCombination {
  id: string;
  restaurantId: string;
  name: string;
  tableIds: string[];
  minCapacity: number;
  maxCapacity: number;
  requiresApproval: boolean;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BulkTableOperation {
  operation: 'create' | 'update' | 'delete';
  tables: Partial<Table>[];
}

export interface TableSummary {
  totalTables: number;
  totalCapacity: number;
  averageCapacity: number;
  tablesByType: Record<string, number>;
  accessibleTables: number;
  combinableTables: number;
}

export interface RestaurantSettings {
  maxCovers?: number;
  turnTimeMinutes: number;
  staggerMinutes: number;
  defaultSlotDuration: number;
}

// Enhanced Opening Hours - supports multiple service periods per day
export interface ServicePeriod {
  name: string;                    // e.g., "Lunch", "Dinner", "Brunch"
  startTime: string;               // "HH:MM" format
  endTime: string;                 // "HH:MM" format  
  slotDurationMinutes?: number;    // Override restaurant's default slot duration
}

export interface DaySchedule {
  isOpen: boolean;
  periods?: ServicePeriod[];       // NEW: Multiple service periods per day
  // Backward compatibility - auto-migrated to periods format
  openTime?: string;
  closeTime?: string;
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

