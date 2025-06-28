# Restaurant Table Booking API

A comprehensive restaurant table booking system with real-time availability checking, waitlist management, and advanced table pacing algorithms.

## 🚀 Features

### Core Booking System
- **Real-time Availability**: Check available time slots with configurable pacing
- **Smart Table Assignment**: Automatic table selection based on party size
- **Guest Bookings**: No account required for customers
- **Waitlist Management**: Automatic notification when tables become available
- **Distributed Locking**: Prevents double bookings with Redis-based locks
- **Transaction Safety**: Database transactions ensure data consistency

### Restaurant Management
- **Multi-restaurant Support**: Single platform, multiple locations
- **Configurable Settings**: Opening hours, booking windows, table pacing
- **Role-based Access**: Owner, Manager, Host, Server permissions
- **Table Management**: Visual floor plans, capacity optimization

### Technical Features
- **TypeScript**: Full type safety across the application
- **PostgreSQL**: Robust relational database with proper indexing
- **Redis**: Caching and distributed locking
- **JWT Authentication**: Secure token-based authentication
- **Comprehensive Testing**: Unit tests for critical algorithms
- **Input Validation**: Strict validation and sanitization
- **Rate Limiting**: Protection against abuse
- **Error Handling**: Graceful error handling and logging

## 📋 API Endpoints

### Public Booking Endpoints

#### Check Availability
```http
GET /api/bookings/availability?restaurantId={uuid}&date={date}&partySize={number}&duration={number}
```

#### Create Guest Booking
```http
POST /api/bookings/guest
Content-Type: application/json

{
  "restaurantId": "uuid",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+1234567890",
  "partySize": 4,
  "bookingDate": "2024-01-15",
  "bookingTime": "19:00",
  "duration": 120,
  "specialRequests": "Window seat please",
  "forceWaitlist": false
}
```

#### Get Booking by Confirmation
```http
GET /api/bookings/confirmation/{confirmationCode}
```

#### Add to Waitlist
```http
POST /api/bookings/waitlist
Content-Type: application/json

{
  "restaurantId": "uuid",
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com",
  "partySize": 2,
  "bookingDate": "2024-01-15",
  "bookingTime": "19:00"
}
```

### Staff Endpoints (Authentication Required)

#### List Restaurant Bookings
```http
GET /api/bookings/restaurant/{restaurantId}?date={date}&status={status}&page={number}&limit={number}
Authorization: Bearer {jwt_token}
```

#### Get Single Booking
```http
GET /api/bookings/{id}
Authorization: Bearer {jwt_token}
```

#### Update Booking
```http
PUT /api/bookings/{id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "customerName": "Updated Name",
  "partySize": 6,
  "bookingTime": "20:00",
  "specialRequests": "Birthday celebration"
}
```

#### Cancel Booking
```http
DELETE /api/bookings/{id}
Authorization: Bearer {jwt_token}
```

#### Mark No-Show
```http
POST /api/bookings/{id}/no-show
Authorization: Bearer {jwt_token}
```

#### Get Waitlist
```http
GET /api/bookings/waitlist?restaurantId={uuid}&date={date}
Authorization: Bearer {jwt_token}
```

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@restaurant.com",
  "password": "password123"
}
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "new@restaurant.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

## 🏗️ Architecture

### Database Schema

#### Users Table
- Role-based access control (super_admin, owner, manager, host, server, customer)
- Restaurant association for staff members
- Secure password hashing with bcrypt

#### Restaurants Table
- Configurable opening hours (JSON)
- Booking settings (advance booking limits, slot duration, buffer time)
- Multi-location support

#### Tables Table
- Flexible capacity ranges (min/max)
- Visual positioning data
- Table shapes (round, square, rectangle)

#### Bookings Table
- Comprehensive booking lifecycle
- Waitlist management with positions
- Confirmation codes for guest access
- No-show tracking

### Availability Algorithm

The availability checking algorithm implements sophisticated table pacing:

1. **Time Slot Generation**: Creates 30-minute slots within operating hours
2. **Buffer Time**: Configurable buffer between bookings (default 15 minutes)
3. **Table Optimization**: Selects smallest suitable table for efficiency
4. **Combination Logic**: Handles large parties with table combinations
5. **Conflict Detection**: Prevents overlapping bookings with buffer zones
6. **Caching**: Redis caching with automatic invalidation

### Locking Mechanism

Distributed locking prevents race conditions:

- **Booking-level Locks**: Prevent double bookings for specific time slots
- **Table-level Locks**: Ensure atomic table assignment
- **Automatic Cleanup**: Expired lock removal
- **Deadlock Prevention**: Hierarchical lock acquisition

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/tablebooking
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### Restaurant Settings

Each restaurant can configure:

```json
{
  "openingHours": {
    "wednesday": { "isOpen": true, "openTime": "17:00", "closeTime": "21:00" },
    "thursday": { "isOpen": true, "openTime": "17:00", "closeTime": "21:00" },
    "friday": { "isOpen": true, "openTime": "17:00", "closeTime": "21:00" },
    "saturday": { "isOpen": true, "openTime": "17:00", "closeTime": "21:00" },
    "sunday": { "isOpen": true, "openTime": "12:00", "closeTime": "14:00" }
  },
  "bookingSettings": {
    "maxAdvanceBookingDays": 270,
    "minAdvanceBookingHours": 2,
    "maxPartySize": 8,
    "slotDuration": 30,
    "bufferTime": 15,
    "enableWaitlist": true,
    "requirePhone": true,
    "requireEmail": false,
    "autoConfirm": false,
    "sendConfirmationEmail": true,
    "sendReminderEmail": true,
    "reminderHours": 24
  }
}
```

## 🧪 Testing

### Run Tests
```bash
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Test Coverage
- **Availability Algorithm**: Comprehensive edge case testing
- **Booking Lock Service**: Distributed locking scenarios
- **API Endpoints**: Request/response validation
- **Error Handling**: Graceful failure scenarios

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+

### Installation

1. **Clone and Setup**
   ```bash
   cd backend
   npm install
   ```

2. **Database Setup**
   ```bash
   # Create database
   createdb tablebooking
   
   # Run schema
   psql tablebooking < src/config/schema.sql
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Verify Installation**
   ```bash
   curl http://localhost:3001/api/health
   ```

## 📚 Business Logic

### Booking Rules

1. **Advance Booking**: 2 hours minimum, 9 months maximum
2. **Operating Hours**: Wed-Sun 5-9pm, Sun 12-2pm (configurable)
3. **Time Slots**: 30-minute intervals
4. **Table Pacing**: 15-minute buffer between bookings
5. **Party Limits**: 1-20 people per booking
6. **Guest Bookings**: No account required

### Waitlist Management

1. **Position Tracking**: FIFO queue with position numbers
2. **Automatic Processing**: When tables become available
3. **Notification System**: Email/SMS alerts (placeholder)
4. **Priority Rules**: Request time-based ordering

### Table Assignment

1. **Size Optimization**: Smallest suitable table selected
2. **Combination Logic**: Multiple tables for large parties
3. **Availability Windows**: Real-time conflict checking
4. **Buffer Enforcement**: Configurable time between bookings

## 🔒 Security Features

- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Input sanitization
- **Rate Limiting**: API abuse protection
- **CORS Configuration**: Secure cross-origin requests
- **Helmet Integration**: Security headers
- **JWT Security**: Secure token handling

## 📈 Performance Optimizations

- **Redis Caching**: Availability data caching
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: PostgreSQL connection management
- **Compression**: Response compression
- **Lock Optimization**: Minimal lock duration

## 🐛 Error Handling

- **Graceful Degradation**: Fallback mechanisms
- **Detailed Logging**: Comprehensive error tracking
- **User-Friendly Messages**: Clear error responses
- **Retry Logic**: Automatic recovery for transient failures

The booking system is production-ready with enterprise-grade features for reliability, security, and scalability.