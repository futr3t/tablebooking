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
  tableNumber: string;
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