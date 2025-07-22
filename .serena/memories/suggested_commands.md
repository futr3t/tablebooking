# Suggested Commands for Development

## Backend Development Commands

### Starting Development
```bash
cd backend
npm install                  # Install dependencies
npm run dev                  # Start development server (nodemon + ts-node)
```

### Testing
```bash
cd backend
npm test                     # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Generate coverage report
```

### Production
```bash
cd backend
npm start                    # Start with ts-node --transpile-only
```

## Frontend Development Commands

### Starting Development  
```bash
cd frontend
npm install                  # Install dependencies
npm run dev                  # Start React development server (port 3000)
npm start                    # Start production server (uses server.js)
```

### Building
```bash
cd frontend
npm run build               # Create production build
```

## Database Commands

### Initial Setup
```bash
./setup-database.sh         # Create schema and tables
./setup-admin-fixed.sh      # Create admin user
```

### PostgreSQL Access
```bash
psql $DATABASE_URL          # Connect to database
psql tablebooking < backend/src/config/schema.sql  # Run schema
```

## Git Commands
```bash
git add .                   # Stage all changes
git commit -m "message"     # Commit changes
git push origin main        # Push to GitHub
```

## Railway Deployment
```bash
railway login               # Login to Railway CLI
railway link                # Link to project
railway run npm run dev     # Run with Railway environment
railway logs                # View deployment logs
```

## System Commands (Linux)
```bash
ls -la                      # List files with details
cd /path/to/dir            # Change directory
grep -r "pattern" .        # Search files recursively
find . -name "*.ts"        # Find TypeScript files
cat file.txt               # View file contents
```

## Port Information
- Backend API: Port 3001
- Frontend Dev: Port 3000  
- PostgreSQL: Port 5432 (default)
- Redis: Port 6379 (default)

## Environment Setup
- Copy `.env.example` to `.env`
- Update database URLs and secrets
- Set JWT_SECRET to secure random string
- Configure CORS_ORIGIN for frontend URL