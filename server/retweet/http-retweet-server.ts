// http-retweet-server.ts
import * as http from 'http';
import * as url from 'url';
import * as querystring from 'querystring';
import * as puppeteer from 'puppeteer-core';
import { 
  RetweetInput, 
  BehaviorType,
  retweetGenericTweetHuman, 
  connectToBrowser, 
  getWebSocketUrl 
} from './generic_retweet_human';

// Server configuration
const PORT = Number(process.env.PORT) || 3006;
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

// Validate retweet input data
function validateRetweetData(data: any): { isValid: boolean; error?: string; retweetInput?: RetweetInput } {
  if (!data) {
    return { isValid: false, error: 'No data provided' };
  }

  // At least one search criteria must be provided
  if (!data.username && !data.searchQuery && !data.tweetContent && !data.profileUrl) {
    return { 
      isValid: false, 
      error: 'At least one of username, searchQuery, tweetContent, or profileUrl must be provided' 
    };
  }

  // Validate behavior type if provided
  if (data.behaviorType && !Object.values(BehaviorType).includes(data.behaviorType)) {
    return { 
      isValid: false, 
      error: `Invalid behavior type. Must be one of: ${Object.values(BehaviorType).join(', ')}` 
    };
  }

  // Validate numeric fields
  if (data.retweetCount && (typeof data.retweetCount !== 'number' || data.retweetCount < 1 || data.retweetCount > 10)) {
    return { 
      isValid: false, 
      error: 'retweetCount must be a number between 1 and 10' 
    };
  }

  if (data.scrollTime && (typeof data.scrollTime !== 'number' || data.scrollTime < 1000 || data.scrollTime > 60000)) {
    return { 
      isValid: false, 
      error: 'scrollTime must be a number between 1000 and 60000 milliseconds' 
    };
  }

  // Construct RetweetInput object
  const retweetInput: RetweetInput = {
    username: data.username,
    searchQuery: data.searchQuery,
    tweetContent: data.tweetContent,
    profileUrl: data.profileUrl,
    retweetCount: data.retweetCount || 1,
    scrollTime: data.scrollTime || 10000,
    searchInFeed: data.searchInFeed !== false, // Default true
    visitProfile: data.visitProfile !== false, // Default true
    behaviorType: data.behaviorType || BehaviorType.SOCIAL_ENGAGER
  };

  return { isValid: true, retweetInput };
}

// Initialize browser connection
async function initBrowser(): Promise<puppeteer.Browser> {
  if (globalBrowser) {
    // Test if browser is still connected
    try {
      await globalBrowser.pages();
      return globalBrowser;
    } catch (error) {
      logWithTimestamp('Existing browser connection is dead, creating new one', 'WARN');
      globalBrowser = null;
    }
  }

  try {
    const wsEndpoint = await getWebSocketUrl();
    globalBrowser = await connectToBrowser(wsEndpoint);
    return globalBrowser;
  } catch (error: any) {
    logWithTimestamp(`Failed to initialize browser: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Handle retweet request
async function handleRetweetRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    logWithTimestamp('Processing retweet request...');
    
    const requestData = await parseRequestBody(req);
    logWithTimestamp(`Received data: ${JSON.stringify(requestData, null, 2)}`);
    
    const validation = validateRetweetData(requestData);
    if (!validation.isValid) {
      sendError(res, 400, validation.error!);
      return;
    }

    const retweetInput = validation.retweetInput!;
    logWithTimestamp(`Validated retweet input: ${JSON.stringify(retweetInput, null, 2)}`);

    // Initialize browser
    logWithTimestamp('Initializing browser connection...');
    const browser = await initBrowser();

    // Perform retweet operation
    logWithTimestamp('Starting retweet operation...');
    const startTime = Date.now();
    
    const success = await retweetGenericTweetHuman(browser, retweetInput);
    
    const duration = Date.now() - startTime;
    logWithTimestamp(`Retweet operation completed in ${duration}ms. Success: ${success}`);

    if (success) {
      sendSuccess(res, {
        retweetInput,
        duration,
        completed: true
      }, `Successfully retweeted ${retweetInput.retweetCount || 1} tweet(s) using ${retweetInput.behaviorType} behavior`);
    } else {
      sendError(res, 500, 'Retweet operation failed', {
        retweetInput,
        duration
      });
    }

  } catch (error: any) {
    logWithTimestamp(`Error handling retweet request: ${error.message}`, 'ERROR');
    sendError(res, 500, 'Internal server error', {
      error: error.message,
      stack: error.stack
    });
  }
}

// Handle status/health check
async function handleStatusRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    let browserStatus = 'disconnected';
    let browserPages = 0;
    
    if (globalBrowser) {
      try {
        const pages = await globalBrowser.pages();
        browserPages = pages.length;
        browserStatus = 'connected';
      } catch (error) {
        browserStatus = 'error';
      }
    }

    const status = {
      server: 'running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      browser: {
        status: browserStatus,
        pages: browserPages
      },
      memory: process.memoryUsage(),
      version: process.version,
      behaviorTypes: Object.values(BehaviorType)
    };

    sendSuccess(res, status, 'Server status retrieved');

  } catch (error: any) {
    logWithTimestamp(`Error getting status: ${error.message}`, 'ERROR');
    sendError(res, 500, 'Error getting server status', {
      error: error.message
    });
  }
}

// Handle help/documentation request
function handleHelpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  const helpData = {
    title: 'Generic Retweet Server API',
    version: '1.0.0',
    description: 'HTTP API for generic Twitter retweet automation with human-like behavior patterns',
    endpoints: {
      'POST /retweet': {
        description: 'Retweet tweets based on search criteria with human-like behavior',
        required_fields: 'At least one of: username, searchQuery, tweetContent, or profileUrl',
        optional_fields: {
          retweetCount: 'Number of tweets to retweet (1-10, default: 1)',
          scrollTime: 'Time to scroll in milliseconds (1000-60000, default: 10000)',
          searchInFeed: 'Search in home feed first (boolean, default: true)',
          visitProfile: 'Visit profile if feed search fails (boolean, default: true)',
          behaviorType: `Behavior pattern (${Object.values(BehaviorType).join(', ')}, default: social_engager)`
        },
        example: {
          username: 'ImranKhanPTI',
          retweetCount: 2,
          behaviorType: 'casual_browser'
        }
      },
      'GET /status': {
        description: 'Get server status and browser connection info'
      },
      'GET /help': {
        description: 'Get this help documentation'
      }
    },
    behaviorTypes: Object.values(BehaviorType).reduce((acc, type) => {
      acc[type] = {
        name: type,
        description: 'Human-like behavior pattern for retweeting'
      };
      return acc;
    }, {} as any),
    examples: {
      'Retweet by username': {
        method: 'POST',
        endpoint: '/retweet',
        body: {
          username: 'ImranKhanPTI',
          retweetCount: 1,
          behaviorType: 'social_engager'
        }
      },
      'Retweet by search query': {
        method: 'POST',
        endpoint: '/retweet',
        body: {
          searchQuery: 'Pakistan politics',
          retweetCount: 2,
          behaviorType: 'casual_browser'
        }
      },
      'Retweet from specific profile': {
        method: 'POST',
        endpoint: '/retweet',
        body: {
          profileUrl: 'https://twitter.com/PTIofficial',
          retweetCount: 1,
          searchInFeed: false,
          behaviorType: 'focused_poster'
        }
      }
    }
  };

  sendSuccess(res, helpData, 'Help documentation retrieved');
}

// Main request handler
function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  logWithTimestamp(`${method} ${pathname}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Route requests
  if (pathname === '/retweet' && method === 'POST') {
    handleRetweetRequest(req, res);
  } else if (pathname === '/status' && method === 'GET') {
    handleStatusRequest(req, res);
  } else if (pathname === '/help' && method === 'GET') {
    handleHelpRequest(req, res);
  } else if (pathname === '/' && method === 'GET') {
    // Redirect to help
    handleHelpRequest(req, res);
  } else {
    sendError(res, 404, `Route not found: ${method} ${pathname}`, {
      availableRoutes: {
        'POST /retweet': 'Retweet tweets with human-like behavior',
        'GET /status': 'Get server status',
        'GET /help': 'Get API documentation'
      }
    });
  }
}

// Start the server
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp(`🚀 Generic Retweet Server Started Successfully!`);
  logWithTimestamp('='.repeat(50));
  logWithTimestamp(`🌐 Server running at: http://${HOST}:${PORT}`);
  logWithTimestamp(`📖 API Documentation: http://${HOST}:${PORT}/help`);
  logWithTimestamp(`❤️  Health Check: http://${HOST}:${PORT}/status`);
  logWithTimestamp(`🔄 Retweet Endpoint: POST http://${HOST}:${PORT}/retweet`);
  logWithTimestamp('='.repeat(50));
  logWithTimestamp(`Available Behavior Types: ${Object.values(BehaviorType).join(', ')}`);
  logWithTimestamp('='.repeat(50));
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logWithTimestamp('Received SIGINT, shutting down gracefully...', 'WARN');
  
  if (globalBrowser) {
    try {
      await globalBrowser.disconnect();
      logWithTimestamp('Browser disconnected successfully');
    } catch (error) {
      logWithTimestamp('Error disconnecting browser', 'ERROR');
    }
  }
  
  server.close(() => {
    logWithTimestamp('Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  logWithTimestamp('Received SIGTERM, shutting down gracefully...', 'WARN');
  
  if (globalBrowser) {
    try {
      await globalBrowser.disconnect();
      logWithTimestamp('Browser disconnected successfully');
    } catch (error) {
      logWithTimestamp('Error disconnecting browser', 'ERROR');
    }
  }
  
  server.close(() => {
    logWithTimestamp('Server closed successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logWithTimestamp(`Uncaught Exception: ${error.message}`, 'ERROR');
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logWithTimestamp(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'ERROR');
});
