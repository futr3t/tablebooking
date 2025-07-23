# Production Dockerfile for React frontend
FROM node:18-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with verbose output
RUN npm install --legacy-peer-deps --verbose

# Copy all source files including public directory
COPY . .

# Set build environment variables
ENV CI=false
ENV GENERATE_SOURCEMAP=false
ENV REACT_APP_API_URL=https://kind-benevolence-production.up.railway.app/api
ENV REACT_APP_SOCKET_URL=https://kind-benevolence-production.up.railway.app

# Build the React app
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install express --production

# Copy server file
COPY server.js .

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Verify build files
RUN echo "=== FINAL BUILD CHECK ===" && \
    ls -la build/ && \
    test -f build/index.html || (echo "ERROR: index.html not found!" && exit 1)

EXPOSE 3000
CMD ["node", "server.js"]