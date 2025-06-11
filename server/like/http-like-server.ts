// http-like-server.ts
import * as http from 'http';
import * as url from 'url';
import * as querystring from 'querystring';
import * as puppeteer from 'puppeteer-core';
import { 
  LikeInput, 
  likeGenericTweetHuman, 
  connectToBrowser, 
  getWebSocketUrl 
} from './generic_like_human';

// Server configuration
const PORT = Number(process.env.PORT) || 3002;
const HOST = process.env.HOST || 'localhost';

// Global browser instance to reuse connections
let globalBrowser: puppeteer.Browser | null = null;

// Logging utility with enhanced formatting
function logWithTimestamp(message: string, level: 'INFO' | 'ERROR' | 'WARN' = 'INFO'): void {
  const timestamp = new Date().toISOString();
  const colorCode = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[32m';
  const resetCode = '\x1b[0m';
  console.log(`${colorCode}[${timestamp}] [${level}] ${message}${resetCode}`);
}

// Response utility functions
function sendResponse(res: http.ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res: http.ServerResponse, statusCode: number, message: string, details?: any): void {
  logWithTimestamp(`Error ${statusCode}: ${message}`, 'ERROR');
  sendResponse(res, statusCode, { 
    success: false, 
    error: message,
    details: details || null,
    timestamp: new Date().toISOString()
  });
}

function sendSuccess(res: http.ServerResponse, data: any = {}, message?: string): void {
  logWithTimestamp(message || 'Request successful');
  sendResponse(res, 200, { 
    success: true, 
    message: message || 'Operation completed successfully',
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
          return;
        }
        
        // Try to parse as JSON first
        try {
          const jsonData = JSON.parse(body);
          resolve(jsonData);
        } catch (jsonError) {
          // If JSON parsing fails, try URL-encoded parsing
          const urlData = querystring.parse(body);
          resolve(urlData);
        }
      } catch (error) {
        reject(new Error('Invalid request body format'));
      }
    });
    
    req.on('error', (error) => {
      reject(error);
    });
  });
}

// Validate like input data
function validateLikeData(data: any): { isValid: boolean; error?: string; likeInput?: LikeInput } {
  if (!data) {
    return { isValid: false, error: 'No data provided' };
  }

  // At least one search criteria must be provided
  if (!data.username && !data.searchQuery && !data.tweetContent && !data.profileUrl) {
    return { 
      isValid: false, 
      error: 'At least one of the following must be provided: username, searchQuery, tweetContent, or profileUrl' 
    };
  }

  // Create like input object
  const likeInput: LikeInput = {};
  
  // Validate and set username
  if (data.username) {
    if (typeof data.username !== 'string' || data.username.trim().length === 0) {
      return { isValid: false, error: 'Username must be a non-empty string' };
    }
    likeInput.username = data.username.trim();
  }
  
  // Validate and set search query
  if (data.searchQuery) {
    if (typeof data.searchQuery !== 'string' || data.searchQuery.trim().length === 0) {
      return { isValid: false, error: 'Search query must be a non-empty string' };
    }
    likeInput.searchQuery = data.searchQuery.trim();
  }
  
  // Validate and set tweet content
  if (data.tweetContent) {
    if (typeof data.tweetContent !== 'string' || data.tweetContent.trim().length === 0) {
      return { isValid: false, error: 'Tweet content must be a non-empty string' };
    }
    likeInput.tweetContent = data.tweetContent.trim();
  }
  
  // Validate and set profile URL
  if (data.profileUrl) {
    if (typeof data.profileUrl !== 'string' || data.profileUrl.trim().length === 0) {
      return { isValid: false, error: 'Profile URL must be a non-empty string' };
    }
    
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(data.profileUrl.trim())) {
      return { isValid: false, error: 'Profile URL must be a valid HTTP/HTTPS URL' };
    }
    
    likeInput.profileUrl = data.profileUrl.trim();
  }
  
  // Validate and set optional parameters
  if (data.likeCount !== undefined) {
    const count = Number(data.likeCount);
    if (isNaN(count) || count < 1 || count > 10) {
      return { isValid: false, error: 'Like count must be a number between 1 and 10' };
    }
    likeInput.likeCount = count;
  }
  
  if (data.scrollTime !== undefined) {
    const scrollTime = Number(data.scrollTime);
    if (isNaN(scrollTime) || scrollTime < 1000 || scrollTime > 60000) {
      return { isValid: false, error: 'Scroll time must be a number between 1000 and 60000 milliseconds' };
    }
    likeInput.scrollTime = scrollTime;
  }
  
  if (data.searchInFeed !== undefined) {
    likeInput.searchInFeed = Boolean(data.searchInFeed);
  }
  
  if (data.visitProfile !== undefined) {
    likeInput.visitProfile = Boolean(data.visitProfile);
  }

  return { isValid: true, likeInput };
}

// Initialize browser connection
async function initializeBrowser(): Promise<puppeteer.Browser> {
  if (globalBrowser) {
    try {
      // Test if browser is still connected
      await globalBrowser.version();
      return globalBrowser;
    } catch (error) {
      logWithTimestamp('Browser connection lost, reconnecting...', 'WARN');
      globalBrowser = null;
    }
  }

  try {
    globalBrowser = await connectToBrowser();
    logWithTimestamp('Browser connected successfully');
    return globalBrowser;
  } catch (error: any) {
    logWithTimestamp(`Failed to connect to browser: ${error.message}`, 'ERROR');
    throw new Error('Browser connection failed. Please ensure the browser is running and WebSocket endpoint is correct.');
  }
}

// Main like handler
async function handleLikeRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    logWithTimestamp('Received like request');
    
    // Parse request body
    const requestData = await parseRequestBody(req);
    logWithTimestamp(`Request data: ${JSON.stringify(requestData)}`);
    
    // Validate like data
    const validation = validateLikeData(requestData);
    if (!validation.isValid) {
      sendError(res, 400, validation.error!);
      return;
    }
    
    const likeInput = validation.likeInput!;
    
    // Log the like operation details
    const searchCriteria = [];
    if (likeInput.username) searchCriteria.push(`username: ${likeInput.username}`);
    if (likeInput.searchQuery) searchCriteria.push(`searchQuery: ${likeInput.searchQuery}`);
    if (likeInput.tweetContent) searchCriteria.push(`tweetContent: ${likeInput.tweetContent}`);
    if (likeInput.profileUrl) searchCriteria.push(`profileUrl: ${likeInput.profileUrl}`);
    
    logWithTimestamp(`Starting like operation with criteria: ${searchCriteria.join(', ')}`);
    logWithTimestamp(`Options: likeCount=${likeInput.likeCount || 1}, scrollTime=${likeInput.scrollTime || 10000}ms, searchInFeed=${likeInput.searchInFeed !== false}, visitProfile=${likeInput.visitProfile !== false}`);
    
    // Initialize browser connection
    const browser = await initializeBrowser();
    
    // Perform like operation with human-like behavior
    await likeGenericTweetHuman(browser, likeInput);
    
    logWithTimestamp('Like operation completed successfully!');
    
    // Send success response
    sendSuccess(res, {
      likeOperation: {
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
    }, 'Like operation completed successfully with human-like behavior');
    
  } catch (error: any) {
    logWithTimestamp(`Error during like operation: ${error.message}`, 'ERROR');
    sendError(res, 500, 'Failed to complete like operation', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Health check handler
function handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
  sendSuccess(res, {
    server: 'HTTP Like Server',
    status: 'running',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    browserConnected: globalBrowser !== null
  }, 'Server is healthy');
}

// API documentation handler
function handleApiDocs(req: http.IncomingMessage, res: http.ServerResponse): void {
  const docs = {
    title: 'HTTP Like Server API',
    version: '1.0.0',
    description: 'HTTP server for liking tweets with human-like behavior based on flexible search criteria',
    endpoints: {
      'POST /like': {
        description: 'Like tweets matching specified criteria with human-like behavior',
        requestBody: {
          username: 'string (optional) - Target username without @ symbol (e.g., "ImranKhanPTI")',
          searchQuery: 'string (optional) - Search terms to find tweets (e.g., "Imran Khan politics")',
          tweetContent: 'string (optional) - Specific content to look for in tweets',
          profileUrl: 'string (optional) - Direct profile URL to visit',
          likeCount: 'number (optional) - Number of tweets to like (1-10, default: 1)',
          scrollTime: 'number (optional) - Time to scroll in milliseconds (1000-60000, default: 10000)',
          searchInFeed: 'boolean (optional) - Search in home feed first (default: true)',
          visitProfile: 'boolean (optional) - Visit profile if feed search fails (default: true)'
        },
        note: 'At least one of username, searchQuery, tweetContent, or profileUrl must be provided',
        examples: [
          {
            title: 'Like by username',
            body: {
              username: 'ImranKhanPTI',
              likeCount: 2
            }
          },
          {
            title: 'Like by search query',
            body: {
              searchQuery: 'climate change',
              likeCount: 1,
              scrollTime: 15000
            }
          },
          {
            title: 'Like by tweet content',
            body: {
              tweetContent: 'artificial intelligence',
              searchInFeed: true,
              visitProfile: false
            }
          },
          {
            title: 'Like by profile URL',
            body: {
              profileUrl: 'https://twitter.com/elonmusk',
              likeCount: 1
            }
          },
          {
            title: 'Combined criteria',
            body: {
              username: 'PTIofficial',
              searchQuery: 'Pakistan politics',
              likeCount: 3,
              scrollTime: 20000
            }
          }
        ],
        response: {
          success: true,
          message: 'Like operation completed successfully with human-like behavior',
          data: {
            likeOperation: {
              criteria: 'object',
              options: 'object'
            }
          }
        }
      },
      'GET /health': {
        description: 'Check server health and status',
        response: {
          success: true,
          data: {
            server: 'string',
            status: 'string',
            browserConnected: 'boolean'
          }
        }
      },
      'GET /docs': {
        description: 'API documentation (this endpoint)'
      }
    },
    examples: {
      curl: [
        '# Like tweets by username',
        'curl -X POST http://localhost:3002/like \\',
        '  -H "Content-Type: application/json" \\',
        '  -d \'{"username": "ImranKhanPTI", "likeCount": 2}\'',
        '',
        '# Like tweets by search query',
        'curl -X POST http://localhost:3002/like \\',
        '  -H "Content-Type: application/json" \\',
        '  -d \'{"searchQuery": "climate change", "scrollTime": 15000}\'',
        '',
        '# Like by tweet content with options',
        'curl -X POST http://localhost:3002/like \\',
        '  -H "Content-Type: application/json" \\',
        '  -d \'{"tweetContent": "AI technology", "searchInFeed": true, "visitProfile": false}\'',
        '',
        '# Health check',
        'curl http://localhost:3002/health'
      ]
    }
  };
  
  sendSuccess(res, docs, 'API Documentation');
}

// Main request handler
function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  const parsedUrl = url.parse(req.url || '', true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Log all requests
  logWithTimestamp(`${method} ${path} from ${req.socket.remoteAddress}`);

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Route handling
  try {
    switch (path) {
      case '/like':
        if (method === 'POST') {
          handleLikeRequest(req, res);
        } else {
          sendError(res, 405, `Method ${method} not allowed for /like. Use POST.`);
        }
        break;
        
      case '/health':
        if (method === 'GET') {
          handleHealthCheck(req, res);
        } else {
          sendError(res, 405, `Method ${method} not allowed for /health. Use GET.`);
        }
        break;
        
      case '/docs':
      case '/':
        if (method === 'GET') {
          handleApiDocs(req, res);
        } else {
          sendError(res, 405, `Method ${method} not allowed for /docs. Use GET.`);
        }
        break;
        
      default:
        sendError(res, 404, `Endpoint ${path} not found`, {
          availableEndpoints: ['/like (POST)', '/health (GET)', '/docs (GET)']
        });
        break;
    }
  } catch (error: any) {
    logWithTimestamp(`Unhandled error: ${error.message}`, 'ERROR');
    sendError(res, 500, 'Internal server error');
  }
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logWithTimestamp('Received SIGTERM signal, shutting down gracefully...');
  
  if (globalBrowser) {
    try {
      await globalBrowser.disconnect();
      logWithTimestamp('Browser connection closed');
    } catch (error: any) {
      logWithTimestamp(`Error closing browser: ${error.message}`, 'ERROR');
    }
  }
  
  server.close(() => {
    logWithTimestamp('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logWithTimestamp('Received SIGINT signal, shutting down gracefully...');
  
  if (globalBrowser) {
    try {
      await globalBrowser.disconnect();
      logWithTimestamp('Browser connection closed');
    } catch (error: any) {
      logWithTimestamp(`Error closing browser: ${error.message}`, 'ERROR');
    }
  }
  
  server.close(() => {
    logWithTimestamp('HTTP server closed');
    process.exit(0);
  });
});

// Create and start the server
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('🚀 HTTP Like Server Started');
  logWithTimestamp('='.repeat(50));
  logWithTimestamp(`Server running at http://${HOST}:${PORT}/`);
  logWithTimestamp(`API Documentation: http://${HOST}:${PORT}/docs`);
  logWithTimestamp(`Health Check: http://${HOST}:${PORT}/health`);
  logWithTimestamp('='.repeat(50));
});

server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    logWithTimestamp(`Port ${PORT} is already in use. Please choose a different port.`, 'ERROR');
  } else {
    logWithTimestamp(`Server error: ${error.message}`, 'ERROR');
  }
  process.exit(1);
});

export { server };
