# HTTP Comment Server Guide

## Overview

The Generic Comment Server is a powerful HTTP API service that allows you to post comments on Twitter/X posts with human-like behavior. Unlike the hardcoded PTI comment system, this server provides flexible, configurable commenting capabilities that can target any username, search query, tweet content, or profile URL.

## Features

### Core Functionality
- **Flexible Targeting**: Comment on posts by username, search query, tweet content, or direct profile URL
- **Human-like Behavior**: Realistic scrolling, reading pauses, typing speed, and navigation patterns
- **Custom Comments**: Use your own comment text or select from custom comment pools
- **Multiple Comments**: Post multiple comments with natural delays between them
- **Smart Search**: Search in home feed first, then visit profiles if needed
- **Error Handling**: Comprehensive error handling and retry mechanisms
- **Browser Management**: Persistent browser connection for efficiency

### Human-like Features
- Variable typing speed with thinking pauses
- Realistic scrolling patterns with reading stops
- Natural navigation timing
- Random comment selection from pools
- Human-like post selection (avoids first posts)
- Authentic user behavior simulation

## Server Setup

### 1. Start the Comment Server

```bash
# Start the comment server (default port 3003)
npm run comment-server

# The server will show:
# 🚀 Comment Server started successfully!
# 📍 Server URL: http://localhost:3003
# 📖 API Documentation: http://localhost:3003/help
# 🏥 Health Check: http://localhost:3003/status
```

### 2. Verify Server Status

```bash
# Check if server is running
curl http://localhost:3003/status

# Expected response:
{
  "success": true,
  "data": {
    "service": "Comment Server",
    "status": "running",
    "port": 3003,
    "host": "localhost",
    "browserConnected": true,
    "endpoints": {
      "POST /comment": "Post comments on tweets based on search criteria",
      "GET /status": "Get server status",
      "GET /help": "Get API documentation"
    }
  }
}
```

## API Endpoints

### POST /comment
Post comments on tweets based on search criteria with human-like behavior.

**Request Body Parameters:**

#### Targeting Parameters (At least one required)
- `username` (string): Target username (e.g., "ImranKhanPTI", "PTIofficial")
- `searchQuery` (string): Search terms to find tweets (e.g., "Pakistan politics")
- `tweetContent` (string): Specific content to look for in tweets
- `profileUrl` (string): Direct profile URL to visit

#### Comment Configuration
- `commentText` (string): Specific comment to post (overrides random selection)
- `comments` (string[]): Array of custom comments (one will be selected randomly)

#### Optional Parameters
- `commentCount` (number): Number of tweets to comment on (1-10, default: 1)
- `scrollTime` (number): Time to scroll in milliseconds (1000-60000, default: 10000)
- `searchInFeed` (boolean): Whether to search in home feed first (default: true)
- `visitProfile` (boolean): Whether to visit profile if feed search fails (default: true)

### GET /status
Get current server status and browser connection state.

### GET /help
Get comprehensive API documentation with examples.

## Usage Examples

### 1. Comment on Specific Username Posts

```bash
curl -X POST http://localhost:3003/comment \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ImranKhanPTI",
    "commentText": "Great message! Keep up the excellent work! 👏",
    "commentCount": 1,
    "scrollTime": 10000
  }'
```

### 2. Comment Using Search Query

```bash
curl -X POST http://localhost:3003/comment \
  -H "Content-Type: application/json" \
  -d '{
    "searchQuery": "Pakistan politics democracy",
    "comments": [
      "Very insightful perspective! 🤔",
      "Thanks for sharing this important message! 👍",
      "This is exactly what Pakistan needs! 🇵🇰"
    ],
    "commentCount": 2,
    "scrollTime": 15000
  }'
```

### 3. Comment on Specific Profile

```bash
curl -X POST http://localhost:3003/comment \
  -H "Content-Type: application/json" \
  -d '{
    "profileUrl": "https://twitter.com/PTIofficial",
    "commentText": "Excellent work team PTI! Pakistan is proud! 🇵🇰❤️",
    "searchInFeed": false,
    "visitProfile": true
  }'
```

### 4. Comment on Posts with Specific Content

```bash
curl -X POST http://localhost:3003/comment \
  -H "Content-Type: application/json" \
  -d '{
    "tweetContent": "justice leadership Pakistan",
    "comments": [
      "Absolutely agree with this important message! 💯",
      "Thank you for standing up for justice! ⚖️",
      "Pakistan needs more leaders like this! 🌟"
    ],
    "commentCount": 1,
    "scrollTime": 12000
  }'
```

### 5. Multiple Comments with Custom Pool

```bash
curl -X POST http://localhost:3003/comment \
  -H "Content-Type: application/json" \
  -d '{
    "username": "PTIofficial",
    "comments": [
      "Great work! Keep it up! 👏",
      "This is inspiring! Thank you! 🌟",
      "Pakistan needs more leaders like this! 🇵🇰",
      "Excellent message! Fully support this! 💪",
      "Thank you for your dedication! ❤️"
    ],
    "commentCount": 3,
    "scrollTime": 20000,
    "searchInFeed": true,
    "visitProfile": true
  }'
```

## Testing

### Run Comprehensive Tests

```bash
# Run all comment server tests
npm run test-comment-client

# Run specific tests
npm run test-comment-client status      # Test server status
npm run test-comment-client username    # Test username commenting
npm run test-comment-client search      # Test search query commenting
npm run test-comment-client profile     # Test profile URL commenting
npm run test-comment-client content     # Test tweet content commenting
npm run test-comment-client multiple    # Test multiple comments
npm run test-comment-client errors      # Test error handling
```

### Expected Test Output

```
🚀 Starting Comment Server Test Suite
============================================================
[2024-01-15T10:30:00.000Z] 🔍 Testing server status...
[2024-01-15T10:30:00.100Z] ✅ Server status check passed
[2024-01-15T10:30:00.100Z]    Service: Comment Server
[2024-01-15T10:30:00.100Z]    Status: running
[2024-01-15T10:30:00.100Z]    Browser Connected: true

[2024-01-15T10:30:01.000Z] 🧪 Testing comment by username...
[2024-01-15T10:30:01.100Z] ✅ Comment by username test completed successfully
[2024-01-15T10:30:01.100Z]    Duration: 15423ms
[2024-01-15T10:30:01.100Z]    Comments Posted: 1
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "message": "Comment operation completed successfully",
    "input": {
      "username": "ImranKhanPTI",
      "searchQuery": null,
      "tweetContent": null,
      "profileUrl": null,
      "commentCount": 1,
      "scrollTime": 10000,
      "searchInFeed": true,
      "visitProfile": true,
      "hasCustomComments": 0,
      "hasCustomText": true
    },
    "duration": "15423ms",
    "timestamp": "2024-01-15T10:30:01.500Z"
  },
  "timestamp": "2024-01-15T10:30:01.500Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "At least one targeting parameter must be provided (username, searchQuery, tweetContent, or profileUrl)",
  "timestamp": "2024-01-15T10:30:01.500Z"
}
```

## Configuration

### Environment Variables

The server uses the same browser connection as other services:

```bash
# .env file
WS_ENDPOINT=ws://localhost:9222/devtools/browser/your-browser-id
```

### Port Configuration

```bash
# Change server port (default: 3003)
PORT=3004 npm run comment-server

# Change host (default: localhost)
HOST=0.0.0.0 npm run comment-server
```

## Human-like Behavior Details

### Timing Patterns
- **Scrolling**: 300-700px scrolls with 200-1200ms pauses
- **Reading**: 2-8 second pauses to simulate reading posts
- **Typing**: 50-250ms per character with thinking pauses
- **Navigation**: 300-700ms hover delays before clicking

### Search Strategy
1. **Home Feed Search**: Scroll through home timeline looking for matching content
2. **Profile Visit**: If feed search fails, navigate to specific profiles
3. **Comment Selection**: Avoid first posts, select randomly from matches
4. **Human Navigation**: Use realistic click patterns and timing

### Comment Selection
- Custom text takes priority
- Random selection from custom comment pools
- Fallback to generic positive comments
- Natural emoji usage patterns

## Error Handling

### Common Errors
- **Invalid Input**: Missing required targeting parameters
- **Browser Connection**: WebSocket endpoint issues
- **Network Timeouts**: Page load or navigation failures
- **Element Not Found**: Reply buttons or text boxes missing

### Troubleshooting
1. **Server Won't Start**: Check if port 3003 is available
2. **Browser Connection Failed**: Verify WS_ENDPOINT in .env file
3. **Comment Failed**: Check Twitter/X login status and rate limits
4. **Timeout Errors**: Increase scrollTime parameter

## Best Practices

### Targeting Strategy
- Use specific usernames for targeted commenting
- Use search queries for broader content discovery
- Use tweet content matching for specific topic responses
- Use profile URLs for direct profile engagement

### Comment Quality
- Provide meaningful, relevant comments
- Use positive, constructive language
- Include appropriate emojis for engagement
- Avoid repetitive or spam-like content

### Rate Limiting
- Space out comment requests (recommended: 30+ seconds between requests)
- Limit daily comment volume to avoid detection
- Use varied comment text to appear natural
- Monitor for any platform restrictions

## Integration Examples

### Node.js Integration

```javascript
const http = require('http');

async function postComment(commentData) {
  const data = JSON.stringify(commentData);
  
  const options = {
    hostname: 'localhost',
    port: 3003,
    path: '/comment',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Usage
postComment({
  username: 'ImranKhanPTI',
  commentText: 'Great message!',
  commentCount: 1
}).then(console.log);
```

### Python Integration

```python
import requests

def post_comment(comment_data):
    response = requests.post(
        'http://localhost:3003/comment',
        json=comment_data,
        headers={'Content-Type': 'application/json'}
    )
    return response.json()

# Usage
result = post_comment({
    'username': 'PTIofficial',
    'comments': ['Great work!', 'Keep it up!'],
    'commentCount': 1
})
print(result)
```

## Security & Privacy

### Data Protection
- Comments are posted using your authenticated browser session
- No credentials are stored or transmitted by the server
- All operations use existing browser authentication

### Rate Limiting
- Built-in human-like delays prevent rapid-fire commenting
- Configurable timing parameters for natural behavior
- Automatic retry mechanisms with backoff

### Logging
- Comprehensive logging for debugging and monitoring
- Screenshots saved automatically for troubleshooting
- No sensitive data logged (comments are logged for verification)

## Support

### Debug Information
- Check `debug_logs/generic_comment_human.log` for detailed operation logs
- Screenshots saved in `debug_logs/` directory for visual debugging
- Server logs show request/response details

### Common Issues
1. **Browser Disconnected**: Restart the browser automation setup
2. **Element Selectors Changed**: Twitter/X may update their UI elements
3. **Rate Limited**: Wait longer between requests
4. **Login Required**: Ensure browser session is authenticated

For additional support, check the debug logs and ensure your browser automation setup is working correctly with other services first.
