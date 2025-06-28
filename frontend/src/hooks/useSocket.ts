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
        
        if (user.restaurantId) {
          socketService.joinRestaurant(user.restaurantId);
        }
      }
    }

    return () => {
      if (user?.restaurantId) {
        socketService.leaveRestaurant(user.restaurantId);
      }
      socketService.disconnect();
    };
  }, [isAuthenticated, user]);

  return socketService;
};