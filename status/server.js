
/**
 * File: server.js
 * Responsibility: Lightweight status page server that runs independently
 * Notes: Serves static status page on port 3001, monitors main app on port 5000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const HOST = '0.0.0.0';

const server = http.createServer((req, res) => {
  // Handle CORS for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve the status page
  if (req.url === '/' || req.url === '/index.html') {
    try {
      const htmlPath = path.join(__dirname, 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf8');
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      console.error('Error serving status page:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
    return;
  }

  // Health check endpoint for the status page itself
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'status-page',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`🟢 Status page server running on http://${HOST}:${PORT}`);
  console.log(`📊 Monitoring main app at port 5000`);
  console.log(`🔄 Status checks every 30 seconds`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Status page server shutting down...');
  server.close(() => {
    console.log('Status page server stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Status page server shutting down...');
  server.close(() => {
    console.log('Status page server stopped');
    process.exit(0);
  });
});
