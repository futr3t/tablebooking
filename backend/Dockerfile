# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the application using ts-node
CMD ["npm", "start"]