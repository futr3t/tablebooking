#!/bin/bash

# Enhanced Availability API Debug Test Script
# This script helps test the error debugging improvements

API_BASE_URL="http://localhost:3001/api"
BACKEND_URL="https://kind-benevolence-production.up.railway.app/api"

echo "🔍 Testing Enhanced Availability API Debugging"
echo "=============================================="

# Test 1: Valid request to check if basic functionality works
echo ""
echo "Test 1: Valid availability request"
echo "----------------------------------"
curl -s -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     "${API_BASE_URL}/bookings/staff/availability?restaurantId=test&date=2025-07-15&partySize=4" \
     | jq '.' || echo "❌ Request failed - check if backend is running"

# Test 2: Missing parameters to trigger validation error
echo ""
echo "Test 2: Missing parameters (should trigger 400 error)"
echo "----------------------------------------------------"
curl -s -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     "${API_BASE_URL}/bookings/staff/availability?restaurantId=test" \
     | jq '.' || echo "❌ Request failed"

# Test 3: Invalid restaurant ID
echo ""
echo "Test 3: Invalid restaurant ID (should trigger 'Restaurant not found')"
echo "--------------------------------------------------------------------"
curl -s -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     "${API_BASE_URL}/bookings/staff/availability?restaurantId=invalid-id&date=2025-07-15&partySize=4" \
     | jq '.' || echo "❌ Request failed"

# Test 4: Past date
echo ""
echo "Test 4: Past date (should trigger 'Cannot book for past dates')"
echo "--------------------------------------------------------------"
curl -s -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     "${API_BASE_URL}/bookings/staff/availability?restaurantId=test&date=2025-01-01&partySize=4" \
     | jq '.' || echo "❌ Request failed"

echo ""
echo "📋 Debug Testing Instructions:"
echo "1. Replace YOUR_TOKEN_HERE with actual JWT token"
echo "2. Update restaurantId with valid restaurant ID from your database"
echo "3. Check backend logs for detailed error information"
echo "4. Test frontend error display by triggering errors in the booking form"
echo ""
echo "🚀 Backend Logs Location:"
echo "- Local: Check terminal running 'npm run dev'"
echo "- Railway: Use 'railway logs' command or Railway dashboard"