import { 
  RestaurantInfo, 
  TimeSlot, 
  BookingRequest, 
  BookingResponse, 
  ApiResponse 
} from './types';

export class WidgetAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/public${endpoint}`;
    const params = new URLSearchParams({ apiKey: this.apiKey });
    
    const response = await fetch(`${url}?${params}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }

    return data.data!;
  }

  async getRestaurantInfo(): Promise<RestaurantInfo> {
    return this.request<RestaurantInfo>('/restaurant-info');
  }

  async getAvailability(date: string, partySize: number): Promise<TimeSlot[]> {
    const params = new URLSearchParams({
      date,
      partySize: partySize.toString(),
    });
    
    return this.request<TimeSlot[]>(`/availability?${params}`);
  }

  async createBooking(booking: BookingRequest): Promise<BookingResponse> {
    return this.request<BookingResponse>('/booking', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  async getBookingByConfirmation(confirmationCode: string): Promise<BookingResponse> {
    return this.request<BookingResponse>(`/booking/${confirmationCode}`);
  }
}