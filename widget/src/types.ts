export interface WidgetConfig {
  apiKey: string;
  containerId: string;
  baseUrl?: string;
}

export interface RestaurantInfo {
  name: string;
  cuisine?: string;
  description?: string;
  phone: string;
  address: string;
  openingHours: {
    [key: string]: {
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
    };
  };
  bookingSettings: {
    maxPartySize: number;
    advanceBookingDays: number;
    requirePhone: boolean;
    requireEmail: boolean;
    showSpecialRequests: boolean;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    borderRadius: string;
  };
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface BookingRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  partySize: number;
  bookingDate: string;
  bookingTime: string;
  specialRequests?: string;
}

export interface BookingResponse {
  id: string;
  confirmationCode: string;
  customerName: string;
  partySize: number;
  bookingTime: string;
  status: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}