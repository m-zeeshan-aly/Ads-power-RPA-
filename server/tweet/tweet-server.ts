// tweet-server.ts
import * as http from 'http';
import * as url from 'url';
import * as querystring from 'querystring';
import * as puppeteer from 'puppeteer-core';
import { 
  TweetInput, 
  postCustomTweetHuman 
} from './custom_tweet_human';
import { getBrowserConnection } from '../shared/browser-connection';

// Server configuration
const PORT = Number(process.env.PORT) || 3001;
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

// Validate tweet input
function validateTweetRequest(data: any): TweetInput {
  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    throw new Error('Message is required and must be a non-empty string');
  }

  const tweetInput: TweetInput = {
    message: data.message.trim()
  };

  // Validate and add hashtags if provided
  if (data.hashtags) {
    if (!Array.isArray(data.hashtags)) {
      throw new Error('Hashtags must be an array');
    }
    
    tweetInput.hashtags = data.hashtags
      .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
      .map((tag: any) => tag.trim());
  }

  // Validate and add mentions if provided
  if (data.mentions) {
    if (!Array.isArray(data.mentions)) {
      throw new Error('Mentions must be an array');
    }
    
    tweetInput.mentions = data.mentions
      .filter((mention: any) => typeof mention === 'string' && mention.trim().length > 0)
      .map((mention: any) => mention.trim());
  }

  // Check total tweet length
  let totalLength = tweetInput.message.length;
  
  if (tweetInput.hashtags && tweetInput.hashtags.length > 0) {
    totalLength += tweetInput.hashtags.reduce((sum, tag) => {
      return sum + (tag.startsWith('#') ? tag.length : tag.length + 1) + 1; // +1 for space
    }, 0);
  }
  
  if (tweetInput.mentions && tweetInput.mentions.length > 0) {
    totalLength += tweetInput.mentions.reduce((sum, mention) => {
      return sum + (mention.startsWith('@') ? mention.length : mention.length + 1) + 1; // +1 for space
    }, 0);
  }

  if (totalLength > 280) {
    throw new Error(`Tweet too long: estimated ${totalLength} characters (max 280)`);
  }

  return tweetInput;
}

// Browser connection management - using shared connection
// (removed local browser management in favor of shared connection)

// Handle POST request to post a tweet
async function handlePostTweet(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const requestBody = await parseRequestBody(req);
    logWithTimestamp(`Received tweet request: ${JSON.stringify(requestBody)}`);

    // Validate the request
    const tweetInput = validateTweetRequest(requestBody);
    
    // Get browser connection
    const browser = await getBrowserConnection();
    
    // Post the tweet with human-like behavior
    await postCustomTweetHuman(browser, tweetInput);
    
    logWithTimestamp('Tweet posted successfully');
    sendSuccess(res, {
      message: 'Tweet posted successfully',
      tweetData: tweetInput
    });
    
  } catch (error: any) {
    logWithTimestamp(`Error posting tweet: ${error.message}`);
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
    name: 'Tweet Posting API',
    version: '1.0.0',
    description: 'HTTP API for posting tweets with human-like behavior',
    endpoints: {
      'POST /tweet': 'Post a new tweet',
      'GET /health': 'Health check',
      'GET /': 'API information'
    },
    requestFormat: {
      message: 'string (required) - The tweet message',
      hashtags: 'array (optional) - Array of hashtags',
      mentions: 'array (optional) - Array of mentions'
    },
    example: {
      message: 'Hello world! This is my first automated tweet.',
      hashtags: ['automation', 'nodejs'],
      mentions: ['example_user']
    }
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

      case '/tweet':
        if (method === 'POST') {
          await handlePostTweet(req, res);
        } else {
          sendError(res, 405, 'Method not allowed. Use POST to post a tweet.');
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
    logWithTimestamp('🚀 Tweet Posting HTTP Server Started');
    logWithTimestamp('='.repeat(60));
    logWithTimestamp(`Server running at http://${HOST}:${PORT}`);
    logWithTimestamp(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logWithTimestamp(`Process ID: ${process.pid}`);
    logWithTimestamp('');
    logWithTimestamp('Available endpoints:');
    logWithTimestamp(`  GET  http://${HOST}:${PORT}/          - API information`);
    logWithTimestamp(`  GET  http://${HOST}:${PORT}/health    - Health check`);
    logWithTimestamp(`  POST http://${HOST}:${PORT}/tweet     - Post a tweet`);
    logWithTimestamp('');
    logWithTimestamp('Example POST request:');
    logWithTimestamp('  curl -X POST http://localhost:3000/tweet \\');
    logWithTimestamp('    -H "Content-Type: application/json" \\');
    logWithTimestamp('    -d \'{"message":"Hello world!","hashtags":["test"],"mentions":["user"]}\'');
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
// npm run http-server

// # Test endpoints
// npm run test-http

// # Post a tweet
// curl -X POST http://localhost:3001/tweet \
//   -H "Content-Type: application/json" \
//   -d '{"message": "Hello from automation!", "hashtags": ["test", "automation"]}'