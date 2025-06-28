import axios from 'axios';
import { AuthResponse, LoginCredentials, User, Booking } from '../types';

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
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};

export const bookingService = {
  getBookings: async (restaurantId: string, date?: string): Promise<Booking[]> => {
    const params = date ? { date } : {};
    const response = await api.get(`/bookings/restaurant/${restaurantId}`, { params });
    return response.data;
  },

  getBooking: async (id: string): Promise<Booking> => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  createBooking: async (booking: Partial<Booking>): Promise<Booking> => {
    const response = await api.post('/bookings', booking);
    return response.data;
  },

  updateBooking: async (id: string, booking: Partial<Booking>): Promise<Booking> => {
    const response = await api.put(`/bookings/${id}`, booking);
    return response.data;
  },

  cancelBooking: async (id: string): Promise<void> => {
    await api.delete(`/bookings/${id}`);
  },

  markNoShow: async (id: string): Promise<Booking> => {
    const response = await api.post(`/bookings/${id}/no-show`);
    return response.data;
  },

  getAvailability: async (restaurantId: string, date: string, partySize: number) => {
    const response = await api.get('/bookings/availability', {
      params: { restaurantId: restaurantId, date, partySize: partySize },
    });
    return response.data;
  },
};

export default api;