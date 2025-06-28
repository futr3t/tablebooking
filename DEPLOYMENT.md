# Restaurant Booking Platform - Railway Deployment Guide

## Prerequisites

- GitHub account
- Railway account (sign up at https://railway.app)
- Git installed locally

## Step 1: Initialize Git Repository

```bash
# Initialize git in the project root
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Restaurant booking platform"

# Create a new repository on GitHub
# Then add the remote and push
git remote add origin https://github.com/YOUR_USERNAME/restaurant-booking.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend on Railway

1. Go to https://railway.app and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-detect the backend service

### Configure Backend Environment Variables

In Railway dashboard, add these environment variables:

```env
NODE_ENV=production
PORT=3001

# Database (Railway will auto-provision these)
DATABASE_URL=<auto-provisioned by Railway>
REDIS_URL=<auto-provisioned by Railway>

# Security
JWT_SECRET=<generate-a-secure-random-string>
JWT_EXPIRES_IN=24h

# CORS (update with your frontend URL after deployment)
CORS_ORIGIN=https://your-frontend.railway.app

# Email (optional)
SENDGRID_API_KEY=<your-sendgrid-key>
FROM_EMAIL=noreply@yourdomain.com

# SMS (optional)
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_PHONE_NUMBER=<your-twilio-number>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Add PostgreSQL and Redis Services

1. In your Railway project, click "+ New"
2. Select "Database" > "Add PostgreSQL"
3. Click "+ New" again
4. Select "Database" > "Add Redis"
5. Railway will automatically set DATABASE_URL and REDIS_URL

### Initialize Database

After deployment, run the schema setup:

1. Click on your backend service in Railway
2. Go to "Settings" > "Deploy" section
3. Click "Run command"
4. Enter: `psql $DATABASE_URL -f src/config/schema.sql`

## Step 3: Deploy Frontend on Railway

1. In the same Railway project, click "+ New"
2. Select "Empty Service"
3. Connect it to your GitHub repo
4. Set the root directory to `/frontend`

### Configure Frontend Environment Variables

```env
REACT_APP_API_URL=https://your-backend.railway.app/api
REACT_APP_SOCKET_URL=https://your-backend.railway.app
```

## Step 4: Custom Domains (Optional)

1. Go to service settings in Railway
2. Click on "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Step 5: Post-Deployment Setup

### Create Initial Admin User

SSH into your backend service and run:

```bash
# Connect to the database
psql $DATABASE_URL

# Insert admin user (update with your details)
INSERT INTO users (email, password_hash, first_name, last_name, role, restaurant_id) 
VALUES (
  'admin@restaurant.com',
  '$2a$10$YourHashedPasswordHere', -- Use bcrypt to hash
  'Admin',
  'User',
  'owner',
  'your-restaurant-uuid'
);
```

### Test the Deployment

1. Visit your frontend URL
2. Login with admin credentials
3. Create test bookings
4. Verify real-time updates work

## Monitoring & Maintenance

### View Logs
- Click on any service in Railway
- Go to "Deployments" tab
- Click on a deployment to view logs

### Database Backups
Railway automatically backs up PostgreSQL. For manual backups:

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Scaling
- Go to service settings
- Adjust "Replicas" for horizontal scaling
- Upgrade plan for more resources

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure CORS_ORIGIN in backend matches frontend URL
   - Include protocol (https://)

2. **Database Connection Failed**
   - Check DATABASE_URL is set correctly
   - Ensure PostgreSQL service is running

3. **Socket.io Not Connecting**
   - Verify REACT_APP_SOCKET_URL matches backend URL
   - Check WebSocket support is enabled

4. **Build Failures**
   - Check build logs in Railway
   - Ensure all dependencies are in package.json
   - Verify Node version compatibility

### Railway CLI (Optional)

Install Railway CLI for local development:

```bash
npm install -g @railway/cli
railway login
railway link
railway run npm run dev
```

## Environment-Specific Notes

### Production Best Practices

1. **Security**
   - Use strong JWT_SECRET
   - Enable HTTPS (Railway provides by default)
   - Keep dependencies updated

2. **Performance**
   - Enable caching headers
   - Use CDN for static assets
   - Monitor response times

3. **Reliability**
   - Set up health checks
   - Configure auto-restart
   - Monitor error rates

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: https://github.com/YOUR_USERNAME/restaurant-booking/issues