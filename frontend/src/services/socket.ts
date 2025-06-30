import { io, Socket } from 'socket.io-client';
import { Booking } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string) {
    if (this.socket?.connected) return;

    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    
    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Booking events
    this.socket.on('booking:created', (booking: Booking) => {
      this.emit('booking:created', booking);
    });

    this.socket.on('booking:updated', (booking: Booking) => {
      this.emit('booking:updated', booking);
    });

    this.socket.on('booking:cancelled', (bookingId: string) => {
      this.emit('booking:cancelled', bookingId);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  joinRestaurant(restaurantId: string) {
    if (this.socket) {
      this.socket.emit('join:restaurant', restaurantId);
    }
  }

  leaveRestaurant(restaurantId: string) {
    if (this.socket) {
      this.socket.emit('leave:restaurant', restaurantId);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

const socketService = new SocketService();
export default socketService;