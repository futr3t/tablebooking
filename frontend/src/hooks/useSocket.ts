import { useEffect } from 'react';
import socketService from '../services/socket';
import { useAuth } from '../contexts/AuthContext';

export const useSocket = () => {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('token');
      if (token) {
        socketService.connect(token);
        
        if (user.restaurant_id) {
          socketService.joinRestaurant(user.restaurant_id);
        }
      }
    }

    return () => {
      if (user?.restaurant_id) {
        socketService.leaveRestaurant(user.restaurant_id);
      }
      socketService.disconnect();
    };
  }, [isAuthenticated, user]);

  return socketService;
};