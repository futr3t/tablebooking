#!/bin/bash

# Script to apply party-size-specific turn times migration

echo "=== Applying Party-Size Turn Times Migration ==="
echo ""

# Check if PostgreSQL environment variables are set
if [ -z "$DATABASE_URL" ]; then
    # Try to load from .env file
    if [ -f .env ]; then
        export $(cat .env | grep -E '^DATABASE_URL=' | xargs)
    fi
fi

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL or ensure it's in your .env file"
    exit 1
fi

# Apply the migration
echo "Applying migration to add party-size turn time rules..."
psql "$DATABASE_URL" -f src/config/add-party-size-turn-times.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "New features added:"
    echo "- turn_time_rules table for party-size-specific turn times"
    echo "- get_turn_time_for_party() function for intelligent turn time selection"
    echo "- Sample turn time rules for demo restaurant:"
    echo "  • 1-2 guests: 90 minutes"
    echo "  • 3-4 guests: 120 minutes (standard)"
    echo "  • 5-8 guests: 150 minutes"
    echo "  • 9-20 guests: 180 minutes"
    echo ""
    echo "You can now configure different turn times based on party size!"
else
    echo ""
    echo "❌ Migration failed. Please check your database connection and try again."
    exit 1
fi