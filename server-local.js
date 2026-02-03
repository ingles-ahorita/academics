import http from 'http';
import url from 'url';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;

// Import API handlers
import createCalendarEventHandler from './api/create-calendar-event.js';
import createStudentHandler from './api/create-student.js';
import kajabiWebhookHandler from './api/kajabi-webhook.js';

// Route mapping
const routes = {
  '/api/create-calendar-event': createCalendarEventHandler,
  '/api/create-student': createStudentHandler,
  '/api/kajabi-webhook': kajabiWebhookHandler,
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Find matching route
  const handler = routes[pathname];

  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Mock Vercel's req object
  const mockReq = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: parsedUrl.query,
    body: null,
  };

  // Mock Vercel's res object
  let responseSent = false;
  const mockRes = {
    statusCode: 200,
    headers: {},
    setHeader: (name, value) => {
      res.setHeader(name, value);
      mockRes.headers[name] = value;
      return mockRes;
    },
    getHeader: (name) => mockRes.headers[name],
    status: (code) => {
      mockRes.statusCode = code;
      return mockRes;
    },
    json: (data) => {
      if (responseSent) return mockRes;
      responseSent = true;
      const contentType = mockRes.headers['Content-Type'] || 'application/json';
      res.writeHead(mockRes.statusCode, { 'Content-Type': contentType });
      res.end(JSON.stringify(data));
      return mockRes;
    },
    end: (data) => {
      if (responseSent) return mockRes;
      responseSent = true;
      res.writeHead(mockRes.statusCode, mockRes.headers);
      res.end(data);
      return mockRes;
    },
    send: (data) => {
      if (responseSent) return mockRes;
      responseSent = true;
      const contentType = mockRes.headers['Content-Type'] || 'text/plain';
      res.writeHead(mockRes.statusCode, { 'Content-Type': contentType });
      res.end(data);
      return mockRes;
    },
  };

  // Parse JSON body for POST/PUT requests
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        if (body) {
          mockReq.body = JSON.parse(body);
        }
        await handler(mockReq, mockRes);
        // Ensure response is sent if handler didn't call res.json/res.end
        if (!responseSent) {
          responseSent = true;
          res.writeHead(mockRes.statusCode || 200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Handler did not send a response' }));
        }
      } catch (error) {
        console.error(`Error handling ${pathname}:`, error);
        if (!responseSent) {
          responseSent = true;
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Internal server error', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }));
        }
      }
    });
  } else {
    // GET, DELETE, etc.
    try {
      await handler(mockReq, mockRes);
      if (!responseSent) {
        responseSent = true;
        res.writeHead(mockRes.statusCode || 200);
        res.end();
      }
    } catch (error) {
      console.error(`Error handling ${pathname}:`, error);
      if (!responseSent) {
        responseSent = true;
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Internal server error', 
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }));
      }
    }
  }

  // Timeout to prevent hanging requests
  req.setTimeout(30000, () => {
    if (!responseSent) {
      responseSent = true;
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request timeout' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📡 Available endpoints:`);
  Object.keys(routes).forEach((route) => {
    console.log(`   ${route}`);
  });
  console.log(`\n💡 Example: curl -X POST http://localhost:${PORT}/api/create-calendar-event \\`);
  console.log(`   -H "Content-Type: application/json" \\`);
  console.log(`   -d '{"summary":"Test","startTime":"2024-01-01T10:00:00Z","endTime":"2024-01-01T11:00:00Z"}'`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Try a different port with PORT=3002 npm run dev:api`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});
