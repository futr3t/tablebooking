export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'owner' | 'manager' | 'host' | 'server' | 'customer';
  restaurant_id?: string;
  created_at: string;
  updated_at: string;
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
  restaurant_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  party_size: number;
  booking_time: string;
  table_id?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  special_requests?: string;
  confirmation_code?: string;
  created_at: string;
  updated_at: string;
  tables?: Table[];
}

export interface Table {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  position?: {
    x: number;
    y: number;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  opening_hours: {
    [key: string]: {
      open: string;
      close: string;
    }[];
  };
  settings: {
    booking_advance_days: number;
    booking_advance_hours: number;
    time_slot_duration: number;
    table_turn_time: number;
    buffer_time: number;
    allow_waitlist: boolean;
  };
}

export interface TimeSlot {
  time: string;
  available: boolean;
  tables: number[];
}