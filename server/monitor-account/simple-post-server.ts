// simple-post-server.ts - Simple HTTP server to get latest post URLs
import * as http from 'http';
import * as url from 'url';
import { getBrowserConnection } from '../shared/browser-connection';
import { logWithTimestamp } from '../shared/utilities';
import { getLatestPostUrl } from './post-url-fetcher';

// Server configuration
const PORT = Number(process.env.MONITOR_SERVER_PORT) || 3007;
const HOST = process.env.MONITOR_SERVER_HOST || 'localhost';

// Response utility functions
function sendResponse(res: http.ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res: http.ServerResponse, statusCode: number, message: string): void {
  logWithTimestamp(`Error ${statusCode}: ${message}`, 'SERVER');
  sendResponse(res, statusCode, { 
    success: false, 
    error: message,
    timestamp: new Date().toISOString()
  });
}

function sendSuccess(res: http.ServerResponse, data: any): void {
  sendResponse(res, 200, { 
    success: true, 
    ...data,
    timestamp: new Date().toISOString()
  });
}

// Handle GET request to fetch latest post URL
async function handleGetPostUrl(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const parsedUrl = url.parse(req.url || '', true);
    const username = parsedUrl.query.username as string;
    
    if (!username) {
      sendError(res, 400, 'Username parameter is required. Example: /get-post?username=mzeeshanaly');
      return;
    }
    
    logWithTimestamp(`GET /get-post - Fetching latest post for @${username}`, 'SERVER');
    
    // Get browser connection
    const browser = await getBrowserConnection();
    
    // Fetch latest post URL
    const result = await getLatestPostUrl(browser, username);
    
    // Send response
    sendSuccess(res, result);
    
  } catch (error: any) {
    logWithTimestamp(`Error in handleGetPostUrl: ${error.message}`, 'SERVER');
    sendError(res, 500, `Failed to fetch post URL: ${error.message}`);
  }
}

// Handle health check
function handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
  sendSuccess(res, {
    status: 'healthy',
    service: 'Post URL Fetcher',
    uptime: process.uptime()
  });
}

// Handle CORS preflight
function handleOptions(req: http.IncomingMessage, res: http.ServerResponse): void {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
}

// Main request handler
async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  logWithTimestamp(`${method} ${pathname}`, 'SERVER');

  try {
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      handleOptions(req, res);
      return;
    }

    // Route handlers
    if (pathname === '/get-post' && method === 'GET') {
      await handleGetPostUrl(req, res);
    } else if (pathname === '/health' && method === 'GET') {
      handleHealthCheck(req, res);
    } else if (pathname === '/' && method === 'GET') {
      sendSuccess(res, {
        message: 'Post URL Fetcher API',
        endpoints: {
          'GET /get-post?username=USER': 'Get latest post URL for a user',
          'GET /health': 'Health check'
        },
        example: '/get-post?username=mzeeshanaly'
      });
    } else {
      sendError(res, 404, `Endpoint not found: ${pathname}`);
    }
  } catch (error: any) {
    logWithTimestamp(`Unhandled error: ${error.message}`, 'SERVER');
    sendError(res, 500, 'Internal server error');
  }
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  logWithTimestamp(`🚀 Post URL Fetcher Server Started!`, 'SERVER');
  logWithTimestamp(`📍 Server: http://${HOST}:${PORT}`, 'SERVER');
  logWithTimestamp(`📊 Get Post: http://${HOST}:${PORT}/get-post?username=mzeeshanaly`, 'SERVER');
  logWithTimestamp(`🏥 Health: http://${HOST}:${PORT}/health`, 'SERVER');
  logWithTimestamp(`✅ Ready to fetch post URLs!`, 'SERVER');
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    logWithTimestamp(`❌ Port ${PORT} is in use. Set MONITOR_SERVER_PORT in .env`, 'SERVER');
  } else {
    logWithTimestamp(`❌ Server error: ${error.message}`, 'SERVER');
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logWithTimestamp('📴 Shutting down server...', 'SERVER');
  server.close(() => {
    logWithTimestamp('Server closed', 'SERVER');
    process.exit(0);
  });
});

export { server };
