#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Applying database schema updates for optimized booking system...${NC}"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in .env${NC}"
    exit 1
fi

# Apply schema updates
echo -e "${GREEN}Applying schema updates...${NC}"
psql "$DATABASE_URL" < src/config/schema-updates.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Schema updates applied successfully${NC}"
else
    echo -e "${RED}✗ Error applying schema updates${NC}"
    exit 1
fi

echo -e "${GREEN}Database schema updated successfully!${NC}"
echo ""
echo "New features added:"
echo "  - Dietary requirements tracking"
echo "  - Booking templates for repeat customers"
echo "  - Enhanced booking metadata"
echo "  - Occasion tracking"
echo "  - VIP customer support"
echo "  - Marketing consent tracking"
echo "  - Internal notes for staff"
echo ""
echo -e "${YELLOW}Remember to restart the backend server to use the new features.${NC}"