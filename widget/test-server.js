const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath = '';
  
  if (req.url === '/' || req.url === '/index.html') {
    filePath = path.join(__dirname, 'public', 'index.html');
  } else if (req.url === '/widget.js') {
    filePath = path.join(__dirname, 'dist', 'widget.js');
  } else if (req.url.startsWith('/dist/')) {
    filePath = path.join(__dirname, req.url);
  } else {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Determine content type
  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'application/javascript';
  if (ext === '.css') contentType = 'text/css';

  // Read and serve file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*' 
    });
    res.end(data);
  });
});

const port = 8080;
server.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
  console.log('Open your browser to see the booking widget demo');
});