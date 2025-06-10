// like-server.ts
import * as http from 'http';
import * as url from 'url';
import * as querystring from 'querystring';
import * as puppeteer from 'puppeteer-core';
import { 
  LikeInput, 
  likeGenericTweetHuman 
} from './generic_like_human';
import { getBrowserConnection } from '../shared/browser-connection';

// Server configuration
const PORT = Number(process.env.PORT) || 3002;
const HOST = process.env.HOST || 'localhost';

// Logging utility
function logWithTimestamp(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Response utility functions
function sendResponse(res: http.ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function sendError(res: http.ServerResponse, statusCode: number, message: string): void {
  logWithTimestamp(`Error ${statusCode}: ${message}`);
  sendResponse(res, statusCode, { 
    success: false, 
    error: message,
    timestamp: new Date().toISOString()
  });
}

function sendSuccess(res: http.ServerResponse, data: any = {}): void {
  sendResponse(res, 200, { 
    success: true, 
    data,
    timestamp: new Date().toISOString()
  });
}

// Parse JSON body from request
function parseRequestBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        if (body.trim() === '') {
          resolve({});
        } else {
          resolve(JSON.parse(body));
        }
      } catch (error) {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    
    req.on('error', (error) => {
      reject(error);
    });
  });
}

// Validate like input
function validateLikeRequest(data: any): LikeInput {
  // At least one search criteria must be provided
  if (!data.username && !data.searchQuery && !data.tweetContent && !data.profileUrl) {
    throw new Error('At least one of the following must be provided: username, searchQuery, tweetContent, or profileUrl');
  }

  const likeInput: LikeInput = {};

  // Validate and add username if provided
  if (data.username) {
    if (typeof data.username !== 'string' || data.username.trim().length === 0) {
      throw new Error('Username must be a non-empty string');
    }
    // Remove @ symbol if provided
    likeInput.username = data.username.trim().replace(/^@/, '');
  }

  // Validate and add search query if provided
  if (data.searchQuery) {
    if (typeof data.searchQuery !== 'string' || data.searchQuery.trim().length === 0) {
      throw new Error('Search query must be a non-empty string');
    }
    likeInput.searchQuery = data.searchQuery.trim();
  }

  // Validate and add tweet content if provided
  if (data.tweetContent) {
    if (typeof data.tweetContent !== 'string' || data.tweetContent.trim().length === 0) {
      throw new Error('Tweet content must be a non-empty string');
    }
    likeInput.tweetContent = data.tweetContent.trim();
  }

  // Validate and add profile URL if provided
  if (data.profileUrl) {
    if (typeof data.profileUrl !== 'string' || data.profileUrl.trim().length === 0) {
      throw new Error('Profile URL must be a non-empty string');
    }
    
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(data.profileUrl.trim())) {
      throw new Error('Profile URL must be a valid HTTP/HTTPS URL');
    }
    
    likeInput.profileUrl = data.profileUrl.trim();
  }

  // Validate optional parameters
  if (data.likeCount !== undefined) {
    const count = Number(data.likeCount);
    if (isNaN(count) || count < 1 || count > 10) {
      throw new Error('Like count must be a number between 1 and 10');
    }
    likeInput.likeCount = count;
  }

  if (data.scrollTime !== undefined) {
    const scrollTime = Number(data.scrollTime);
    if (isNaN(scrollTime) || scrollTime < 1000 || scrollTime > 60000) {
      throw new Error('Scroll time must be a number between 1000 and 60000 milliseconds');
    }
    likeInput.scrollTime = scrollTime;
  }

  if (data.searchInFeed !== undefined) {
    likeInput.searchInFeed = Boolean(data.searchInFeed);
  }

  if (data.visitProfile !== undefined) {
    likeInput.visitProfile = Boolean(data.visitProfile);
  }

  return likeInput;
}

// Browser connection management - using shared connection
// (removed local browser management in favor of shared connection)

// Handle POST request to like tweets
async function handleLikeTweets(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const requestBody = await parseRequestBody(req);
    logWithTimestamp(`Received like request: ${JSON.stringify(requestBody)}`);

    // Validate the request
    const likeInput = validateLikeRequest(requestBody);
    
    // Log the like operation details
    const searchCriteria = [];
    if (likeInput.username) searchCriteria.push(`username: ${likeInput.username}`);
    if (likeInput.searchQuery) searchCriteria.push(`searchQuery: ${likeInput.searchQuery}`);
    if (likeInput.tweetContent) searchCriteria.push(`tweetContent: ${likeInput.tweetContent}`);
    if (likeInput.profileUrl) searchCriteria.push(`profileUrl: ${likeInput.profileUrl}`);
    
    logWithTimestamp(`Starting like operation with criteria: ${searchCriteria.join(', ')}`);
    
    // Get browser connection
    const browser = await getBrowserConnection();
    
    // Like tweets with human-like behavior
    await likeGenericTweetHuman(browser, likeInput);
    
    logWithTimestamp('Like operation completed successfully');
    sendSuccess(res, {
      message: 'Tweets liked successfully with human-like behavior',
      likeData: {
        criteria: {
          username: likeInput.username || null,
          searchQuery: likeInput.searchQuery || null,
          tweetContent: likeInput.tweetContent || null,
          profileUrl: likeInput.profileUrl || null
        },
        options: {
          likeCount: likeInput.likeCount || 1,
          scrollTime: likeInput.scrollTime || 10000,
          searchInFeed: likeInput.searchInFeed !== false,
          visitProfile: likeInput.visitProfile !== false
        }
      }
    });
    
  } catch (error: any) {
    logWithTimestamp(`Error liking tweets: ${error.message}`);
    sendError(res, 400, error.message);
  }
}

// Handle GET request for health check
function handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
  sendSuccess(res, {
    status: 'healthy',
    browser: 'managed by shared connection',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}

// Handle GET request for API information
function handleApiInfo(req: http.IncomingMessage, res: http.ServerResponse): void {
  sendSuccess(res, {
    name: 'Tweet Like API',
    version: '1.0.0',
    description: 'HTTP API for liking tweets with human-like behavior based on search criteria',
    endpoints: {
      'POST /like': 'Like tweets based on search criteria',
      'GET /health': 'Health check',
      'GET /': 'API information'
    },
    requestFormat: {
      // Required (at least one)
      username: 'string (optional) - Target username without @ symbol',
      searchQuery: 'string (optional) - Search terms to find tweets',
      tweetContent: 'string (optional) - Specific content to look for in tweets',
      profileUrl: 'string (optional) - Direct profile URL to visit',
      
      // Optional parameters
      likeCount: 'number (optional) - Number of tweets to like (1-10, default: 1)',
      scrollTime: 'number (optional) - Time to scroll in milliseconds (1000-60000, default: 10000)',
      searchInFeed: 'boolean (optional) - Search in home feed first (default: true)',
      visitProfile: 'boolean (optional) - Visit profile if feed search fails (default: true)'
    },
    examples: [
      {
        title: 'Like by username',
        request: {
          username: 'elonmusk',
          likeCount: 2
        }
      },
      {
        title: 'Like by search query',
        request: {
          searchQuery: 'artificial intelligence',
          likeCount: 1,
          scrollTime: 15000
        }
      },
      {
        title: 'Like by tweet content',
        request: {
          tweetContent: 'climate change',
          likeCount: 3
        }
      },
      {
        title: 'Like by profile URL',
        request: {
          profileUrl: 'https://twitter.com/openai',
          likeCount: 1,
          visitProfile: true,
          searchInFeed: false
        }
      },
      {
        title: 'Combined criteria',
        request: {
          username: 'nasa',
          searchQuery: 'space exploration',
          likeCount: 2,
          scrollTime: 20000
        }
      }
    ]
  });
}

// Handle OPTIONS request for CORS
function handleOptions(req: http.IncomingMessage, res: http.ServerResponse): void {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': '0'
  });
  res.end();
}

// Main request handler
async function requestHandler(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const parsedUrl = url.parse(req.url || '', true);
  const path = parsedUrl.pathname;
  const method = req.method;

  logWithTimestamp(`${method} ${path} - ${req.headers['user-agent'] || 'Unknown'}`);

  try {
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      handleOptions(req, res);
      return;
    }

    // Route requests
    switch (path) {
      case '/':
        if (method === 'GET') {
          handleApiInfo(req, res);
        } else {
          sendError(res, 405, 'Method not allowed');
        }
        break;

      case '/health':
        if (method === 'GET') {
          handleHealthCheck(req, res);
        } else {
          sendError(res, 405, 'Method not allowed');
        }
        break;

      case '/like':
        if (method === 'POST') {
          await handleLikeTweets(req, res);
        } else {
          sendError(res, 405, 'Method not allowed. Use POST to like tweets.');
        }
        break;

      default:
        sendError(res, 404, 'Endpoint not found');
        break;
    }
  } catch (error: any) {
    logWithTimestamp(`Unhandled error: ${error.message}`);
    sendError(res, 500, 'Internal server error');
  }
}

// Graceful shutdown
function setupGracefulShutdown(server: http.Server): void {
  const shutdown = async (signal: string) => {
    logWithTimestamp(`Received ${signal}. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
      logWithTimestamp('HTTP server closed');
      
      logWithTimestamp('Graceful shutdown completed');
      process.exit(0);
    });
    
    // Force shutdown after timeout
    setTimeout(() => {
      logWithTimestamp('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the server
function startServer(): void {
  const server = http.createServer(requestHandler);
  
  server.listen(PORT, HOST, () => {
    logWithTimestamp('='.repeat(60));
    logWithTimestamp('🚀 Tweet Like HTTP Server Started');
    logWithTimestamp('='.repeat(60));
    logWithTimestamp(`Server running at http://${HOST}:${PORT}`);
    logWithTimestamp(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logWithTimestamp(`Process ID: ${process.pid}`);
    logWithTimestamp('');
    logWithTimestamp('Available endpoints:');
    logWithTimestamp(`  GET  http://${HOST}:${PORT}/          - API information`);
    logWithTimestamp(`  GET  http://${HOST}:${PORT}/health    - Health check`);
    logWithTimestamp(`  POST http://${HOST}:${PORT}/like      - Like tweets`);
    logWithTimestamp('');
    logWithTimestamp('Example POST requests:');
    logWithTimestamp('');
    logWithTimestamp('# Like by username:');
    logWithTimestamp('  curl -X POST http://localhost:3002/like \\');
    logWithTimestamp('    -H "Content-Type: application/json" \\');
    logWithTimestamp('    -d \'{"username":"elonmusk","likeCount":2}\'');
    logWithTimestamp('');
    logWithTimestamp('# Like by search query:');
    logWithTimestamp('  curl -X POST http://localhost:3002/like \\');
    logWithTimestamp('    -H "Content-Type: application/json" \\');
    logWithTimestamp('    -d \'{"searchQuery":"artificial intelligence","likeCount":1}\'');
    logWithTimestamp('');
    logWithTimestamp('# Like by tweet content:');
    logWithTimestamp('  curl -X POST http://localhost:3002/like \\');
    logWithTimestamp('    -H "Content-Type: application/json" \\');
    logWithTimestamp('    -d \'{"tweetContent":"climate change","likeCount":3}\'');
    logWithTimestamp('');
    logWithTimestamp('# Like by profile URL:');
    logWithTimestamp('  curl -X POST http://localhost:3002/like \\');
    logWithTimestamp('    -H "Content-Type: application/json" \\');
    logWithTimestamp('    -d \'{"profileUrl":"https://twitter.com/openai","likeCount":1}\'');
    logWithTimestamp('='.repeat(60));
  });

  server.on('error', (error: any) => {
    logWithTimestamp(`Server error: ${error.message}`);
    process.exit(1);
  });

  setupGracefulShutdown(server);
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { startServer, requestHandler };


// usage 
// # Start server
// npm run like-server

// # Test endpoints
// npm run test-like-server

// # Like by username
// curl -X POST http://localhost:3002/like \
//   -H "Content-Type: application/json" \
//   -d '{"username": "elonmusk", "likeCount": 2}'

// # Like by search query
// curl -X POST http://localhost:3002/like \
//   -H "Content-Type: application/json" \
//   -d '{"searchQuery": "artificial intelligence", "likeCount": 1, "scrollTime": 15000}'

// # Like by tweet content
// curl -X POST http://localhost:3002/like \
//   -H "Content-Type: application/json" \
//   -d '{"tweetContent": "climate change", "likeCount": 3}'

// # Like by profile URL
// curl -X POST http://localhost:3002/like \
//   -H "Content-Type: application/json" \
//   -d '{"profileUrl": "https://twitter.com/openai", "likeCount": 1, "visitProfile": true, "searchInFeed": false}'

// # Combined criteria (username + search query)
// curl -X POST http://localhost:3002/like \
//   -H "Content-Type: application/json" \
//   -d '{"username": "nasa", "searchQuery": "space exploration", "likeCount": 2, "scrollTime": 20000}'
