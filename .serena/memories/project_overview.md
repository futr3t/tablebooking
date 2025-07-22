# Restaurant Table Booking Platform - Project Overview

## Purpose
A comprehensive restaurant table booking platform similar to OpenTable/ResDiary that provides:
- Real-time availability checking with smart table assignment
- Guest bookings without authentication requirement  
- Staff management interface with role-based access control
- Waitlist functionality with automatic processing
- Embeddable widget for restaurant websites
- Multi-restaurant support

## Key Features
- **Smart Availability Algorithm**: Time slot generation with table pacing and buffer times
- **Distributed Locking**: Redis-based locks prevent double bookings
- **Guest-Friendly**: Customers can book without creating accounts
- **Professional Admin Panel**: React-based interface for restaurant staff
- **Widget System**: Customizable booking widget for restaurant websites
- **Flexible Table Management**: Custom numbering, types, capacity ranges
- **Dietary Requirements Tracking**: Allergen and preference management
- **Optimized Manual Booking**: Fast staff entry with customer history

## Current Status
- Platform is **PRODUCTION READY & DEPLOYED** on Railway
- Backend API: 100% complete with all features
- Frontend Admin Panel: 100% complete with Material-UI design
- Database: PostgreSQL with complete schema, Redis for caching (optional)
- All core functionality is working and tested

## Access Credentials
- Admin Email: admin@restaurant.com
- Admin Password: admin123
- GitHub: https://github.com/futr3t/tablebooking

## Recent Development Focus
- Fixed booking availability API date comparison logic (July 2025)
- Enhanced manual booking system with dietary requirements
- Implemented customer auto-complete and booking templates
- Added pacing indicators (available/moderate/busy/full)
- Professional UI design with Inter fonts and gradients