# Railway Environment Variables Setup Guide

## Problem
The admin panel login is failing because the frontend cannot connect to the backend API. This is due to missing environment variables in Railway.

## Solution

### 1. Backend Service Environment Variables
In your Railway **backend** service, add these environment variables:

```env
# CORS Configuration - CRITICAL for frontend connection
CORS_ORIGIN=https://your-frontend-service.railway.app

# JWT Configuration - CRITICAL for authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Optional but recommended
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Frontend Service Environment Variables
In your Railway **frontend** service, add these environment variables:

```env
# API Configuration - CRITICAL for backend connection
REACT_APP_API_URL=https://your-backend-service.railway.app/api
REACT_APP_SOCKET_URL=https://your-backend-service.railway.app

# Build configuration
NODE_ENV=production
```

## How to Add Environment Variables in Railway

1. Go to your Railway project
2. Click on the service (backend or frontend)
3. Go to the "Variables" tab
4. Click "Add Variable"
5. Add each variable with its value

## Getting Your Service URLs

1. In Railway, click on your backend service
2. Go to "Settings" tab
3. Look for "Domains" section
4. Copy the domain (e.g., `tablebooking-backend.railway.app`)
5. Use this for the frontend's `REACT_APP_API_URL` (add `/api` at the end)
6. Do the same for your frontend service URL for backend's `CORS_ORIGIN`

## Example with Real URLs

If your Railway services have these domains:
- Backend: `tablebooking-backend-production.up.railway.app`
- Frontend: `tablebooking-frontend-production.up.railway.app`

### Backend Variables:
```env
CORS_ORIGIN=https://tablebooking-frontend-production.up.railway.app
JWT_SECRET=my-super-secret-key-12345
JWT_EXPIRES_IN=24h
```

### Frontend Variables:
```env
REACT_APP_API_URL=https://tablebooking-backend-production.up.railway.app/api
REACT_APP_SOCKET_URL=https://tablebooking-backend-production.up.railway.app
```

## Verification Steps

1. After adding variables, Railway will automatically redeploy
2. Check the build logs to ensure variables are being used
3. In frontend build logs, look for:
   ```
   API URL: https://your-backend-service.railway.app/api
   Socket URL: https://your-backend-service.railway.app
   ```
4. Try logging in with:
   - Email: `admin@restaurant.com`
   - Password: `admin123`

## Troubleshooting

If login still fails:

1. **Check Browser Console**: Open DevTools (F12) and look for network errors
2. **Verify CORS**: Backend logs should show allowed origins
3. **Check API Response**: Network tab should show `/api/auth/login` request
4. **Clear Browser Cache**: Sometimes old localhost URLs are cached

## Common Issues

1. **"Network Error"**: Frontend can't reach backend - check `REACT_APP_API_URL`
2. **"CORS Error"**: Backend rejecting frontend - check `CORS_ORIGIN`
3. **"401 Unauthorized"**: JWT issue - check `JWT_SECRET` matches between deploys
4. **"Cannot read property 'data' of undefined"**: API URL is wrong or backend is down