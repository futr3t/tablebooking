// Database field mapping utilities
export const mapUserFromDb = (dbUser: any) => ({
  id: dbUser.id,
  email: dbUser.email,
  password: dbUser.password,
  firstName: dbUser.first_name,
  lastName: dbUser.last_name,
  phone: dbUser.phone,
  role: dbUser.role,
  restaurantId: dbUser.restaurant_id,
  isActive: dbUser.is_active,
  createdAt: dbUser.created_at,
  updatedAt: dbUser.updated_at
});

export const mapUserToDb = (user: any) => ({
  email: user.email,
  password: user.password,
  first_name: user.firstName,
  last_name: user.lastName,
  phone: user.phone,
  role: user.role,
  restaurant_id: user.restaurantId,
  is_active: user.isActive
});

export const mapBookingFromDb = (dbBooking: any) => ({
  id: dbBooking.id,
  restaurantId: dbBooking.restaurant_id,
  tableId: dbBooking.table_id,
  customerName: dbBooking.guest_name,
  customerEmail: dbBooking.guest_email,
  customerPhone: dbBooking.guest_phone,
  partySize: dbBooking.party_size,
  bookingDate: dbBooking.booking_time,
  bookingTime: dbBooking.booking_time,
  duration: dbBooking.duration || 90,
  status: dbBooking.status,
  notes: dbBooking.notes,
  specialRequests: dbBooking.special_requests,
  confirmationCode: dbBooking.confirmation_code,
  createdAt: dbBooking.created_at,
  updatedAt: dbBooking.updated_at
});

export const mapBookingToDb = (booking: any) => ({
  restaurant_id: booking.restaurantId,
  table_id: booking.tableId,
  guest_name: booking.customerName,
  guest_email: booking.customerEmail,
  guest_phone: booking.customerPhone,
  party_size: booking.partySize,
  booking_time: booking.bookingTime || booking.bookingDate,
  duration: booking.duration || 90,
  status: booking.status,
  notes: booking.notes,
  special_requests: booking.specialRequests
});

// Widget Config mapping functions
export const mapWidgetConfigFromDb = (dbWidgetConfig: any) => ({
  id: dbWidgetConfig.id,
  restaurantId: dbWidgetConfig.restaurant_id,
  apiKey: dbWidgetConfig.api_key,
  isEnabled: dbWidgetConfig.is_enabled,
  theme: dbWidgetConfig.theme,
  settings: dbWidgetConfig.settings,
  createdAt: dbWidgetConfig.created_at,
  updatedAt: dbWidgetConfig.updated_at,
});

export const mapWidgetConfigToDb = (widgetConfig: any) => ({
  restaurant_id: widgetConfig.restaurantId,
  api_key: widgetConfig.apiKey,
  is_enabled: widgetConfig.isEnabled,
  theme: widgetConfig.theme,
  settings: widgetConfig.settings,
});