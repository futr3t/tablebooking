#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔗 Direct Database Connection Method${NC}"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL client (psql) not found${NC}"
    echo ""
    echo "Install PostgreSQL client:"
    echo "  Ubuntu/Debian: sudo apt install postgresql-client"
    echo "  macOS: brew install postgresql"
    echo "  Windows: Download from postgresql.org"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL client found${NC}"

# Check if schema file exists
if [ ! -f "backend/src/config/schema-updates.sql" ]; then
    echo -e "${RED}❌ Schema update file not found${NC}"
    echo "Please run this from the project root directory"
    exit 1
fi

echo -e "${GREEN}✅ Schema update file found${NC}"
echo ""

echo -e "${YELLOW}📋 Get your Railway database URL:${NC}"
echo ""
echo "1. Go to https://railway.app"
echo "2. Open your tablebooking project"
echo "3. Click on PostgreSQL service"
echo "4. Go to 'Variables' or 'Connect' tab"
echo "5. Copy the DATABASE_URL (starts with postgresql://)"
echo ""

read -p "Enter your DATABASE_URL: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ No DATABASE_URL provided${NC}"
    exit 1
fi

# Validate URL format
if [[ ! $DATABASE_URL =~ ^postgresql:// ]]; then
    echo -e "${RED}❌ Invalid DATABASE_URL format${NC}"
    echo "Should start with postgresql://"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Database URL provided${NC}"
echo ""

echo -e "${YELLOW}⚠️  About to update PRODUCTION database${NC}"
echo "This will add new tables and columns (safe operation)"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo -e "${BLUE}🔄 Applying database updates...${NC}"

# Apply the schema updates directly
if psql "$DATABASE_URL" -f backend/src/config/schema-updates.sql; then
    echo ""
    echo -e "${GREEN}🎉 Database updates applied successfully!${NC}"
    echo ""
    echo -e "${BLUE}📊 New features added:${NC}"
    echo "  ✅ Dietary requirements tracking"
    echo "  ✅ Customer booking templates"
    echo "  ✅ Occasion tracking"
    echo "  ✅ VIP customer support"
    echo "  ✅ Enhanced booking metadata"
    echo ""
    echo -e "${GREEN}🚀 Your optimized booking system is now live!${NC}"
    echo ""
    echo "Test it by:"
    echo "1. Visit your Railway frontend URL"
    echo "2. Login with admin@restaurant.com / admin123"
    echo "3. Click 'Quick Booking' button"
    echo "4. Try customer auto-complete and dietary requirements"
    
else
    echo ""
    echo -e "${RED}❌ Failed to apply updates${NC}"
    echo ""
    echo -e "${YELLOW}💡 Troubleshooting:${NC}"
    echo "1. Check your DATABASE_URL is correct"
    echo "2. Verify you have database permissions"
    echo "3. Make sure PostgreSQL service is running on Railway"
    echo "4. Try the Railway dashboard method instead"
fi

echo ""