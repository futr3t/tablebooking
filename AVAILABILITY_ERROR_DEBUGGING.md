# Enhanced Availability Error Debugging System

## Overview
The "Failed to load availability" error has been enhanced with comprehensive debugging capabilities to help identify and resolve issues quickly.

## Error Flow Analysis

### 1. Frontend Error Location
**File**: `/frontend/src/components/bookings/OptimizedBookingForm.tsx`
**Lines**: 232-300

**What happens:**
- User selects date/party size in booking form
- Frontend calls `/api/bookings/staff/availability` endpoint
- If error occurs, detailed error handling categorizes and displays appropriate message
- Debug information is stored for troubleshooting

### 2. API Endpoint
**Endpoint**: `GET /api/bookings/staff/availability`
**Controller**: `/backend/src/controllers/booking.ts` (lines 770-844)
**Service Chain**: 
- `getEnhancedAvailability()` → `EnhancedAvailabilityService.getEnhancedAvailability()` → `AvailabilityService.checkAvailability()`

### 3. Error Handling Layers

#### Layer 1: Controller Level (`booking.ts`)
- Validates authentication and permissions
- Logs detailed request information
- Catches and categorizes service errors
- Returns appropriate HTTP status codes

#### Layer 2: Enhanced Availability Service (`enhanced-availability.ts`)
- Validates restaurant existence
- Checks table capacity limits
- Logs party size and table validation
- Provides detailed availability analysis

#### Layer 3: Core Availability Service (`availability.ts`)
- Validates date ranges and booking windows
- Checks restaurant operating hours
- Generates time slots
- Handles minimum advance booking requirements

## Enhanced Logging Features

### Backend Logging
All services now include comprehensive debug logging:

```javascript
console.log('[AvailabilityService] Starting availability check:', {
  restaurantId,
  date,
  partySize,
  duration,
  timestamp: new Date().toISOString()
});
```

**Log Prefixes:**
- `[Controller]` - Controller-level operations
- `[EnhancedAvailability]` - Enhanced availability service
- `[AvailabilityService]` - Core availability logic

### Frontend Error Categorization
Errors are now categorized and display specific messages:

1. **Authentication Errors (401)**: "Authentication failed. Please log in again."
2. **Permission Errors (403)**: "Access denied to this restaurant."
3. **Validation Errors (400)**: Shows specific validation message
4. **Restaurant Closed**: Shows specific closed day/hours message
5. **Restaurant Not Found**: "Restaurant not found. Please refresh the page and try again."
6. **Party Size Exceeded**: Shows specific capacity limitation message
7. **Past Date Errors**: "Cannot book for past dates. Please select a future date."
8. **Advance Booking Limits**: Shows specific advance booking limitation

### Debug Panel Feature
- Checkbox appears when errors occur: "Show debug information"
- Displays complete error details in JSON format
- Includes unique error ID for support reference
- Shows request parameters and full server response

## Common Error Scenarios

### 1. Restaurant Not Found
**Cause**: Invalid restaurantId parameter
**Backend Log**: `[AvailabilityService] Restaurant lookup failed`
**Frontend**: "Restaurant not found. Please refresh the page and try again."

### 2. Restaurant Closed
**Cause**: Requesting availability for closed day
**Backend Log**: `[AvailabilityService] Restaurant closed error`
**Frontend**: "Restaurant is closed on [Day]s"

### 3. Past Date Booking
**Cause**: Date selected is before today
**Backend Log**: `[AvailabilityService] Past date error`
**Frontend**: "Cannot book for past dates. Please select a future date."

### 4. Party Size Too Large
**Cause**: Party size exceeds restaurant's maximum capacity
**Backend Log**: `[EnhancedAvailability] Party size exceeds capacity`
**Frontend**: Shows specific capacity limit message

### 5. Authentication Issues
**Cause**: Invalid/expired JWT token
**Backend Log**: `[Controller] No authenticated user`
**Frontend**: "Authentication failed. Please log in again."

## Testing the Debug System

### Manual Testing
1. Open booking form in frontend
2. Try these scenarios to trigger errors:
   - Select a past date
   - Enter party size larger than restaurant capacity
   - Select a day when restaurant is closed
3. Check "Show debug information" when errors appear
4. Review console logs for detailed error information

### Using Test Script
```bash
./test-availability-debug.sh
```

### Backend Log Monitoring
**Local Development:**
```bash
cd backend
npm run dev
# Watch terminal for detailed logs
```

**Railway Production:**
```bash
railway logs --service backend
```

## Debug Information Format

When "Show debug information" is checked, the following information is displayed:

```json
{
  "errorMessage": "Restaurant not found",
  "statusCode": 500,
  "fullResponse": { /* Complete API response */ },
  "timestamp": "2025-07-12T10:30:00.000Z",
  "request": {
    "restaurantId": "invalid-id",
    "date": "2025-07-15",
    "partySize": 4,
    "preferredTime": "19:00"
  }
}
```

## Resolving Common Issues

### Issue: "Failed to load availability" with no specific message
**Solution**: 
1. Check backend logs for detailed error information
2. Verify database connectivity
3. Confirm restaurant configuration is complete
4. Check opening hours are properly configured

### Issue: Authentication failures
**Solution**:
1. Verify JWT token is valid and not expired
2. Check user has proper restaurant access permissions
3. Confirm user role allows booking operations

### Issue: No time slots available
**Solution**:
1. Verify restaurant has active tables
2. Check opening hours configuration
3. Confirm minimum advance booking settings
4. Review existing bookings for conflicts

## File Locations

### Enhanced Files
- `/backend/src/services/availability.ts` - Core availability with enhanced logging
- `/backend/src/services/enhanced-availability.ts` - Enhanced service with detailed logging
- `/backend/src/controllers/booking.ts` - Controller with comprehensive error handling
- `/frontend/src/components/bookings/OptimizedBookingForm.tsx` - Frontend with debug panel

### New Files
- `/test-availability-debug.sh` - Test script for debugging
- `/AVAILABILITY_ERROR_DEBUGGING.md` - This documentation

## Support Information

When reporting availability errors, include:
1. Error ID from debug panel
2. Complete debug information JSON
3. Backend logs showing the error
4. Steps to reproduce the issue
5. Restaurant ID and user role involved

The enhanced debugging system provides complete visibility into the availability checking process, making it much easier to identify and resolve issues quickly.