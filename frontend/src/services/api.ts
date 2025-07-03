import axios from 'axios';
import { AuthResponse, LoginCredentials, User, Booking, WidgetConfig, InstallationInstructions, Table, TableSummary, BulkTableOperation, TimeSlotRule, CreateTimeSlotRuleData, UpdateTimeSlotRuleData } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          error.config.headers.Authorization = `Bearer ${response.data.token}`;
          return axios(error.config);
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    // Backend returns { success: true, data: { user, token }, message }
    // Frontend expects { user, token, refreshToken }
    return {
      user: response.data.data.user,
      token: response.data.data.token,
      refreshToken: response.data.data.token // Use same token as refresh token for now
    };
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile');
    // Backend returns { success: true, data: user }
    return response.data.data || response.data;
  },
};

export const bookingService = {
  getBookings: async (restaurantId: string, date?: string): Promise<Booking[]> => {
    const params = date ? { date } : {};
    const response = await api.get(`/bookings/restaurant/${restaurantId}`, { params });
    // Backend returns { success: true, data: bookings, pagination }
    return response.data.data || response.data;
  },

  getBooking: async (id: string): Promise<Booking> => {
    const response = await api.get(`/bookings/${id}`);
    return response.data.data || response.data;
  },

  createBooking: async (booking: Partial<Booking>): Promise<Booking> => {
    const response = await api.post('/bookings', booking);
    return response.data.data || response.data;
  },

  updateBooking: async (id: string, booking: Partial<Booking>): Promise<Booking> => {
    const response = await api.put(`/bookings/${id}`, booking);
    return response.data.data || response.data;
  },

  cancelBooking: async (id: string): Promise<void> => {
    await api.delete(`/bookings/${id}`);
  },

  markNoShow: async (id: string): Promise<Booking> => {
    const response = await api.post(`/bookings/${id}/no-show`);
    return response.data.data || response.data;
  },

  getAvailability: async (restaurantId: string, date: string, partySize: number) => {
    const response = await api.get('/bookings/availability', {
      params: { restaurantId, date, partySize },
    });
    return response.data.data || response.data;
  },
};

export const widgetService = {
  getConfig: async (): Promise<WidgetConfig> => {
    const response = await api.get('/widget/config');
    return response.data.data || response.data;
  },

  updateConfig: async (config: Partial<WidgetConfig>): Promise<WidgetConfig> => {
    const response = await api.put('/widget/config', config);
    return response.data.data || response.data;
  },

  toggleWidget: async (enabled: boolean): Promise<WidgetConfig> => {
    const response = await api.put('/widget/toggle', { enabled });
    return response.data.data || response.data;
  },

  regenerateApiKey: async (): Promise<WidgetConfig> => {
    const response = await api.post('/widget/api-key/regenerate');
    return response.data.data || response.data;
  },

  getInstallationInstructions: async (): Promise<InstallationInstructions> => {
    const response = await api.get('/widget/installation');
    return response.data.data || response.data;
  },
};

export const restaurantService = {
  getSettings: async (restaurantId: string): Promise<any> => {
    const response = await api.get(`/restaurants/${restaurantId}/settings`);
    return response.data.data || response.data;
  },

  updateSettings: async (restaurantId: string, settings: any): Promise<any> => {
    const response = await api.put(`/restaurants/${restaurantId}/settings`, settings);
    return response.data.data || response.data;
  },

  getRestaurant: async (restaurantId: string): Promise<any> => {
    const response = await api.get(`/restaurants/${restaurantId}`);
    return response.data.data || response.data;
  },
};

export const tableService = {
  getTables: async (restaurantId: string, options?: {
    includeInactive?: boolean;
    tableType?: string;
    isAccessible?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ tables: Table[]; total: number }> => {
    const response = await api.get(`/tables/restaurant/${restaurantId}`, { params: options });
    console.log('Get tables response:', response.data);
    
    // Handle the response structure properly
    const data = response.data.data || response.data;
    
    // If data is an array, wrap it in the expected structure
    if (Array.isArray(data)) {
      return { tables: data, total: data.length };
    }
    
    return data;
  },

  getTable: async (id: string): Promise<Table> => {
    const response = await api.get(`/tables/${id}`);
    return response.data.data || response.data;
  },

  createTable: async (restaurantId: string, table: Partial<Table>): Promise<Table> => {
    const response = await api.post(`/tables/restaurant/${restaurantId}`, table);
    return response.data.data || response.data;
  },

  updateTable: async (id: string, table: Partial<Table>): Promise<Table> => {
    const response = await api.put(`/tables/${id}`, table);
    return response.data.data || response.data;
  },

  deleteTable: async (id: string): Promise<void> => {
    await api.delete(`/tables/${id}`);
  },

  bulkOperations: async (restaurantId: string, operation: BulkTableOperation): Promise<Table[]> => {
    const response = await api.post(`/tables/restaurant/${restaurantId}/bulk`, operation);
    return response.data.data || response.data;
  },

  getSummary: async (restaurantId: string): Promise<TableSummary> => {
    const response = await api.get(`/tables/restaurant/${restaurantId}/summary`);
    return response.data.data || response.data;
  },

  searchTables: async (restaurantId: string, searchTerm: string, filters?: {
    tableType?: string;
    minCapacity?: number;
    maxCapacity?: number;
    isAccessible?: boolean;
  }): Promise<Table[]> => {
    const params = { q: searchTerm, ...filters };
    const response = await api.get(`/tables/restaurant/${restaurantId}/search`, { params });
    return response.data.data || response.data;
  },
};

export const timeSlotRuleService = {
  /**
   * Get all time slot rules for a restaurant
   */
  getTimeSlotRules: async (restaurantId: string): Promise<TimeSlotRule[]> => {
    const response = await api.get(`/restaurants/${restaurantId}/time-slot-rules`);
    return response.data.data || response.data;
  },

  /**
   * Get time slot rules for a specific day
   */
  getTimeSlotRulesForDay: async (restaurantId: string, dayOfWeek: number): Promise<TimeSlotRule[]> => {
    const response = await api.get(`/restaurants/${restaurantId}/time-slot-rules/day/${dayOfWeek}`);
    return response.data.data || response.data;
  },

  /**
   * Get a single time slot rule by ID
   */
  getTimeSlotRule: async (id: string): Promise<TimeSlotRule> => {
    const response = await api.get(`/time-slot-rules/${id}`);
    return response.data.data || response.data;
  },

  /**
   * Create a new time slot rule
   */
  createTimeSlotRule: async (restaurantId: string, data: CreateTimeSlotRuleData): Promise<TimeSlotRule> => {
    const response = await api.post(`/restaurants/${restaurantId}/time-slot-rules`, data);
    return response.data.data || response.data;
  },

  /**
   * Update an existing time slot rule
   */
  updateTimeSlotRule: async (id: string, data: UpdateTimeSlotRuleData): Promise<TimeSlotRule> => {
    const response = await api.put(`/time-slot-rules/${id}`, data);
    return response.data.data || response.data;
  },

  /**
   * Delete a time slot rule
   */
  deleteTimeSlotRule: async (id: string): Promise<void> => {
    await api.delete(`/time-slot-rules/${id}`);
  },
};

export default api;