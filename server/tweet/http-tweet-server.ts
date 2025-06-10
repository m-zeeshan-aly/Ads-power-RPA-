// http-tweet-server.ts
import * as http from 'http';
import * as url from 'url';
import * as querystring from 'querystring';
import * as puppeteer from 'puppeteer-core';
import { 
  TweetInput, 
  postCustomTweetHuman, 
  connectToBrowser, 
  getWebSocketUrl 
} from '../custom_tweet_human';

// Server configuration
const PORT = Number(process.env.PORT) || 3001;
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

// Validate tweet input
function validateTweetData(data: any): { isValid: boolean; error?: string; tweetInput?: TweetInput } {
  if (!data) {
    return { isValid: false, error: 'No data provided' };
  }

  // Message is required
  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    return { isValid: false, error: 'Message is required and must be a non-empty string' };
  }

  const message = data.message.trim();
  
  // Parse hashtags (optional)
  let hashtags: string[] | undefined;
  if (data.hashtags) {
    if (typeof data.hashtags === 'string') {
      // If it's a string, split by comma
      hashtags = data.hashtags.split(',').map((h: string) => h.trim()).filter((h: string) => h.length > 0);
    } else if (Array.isArray(data.hashtags)) {
      // If it's already an array
      hashtags = data.hashtags.map((h: any) => String(h).trim()).filter((h: string) => h.length > 0);
    } else {
      return { isValid: false, error: 'Hashtags must be a string (comma-separated) or array' };
    }
    
    // Remove # symbols if users accidentally include them
    if (hashtags) {
      hashtags = hashtags.map((h: string) => h.replace(/^#/, ''));
    }
    
    if (hashtags && hashtags.length === 0) {
      hashtags = undefined;
    }
  }

  // Parse mentions (optional)
  let mentions: string[] | undefined;
  if (data.mentions) {
    if (typeof data.mentions === 'string') {
      mentions = data.mentions.split(',').map((m: string) => m.trim()).filter((m: string) => m.length > 0);
    } else if (Array.isArray(data.mentions)) {
      mentions = data.mentions.map((m: any) => String(m).trim()).filter((m: string) => m.length > 0);
    } else {
      return { isValid: false, error: 'Mentions must be a string (comma-separated) or array' };
    }
    
    // Remove @ symbols if users accidentally include them
    if (mentions) {
      mentions = mentions.map((m: string) => m.replace(/^@/, ''));
    }
    
    if (mentions && mentions.length === 0) {
      mentions = undefined;
    }
  }

  const tweetInput: TweetInput = {
    message,
    hashtags,
    mentions
  };

  // Calculate approximate final tweet length
  const mentionText = mentions ? mentions.map(m => `@${m}`).join(' ') + ' ' : '';
  const hashtagText = hashtags ? ' ' + hashtags.map(h => `#${h}`).join(' ') : '';
  const fullTweet = `${mentionText}${message}${hashtagText}`;
  
  if (fullTweet.length > 280) {
    return { 
      isValid: false, 
      error: `Tweet too long: ${fullTweet.length}/280 characters. Please shorten your message or reduce hashtags/mentions.` 
    };
  }

  return { isValid: true, tweetInput };
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
    const wsEndpoint = await getWebSocketUrl();
    globalBrowser = await connectToBrowser(wsEndpoint);
    logWithTimestamp('Browser connected successfully');
    return globalBrowser;
  } catch (error: any) {
    logWithTimestamp(`Failed to connect to browser: ${error.message}`, 'ERROR');
    throw new Error('Browser connection failed. Please ensure the browser is running and WebSocket endpoint is correct.');
  }
}

// Main tweet posting handler
async function handleTweetPost(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    logWithTimestamp('Received tweet post request');
    
    // Parse request body
    const requestData = await parseRequestBody(req);
    logWithTimestamp(`Request data: ${JSON.stringify(requestData)}`);
    
    // Validate tweet data
    const validation = validateTweetData(requestData);
    if (!validation.isValid) {
      sendError(res, 400, validation.error!);
      return;
    }
    
    const tweetInput = validation.tweetInput!;
    
    // Format tweet preview for logging
    const mentionText = tweetInput.mentions ? tweetInput.mentions.map(m => `@${m}`).join(' ') + ' ' : '';
    const hashtagText = tweetInput.hashtags ? ' ' + tweetInput.hashtags.map(h => `#${h}`).join(' ') : '';
    const fullTweet = `${mentionText}${tweetInput.message}${hashtagText}`;
    
    logWithTimestamp(`Posting tweet: "${fullTweet}" (${fullTweet.length} chars)`);
    
    // Initialize browser connection
    const browser = await initializeBrowser();
    
    // Post the tweet with human-like behavior
    await postCustomTweetHuman(browser, tweetInput);
    
    logWithTimestamp('Tweet posted successfully!');
    
    // Send success response
    sendSuccess(res, {
      tweet: {
        message: tweetInput.message,
        hashtags: tweetInput.hashtags || [],
        mentions: tweetInput.mentions || [],
        fullText: fullTweet,
        characterCount: fullTweet.length
      }
    }, 'Tweet posted successfully with human-like behavior');
    
  } catch (error: any) {
    logWithTimestamp(`Error posting tweet: ${error.message}`, 'ERROR');
    sendError(res, 500, 'Failed to post tweet', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Health check handler
function handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
  sendSuccess(res, {
    server: 'HTTP Tweet Server',
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
    title: 'HTTP Tweet Server API',
    version: '1.0.0',
    description: 'HTTP server for posting tweets with human-like behavior',
    endpoints: {
      'POST /tweet': {
        description: 'Post a tweet with human-like behavior',
        requestBody: {
          message: 'string (required) - The main tweet message',
          hashtags: 'string[] | string (optional) - Hashtags as array or comma-separated string',
          mentions: 'string[] | string (optional) - Mentions as array or comma-separated string'
        },
        example: {
          message: 'Hello world! This is my first automated tweet.',
          hashtags: ['automation', 'twitter', 'bot'],
          mentions: ['example_user']
        },
        response: {
          success: true,
          message: 'Tweet posted successfully with human-like behavior',
          data: {
            tweet: {
              message: 'string',
              hashtags: 'string[]',
              mentions: 'string[]',
              fullText: 'string',
              characterCount: 'number'
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
        'curl -X POST http://localhost:3001/tweet \\',
        '  -H "Content-Type: application/json" \\',
        '  -d \'{"message": "Hello from automation!", "hashtags": ["bot", "automation"]}\'',
        '',
        'curl -X POST http://localhost:3001/tweet \\',
        '  -H "Content-Type: application/json" \\',
        '  -d \'{"message": "Check this out", "hashtags": "ai,automation", "mentions": "friend1,friend2"}\''
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
      case '/tweet':
        if (method === 'POST') {
          handleTweetPost(req, res);
        } else {
          sendError(res, 405, `Method ${method} not allowed for /tweet. Use POST.`);
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
          availableEndpoints: ['/tweet (POST)', '/health (GET)', '/docs (GET)']
        });
        break;
    }
  } catch (error: any) {
    logWithTimestamp(`Unhandled error: ${error.message}`, 'ERROR');
    sendError(res, 500, 'Internal server error');
  }
}

// Graceful shutdown handler
function setupGracefulShutdown(server: http.Server): void {
  const shutdown = async (signal: string) => {
    logWithTimestamp(`Received ${signal}, shutting down gracefully...`, 'WARN');
    
    // Stop accepting new connections
    server.close(() => {
      logWithTimestamp('HTTP server closed');
    });
    
    // Close browser connection
    if (globalBrowser) {
      try {
        await globalBrowser.disconnect();
        logWithTimestamp('Browser connection closed');
      } catch (error: any) {
        logWithTimestamp(`Error closing browser: ${error.message}`, 'ERROR');
      }
    }
    
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start server
function startServer(): void {
  const server = http.createServer(handleRequest);
  
  server.listen(PORT, HOST as any, () => {
    logWithTimestamp(`🚀 HTTP Tweet Server running at http://${HOST}:${PORT}`);
    logWithTimestamp(`📖 API Documentation: http://${HOST}:${PORT}/docs`);
    logWithTimestamp(`❤️ Health Check: http://${HOST}:${PORT}/health`);
    logWithTimestamp(`📨 Tweet Endpoint: POST http://${HOST}:${PORT}/tweet`);
    logWithTimestamp('Ready to receive tweet requests!');
  });
  
  server.on('error', (error: any) => {
    logWithTimestamp(`Server error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
  
  setupGracefulShutdown(server);
}

// Initialize and start server
async function main(): Promise<void> {
  try {
    logWithTimestamp('Starting HTTP Tweet Server...');
    
    // Test browser connection on startup (optional)
    if (process.env.SKIP_BROWSER_TEST !== 'true') {
      try {
        logWithTimestamp('Testing browser connection...');
        await initializeBrowser();
        logWithTimestamp('Browser connection test successful');
      } catch (error: any) {
        logWithTimestamp(`Browser connection test failed: ${error.message}`, 'WARN');
        logWithTimestamp('Server will start anyway. Tweets will fail until browser is connected.', 'WARN');
      }
    } else {
      logWithTimestamp('Skipping browser connection test (SKIP_BROWSER_TEST=true)');
    }
    
    // Start the HTTP server
    startServer();
    
  } catch (error: any) {
    logWithTimestamp(`Failed to start server: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Export for testing
export {
  validateTweetData,
  handleTweetPost,
  handleHealthCheck,
  handleApiDocs
};

// Start server if this file is run directly
if (require.main === module) {
  main();
}
