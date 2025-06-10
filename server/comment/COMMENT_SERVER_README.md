# Comment Server README

A powerful HTTP API server for posting comments on Twitter/X posts with human-like behavior and flexible targeting options.

## Quick Start

### 1. Start the Server

```bash
npm run comment-server
```

Server starts on http://localhost:3003

### 2. Test the Server

```bash
# Run all tests
npm run test-comment-client

# Test specific functionality
npm run test-comment-client username
npm run test-comment-client search
npm run test-comment-client profile
```

### 3. Basic Usage

```bash
# Comment on posts by username
curl -X POST http://localhost:3003/comment \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ImranKhanPTI",
    "commentText": "Great message! 👏",
    "commentCount": 1
  }'

# Comment using search query
curl -X POST http://localhost:3003/comment \
  -H "Content-Type: application/json" \
  -d '{
    "searchQuery": "Pakistan politics",
    "comments": ["Interesting!", "Thanks for sharing!"],
    "commentCount": 1
  }'
```

## Key Features

### 🎯 Flexible Targeting
- **Username**: Target specific user's posts
- **Search Query**: Find posts by keywords
- **Tweet Content**: Match specific content
- **Profile URL**: Comment on specific profiles

### 🤖 Human-like Behavior
- Realistic scrolling and reading patterns
- Variable typing speed with thinking pauses
- Natural navigation timing
- Random post selection (avoids first posts)

### 💬 Comment Customization
- Custom comment text
- Random selection from comment pools
- Generic fallback comments
- Emoji support

### 🔧 Advanced Configuration
- Multiple comments per request
- Configurable scroll timing
- Feed vs profile search options
- Error handling and retries

## API Overview

### POST /comment
Post comments with targeting criteria:

```json
{
  "username": "string",           // Target username
  "searchQuery": "string",        // Search terms
  "tweetContent": "string",       // Content to match
  "profileUrl": "string",         // Direct profile URL
  "commentText": "string",        // Specific comment
  "comments": ["string"],         // Comment pool
  "commentCount": 1,              // Number of comments (1-10)
  "scrollTime": 10000,            // Scroll duration (ms)
  "searchInFeed": true,           // Search in home feed
  "visitProfile": true            // Visit profile if needed
}
```

### GET /status
Check server and browser connection status.

### GET /help
Get comprehensive API documentation.

## Response Format

### Success
```json
{
  "success": true,
  "data": {
    "message": "Comment operation completed successfully",
    "input": { /* request parameters */ },
    "duration": "15423ms",
    "timestamp": "2024-01-15T10:30:01.500Z"
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-15T10:30:01.500Z"
}
```

## Human-like Behavior Details

### Timing Patterns
- **Scrolling**: 300-700px with 200-1200ms pauses
- **Reading**: 2-8 second content reading simulation
- **Typing**: 50-250ms per character with thinking pauses
- **Navigation**: 300-700ms hover delays

### Search Strategy
1. Search home feed for matching content
2. Visit specific profiles if feed search fails
3. Select posts randomly (avoid first post bias)
4. Use human-like navigation patterns

### Comment Selection
1. Use provided `commentText` if specified
2. Random selection from `comments` array if provided
3. Fallback to generic positive comments
4. Natural emoji usage

## Configuration

### Environment Setup
Ensure your `.env` file contains:
```bash
WS_ENDPOINT=ws://localhost:9222/devtools/browser/your-browser-id
```

### Port Configuration
```bash
# Custom port
PORT=3004 npm run comment-server

# Custom host
HOST=0.0.0.0 npm run comment-server
```

## Testing

### Comprehensive Test Suite
```bash
# All tests
npm run test-comment-client

# Specific tests
npm run test-comment-client status      # Server status
npm run test-comment-client username    # Username targeting
npm run test-comment-client search      # Search query
npm run test-comment-client profile     # Profile URL
npm run test-comment-client content     # Tweet content
npm run test-comment-client multiple    # Multiple comments
npm run test-comment-client errors      # Error handling
```

### Test Examples
- Username-based commenting
- Search query matching
- Profile URL targeting
- Tweet content matching
- Multiple comment posting
- Error scenario handling

## Use Cases

### Political Engagement
```bash
curl -X POST http://localhost:3003/comment \
  -H "Content-Type: application/json" \
  -d '{
    "username": "PTIofficial",
    "comments": [
      "Great work PTI! 🇵🇰",
      "Keep up the excellent leadership!",
      "Pakistan stands with you! ❤️"
    ],
    "commentCount": 1
  }'
```

### Topic-based Commenting
```bash
curl -X POST http://localhost:3003/comment \
  -H "Content-Type: application/json" \
  -d '{
    "searchQuery": "Pakistan development economy",
    "commentText": "Very insightful analysis! Thank you for sharing. 📊",
    "scrollTime": 15000
  }'
```

### Profile Engagement
```bash
curl -X POST http://localhost:3003/comment \
  -H "Content-Type: application/json" \
  -d '{
    "profileUrl": "https://twitter.com/ImranKhanPTI",
    "comments": [
      "Thank you for your leadership! 🙏",
      "Pakistan needs more leaders like you!",
      "Keep fighting for justice! ⚖️"
    ],
    "visitProfile": true,
    "searchInFeed": false
  }'
```

## Best Practices

### Comment Quality
- Use meaningful, relevant comments
- Include appropriate emojis for engagement
- Vary comment text to appear natural
- Avoid repetitive or spam-like content

### Rate Limiting
- Space requests 30+ seconds apart
- Limit daily comment volume
- Monitor for platform restrictions
- Use human-like timing patterns

### Targeting Strategy
- Use specific usernames for targeted engagement
- Use search queries for topic discovery
- Use content matching for relevant responses
- Combine strategies for comprehensive coverage

## Troubleshooting

### Common Issues
1. **Server Won't Start**: Check port 3003 availability
2. **Browser Connection Failed**: Verify WS_ENDPOINT in .env
3. **Comment Failed**: Check Twitter/X login status
4. **Timeout Errors**: Increase scrollTime parameter

### Debug Information
- Check `debug_logs/generic_comment_human.log` for operation details
- Screenshots saved in `debug_logs/` for visual debugging
- Server logs show request/response information

### Error Codes
- **400**: Invalid request parameters
- **500**: Server error (browser connection, navigation failure)
- **404**: Invalid endpoint

## Architecture

### Components
- **comment-server.ts**: HTTP API server
- **generic_comment_human.ts**: Core commenting logic with human behavior
- **test-comment-client.ts**: Comprehensive test suite

### Dependencies
- **puppeteer-core**: Browser automation
- **dotenv**: Environment configuration
- **Node.js http**: HTTP server functionality

### Browser Integration
- Uses existing browser automation setup
- Persistent connection for efficiency
- Automatic reconnection on disconnect

## Security

### Data Protection
- Uses existing browser session authentication
- No credential storage or transmission
- Local operation only

### Privacy
- All operations performed in your authenticated browser
- No external data transmission
- Local logging only

## Integration

### Node.js Example
```javascript
const response = await fetch('http://localhost:3003/comment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'ImranKhanPTI',
    commentText: 'Great message!',
    commentCount: 1
  })
});
const result = await response.json();
```

### Python Example
```python
import requests

response = requests.post('http://localhost:3003/comment', 
  json={
    'searchQuery': 'Pakistan politics',
    'comments': ['Interesting perspective!', 'Thanks for sharing!'],
    'commentCount': 1
  }
)
result = response.json()
```

## Support

For detailed documentation, see [HTTP_COMMENT_SERVER_GUIDE.md](./HTTP_COMMENT_SERVER_GUIDE.md)

For issues:
1. Check debug logs in `debug_logs/`
2. Verify browser automation setup
3. Test with other services first
4. Check network connectivity

---

**Server URL**: http://localhost:3003  
**Documentation**: http://localhost:3003/help  
**Health Check**: http://localhost:3003/status
