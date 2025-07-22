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
  
  // Add API endpoint for debugging FIRST
  app.get('/api/frontend-health', (req, res) => {
    res.json({
      service: 'frontend',
      status: 'running',
      buildExists: true,
      buildPath: buildPath,
      port: PORT,
      nodeEnv: process.env.NODE_ENV,
      indexExists: fs.existsSync(path.join(buildPath, 'index.html'))
    });
  });
  
  // Serve static files from build directory
  app.use(express.static(buildPath, { 
    setHeaders: (res, path) => {
      console.log('Serving static file:', path);
    }
  }));
  
  // Catch all handler for React Router - handles all non-static routes
  app.get('*', (req, res) => {
    console.log('Catch-all handler for:', req.path);
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      console.log('Serving index.html for:', req.path);
      res.sendFile(indexPath);
    } else {
      console.error('index.html not found at:', indexPath);
      res.status(404).json({
        error: 'index.html not found',
        path: indexPath,
        buildContents: fs.readdirSync(buildPath)
      });
    }
  });
} else {
  // Add API endpoint for debugging even without build
  app.get('/api/frontend-health', (req, res) => {
    res.json({
      service: 'frontend',
      status: 'running-no-build',
      buildExists: false,
      buildPath: buildPath,
      port: PORT,
      nodeEnv: process.env.NODE_ENV,
      error: 'Build directory not found'
    });
  });
  
  // If no build directory, still respond to healthchecks
  app.get('*', (req, res) => {
    console.log('Request to:', req.path);
    res.status(503).json({
      service: 'frontend',
      error: 'Build directory not found',
      message: `Frontend server running on port ${PORT} but React build is missing`,
      buildPath: buildPath
    });
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