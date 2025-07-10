import axios from 'axios';
import { AuthResponse, LoginCredentials, User, Booking, WidgetConfig, InstallationInstructions, Table, TableSummary, BulkTableOperation, DietaryRequirement, BookingTemplate, EnhancedAvailability } from '../types';

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

  // Staff booking methods
  createStaffBooking: async (booking: any): Promise<Booking> => {
    const response = await api.post('/bookings/staff', booking);
    return response.data.data || response.data;
  },

  getEnhancedAvailability: async (
    restaurantId: string, 
    date: string, 
    partySize: number,
    preferredTime?: string
  ): Promise<EnhancedAvailability> => {
    const response = await api.get('/bookings/staff/availability', {
      params: { restaurantId, date, partySize, preferredTime },
    });
    return response.data.data || response.data;
  },

  searchCustomers: async (restaurantId: string, search: string): Promise<BookingTemplate[]> => {
    const response = await api.get(`/bookings/staff/customers/${restaurantId}`, {
      params: { search },
    });
    return response.data.data || response.data;
  },

  bulkCheckAvailability: async (
    restaurantId: string,
    dates: string[],
    partySize: number,
    duration?: number
  ) => {
    const response = await api.post('/bookings/staff/availability/bulk', {
      restaurantId,
      dates,
      partySize,
      duration,
    });
    return response.data.data || response.data;
  },
};

// New services for optimized booking system
export const dietaryService = {
  getRequirements: async (): Promise<DietaryRequirement[]> => {
    const response = await api.get('/dietary-requirements');
    return response.data.data || response.data;
  },

  searchRequirements: async (query: string): Promise<DietaryRequirement[]> => {
    const response = await api.get('/dietary-requirements/search', {
      params: { q: query },
    });
    return response.data.data || response.data;
  },

  getCommonCombinations: async () => {
    const response = await api.get('/dietary-requirements/combinations');
    return response.data.data || response.data;
  },

  createRequirement: async (requirement: Partial<DietaryRequirement>): Promise<DietaryRequirement> => {
    const response = await api.post('/dietary-requirements', requirement);
    return response.data.data || response.data;
  },

  updateRequirement: async (id: string, requirement: Partial<DietaryRequirement>): Promise<DietaryRequirement> => {
    const response = await api.put(`/dietary-requirements/${id}`, requirement);
    return response.data.data || response.data;
  },

  getStats: async (restaurantId: string) => {
    const response = await api.get(`/dietary-requirements/stats/${restaurantId}`);
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
  // Existing settings methods
  getSettings: async (restaurantId: string): Promise<any> => {
    const response = await api.get(`/restaurants/${restaurantId}/settings`);
    return response.data.data || response.data;
  },

  updateSettings: async (restaurantId: string, settings: any): Promise<any> => {
    console.log('Sending settings update:', {
      restaurantId,
      settings,
      settingsKeys: Object.keys(settings)
    });
    const response = await api.put(`/restaurants/${restaurantId}/settings`, settings);
    return response.data.data || response.data;
  },

  getRestaurant: async (restaurantId: string): Promise<any> => {
    const response = await api.get(`/restaurants/${restaurantId}`);
    return response.data.data || response.data;
  },

  // New admin methods for restaurant management
  getAllRestaurants: async (query?: string): Promise<any> => {
    const response = await api.get(`/restaurants?${query}`);
    return response.data;
  },

  createRestaurant: async (restaurantData: any): Promise<any> => {
    const response = await api.post('/restaurants', restaurantData);
    return response.data;
  },

  updateRestaurant: async (id: string, restaurantData: any): Promise<any> => {
    const response = await api.put(`/restaurants/${id}`, restaurantData);
    return response.data;
  },

  deleteRestaurant: async (id: string): Promise<any> => {
    const response = await api.delete(`/restaurants/${id}`);
    return response.data;
  },

  switchRestaurant: async (restaurantId: string): Promise<any> => {
    const response = await api.post('/restaurants/switch', { restaurantId });
    return response.data;
  }
};

export const turnTimeRulesService = {
  getRules: async (restaurantId: string): Promise<any[]> => {
    const response = await api.get(`/turn-time-rules/restaurant/${restaurantId}`);
    return response.data.data || [];
  },
  
  createRule: async (restaurantId: string, rule: any): Promise<any> => {
    const response = await api.post(`/turn-time-rules/restaurant/${restaurantId}`, rule);
    return response.data.data;
  },
  
  updateRule: async (ruleId: string, updates: any): Promise<any> => {
    const response = await api.put(`/turn-time-rules/${ruleId}`, updates);
    return response.data.data;
  },
  
  deleteRule: async (ruleId: string): Promise<void> => {
    await api.delete(`/turn-time-rules/${ruleId}`);
  }
};

export const tableService = {
  getTables: async (restaurantId: string, options?: {
    includeInactive?: boolean;
    tableType?: string;
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
  }): Promise<Table[]> => {
    const params = { q: searchTerm, ...filters };
    const response = await api.get(`/tables/restaurant/${restaurantId}/search`, { params });
    return response.data.data || response.data;
  },
};

export const userService = {
  getUsers: async (query?: string): Promise<any> => {
    const response = await api.get(`/users?${query}`);
    return response.data;
  },

  getUser: async (id: string): Promise<any> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData: any): Promise<any> => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (id: string, userData: any): Promise<any> => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: string): Promise<any> => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};


export default api;