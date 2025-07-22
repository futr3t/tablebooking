# Important Project Details

## Critical Business Rules

### Booking Rules
- **Advance Booking**: Minimum 2 hours, maximum 9 months (270 days)
- **Operating Hours**: Wed-Sun 5-9pm, Sunday also 12-2pm (configurable per restaurant)
- **Time Slots**: 30-minute intervals with 15-minute buffer between bookings
- **Party Size**: 1-20 people per booking (configurable)
- **Guest Bookings**: No authentication required, uses confirmation codes

### Table Assignment Logic
1. Find smallest suitable table for party size
2. Check table combinations for large parties
3. Respect minimum/maximum capacity per table
4. Consider table type preferences (booth, patio, etc.)
5. Ensure buffer time between bookings

## Security Considerations

### Authentication
- JWT tokens with 24-hour expiration
- Role hierarchy: super_admin > owner > manager > host > server > customer
- Restaurant-scoped permissions
- Secure password hashing with bcrypt (12 rounds)

### API Security
- Rate limiting on all endpoints
- CORS configuration for frontend origin
- Input sanitization to prevent XSS
- Parameterized queries to prevent SQL injection
- API key validation for widget endpoints

## Known Issues and Fixes

### Recent Fixes (July 2025)
- Fixed date comparison logic in availability service
- Changed from datetime to date-only comparison for same-day bookings
- Moved advance booking check to per-slot validation

### Redis Handling
- Redis is optional - system works without it
- Graceful fallback for caching operations
- Distributed locking works with database fallback

## Performance Optimizations

### Database
- UUID primary keys with proper indexing
- Composite indexes on frequently queried columns
- Connection pooling configured
- Optimized queries for availability checking

### Caching Strategy
- Redis caching for availability data
- Cache invalidation on booking changes
- TTL-based expiration for time-sensitive data

## Deployment Configuration

### Railway Specifics
- Two services: backend and frontend
- PostgreSQL provisioned by Railway
- Environment variables managed in Railway dashboard
- Frontend serves through Express server in production

### Critical Environment Variables
- DATABASE_URL (auto-provisioned by Railway)
- JWT_SECRET (must be secure random string)
- CORS_ORIGIN (must match frontend URL exactly)
- NODE_ENV=production

## Testing Approach
- Unit tests for core algorithms (availability, locking)
- Integration tests for API endpoints
- Mock external dependencies (Redis, database)
- Focus on edge cases and concurrent operations

## Widget System
- Embeddable JavaScript widget for restaurant websites
- API key authentication per restaurant
- Customizable themes and colors
- XSS prevention and input validation
- Rate limiting per API key

## Future Considerations
- Email/SMS integration ready (SendGrid/Twilio configured)
- Payment processing hooks prepared (Stripe ready)
- Multi-language support structure in place
- Analytics and reporting foundation built