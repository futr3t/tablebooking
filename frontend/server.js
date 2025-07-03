const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== FRONTEND SERVER STARTING ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current directory:', __dirname);
console.log('Directory contents:', fs.readdirSync(__dirname));

const buildPath = path.join(__dirname, 'build');
const buildExists = fs.existsSync(buildPath);
console.log('Build path:', buildPath);
console.log('Build exists:', buildExists);

if (buildExists) {
  console.log('Build directory contents:', fs.readdirSync(buildPath).slice(0, 10));
  
  // Serve static files
  app.use(express.static(buildPath));
  
  // CRITICAL: Handle Railway's healthcheck at root path
  app.get('/', (req, res) => {
    console.log('Healthcheck request received at /');
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send('OK - Server running but index.html not found');
    }
  });
  
  // Catch all handler for React Router
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  // If no build directory, still respond to healthchecks
  app.get('*', (req, res) => {
    console.log('Request to:', req.path);
    res.status(503).send(`Build directory not found. Server running on port ${PORT}`);
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server started successfully on port ${PORT}`);
  console.log(`Server is ready to accept connections`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Log any uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});