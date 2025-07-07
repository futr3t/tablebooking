#!/bin/bash

echo "🔍 ULTRATHINKING: Testing Production Booking Error with Enhanced Debugging"
echo "=================================================================="

echo ""
echo "📊 1. Check Production Health"
curl -s "https://kind-benevolence-production.up.railway.app/api/health" | jq '.data.database'

echo ""
echo "📊 2. Check Production Lock Service Version"
curl -s "https://kind-benevolence-production.up.railway.app/api/debug/booking-lock-version" | jq '.data.version'

echo ""
echo "📊 3. Check Production Error Handling"
curl -s "https://kind-benevolence-production.up.railway.app/api/debug/test-lock-error" | jq '.data'

echo ""
echo "📊 4. Test Production Availability"
curl -s "https://kind-benevolence-production.up.railway.app/api/bookings/availability?restaurantId=1723b385-dc14-461f-a06a-119d2bc0ba5c&date=2025-07-08&partySize=4" | jq '.success, .data.timeSlots | length'

echo ""
echo "📊 5. Test Production Booking Creation (Expected to fail with detailed error)"
curl -s -X POST "https://kind-benevolence-production.up.railway.app/api/bookings/guest" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "1723b385-dc14-461f-a06a-119d2bc0ba5c",
    "customerName": "Ultra Debug Test",
    "customerEmail": "debug@test.com", 
    "customerPhone": "5551234567",
    "partySize": 4,
    "bookingDate": "2025-07-08",
    "bookingTime": "17:00",
    "duration": 120,
    "specialRequests": "Ultra debug trace test"
  }' | jq '.'

echo ""
echo "🎯 Analysis Complete"