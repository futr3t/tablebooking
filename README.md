# Restaurant Table Booking Platform

A modular restaurant table booking platform similar to OpenTable/ResDiary.

## Tech Stack
- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL + Redis
- **Frontend**: React with TypeScript
- **Real-time**: Socket.io
- **Email/SMS**: SendGrid/Twilio

## Project Structure
```
tablebooking/
├── backend/          # Node.js/Express API
├── frontend/         # React application
└── README.md
```

## Getting Started

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Features
- Booking API with availability checking
- Admin panel with role-based access
- Visual floor plan with drag-drop
- Customer booking widget (embeddable)
- Automated emails/SMS
- Reporting system
- Waitlist functionality
- No-show tracking

## Configuration
Everything is configurable via the admin panel with modular architecture supporting up to 30 covers per location.