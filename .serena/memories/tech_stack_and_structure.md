# Tech Stack and Project Structure

## Technology Stack

### Backend (Node.js/Express with TypeScript)
- **Framework**: Express 5.1.0 with TypeScript
- **Database**: PostgreSQL 8.16+ with pg driver
- **Cache**: Redis 5.5+ (optional, graceful fallback)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcryptjs
- **Real-time**: Socket.io 4.8.1
- **Validation**: express-validator 7.2.1
- **Security**: helmet, cors, express-rate-limit
- **Testing**: Jest with ts-jest, supertest
- **Development**: nodemon, ts-node

### Frontend (React with TypeScript)
- **Framework**: React 18.2.0 with TypeScript
- **UI Library**: Material-UI 5.13.1
- **Routing**: React Router DOM 6.11.2
- **State Management**: React Context API
- **HTTP Client**: Axios 1.4.0
- **Date Handling**: date-fns 2.30.0
- **Real-time**: Socket.io-client 4.6.2
- **Build Tool**: Create React App 5.0.1

## Project Structure

```
tablebooking/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── config/            # Database connections, schema
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Auth, validation, security
│   │   ├── models/            # Database models (DAO pattern)
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic layer
│   │   ├── types/             # TypeScript type definitions
│   │   ├── utils/             # Helper functions
│   │   ├── __tests__/         # Jest test files
│   │   └── index.ts           # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── frontend/                  # React admin panel
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── contexts/          # Auth context
│   │   ├── services/          # API integration
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript interfaces
│   │   └── App.tsx           # Main app component
│   └── package.json
├── widget/                    # Embeddable booking widget
├── CLAUDE.md                  # Project state documentation
├── README.md                  # Main project overview
└── DEPLOYMENT.md              # Railway deployment guide
```

## Database Schema
- PostgreSQL with UUID primary keys
- Tables: users, restaurants, tables, bookings, widget_configurations
- Enhanced with dietary_requirements, booking_templates, booking_occasions
- Comprehensive indexes for performance
- Triggers for automatic timestamp updates