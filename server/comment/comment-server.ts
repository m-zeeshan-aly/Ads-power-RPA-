// comment-server.ts
import * as http from 'http';
import * as url from 'url';
import * as querystring from 'querystring';
import * as puppeteer from 'puppeteer-core';
import { 
  CommentInput, 
  commentOnPostsHuman, 
  connectToBrowser, 
  getWebSocketUrl 
} from './generic_comment_human';

// Server configuration
const PORT = Number(process.env.PORT) || 3003;
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
function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    req.on('error', reject);
  });
}

// Validate comment input
function validateCommentInput(input: any): CommentInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Request body must be a valid JSON object');
  }

  // At least one targeting parameter must be provided
  if (!input.username && !input.searchQuery && !input.tweetContent && !input.profileUrl) {
    throw new Error('At least one of username, searchQuery, tweetContent, or profileUrl must be provided');
  }

  // Validate types
  if (input.username && typeof input.username !== 'string') {
    throw new Error('username must be a string');
  }
  
  if (input.searchQuery && typeof input.searchQuery !== 'string') {
    throw new Error('searchQuery must be a string');
  }
  
  if (input.tweetContent && typeof input.tweetContent !== 'string') {
    throw new Error('tweetContent must be a string');
  }
  
  if (input.profileUrl && typeof input.profileUrl !== 'string') {
    throw new Error('profileUrl must be a string');
  }
  
  if (input.commentText && typeof input.commentText !== 'string') {
    throw new Error('commentText must be a string');
  }
  
  if (input.comments && (!Array.isArray(input.comments) || !input.comments.every((c: any) => typeof c === 'string'))) {
    throw new Error('comments must be an array of strings');
  }
  
  if (input.commentCount && (!Number.isInteger(input.commentCount) || input.commentCount < 1 || input.commentCount > 10)) {
    throw new Error('commentCount must be an integer between 1 and 10');
  }
  
  if (input.scrollTime && (!Number.isInteger(input.scrollTime) || input.scrollTime < 1000 || input.scrollTime > 60000)) {
    throw new Error('scrollTime must be an integer between 1000 and 60000 milliseconds');
  }
  
  if (input.searchInFeed !== undefined && typeof input.searchInFeed !== 'boolean') {
    throw new Error('searchInFeed must be a boolean');
  }
  
  if (input.visitProfile !== undefined && typeof input.visitProfile !== 'boolean') {
    throw new Error('visitProfile must be a boolean');
  }

  return input as CommentInput;
}

// Browser connection management
let browserConnection: puppeteer.Browser | null = null;
let browserConnectionPromise: Promise<puppeteer.Browser> | null = null;

async function getBrowserConnection(): Promise<puppeteer.Browser> {
  if (browserConnection && browserConnection.isConnected()) {
    return browserConnection;
  }

  if (browserConnectionPromise) {
    return browserConnectionPromise;
  }

  browserConnectionPromise = (async () => {
    try {
      logWithTimestamp('Establishing new browser connection...');
      const wsEndpoint = await getWebSocketUrl();
      browserConnection = await connectToBrowser(wsEndpoint);
      
      // Handle disconnection
      browserConnection.on('disconnected', () => {
        logWithTimestamp('Browser connection lost');
        browserConnection = null;
        browserConnectionPromise = null;
      });

      logWithTimestamp('Browser connection established successfully');
      return browserConnection;
    } catch (error: any) {
      logWithTimestamp(`Failed to establish browser connection: ${error.message}`);
      browserConnectionPromise = null;
      throw error;
    }
  })();

  return browserConnectionPromise;
}

// Handle comment requests
async function handleCommentRequest(input: CommentInput): Promise<any> {
  logWithTimestamp(`Processing comment request for: ${JSON.stringify({
    username: input.username,
    searchQuery: input.searchQuery,
    tweetContent: input.tweetContent ? input.tweetContent.substring(0, 50) + '...' : undefined,
    profileUrl: input.profileUrl,
    commentCount: input.commentCount || 1,
    hasCustomComments: input.comments ? input.comments.length : 0,
    hasCustomText: !!input.commentText
  })}`);

  try {
    const browser = await getBrowserConnection();
    
    const startTime = Date.now();
    await commentOnPostsHuman(browser, input);
    const duration = Date.now() - startTime;
    
    logWithTimestamp(`Comment operation completed successfully in ${duration}ms`);
    
    return {
      message: 'Comment operation completed successfully',
      input: {
        username: input.username,
        searchQuery: input.searchQuery,
        tweetContent: input.tweetContent,
        profileUrl: input.profileUrl,
        commentCount: input.commentCount || 1,
        scrollTime: input.scrollTime || 10000,
        searchInFeed: input.searchInFeed !== false,
        visitProfile: input.visitProfile !== false,
        hasCustomComments: input.comments ? input.comments.length : 0,
        hasCustomText: !!input.commentText
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logWithTimestamp(`Comment operation failed: ${error.message}`);
    throw new Error(`Comment operation failed: ${error.message}`);
  }
}

// Handle status endpoint
function handleStatus(): any {
  return {
    service: 'Comment Server',
    status: 'running',
    port: PORT,
    host: HOST,
    timestamp: new Date().toISOString(),
    browserConnected: browserConnection ? browserConnection.isConnected() : false,
    endpoints: {
      'POST /comment': 'Post comments on tweets based on search criteria',
      'GET /status': 'Get server status',
      'GET /help': 'Get API documentation'
    }
  };
}

// Handle help endpoint
function handleHelp(): any {
  return {
    service: 'Comment Server API Documentation',
    version: '1.0.0',
    endpoints: {
      'POST /comment': {
        description: 'Post comments on tweets based on search criteria with human-like behavior',
        method: 'POST',
        contentType: 'application/json',
        body: {
          required: 'At least one of the following targeting parameters',
          targeting: {
            username: 'string - Target username (e.g., "ImranKhanPTI", "PTIofficial")',
            searchQuery: 'string - Search terms to find tweets (e.g., "Imran Khan", "PTI politics")',
            tweetContent: 'string - Specific content to look for in tweets',
            profileUrl: 'string - Direct profile URL to visit'
          },
          comment_configuration: {
            commentText: 'string - Specific comment to post (overrides random selection)',
            comments: 'string[] - Array of custom comments (one will be selected randomly)',
          },
          optional_parameters: {
            commentCount: 'number - Number of tweets to comment on (1-10, default: 1)',
            scrollTime: 'number - Time to scroll in milliseconds (1000-60000, default: 10000)',
            searchInFeed: 'boolean - Whether to search in home feed first (default: true)',
            visitProfile: 'boolean - Whether to visit profile if feed search fails (default: true)'
          }
        },
        example: {
          username: 'ImranKhanPTI',
          commentText: 'Great message! Keep up the excellent work! 👏',
          commentCount: 2,
          scrollTime: 15000,
          searchInFeed: true,
          visitProfile: true
        }
      },
      'GET /status': {
        description: 'Get current server status and browser connection state',
        method: 'GET'
      },
      'GET /help': {
        description: 'Get this API documentation',
        method: 'GET'
      }
    },
    usage_examples: [
      {
        description: 'Comment on PTI posts with custom message',
        curl: 'curl -X POST http://localhost:3003/comment -H "Content-Type: application/json" -d \'{"username": "PTIofficial", "commentText": "Great work! Keep it up! 🇵🇰"}\''
      },
      {
        description: 'Comment on posts containing specific search terms',
        curl: 'curl -X POST http://localhost:3003/comment -H "Content-Type: application/json" -d \'{"searchQuery": "Pakistan politics", "comments": ["Interesting perspective!", "Thanks for sharing!", "Well said!"]}\''
      },
      {
        description: 'Comment on specific profile with multiple comments',
        curl: 'curl -X POST http://localhost:3003/comment -H "Content-Type: application/json" -d \'{"profileUrl": "https://twitter.com/ImranKhanPTI", "commentCount": 3, "scrollTime": 20000}\''
      }
    ],
    notes: [
      'The server maintains a persistent browser connection for efficiency',
      'All comment actions include human-like timing and scrolling behavior',
      'Comments are posted with realistic typing speed and pauses',
      'The server will search in home feed first, then visit profiles if needed',
      'Multiple comments will be spaced out with realistic delays',
      'Screenshots are automatically saved for debugging in debug_logs/ directory'
    ]
  };
}

// Main request handler
async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  logWithTimestamp(`${method} ${pathname} - ${req.headers['user-agent'] || 'Unknown'}`);

  try {
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      sendSuccess(res, { message: 'CORS preflight successful' });
      return;
    }

    // Route handlers
    if (pathname === '/comment' && method === 'POST') {
      const body = await parseBody(req);
      const validatedInput = validateCommentInput(body);
      const result = await handleCommentRequest(validatedInput);
      sendSuccess(res, result);
    } else if (pathname === '/status' && method === 'GET') {
      const status = handleStatus();
      sendSuccess(res, status);
    } else if (pathname === '/help' && method === 'GET') {
      const help = handleHelp();
      sendSuccess(res, help);
    } else if (pathname === '/' && method === 'GET') {
      // Root endpoint - redirect to help
      const help = handleHelp();
      sendSuccess(res, help);
    } else {
      sendError(res, 404, `Not Found: ${method} ${pathname}`);
    }
  } catch (error: any) {
    logWithTimestamp(`Request handling error: ${error.message}`);
    sendError(res, 500, error.message);
  }
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  logWithTimestamp('='.repeat(60));
  logWithTimestamp(`🚀 Comment Server started successfully!`);
  logWithTimestamp(`📍 Server URL: http://${HOST}:${PORT}`);
  logWithTimestamp(`📖 API Documentation: http://${HOST}:${PORT}/help`);
  logWithTimestamp(`🏥 Health Check: http://${HOST}:${PORT}/status`);
  logWithTimestamp('='.repeat(60));
  logWithTimestamp('Available endpoints:');
  logWithTimestamp(`  POST http://${HOST}:${PORT}/comment   - Post comments on tweets`);
  logWithTimestamp(`  GET  http://${HOST}:${PORT}/status    - Server status`);
  logWithTimestamp(`  GET  http://${HOST}:${PORT}/help      - API documentation`);
  logWithTimestamp('='.repeat(60));
  logWithTimestamp('Server is ready to accept comment requests');
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    logWithTimestamp(`❌ Port ${PORT} is already in use. Please try a different port.`);
  } else {
    logWithTimestamp(`❌ Server error: ${error.message}`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logWithTimestamp('\n📴 Shutting down Comment Server...');
  
  server.close(() => {
    logWithTimestamp('HTTP server closed');
  });

  if (browserConnection) {
    try {
      await browserConnection.disconnect();
      logWithTimestamp('Browser connection closed');
    } catch (error: any) {
      logWithTimestamp(`Error closing browser connection: ${error.message}`);
    }
  }

  logWithTimestamp('Comment Server shutdown complete');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logWithTimestamp(`❌ Uncaught Exception: ${error.message}`);
  logWithTimestamp(error.stack || 'No stack trace available');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logWithTimestamp(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

export { server, handleCommentRequest, validateCommentInput };
