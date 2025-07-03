#!/bin/bash

echo "Starting frontend server..."

# Check if build directory exists
if [ ! -d "build" ]; then
    echo "ERROR: Build directory not found!"
    echo "Please ensure the build phase completed successfully."
    exit 1
fi

# Check if index.html exists
if [ ! -f "build/index.html" ]; then
    echo "ERROR: build/index.html not found!"
    echo "Build appears to be incomplete."
    exit 1
fi

echo "Build directory found. Starting serve..."
echo "Server will be available at http://localhost:${PORT:-3000}"

# Start serve with SPA mode
exec serve -s build -p ${PORT:-3000} --single