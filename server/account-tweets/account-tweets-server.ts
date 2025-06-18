// account-tweets-server.ts - HTTP server for fetching account tweets
import * as http from 'http';
import * as url from 'url';
import { getBrowserConnection } from '../shared/browser-connection';
import { logWithTimestamp } from '../shared/utilities';
import { getAccountTweets, AccountTweetsInput, AccountTweetsResult } from './account-tweets-fetcher';

// Server configuration
const PORT = Number(process.env.ACCOUNT_TWEETS_SERVER_PORT) || 3008;
const HOST = process.env.ACCOUNT_TWEETS_SERVER_HOST || 'localhost';

// Response utility functions
function sendResponse(res: http.ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res: http.ServerResponse, statusCode: number, message: string): void {
  logWithTimestamp(`Error ${statusCode}: ${message}`, 'ACCOUNT_TWEETS_SERVER');
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

// Parse JSON body from request
async function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', chunk => {
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
    
    req.on('error', reject);
  });
}

// Validate input
function validateInput(input: any): AccountTweetsInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Request body must be a JSON object');
  }
  
  if (!input.username || typeof input.username !== 'string') {
    throw new Error('Username is required and must be a string');
  }
  
  // Clean username
  const username = input.username.replace(/^@/, '').trim();
  if (!username) {
    throw new Error('Username cannot be empty');
  }
  
  const count = input.count || 30;
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('Count must be a positive integer (minimum 1)');
  }
  
  return {
    username,
    count,
    includeReplies: Boolean(input.includeReplies),
    includeRetweets: input.includeRetweets !== false // Default to true
  };
}

// Handle POST request to fetch account tweets
async function handleFetchTweets(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const body = await parseBody(req);
    const input = validateInput(body);
    
    logWithTimestamp(`POST /fetch-tweets - Fetching ${input.count} tweets from @${input.username}`, 'ACCOUNT_TWEETS_SERVER');
    
    // Get browser connection
    const browser = await getBrowserConnection();
    
    // Fetch account tweets
    const result = await getAccountTweets(browser, input);
    
    // Send response
    sendSuccess(res, result);
    
  } catch (error: any) {
    logWithTimestamp(`Error in handleFetchTweets: ${error.message}`, 'ACCOUNT_TWEETS_SERVER');
    sendError(res, 500, `Failed to fetch tweets: ${error.message}`);
  }
}

// Handle GET request with query parameters
async function handleGetTweets(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const parsedUrl = url.parse(req.url || '', true);
    const query = parsedUrl.query;
    
    if (!query.username) {
      sendError(res, 400, 'Username parameter is required. Example: /get-tweets?username=mzeeshanaly&count=20');
      return;
    }
    
    const input: AccountTweetsInput = {
      username: String(query.username).replace(/^@/, ''),
      count: query.count ? Math.max(parseInt(String(query.count)), 1) : 30,
      includeReplies: query.includeReplies === 'true',
      includeRetweets: query.includeRetweets !== 'false'
    };
    
    logWithTimestamp(`GET /get-tweets - Fetching ${input.count} tweets from @${input.username}`, 'ACCOUNT_TWEETS_SERVER');
    
    // Get browser connection
    const browser = await getBrowserConnection();
    
    // Fetch account tweets
    const result = await getAccountTweets(browser, input);
    
    // Send response
    sendSuccess(res, result);
    
  } catch (error: any) {
    logWithTimestamp(`Error in handleGetTweets: ${error.message}`, 'ACCOUNT_TWEETS_SERVER');
    sendError(res, 500, `Failed to fetch tweets: ${error.message}`);
  }
}

// Handle health check
function handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
  sendSuccess(res, {
    status: 'healthy',
    service: 'Account Tweets Fetcher',
    uptime: process.uptime()
  });
}

// Handle help documentation
function handleHelp(req: http.IncomingMessage, res: http.ServerResponse): void {
  const help = {
    service: 'Account Tweets Fetcher API',
    version: '1.0.0',
    description: 'Fetch the last N tweets from any Twitter account with detailed information',
    
    endpoints: {
      'POST /fetch-tweets': {
        description: 'Fetch tweets using JSON body',
        method: 'POST',
        contentType: 'application/json',
        body: {
          username: 'string (required) - Twitter username (with or without @)',
          count: 'number (optional) - Number of tweets to fetch (minimum 1, default: 30)',
          includeReplies: 'boolean (optional) - Include reply tweets (default: false)',
          includeRetweets: 'boolean (optional) - Include retweets (default: true)'
        },
        example: {
          username: 'elonmusk',
          count: 20,
          includeReplies: false,
          includeRetweets: true
        }
      },
      
      'GET /get-tweets': {
        description: 'Fetch tweets using query parameters',
        method: 'GET',
        parameters: {
          username: 'string (required) - Twitter username',
          count: 'number (optional) - Number of tweets (minimum 1, default: 30)',
          includeReplies: 'boolean (optional) - Include replies (default: false)',
          includeRetweets: 'boolean (optional) - Include retweets (default: true)'
        },
        example: '/get-tweets?username=elonmusk&count=15&includeReplies=false'
      },
      
      'GET /health': {
        description: 'Health check endpoint',
        method: 'GET'
      },
      
      'GET /help': {
        description: 'This help documentation',
        method: 'GET'
      }
    },
    
    response_format: {
      success: 'boolean - Operation success status',
      username: 'string - Target username',
      tweets: 'TweetData[] - Array of tweet objects',
      totalFetched: 'number - Number of tweets fetched',
      processingTime: 'string - Time taken to process',
      timestamp: 'string - Response timestamp'
    },
    
    tweet_data_structure: {
      tweetId: 'string - Unique tweet ID',
      content: 'string - Tweet text content',
      timestamp: 'string - ISO timestamp when posted',
      relativeTime: 'string - Relative time (e.g., "2h", "1d")',
      url: 'string - Direct URL to the tweet',
      likes: 'number - Number of likes',
      retweets: 'number - Number of retweets',
      replies: 'number - Number of replies',
      views: 'number - Number of views (if available)',
      isRetweet: 'boolean - Whether this is a retweet',
      originalAuthor: 'string - Original author if retweet',
      images: 'string[] - Array of image URLs',
      videos: 'string[] - Array of video indicators',
      hashtags: 'string[] - Hashtags used',
      mentions: 'string[] - Users mentioned',
      mediaCount: 'number - Total media attachments'
    },
    
    usage_examples: [
      {
        description: 'Get 30 latest tweets from Elon Musk (no replies)',
        curl: `curl -X POST http://localhost:${PORT}/fetch-tweets -H "Content-Type: application/json" -d '{"username": "elonmusk", "count": 30, "includeReplies": false}'`
      },
      {
        description: 'Get 15 tweets including retweets and replies',
        curl: `curl -X POST http://localhost:${PORT}/fetch-tweets -H "Content-Type: application/json" -d '{"username": "ImranKhanPTI", "count": 15, "includeReplies": true, "includeRetweets": true}'`
      },
      {
        description: 'Quick GET request for 20 tweets',
        curl: `curl "http://localhost:${PORT}/get-tweets?username=PTIofficial&count=20"`
      },
      {
        description: 'Health check',
        curl: `curl http://localhost:${PORT}/health`
      }
    ]
  };
  
  sendSuccess(res, help);
}

// Handle CORS preflight
function handleOptions(req: http.IncomingMessage, res: http.ServerResponse): void {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
}

// Main request handler
async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  logWithTimestamp(`${method} ${pathname}`, 'ACCOUNT_TWEETS_SERVER');

  try {
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      handleOptions(req, res);
      return;
    }

    // Route handlers
    if (pathname === '/fetch-tweets' && method === 'POST') {
      await handleFetchTweets(req, res);
    } else if (pathname === '/get-tweets' && method === 'GET') {
      await handleGetTweets(req, res);
    } else if (pathname === '/health' && method === 'GET') {
      handleHealthCheck(req, res);
    } else if (pathname === '/help' && method === 'GET') {
      handleHelp(req, res);
    } else if (pathname === '/' && method === 'GET') {
      handleHelp(req, res);
    } else {
      sendError(res, 404, `Endpoint not found: ${pathname}`);
    }
  } catch (error: any) {
    logWithTimestamp(`Unhandled error: ${error.message}`, 'ACCOUNT_TWEETS_SERVER');
    sendError(res, 500, 'Internal server error');
  }
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  logWithTimestamp('='.repeat(80), 'ACCOUNT_TWEETS_SERVER');
  logWithTimestamp('🚀 Account Tweets Fetcher Server Started!', 'ACCOUNT_TWEETS_SERVER');
  logWithTimestamp('='.repeat(80), 'ACCOUNT_TWEETS_SERVER');
  logWithTimestamp(`📍 Server: http://${HOST}:${PORT}`, 'ACCOUNT_TWEETS_SERVER');
  logWithTimestamp(`📊 Fetch Tweets: POST http://${HOST}:${PORT}/fetch-tweets`, 'ACCOUNT_TWEETS_SERVER');
  logWithTimestamp(`📊 Quick Fetch: GET http://${HOST}:${PORT}/get-tweets?username=USERNAME`, 'ACCOUNT_TWEETS_SERVER');
  logWithTimestamp(`📖 Documentation: http://${HOST}:${PORT}/help`, 'ACCOUNT_TWEETS_SERVER');
  logWithTimestamp(`🏥 Health: http://${HOST}:${PORT}/health`, 'ACCOUNT_TWEETS_SERVER');
  logWithTimestamp('='.repeat(80), 'ACCOUNT_TWEETS_SERVER');
  logWithTimestamp('✅ Ready to fetch account tweets!', 'ACCOUNT_TWEETS_SERVER');
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    logWithTimestamp(`❌ Port ${PORT} is in use. Set ACCOUNT_TWEETS_SERVER_PORT in .env`, 'ACCOUNT_TWEETS_SERVER');
  } else {
    logWithTimestamp(`❌ Server error: ${error.message}`, 'ACCOUNT_TWEETS_SERVER');
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logWithTimestamp('📴 Shutting down server...', 'ACCOUNT_TWEETS_SERVER');
  server.close(() => {
    logWithTimestamp('Server closed', 'ACCOUNT_TWEETS_SERVER');
    process.exit(0);
  });
});

export { server };
