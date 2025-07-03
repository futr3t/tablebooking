#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Railway Database Update - Simple Method${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "backend/src/config/schema-updates.sql" ]; then
    echo -e "${RED}❌ Schema update file not found${NC}"
    echo "Please run this from the project root directory"
    exit 1
fi

echo -e "${YELLOW}⚠️  This will update your PRODUCTION database${NC}"
echo "The updates are safe and only add new features (no data loss)"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo -e "${BLUE}📋 MANUAL STEPS REQUIRED:${NC}"
echo ""
echo "1. First, let's open a Railway database connection:"
echo -e "${YELLOW}   railway shell${NC}"
echo ""
echo "2. Then in the Railway shell, connect to PostgreSQL:"
echo -e "${YELLOW}   psql \$DATABASE_URL${NC}"
echo ""
echo "3. Copy and paste the SQL commands shown below:"
echo ""

echo -e "${GREEN}=== COPY THIS SQL (scroll down to see all) ===${NC}"
cat backend/src/config/schema-updates.sql
echo -e "${GREEN}=== END OF SQL ===${NC}"

echo ""
echo -e "${BLUE}💡 Steps Summary:${NC}"
echo "1. Run: ${YELLOW}railway shell${NC}"
echo "2. Run: ${YELLOW}psql \$DATABASE_URL${NC}"
echo "3. Copy/paste the SQL above"
echo "4. Type: ${YELLOW}\\q${NC} to exit psql"
echo "5. Type: ${YELLOW}exit${NC} to exit railway shell"
echo ""
echo -e "${GREEN}🎯 After success, your optimized booking system will be live!${NC}"