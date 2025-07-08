#!/bin/bash

# Script to apply the turn time minutes removal migration

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not found in .env file"
    exit 1
fi

echo "Applying turn time minutes removal migration..."

# Apply the migration
psql "$DATABASE_URL" -f remove-turn-time-minutes.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo "The turn_time_minutes column has been removed from the restaurants table."
    echo "The system will now use turn time rules for all booking duration calculations."
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi