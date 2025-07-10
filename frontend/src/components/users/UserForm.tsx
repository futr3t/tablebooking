import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Autocomplete,
  Chip,
  Paper,
  Grid,
  Divider,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  Business as BusinessIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { userService, restaurantService } from '../../services/api';
import { User } from '../../types';

interface UserFormData extends User {
  password?: string;
  isActive?: boolean;
  phone?: string;
}

interface Restaurant {
  id: string;
  name: string;
  email: string;
  address: string;
}

interface UserFormProps {
  user?: UserFormData;
  onSave: (user: UserFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSave, onCancel, isEditing = false }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState<UserFormData>({
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'customer',
    restaurantId: '',
    isActive: true,
    password: ''
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(!isEditing);

  const roleOptions = [
    { value: 'customer', label: 'Customer', description: 'Can make bookings' },
    { value: 'server', label: 'Server', description: 'Can view and manage bookings' },
    { value: 'host', label: 'Host', description: 'Can manage bookings and tables' },
    { value: 'manager', label: 'Manager', description: 'Can manage staff and settings' },
    { value: 'owner', label: 'Owner', description: 'Full restaurant management' },
    { value: 'super_admin', label: 'Super Admin', description: 'System administration' }
  ];

  // Filter roles based on current user's permissions
  const getAvailableRoles = () => {
    if (currentUser?.role === 'super_admin') {
      return roleOptions;
    } else if (currentUser?.role === 'owner') {
      return roleOptions.filter(r => r.value !== 'super_admin');
    } else if (currentUser?.role === 'manager') {
      return roleOptions.filter(r => !['super_admin', 'owner', 'manager'].includes(r.value));
    }
    return roleOptions.filter(r => r.value === 'customer');
  };

  const availableRoles = getAvailableRoles();

  useEffect(() => {
    if (user) {
      setFormData({
        ...user,
        password: '' // Don't populate password for editing
      });
    }
  }, [user]);

  useEffect(() => {
    if (currentUser?.role === 'super_admin') {
      fetchRestaurants();
    } else if (currentUser?.restaurantId) {
      // For non-super admins, use their own restaurant
      setFormData(prev => ({
        ...prev,
        restaurantId: currentUser.restaurantId || ''
      }));
    }
  }, [currentUser]);

  const fetchRestaurants = async () => {
    try {
      const response = await restaurantService.getAllRestaurants();
      if (response.success) {
        setRestaurants(response.data.items);
      }
    } catch (err) {
      console.error('Failed to fetch restaurants:', err);
    }
  };

  const handleInputChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      return false;
    }

    if (!formData.role) {
      setError('Please select a role');
      return false;
    }

    if (formData.role !== 'super_admin' && !formData.restaurantId) {
      setError('Please select a restaurant');
      return false;
    }

    if (passwordRequired && !formData.password) {
      setError('Password is required');
      return false;
    }

    if (formData.password && formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const userData = {
        ...formData,
        // Don't send password if it's empty during edit
        ...(formData.password && { password: formData.password })
      };

      if (isEditing && user?.id) {
        const response = await userService.updateUser(user.id, userData);
        if (response.success) {
          onSave(response.data);
        } else {
          setError(response.message || 'Failed to update user');
        }
      } else {
        const response = await userService.createUser(userData);
        if (response.success) {
          onSave(response.data);
        } else {
          setError(response.message || 'Failed to create user');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving user');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const selectedRestaurant = restaurants.find(r => r.id === formData.restaurantId);

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
          {isEditing ? 'Edit User' : 'Create New User'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEditing ? 'Update user information and permissions' : 'Add a new user to the system'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonIcon color="primary" />
              <Typography variant="h6">Personal Information</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              required
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              required
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              disabled={loading}
              InputProps={{
                startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6">Access & Permissions</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => handleInputChange('role', e.target.value)}
                disabled={loading}
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    <Box>
                      <Typography variant="body1">{role.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {role.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  disabled={loading}
                />
              }
              label="Active"
            />
          </Grid>

          {/* Restaurant Assignment */}
          {currentUser?.role === 'super_admin' && formData.role !== 'super_admin' && (
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Restaurant</InputLabel>
                <Select
                  value={formData.restaurantId}
                  label="Restaurant"
                  onChange={(e) => handleInputChange('restaurantId', e.target.value)}
                  disabled={loading}
                >
                  {restaurants.map((restaurant) => (
                    <MenuItem key={restaurant.id} value={restaurant.id}>
                      <Box>
                        <Typography variant="body1">{restaurant.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {restaurant.email} • {restaurant.address}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Password Section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LockIcon color="primary" />
              <Typography variant="h6">Password</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label={isEditing ? "New Password (leave empty to keep current)" : "Password"}
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required={passwordRequired}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="outlined"
              onClick={generatePassword}
              disabled={loading}
              size="small"
            >
              Generate Password
            </Button>
          </Grid>

          {/* Selected Restaurant Info */}
          {selectedRestaurant && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Selected Restaurant:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedRestaurant.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedRestaurant.email} • {selectedRestaurant.address}
                </Typography>
              </Box>
            </Grid>
          )}

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={loading}
                startIcon={<CancelIcon />}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {isEditing ? 'Update User' : 'Create User'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default UserForm;