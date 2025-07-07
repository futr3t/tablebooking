#!/bin/bash

echo "🚀 TESTING COMPREHENSIVE BOOKING FIX"
echo "====================================="

BASE_URL="https://kind-benevolence-production.up.railway.app/api"

echo ""
echo "🧪 TEST 1: Direct Database Booking Creation (Bypass all complex logic)"
curl -s -X POST "$BASE_URL/debug/direct-booking-test" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "🧪 TEST 2: Standard Booking Creation (Now with Redis bypass in production)"
curl -s -X POST "$BASE_URL/bookings/guest" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "1723b385-dc14-461f-a06a-119d2bc0ba5c",
    "customerName": "Redis Bypass Test",
    "customerEmail": "bypass@test.com",
    "customerPhone": "5551234567",
    "partySize": 4,
    "bookingDate": "2025-07-08",
    "bookingTime": "17:00",
    "duration": 120,
    "specialRequests": "Testing Redis bypass fix"
  }' | jq '.'

echo ""
echo "🧪 TEST 3: Check Lock Service Status"
curl -s "$BASE_URL/debug/booking-lock-version" | jq '.data.version'

echo ""
echo "🎯 ANALYSIS COMPLETE"