// notification-reply-server.ts - Standalone server for notification reply functionality
import * as http from 'http';
import * as url from 'url';
import { 
  NotificationReplyInput, 
  replyToNotificationHuman,
  validateNotificationReplyInput
} from './notification_reply_human';
import { getBrowserConnection } from '../shared/browser-connection';

// Server configuration
const PORT = Number(process.env.NOTIFICATION_REPLY_SERVER_PORT) || 3005;
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

// Validate notification reply input
function validateNotificationReplyRequest(data: any): NotificationReplyInput {
  if (!data || typeof data !== 'object') {
    throw new Error('Request body must be a valid JSON object');
  }

  if (!data.username || typeof data.username !== 'string') {
    throw new Error('username is required and must be a string');
  }

  if (!data.replyMessage || typeof data.replyMessage !== 'string') {
    throw new Error('replyMessage is required and must be a string');
  }

  if (data.replyMessage.length > 280) {
    throw new Error('replyMessage must be 280 characters or less');
  }

  // Validate optional parameters
  if (data.notificationContent && typeof data.notificationContent !== 'string') {
    throw new Error('notificationContent must be a string');
  }

  if (data.notificationText && typeof data.notificationText !== 'string') {
    throw new Error('notificationText must be a string');
  }

  if (data.notificationId && typeof data.notificationId !== 'string') {
    throw new Error('notificationId must be a string');
  }

  if (data.maxNotificationsToCheck && (!Number.isInteger(data.maxNotificationsToCheck) || data.maxNotificationsToCheck < 1 || data.maxNotificationsToCheck > 50)) {
    throw new Error('maxNotificationsToCheck must be an integer between 1 and 50');
  }

  if (data.scrollAttempts && (!Number.isInteger(data.scrollAttempts) || data.scrollAttempts < 1 || data.scrollAttempts > 10)) {
    throw new Error('scrollAttempts must be an integer between 1 and 10');
  }

  if (data.waitAfterReply && (!Number.isInteger(data.waitAfterReply) || data.waitAfterReply < 1000 || data.waitAfterReply > 30000)) {
    throw new Error('waitAfterReply must be an integer between 1000 and 30000 milliseconds');
  }

  return data as NotificationReplyInput;
}

// Handle notification reply requests
async function handleNotificationReplyRequest(input: NotificationReplyInput): Promise<any> {
  logWithTimestamp(`Processing notification reply request: ${JSON.stringify({
    targetUsername: input.username,
    replyMessage: input.replyMessage.substring(0, 50) + (input.replyMessage.length > 50 ? '...' : ''),
    hasNotificationContent: !!input.notificationContent,
    hasNotificationText: !!input.notificationText,
    maxNotificationsToCheck: input.maxNotificationsToCheck || 20,
    scrollAttempts: input.scrollAttempts || 3
  })}`);

  try {
    const browser = await getBrowserConnection();
    
    const startTime = Date.now();
    await replyToNotificationHuman(browser, input);
    const duration = Date.now() - startTime;
    
    logWithTimestamp(`Notification reply operation completed successfully in ${duration}ms`);
    
    return {
      message: 'Notification reply sent successfully',
      input: {
        targetUsername: input.username,
        replyMessage: input.replyMessage,
        notificationContent: input.notificationContent,
        notificationText: input.notificationText,
        maxNotificationsToCheck: input.maxNotificationsToCheck || 20,
        scrollAttempts: input.scrollAttempts || 3,
        waitAfterReply: input.waitAfterReply || 3000,
        behaviorType: input.behaviorType || 'default'
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logWithTimestamp(`Notification reply operation failed: ${error.message}`);
    throw new Error(`Notification reply operation failed: ${error.message}`);
  }
}

// Handle status endpoint
function handleStatus(): any {
  return {
    service: 'Notification Reply Server',
    status: 'running',
    port: PORT,
    host: HOST,
    timestamp: new Date().toISOString(),
    browser: 'managed by shared connection',
    endpoints: {
      'POST /reply': 'Reply to specific notifications',
      'GET /status': 'Get server status',
      'GET /help': 'Get API documentation'
    }
  };
}

// Handle help endpoint
function handleHelp(): any {
  return {
    service: 'Notification Reply Server API Documentation',
    version: '1.0.0',
    endpoints: {
      'POST /reply': {
        description: 'Reply to a specific notification with human-like behavior',
        method: 'POST',
        contentType: 'application/json',
        body: {
          required: {
            username: 'string - Username of the person whose notification to reply to (e.g., "john_doe")',
            replyMessage: 'string - The reply message to send (max 280 characters)'
          },
          optional: {
            notificationContent: 'string - Partial content to match in the notification for better targeting',
            notificationText: 'string - Exact notification text to match',
            notificationId: 'string - Specific notification ID if available',
            maxNotificationsToCheck: 'number - Maximum notifications to scan (1-50, default: 20)',
            scrollAttempts: 'number - Times to scroll if notification not found (1-10, default: 3)',
            waitAfterReply: 'number - Wait time after sending reply in ms (1000-30000, default: 3000)',
            behaviorType: 'string - Human behavior pattern to use'
          }
        },
        example: {
          username: 'john_doe',
          replyMessage: 'Thanks for your comment! I appreciate your feedback. 👍',
          notificationContent: 'great post about AI',
          maxNotificationsToCheck: 25,
          scrollAttempts: 4,
          behaviorType: 'social_engager'
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
        description: 'Reply to a notification from a specific user',
        curl: 'curl -X POST http://localhost:3005/reply -H "Content-Type: application/json" -d \'{"username": "alice123", "replyMessage": "Thanks for your thoughtful comment!"}\''
      },
      {
        description: 'Reply with content matching for precise targeting',
        curl: 'curl -X POST http://localhost:3005/reply -H "Content-Type: application/json" -d \'{"username": "bob_smith", "replyMessage": "I totally agree!", "notificationContent": "interesting perspective on technology"}\''
      },
      {
        description: 'Reply with custom search parameters',
        curl: 'curl -X POST http://localhost:3005/reply -H "Content-Type: application/json" -d \'{"username": "charlie_dev", "replyMessage": "Great question! Let me explain...", "maxNotificationsToCheck": 30, "scrollAttempts": 5}\''
      }
    ],
    
    behavior_patterns: {
      casual_browser: 'Relaxed scrolling, longer reading pauses',
      social_engager: 'Moderate pace, thoughtful interactions',
      focused_poster: 'Direct approach, minimal delays',
      thoughtful_writer: 'Longer pauses, careful consideration'
    },
    
    matching_strategy: {
      username: 'Primary matching criteria - exact or partial username match',
      notificationContent: 'Secondary matching - fuzzy match against notification content',
      notificationText: 'Tertiary matching - fuzzy match against full notification text',
      confidence_scoring: 'Uses weighted scoring system to find best match'
    },
    
    notes: [
      'The server uses human-like behavior patterns to avoid detection',
      'Notifications are searched from newest to oldest',
      'Multiple scroll attempts will be made if notification not found',
      'The system will navigate to notifications page automatically',
      'Screenshots are saved for debugging purposes',
      'Reply messages are typed with realistic human typing speed',
      'The server maintains persistent browser connection for efficiency'
    ]
  };
}

// Handle POST request to reply to notifications
async function handleReplyToNotification(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const requestBody = await parseRequestBody(req);
    logWithTimestamp(`Received notification reply request: ${JSON.stringify({
      username: requestBody.username,
      replyLength: requestBody.replyMessage ? requestBody.replyMessage.length : 0,
      hasContent: !!requestBody.notificationContent
    })}`);

    const validatedInput = validateNotificationReplyRequest(requestBody);
    const result = await handleNotificationReplyRequest(validatedInput);
    
    logWithTimestamp('Notification reply operation completed successfully');
    sendSuccess(res, result);
    
  } catch (error: any) {
    logWithTimestamp(`Error in notification reply: ${error.message}`);
    sendError(res, 400, error.message);
  }
}

// Handle GET request for health check
function handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
  const status = handleStatus();
  sendSuccess(res, status);
}

// Handle GET request for API documentation
function handleApiDocumentation(req: http.IncomingMessage, res: http.ServerResponse): void {
  const help = handleHelp();
  sendSuccess(res, help);
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
    if (pathname === '/reply' && method === 'POST') {
      await handleReplyToNotification(req, res);
    } else if (pathname === '/status' && method === 'GET') {
      handleHealthCheck(req, res);
    } else if (pathname === '/help' && method === 'GET') {
      handleApiDocumentation(req, res);
    } else if (pathname === '/' && method === 'GET') {
      // Root endpoint - redirect to help
      handleApiDocumentation(req, res);
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
  logWithTimestamp(`🚀 Notification Reply Server started successfully!`);
  logWithTimestamp(`📍 Server URL: http://${HOST}:${PORT}`);
  logWithTimestamp(`📖 API Documentation: http://${HOST}:${PORT}/help`);
  logWithTimestamp(`🏥 Health Check: http://${HOST}:${PORT}/status`);
  logWithTimestamp('='.repeat(60));
  logWithTimestamp('Available endpoints:');
  logWithTimestamp(`  POST http://${HOST}:${PORT}/reply    - Reply to notifications`);
  logWithTimestamp(`  GET  http://${HOST}:${PORT}/status   - Server status`);
  logWithTimestamp(`  GET  http://${HOST}:${PORT}/help     - API documentation`);
  logWithTimestamp('='.repeat(60));
  logWithTimestamp('💬 Server is ready to handle notification replies with human-like behavior');
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
  logWithTimestamp('\n📴 Shutting down Notification Reply Server...');
  
  server.close(() => {
    logWithTimestamp('HTTP server closed');
  });

  logWithTimestamp('Notification Reply Server shutdown complete');
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

export { server, handleNotificationReplyRequest, validateNotificationReplyRequest };
