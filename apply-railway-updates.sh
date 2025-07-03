#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Applying Database Schema Updates to Railway Production${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found. Please install it first:${NC}"
    echo "npm install -g @railway/cli"
    echo "Then run: railway login"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway. Please run:${NC}"
    echo "railway login"
    exit 1
fi

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SAFETY STEPS:${NC}"
echo "1. This will modify your PRODUCTION database"
echo "2. Make sure you have a recent backup"
echo "3. The updates add new tables and columns (safe operations)"
echo "4. No existing data will be lost"
echo ""

read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

echo ""
echo -e "${BLUE}🔍 Checking Railway project connection...${NC}"

# Check if we're in a Railway project
if ! railway status &>/dev/null; then
    echo -e "${YELLOW}📁 Not connected to a Railway project. Please link to your project:${NC}"
    echo "Run: railway link"
    echo "Then re-run this script"
    exit 1
fi

# Show current project status
echo -e "${GREEN}✅ Connected to Railway project${NC}"
railway status

# Try to get database URL from Railway
echo ""
echo -e "${BLUE}🔗 Getting database connection...${NC}"

# Check if we can access variables
if ! railway variables &>/dev/null; then
    echo -e "${YELLOW}⚠️  Cannot access Railway variables. Continuing with direct connection...${NC}"
else
    echo -e "${GREEN}✅ Railway variables accessible${NC}"
fi

# Check if schema update file exists
if [ ! -f "backend/src/config/schema-updates.sql" ]; then
    echo -e "${RED}❌ Schema update file not found: backend/src/config/schema-updates.sql${NC}"
    echo "Please make sure you're running this script from the project root directory"
    exit 1
fi

echo -e "${GREEN}✅ Schema update file found${NC}"

# Create a backup SQL first (optional but recommended)
echo ""
echo -e "${BLUE}💾 Creating schema backup (optional)...${NC}"
BACKUP_FILE="railway-schema-backup-$(date +%Y%m%d-%H%M%S).sql"

# Try to create backup - if it fails, continue anyway
railway shell 'pg_dump $DATABASE_URL --schema-only' > "$BACKUP_FILE" 2>/dev/null
if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    echo -e "${GREEN}✅ Schema backup saved to: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  Could not create schema backup (continuing anyway)${NC}"
    rm -f "$BACKUP_FILE" 2>/dev/null
fi

echo ""
echo -e "${BLUE}🔄 Applying schema updates...${NC}"
echo "This may take a moment..."
echo ""

# Apply the schema updates using Railway shell with psql
if railway shell 'psql $DATABASE_URL' < backend/src/config/schema-updates.sql; then
    echo ""
    echo -e "${GREEN}🎉 Schema updates applied successfully!${NC}"
    echo ""
    echo -e "${BLUE}📊 New features added:${NC}"
    echo "  ✅ Dietary requirements tracking"
    echo "  ✅ Booking templates for repeat customers"
    echo "  ✅ Enhanced booking metadata"
    echo "  ✅ Occasion tracking (birthdays, anniversaries, etc.)"
    echo "  ✅ VIP customer support"
    echo "  ✅ Marketing consent tracking"
    echo "  ✅ Internal staff notes"
    echo "  ✅ Pacing override capabilities"
    echo ""
    echo -e "${YELLOW}🔄 Your Railway deployment will automatically restart with the new schema${NC}"
    echo -e "${GREEN}✅ The optimized booking system is now live in production!${NC}"
    
else
    echo ""
    echo -e "${RED}❌ Failed to apply schema updates${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting steps:${NC}"
    echo "1. Check if you're connected to the right project: railway link"
    echo "2. Verify your database service is running: railway status"
    echo "3. Check service logs: railway logs"
    echo "4. Try manual connection: railway shell 'psql \$DATABASE_URL'"
    echo ""
    echo -e "${BLUE}💡 Manual application:${NC}"
    echo "You can also apply the updates manually:"
    echo "1. railway shell 'psql \$DATABASE_URL'"
    echo "2. Copy and paste the contents of backend/src/config/schema-updates.sql"
    
    exit 1
fi

echo ""
echo -e "${BLUE}🧪 Test the new features:${NC}"
echo "1. Visit your Railway frontend URL"
echo "2. Login with admin@restaurant.com / admin123"
echo "3. Click 'Quick Booking' to test the new optimized form"
echo "4. Try the customer auto-complete and dietary requirements"
echo ""

# Show Railway URLs
echo -e "${BLUE}🔗 Your Railway deployment:${NC}"
railway status 2>/dev/null || echo "Run 'railway status' to see your deployment details"

echo ""
echo -e "${GREEN}🚀 Production update complete!${NC}"