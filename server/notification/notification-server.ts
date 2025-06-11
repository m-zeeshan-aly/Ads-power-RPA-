// notification-server.ts
import * as http from 'http';
import * as url from 'url';
import { 
  NotificationInput, 
  NotificationData,
  checkNotificationsHuman 
} from './generic_notification_human';
import { getBrowserConnection } from '../shared/browser-connection';

// Server configuration
const PORT = Number(process.env.NOTIFICATION_SERVER_PORT) || 3004;
const HOST = process.env.HOST || 'localhost';

// Logging utility
function logWithTimestamp(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [NOTIFICATION] ${message}`);
}

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

// Validate notification input
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

  if (input.behaviorType !== undefined) {
    if (typeof input.behaviorType !== 'string') {
      throw new Error('behaviorType must be a string');
    }
    notificationInput.behaviorType = input.behaviorType;
  }

  return notificationInput;
}

// Handle notification requests
async function handleNotificationRequest(input: NotificationInput): Promise<any> {
  logWithTimestamp(`Processing notification check request with options: ${JSON.stringify({
    maxNotifications: input.maxNotifications || 10,
    includeOlderNotifications: input.includeOlderNotifications || false,
    behaviorType: input.behaviorType || 'default'
  })}`);

  try {
    const browser = await getBrowserConnection();
    
    const startTime = Date.now();
    const notifications = await checkNotificationsHuman(browser, input);
    const duration = Date.now() - startTime;
    
    logWithTimestamp(`Notification check completed successfully in ${duration}ms`);
    logWithTimestamp(`Found ${notifications.length} relevant notifications (comments/mentions)`);
    
    return {
      message: 'Notification check completed successfully',
      notifications: notifications,
      summary: {
        totalFound: notifications.length,
        comments: notifications.filter((n: NotificationData) => n.type === 'comment').length,
        mentions: notifications.filter((n: NotificationData) => n.type === 'mention').length,
        verifiedUsers: notifications.filter((n: NotificationData) => n.isVerified).length
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
    logWithTimestamp(`Notification check failed: ${error.message}`);
    throw new Error(`Notification check failed: ${error.message}`);
  }
}

// Handle POST request to check notifications
async function handleCheckNotifications(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const requestBody = await parseRequestBody(req);
    logWithTimestamp(`Received notification check request: ${JSON.stringify(requestBody)}`);

    // Validate the request (empty body is acceptable for notifications)
    const notificationInput = validateNotificationInput(requestBody);
    
    // Check notifications with human-like behavior
    const result = await handleNotificationRequest(notificationInput);
    
    logWithTimestamp('Notification check operation completed successfully');
    sendSuccess(res, result);
    
  } catch (error: any) {
    logWithTimestamp(`Error checking notifications: ${error.message}`);
    sendError(res, 400, error.message);
  }
}

// Handle GET request for health check
function handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
  sendSuccess(res, {
    status: 'healthy',
    service: 'Notification Server',
    browser: 'managed by shared connection',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}

// Handle GET request for API information
function handleApiInfo(req: http.IncomingMessage, res: http.ServerResponse): void {
  sendSuccess(res, {
    name: 'Notification Check API',
    version: '1.0.0',
    description: 'HTTP API for checking Twitter/X notifications with human-like behavior',
    endpoints: {
      'POST /notifications': 'Check for unread notifications (comments and mentions only)',
      'GET /health': 'Health check',
      'GET /help': 'API documentation',
      'GET /': 'API information'
    },
    requestFormat: {
      // All parameters are optional
      maxNotifications: 'number (optional) - Maximum notifications to check (1-50, default: 10)',
      includeOlderNotifications: 'boolean (optional) - Check older notifications too (default: false)',
      behaviorType: 'string (optional) - Human behavior pattern to use'
    },
    example: {
      maxNotifications: 15,
      includeOlderNotifications: true,
      behaviorType: 'social_engager'
    },
    responseFormat: {
      notifications: 'array - Array of notification objects',
      summary: 'object - Summary of found notifications',
      options: 'object - Request options used',
      duration: 'string - Time taken to check notifications'
    }
  });
}

// Handle help endpoint
function handleHelp(req: http.IncomingMessage, res: http.ServerResponse): void {
  const helpData = {
    service: 'Notification Server API Documentation',
    version: '1.0.0',
    description: 'Check for unread notifications on Twitter/X, specifically filtering for comments and mentions only',
    
    endpoints: {
      'POST /notifications': {
        description: 'Check for unread notifications with human-like behavior',
        method: 'POST',
        contentType: 'application/json',
        body: {
          note: 'All parameters are optional - empty request body is valid',
          optional_parameters: {
            maxNotifications: 'number - Maximum notifications to check (1-50, default: 10)',
            includeOlderNotifications: 'boolean - Whether to scroll and check older notifications (default: false)',
            behaviorType: 'string - Human behavior pattern to use for browsing'
          }
        },
        example: {
          maxNotifications: 20,
          includeOlderNotifications: true,
          behaviorType: 'social_engager'
        },
        response: {
          notifications: 'array - Array of comment/mention notifications',
          summary: 'object - Summary statistics',
          options: 'object - Request options used',
          duration: 'string - Processing time'
        }
      },
      'GET /health': {
        description: 'Get current server status and browser connection state',
        method: 'GET'
      },
      'GET /help': {
        description: 'Get this API documentation',
        method: 'GET'
      }
    },
    
    notification_types_returned: {
      comment: 'Someone replied to or commented on your tweet',
      mention: 'Someone mentioned or tagged you in their tweet'
    },
    
    notification_object_structure: {
      type: 'string - notification type (comment/mention)',
      username: 'string - @username of the person who interacted',
      userDisplayName: 'string - Display name of the user',
      userHandle: 'string - Username without @ symbol',
      content: 'string - The comment or mention content',
      originalTweetContent: 'string - Your original tweet content (for comments)',
      timestamp: 'string - When the notification occurred',
      profileUrl: 'string - Profile URL of the user',
      notificationText: 'string - Full notification text',
      isVerified: 'boolean - Whether the user is verified',
      actionTaken: 'string - Description of the action taken'
    },
    
    usage_examples: [
      {
        description: 'Check for any new comments and mentions (basic)',
        curl: 'curl -X POST http://localhost:3004/notifications'
      },
      {
        description: 'Check up to 20 notifications including older ones',
        curl: 'curl -X POST http://localhost:3004/notifications -H "Content-Type: application/json" -d \'{"maxNotifications": 20, "includeOlderNotifications": true}\''
      },
      {
        description: 'Check with specific behavior pattern',
        curl: 'curl -X POST http://localhost:3004/notifications -H "Content-Type: application/json" -d \'{"behaviorType": "casual_browser", "maxNotifications": 15}\''
      }
    ],
    
    notes: [
      'The service only returns comments and mentions - other notification types are filtered out',
      'Empty request body is valid - all parameters have sensible defaults',
      'The service uses human-like browsing behavior to avoid detection',
      'If no notifications are found, an empty array is returned',
      'Screenshots are saved automatically for debugging purposes',
      'Response includes summary statistics for quick overview'
    ]
  };
  
  sendSuccess(res, helpData);
}

// Handle OPTIONS request for CORS
function handleOptions(req: http.IncomingMessage, res: http.ServerResponse): void {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
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

      case '/help':
        if (method === 'GET') {
          handleHelp(req, res);
        } else {
          sendError(res, 405, 'Method not allowed');
        }
        break;

      case '/notifications':
        if (method === 'POST') {
          await handleCheckNotifications(req, res);
        } else {
          sendError(res, 405, 'Method not allowed. Use POST to check notifications.');
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
  process.on('SIGINT', () => {
    logWithTimestamp('Received SIGINT, shutting down gracefully...');
    server.close(() => {
      logWithTimestamp('Server closed successfully');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    logWithTimestamp('Received SIGTERM, shutting down gracefully...');
    server.close(() => {
      logWithTimestamp('Server closed successfully');
      process.exit(0);
    });
  });
}

// Start the server
function startServer(): void {
  const server = http.createServer(requestHandler);
  
  server.listen(PORT, HOST, () => {
    logWithTimestamp('='.repeat(60));
    logWithTimestamp('🔔 Notification Server Started Successfully!');
    logWithTimestamp('='.repeat(60));
    logWithTimestamp(`Server running at http://${HOST}:${PORT}`);
    logWithTimestamp(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logWithTimestamp(`Process ID: ${process.pid}`);
    logWithTimestamp('');
    logWithTimestamp('Available endpoints:');
    logWithTimestamp(`  GET  http://${HOST}:${PORT}/          - API information`);
    logWithTimestamp(`  GET  http://${HOST}:${PORT}/health    - Health check`);
    logWithTimestamp(`  GET  http://${HOST}:${PORT}/help      - API documentation`);
    logWithTimestamp(`  POST http://${HOST}:${PORT}/notifications - Check notifications`);
    logWithTimestamp('');
    logWithTimestamp('Example POST request:');
    logWithTimestamp('  curl -X POST http://localhost:3004/notifications \\');
    logWithTimestamp('    -H "Content-Type: application/json" \\');
    logWithTimestamp('    -d \'{"maxNotifications": 15, "includeOlderNotifications": true}\'');
    logWithTimestamp('='.repeat(60));
    logWithTimestamp('🔍 Service filters for comments and mentions only');
    logWithTimestamp('📱 Empty request body is valid - uses sensible defaults');
    logWithTimestamp('🤖 Human-like behavior patterns applied for stealth');
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
