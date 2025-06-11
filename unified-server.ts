// unified-server.ts - Unified server for all social media automation services
import * as http from 'http';
import * as url from 'url';
import * as dotenv from 'dotenv';
import { getBrowserConnection } from './server/shared/browser-connection';

// Import all service handlers
import { 
  TweetInput, 
  postCustomTweetHuman 
} from './server/tweet/custom_tweet_human';

import { 
  LikeInput, 
  likeGenericTweetHuman 
} from './server/like/generic_like_human';

import { 
  CommentInput, 
  commentOnPostsHuman 
} from './server/comment/generic_comment_human';

import { 
  RetweetInput, 
  BehaviorType,
  retweetGenericTweetHuman 
} from './server/retweet/generic_retweet_human';

import { 
  NotificationInput, 
  NotificationData,
  checkNotificationsHuman 
} from './server/notification/generic_notification_human';

// Load environment variables
dotenv.config();

// Server configuration from environment
const PORT = Number(process.env.UNIFIED_SERVER_PORT) || 3000;
const HOST = process.env.UNIFIED_SERVER_HOST || 'localhost';

// Logging utility with service-specific colors
function logWithTimestamp(message: string, service: string = 'UNIFIED'): void {
  const timestamp = new Date().toISOString();
  const colorCode = service === 'UNIFIED' ? '\x1b[36m' : 
                   service === 'TWEET' ? '\x1b[32m' : 
                   service === 'LIKE' ? '\x1b[33m' : 
                   service === 'COMMENT' ? '\x1b[35m' : 
                   service === 'RETWEET' ? '\x1b[34m' : 
                   service === 'NOTIFICATION' ? '\x1b[93m' : '\x1b[37m';
  const resetCode = '\x1b[0m';
  console.log(`${colorCode}[${timestamp}] [${service}] ${message}${resetCode}`);
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

function sendError(res: http.ServerResponse, statusCode: number, message: string, service: string = 'UNIFIED'): void {
  logWithTimestamp(`Error ${statusCode}: ${message}`, service);
  sendResponse(res, statusCode, { 
    success: false, 
    error: message,
    timestamp: new Date().toISOString(),
    service: service.toLowerCase()
  });
}

function sendSuccess(res: http.ServerResponse, data: any = {}, service: string = 'UNIFIED'): void {
  sendResponse(res, 200, { 
    success: true, 
    data,
    timestamp: new Date().toISOString(),
    service: service.toLowerCase()
  });
}

// Parse JSON body from request
async function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Input validation functions
function validateTweetInput(input: any): TweetInput {
  if (!input.message || typeof input.message !== 'string') {
    throw new Error('message is required and must be a string');
  }
  
  if (input.message.length > 280) {
    throw new Error('message must be 280 characters or less');
  }

  return input as TweetInput;
}

function validateLikeInput(input: any): LikeInput {
  if (!input.username && !input.searchQuery && !input.tweetContent && !input.profileUrl) {
    throw new Error('At least one targeting parameter must be provided (username, searchQuery, tweetContent, or profileUrl)');
  }

  if (input.likeCount && (!Number.isInteger(input.likeCount) || input.likeCount < 1 || input.likeCount > 10)) {
    throw new Error('likeCount must be an integer between 1 and 10');
  }

  return input as LikeInput;
}

function validateCommentInput(input: any): CommentInput {
  if (!input.username && !input.searchQuery && !input.tweetContent && !input.profileUrl) {
    throw new Error('At least one targeting parameter must be provided (username, searchQuery, tweetContent, or profileUrl)');
  }

  if (input.commentCount && (!Number.isInteger(input.commentCount) || input.commentCount < 1 || input.commentCount > 10)) {
    throw new Error('commentCount must be an integer between 1 and 10');
  }

  if (input.comments && (!Array.isArray(input.comments) || !input.comments.every((c: any) => typeof c === 'string'))) {
    throw new Error('comments must be an array of strings');
  }

  return input as CommentInput;
}

function validateRetweetInput(input: any): RetweetInput {
  if (!input.username && !input.searchQuery && !input.tweetContent && !input.profileUrl) {
    throw new Error('At least one targeting parameter must be provided (username, searchQuery, tweetContent, or profileUrl)');
  }

  if (input.retweetCount && (!Number.isInteger(input.retweetCount) || input.retweetCount < 1 || input.retweetCount > 10)) {
    throw new Error('retweetCount must be an integer between 1 and 10');
  }

  if (input.behaviorType && !Object.values(BehaviorType).includes(input.behaviorType)) {
    throw new Error('Invalid behaviorType');
  }

  return input as RetweetInput;
}

function validateNotificationInput(input: any): NotificationInput {
  const notificationInput: NotificationInput = {};

  // Validate optional parameters
  if (input.maxNotifications !== undefined) {
    const maxNotifications = Number(input.maxNotifications);
    if (isNaN(maxNotifications) || maxNotifications < 1 || maxNotifications > 50) {
      throw new Error('maxNotifications must be a number between 1 and 50');
    }
    notificationInput.maxNotifications = maxNotifications;
  }

  if (input.includeOlderNotifications !== undefined) {
    notificationInput.includeOlderNotifications = Boolean(input.includeOlderNotifications);
  }

  if (input.timeRangeHours !== undefined) {
    const timeRangeHours = Number(input.timeRangeHours);
    if (isNaN(timeRangeHours) || timeRangeHours < 1 || timeRangeHours > 168) { // Max 1 week
      throw new Error('timeRangeHours must be a number between 1 and 168 (1 week)');
    }
    notificationInput.timeRangeHours = timeRangeHours;
  }

  if (input.behaviorType !== undefined) {
    if (typeof input.behaviorType !== 'string') {
      throw new Error('behaviorType must be a string');
    }
    notificationInput.behaviorType = input.behaviorType;
  }

  return notificationInput;
}

// Service handlers
async function handleTweetRequest(input: TweetInput): Promise<any> {
  logWithTimestamp(`Processing tweet request: "${input.message.substring(0, 50)}..."`, 'TWEET');

  try {
    const browser = await getBrowserConnection();
    
    const startTime = Date.now();
    await postCustomTweetHuman(browser, input);
    const duration = Date.now() - startTime;
    
    logWithTimestamp(`Tweet posted successfully in ${duration}ms`, 'TWEET');
    
    return {
      message: 'Tweet posted successfully',
      input: {
        message: input.message,
        hashtags: input.hashtags || [],
        mentions: input.mentions || []
      },
      duration: `${duration}ms`
    };
  } catch (error: any) {
    logWithTimestamp(`Tweet operation failed: ${error.message}`, 'TWEET');
    throw new Error(`Tweet operation failed: ${error.message}`);
  }
}

async function handleLikeRequest(input: LikeInput): Promise<any> {
  logWithTimestamp(`Processing like request for: ${JSON.stringify({
    username: input.username,
    searchQuery: input.searchQuery,
    likeCount: input.likeCount || 1
  })}`, 'LIKE');

  try {
    const browser = await getBrowserConnection();
    
    const startTime = Date.now();
    await likeGenericTweetHuman(browser, input);
    const duration = Date.now() - startTime;
    
    logWithTimestamp(`Like operation completed successfully in ${duration}ms`, 'LIKE');
    
    return {
      message: 'Like operation completed successfully',
      input: {
        username: input.username,
        searchQuery: input.searchQuery,
        tweetContent: input.tweetContent,
        profileUrl: input.profileUrl,
        likeCount: input.likeCount || 1
      },
      duration: `${duration}ms`
    };
  } catch (error: any) {
    logWithTimestamp(`Like operation failed: ${error.message}`, 'LIKE');
    throw new Error(`Like operation failed: ${error.message}`);
  }
}

async function handleCommentRequest(input: CommentInput): Promise<any> {
  logWithTimestamp(`Processing comment request for: ${JSON.stringify({
    username: input.username,
    searchQuery: input.searchQuery,
    commentCount: input.commentCount || 1
  })}`, 'COMMENT');

  try {
    const browser = await getBrowserConnection();
    
    const startTime = Date.now();
    await commentOnPostsHuman(browser, input);
    const duration = Date.now() - startTime;
    
    logWithTimestamp(`Comment operation completed successfully in ${duration}ms`, 'COMMENT');
    
    return {
      message: 'Comment operation completed successfully',
      input: {
        username: input.username,
        searchQuery: input.searchQuery,
        tweetContent: input.tweetContent,
        profileUrl: input.profileUrl,
        commentCount: input.commentCount || 1,
        hasCustomComments: input.comments ? input.comments.length : 0,
        hasCustomText: !!input.commentText
      },
      duration: `${duration}ms`
    };
  } catch (error: any) {
    logWithTimestamp(`Comment operation failed: ${error.message}`, 'COMMENT');
    throw new Error(`Comment operation failed: ${error.message}`);
  }
}

async function handleRetweetRequest(input: RetweetInput): Promise<any> {
  logWithTimestamp(`Processing retweet request for: ${JSON.stringify({
    username: input.username,
    searchQuery: input.searchQuery,
    retweetCount: input.retweetCount || 1,
    behaviorType: input.behaviorType || BehaviorType.SOCIAL_ENGAGER
  })}`, 'RETWEET');

  try {
    const browser = await getBrowserConnection();
    
    const startTime = Date.now();
    await retweetGenericTweetHuman(browser, input);
    const duration = Date.now() - startTime;
    
    logWithTimestamp(`Retweet operation completed successfully in ${duration}ms`, 'RETWEET');
    
    return {
      message: 'Retweet operation completed successfully',
      input: {
        username: input.username,
        searchQuery: input.searchQuery,
        tweetContent: input.tweetContent,
        profileUrl: input.profileUrl,
        retweetCount: input.retweetCount || 1,
        behaviorType: input.behaviorType || BehaviorType.SOCIAL_ENGAGER
      },
      duration: `${duration}ms`
    };
  } catch (error: any) {
    logWithTimestamp(`Retweet operation failed: ${error.message}`, 'RETWEET');
    throw new Error(`Retweet operation failed: ${error.message}`);
  }
}

async function handleNotificationRequest(input: NotificationInput): Promise<any> {
  logWithTimestamp(`Processing notification check request with options: ${JSON.stringify({
    maxNotifications: input.maxNotifications || 10,
    includeOlderNotifications: input.includeOlderNotifications || false,
    behaviorType: input.behaviorType || 'default'
  })}`, 'NOTIFICATION');

  try {
    const browser = await getBrowserConnection();
    
    const startTime = Date.now();
    const notifications = await checkNotificationsHuman(browser, input);
    const duration = Date.now() - startTime;
    
    logWithTimestamp(`Notification check completed successfully in ${duration}ms`, 'NOTIFICATION');
    logWithTimestamp(`Found ${notifications.length} relevant notifications (comments/mentions)`, 'NOTIFICATION');
    
    return {
      message: 'Notification check completed successfully',
      notifications: notifications,
      summary: {
        totalFound: notifications.length,
        comments: notifications.filter(n => n.type === 'comment').length,
        mentions: notifications.filter(n => n.type === 'mention').length,
        verifiedUsers: notifications.filter(n => n.isVerified).length
      },
      options: {
        maxNotifications: input.maxNotifications || 10,
        includeOlderNotifications: input.includeOlderNotifications || false,
        behaviorType: input.behaviorType || 'default'
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logWithTimestamp(`Notification check failed: ${error.message}`, 'NOTIFICATION');
    throw new Error(`Notification check failed: ${error.message}`);
  }
}

// Status handler
async function handleStatus(): Promise<any> {
  const browser = await getBrowserConnection().catch(() => null);
  
  return {
    service: 'Unified Social Media Automation Server',
    status: 'running',
    port: PORT,
    host: HOST,
    browserConnected: browser ? browser.isConnected() : false,
    services: {
      tweet: {
        endpoint: 'POST /api/tweet',
        description: 'Post tweets with human-like behavior'
      },
      like: {
        endpoint: 'POST /api/like',
        description: 'Like tweets based on search criteria'
      },
      comment: {
        endpoint: 'POST /api/comment',
        description: 'Comment on tweets with custom messages'
      },
      retweet: {
        endpoint: 'POST /api/retweet',
        description: 'Retweet posts with different behavior patterns'
      },
      notification: {
        endpoint: 'GET /api/notification',
        description: 'Check for unread notifications (comments and mentions only)'
      }
    }
  };
}

// Help documentation handler
function handleHelp(): any {
  return {
    service: 'Unified Social Media Automation Server',
    version: '1.0.0',
    description: 'A unified HTTP API server for Twitter/X automation with human-like behavior',
    
    endpoints: {
      'POST /api/tweet': {
        description: 'Post a tweet with human-like behavior',
        body: {
          tweetText: 'string (required, max 280 chars) - The text content of the tweet',
          includeMedia: 'boolean (optional) - Whether to include media',
          mediaPath: 'string (optional) - Path to media file'
        },
        example: {
          tweetText: 'Hello world! This is a test tweet. #automation',
          includeMedia: false
        }
      },
      
      'POST /api/like': {
        description: 'Like tweets based on search criteria with human-like behavior',
        body: {
          targeting: 'At least one required',
          username: 'string - Target username (e.g., "ImranKhanPTI")',
          searchQuery: 'string - Search terms (e.g., "Pakistan politics")',
          tweetContent: 'string - Specific content to match',
          profileUrl: 'string - Direct profile URL',
          likeCount: 'number (1-10, default: 1) - Number of tweets to like',
          scrollTime: 'number (1000-60000ms, default: 10000) - Scroll duration'
        },
        example: {
          username: 'ImranKhanPTI',
          likeCount: 2,
          scrollTime: 15000
        }
      },
      
      'POST /api/comment': {
        description: 'Comment on tweets with custom messages and human-like behavior',
        body: {
          targeting: 'At least one required',
          username: 'string - Target username',
          searchQuery: 'string - Search terms',
          tweetContent: 'string - Content to match',
          profileUrl: 'string - Direct profile URL',
          commentText: 'string - Specific comment to post',
          comments: 'string[] - Pool of comments for random selection',
          commentCount: 'number (1-10, default: 1) - Number of comments to post'
        },
        example: {
          username: 'PTIofficial',
          commentText: 'Great work! Keep it up! 👏',
          commentCount: 1
        }
      },
      
      'POST /api/retweet': {
        description: 'Retweet posts with different human behavior patterns',
        body: {
          targeting: 'At least one required',
          username: 'string - Target username',
          searchQuery: 'string - Search terms',
          tweetContent: 'string - Content to match',
          profileUrl: 'string - Direct profile URL',
          retweetCount: 'number (1-10, default: 1) - Number of retweets',
          behaviorType: `string - Human behavior pattern (${Object.values(BehaviorType).join(', ')})`
        },
        behaviorTypes: {
          [BehaviorType.CASUAL_BROWSER]: 'Scrolls extensively, takes time to read, natural pauses',
          [BehaviorType.FOCUSED_POSTER]: 'Minimal scrolling, direct approach, quick decisions',
          [BehaviorType.SOCIAL_ENGAGER]: 'Moderate scrolling, careful selection, thoughtful interaction',
          [BehaviorType.QUICK_POSTER]: 'Fast scrolling, minimal delays, efficient retweeting',
          [BehaviorType.THOUGHTFUL_WRITER]: 'Extensive reading, long pauses, careful consideration'
        },
        example: {
          username: 'ImranKhanPTI',
          retweetCount: 1,
          behaviorType: BehaviorType.SOCIAL_ENGAGER
        }
      },
      
      'GET /api/notification': {
        description: 'Check for unread notifications with human-like behavior (comments and mentions only)',
        parameters: {
          note: 'All parameters are optional via query string',
          maxNotifications: 'number (1-50, default: 10) - Maximum notifications to check',
          includeOlderNotifications: 'boolean (default: false) - Whether to scroll and check older notifications',
          timeRangeHours: 'number (1-168, default: 24) - How many hours back to check',
          behaviorType: 'string - Human behavior pattern to use for browsing'
        },
        example: '?maxNotifications=15&includeOlderNotifications=true&timeRangeHours=48&behaviorType=social_engager',
        response: {
          notifications: 'array - Array of comment/mention notification objects with original post data',
          summary: 'object - Summary statistics of found notifications',
          options: 'object - Request options used',
          duration: 'string - Time taken to check notifications'
        },
        notificationTypes: {
          comment: 'Someone replied to or commented on your tweet (includes original post data)',
          mention: 'Someone mentioned or tagged you in their tweet'
        }
      },
      
      'GET /api/status': {
        description: 'Get server status and browser connection state'
      },
      
      'GET /api/help': {
        description: 'Get this API documentation'
      }
    },
    
    usage_examples: [
      {
        description: 'Post a simple tweet',
        curl: `curl -X POST http://localhost:${PORT}/api/tweet -H "Content-Type: application/json" -d '{"tweetText": "Hello from the unified server! 🚀"}'`
      },
      {
        description: 'Like tweets from a specific user',
        curl: `curl -X POST http://localhost:${PORT}/api/like -H "Content-Type: application/json" -d '{"username": "ImranKhanPTI", "likeCount": 2}'`
      },
      {
        description: 'Comment on posts with custom message',
        curl: `curl -X POST http://localhost:${PORT}/api/comment -H "Content-Type: application/json" -d '{"searchQuery": "Pakistan politics", "commentText": "Great insight!"}'`
      },
      {
        description: 'Retweet with thoughtful behavior',
        curl: `curl -X POST http://localhost:${PORT}/api/retweet -H "Content-Type: application/json" -d '{"username": "PTIofficial", "behaviorType": "thoughtful_writer"}'`
      },
      {
        description: 'Check for unread notifications (basic usage)',
        curl: `curl "http://localhost:${PORT}/api/notification"`
      },
      {
        description: 'Check notifications with time filter and custom settings',
        curl: `curl "http://localhost:${PORT}/api/notification?timeRangeHours=48&maxNotifications=20&includeOlderNotifications=true"`
      }
    ]
  };
}

// Main request handler
async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  logWithTimestamp(`${method} ${pathname}`, 'UNIFIED');

  try {
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      sendSuccess(res, { message: 'CORS preflight successful' });
      return;
    }

    // Route handlers
    if (pathname === '/api/tweet' && method === 'POST') {
      const body = await parseBody(req);
      const validatedInput = validateTweetInput(body);
      const result = await handleTweetRequest(validatedInput);
      sendSuccess(res, result, 'TWEET');
      
    } else if (pathname === '/api/like' && method === 'POST') {
      const body = await parseBody(req);
      const validatedInput = validateLikeInput(body);
      const result = await handleLikeRequest(validatedInput);
      sendSuccess(res, result, 'LIKE');
      
    } else if (pathname === '/api/comment' && method === 'POST') {
      const body = await parseBody(req);
      const validatedInput = validateCommentInput(body);
      const result = await handleCommentRequest(validatedInput);
      sendSuccess(res, result, 'COMMENT');
      
    } else if (pathname === '/api/retweet' && method === 'POST') {
      const body = await parseBody(req);
      const validatedInput = validateRetweetInput(body);
      const result = await handleRetweetRequest(validatedInput);
      sendSuccess(res, result, 'RETWEET');
      
    } else if (pathname === '/api/notification' && method === 'GET') {
      const parsedUrl = url.parse(req.url || '', true);
      const query = parsedUrl.query;
      const validatedInput = validateNotificationInput(query);
      const result = await handleNotificationRequest(validatedInput);
      sendSuccess(res, result, 'NOTIFICATION');
      
    } else if (pathname === '/api/status' && method === 'GET') {
      const status = await handleStatus();
      sendSuccess(res, status);
      
    } else if (pathname === '/api/help' && method === 'GET') {
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
    logWithTimestamp(`Request handling error: ${error.message}`, 'UNIFIED');
    sendError(res, 500, error.message);
  }
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  logWithTimestamp('='.repeat(80), 'UNIFIED');
  logWithTimestamp('🚀 Unified Social Media Automation Server started successfully!', 'UNIFIED');
  logWithTimestamp(`📍 Server URL: http://${HOST}:${PORT}`, 'UNIFIED');
  logWithTimestamp(`📖 API Documentation: http://${HOST}:${PORT}/api/help`, 'UNIFIED');
  logWithTimestamp(`🏥 Health Check: http://${HOST}:${PORT}/api/status`, 'UNIFIED');
  logWithTimestamp('='.repeat(80), 'UNIFIED');
  logWithTimestamp('Available endpoints:', 'UNIFIED');
  logWithTimestamp(`  📨 POST http://${HOST}:${PORT}/api/tweet      - Post tweets`, 'UNIFIED');
  logWithTimestamp(`  👍 POST http://${HOST}:${PORT}/api/like       - Like tweets`, 'UNIFIED');
  logWithTimestamp(`  💬 POST http://${HOST}:${PORT}/api/comment    - Comment on tweets`, 'UNIFIED');
  logWithTimestamp(`  🔄 POST http://${HOST}:${PORT}/api/retweet    - Retweet posts`, 'UNIFIED');
  logWithTimestamp(`  🔔 GET  http://${HOST}:${PORT}/api/notification - Check notifications`, 'UNIFIED');
  logWithTimestamp(`  📊 GET  http://${HOST}:${PORT}/api/status     - Server status`, 'UNIFIED');
  logWithTimestamp(`  📖 GET  http://${HOST}:${PORT}/api/help       - API documentation`, 'UNIFIED');
  logWithTimestamp('='.repeat(80), 'UNIFIED');
  logWithTimestamp('🌟 All services are unified on a single port with shared browser connection!', 'UNIFIED');
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    logWithTimestamp(`❌ Port ${PORT} is already in use. Please set UNIFIED_SERVER_PORT in .env to use a different port.`, 'UNIFIED');
  } else {
    logWithTimestamp(`❌ Server error: ${error.message}`, 'UNIFIED');
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logWithTimestamp('\n📴 Shutting down Unified Server...', 'UNIFIED');
  
  server.close(() => {
    logWithTimestamp('HTTP server closed', 'UNIFIED');
  });

  // The shared browser connection will handle its own cleanup
  logWithTimestamp('Unified Server shutdown complete', 'UNIFIED');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logWithTimestamp(`❌ Uncaught Exception: ${error.message}`, 'UNIFIED');
  logWithTimestamp(error.stack || 'No stack trace available', 'UNIFIED');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logWithTimestamp(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`, 'UNIFIED');
  process.exit(1);
});

export { server, handleTweetRequest, handleLikeRequest, handleCommentRequest, handleRetweetRequest, handleNotificationRequest };