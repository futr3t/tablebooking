# 🚨 LOGIN FIX GUIDE - "Failed to Login" Error

## 🔍 Quick Diagnosis

### Step 1: Access the Debug Endpoint
Open your browser and visit:
```
https://your-backend-service.railway.app/api/diagnostic/debug-login
```

This will show you **exactly** what's wrong with your deployment.

## 🎯 Most Common Causes (99% of cases)

### 1. **Missing JWT_SECRET** (Most Likely)
**Symptom**: Login fails with "Failed to login" error
**Fix**: 
```
Railway Backend Service → Variables → Add:
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 2. **CORS Mismatch** (Very Common)
**Symptom**: Network error or CORS error in browser console
**Fix**:
```
Railway Backend Service → Variables → Add:
CORS_ORIGIN=https://your-frontend-service.railway.app
```
(Replace with your actual frontend URL)

### 3. **Frontend Not Pointing to Backend**
**Symptom**: Network requests going to localhost or wrong URL
**Fix**:
```
Railway Frontend Service → Variables → Add:
REACT_APP_API_URL=https://your-backend-service.railway.app/api
REACT_APP_SOCKET_URL=https://your-backend-service.railway.app
```
(Replace with your actual backend URL)

## 📋 Complete Environment Variables Checklist

### Backend Service (Required)
```env
# Authentication (CRITICAL - login won't work without this!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# CORS (CRITICAL - must match your frontend URL exactly)
CORS_ORIGIN=https://your-frontend-service.railway.app

# Database (Usually auto-set by Railway)
DATABASE_URL=(automatically set when you add PostgreSQL)

# Optional but recommended
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Service (Required)
```env
# API Connection (CRITICAL - must point to your backend)
REACT_APP_API_URL=https://your-backend-service.railway.app/api
REACT_APP_SOCKET_URL=https://your-backend-service.railway.app

# Build settings
NODE_ENV=production
```

## 🛠️ Step-by-Step Fix Instructions

### 1. Get Your Service URLs
1. Go to Railway Dashboard
2. Click on your **Backend Service**
3. Go to **Settings** → **Domains**
4. Copy the domain (e.g., `kind-benevolence-production.up.railway.app`)
5. Do the same for your **Frontend Service**

### 2. Set Backend Environment Variables
1. In Railway, click on your **Backend Service**
2. Go to **Variables** tab
3. Click **New Variable** and add:
   - `JWT_SECRET` = `my-super-secret-key-12345` (use a long random string)
   - `CORS_ORIGIN` = `https://[your-frontend-domain]` (NO trailing slash)
   - `JWT_EXPIRES_IN` = `24h`

### 3. Set Frontend Environment Variables
1. In Railway, click on your **Frontend Service**
2. Go to **Variables** tab
3. Click **New Variable** and add:
   - `REACT_APP_API_URL` = `https://[your-backend-domain]/api`
   - `REACT_APP_SOCKET_URL` = `https://[your-backend-domain]`

### 4. Wait for Redeploy
Railway will automatically redeploy both services when you add variables.

### 5. Verify Fix
1. Visit: `https://[your-backend-domain]/api/diagnostic/debug-login`
2. Check that no CRITICAL issues are shown
3. Try logging in with:
   - Email: `admin@restaurant.com`
   - Password: `admin123`

## 🔍 Advanced Debugging

### Check Browser Console
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for `/api/auth/login` request
5. Check:
   - Status code (should be 200)
   - Response (look for error messages)
   - Request headers (check Origin)

### Common Error Messages

#### "Network Error"
- Frontend can't reach backend
- Check `REACT_APP_API_URL` is set correctly

#### "CORS Error" 
- Backend is rejecting frontend
- Check `CORS_ORIGIN` matches your frontend URL exactly

#### "Invalid credentials"
- User/password is wrong OR JWT_SECRET is not set
- Check debug endpoint to verify admin user exists

#### "Failed to login"
- Generic error - usually means JWT_SECRET is missing
- Check backend logs in Railway

## 🚀 Quick Test URLs

After setting environment variables, test these:

1. **Backend Health**: `https://[backend-domain]/api/health`
   - Should return: `{"success":true,"data":{"status":"healthy"...}}`

2. **Debug Endpoint**: `https://[backend-domain]/api/diagnostic/debug-login`
   - Should show all environment variables status

3. **Frontend**: `https://[frontend-domain]/`
   - Should load the login page

## 💡 Pro Tips

1. **JWT_SECRET**: Use a long random string (32+ characters)
2. **CORS_ORIGIN**: Must be EXACT match (https, no trailing slash)
3. **Clear Browser Cache**: After fixing, clear cache and cookies
4. **Check Logs**: Railway → Service → Logs tab shows real-time logs

## 🆘 If Still Not Working

1. Clear your browser cache/cookies
2. Check Railway logs for both services
3. Make sure PostgreSQL database is connected to backend
4. Verify admin user exists in database
5. Try incognito/private browser window

## 📝 Example Working Configuration

### Backend Variables:
```
DATABASE_URL=postgresql://postgres:xxx@xxx.railway.internal:5432/railway
JWT_SECRET=a8f5f167f44f4964e6c998dee8270dfcc5b3e8f5a2c6b3a1
CORS_ORIGIN=https://tablebooking-frontend-production.up.railway.app
NODE_ENV=production
```

### Frontend Variables:
```
REACT_APP_API_URL=https://tablebooking-backend-production.up.railway.app/api
REACT_APP_SOCKET_URL=https://tablebooking-backend-production.up.railway.app
NODE_ENV=production
```

---

**Remember**: The #1 cause of login failure is missing `JWT_SECRET` in the backend!