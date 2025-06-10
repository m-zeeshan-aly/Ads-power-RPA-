# Generic Like System Documentation

## Overview

The Generic Like System provides a flexible way to like tweets on Twitter based on various search criteria. Unlike the original system that was hardcoded for specific accounts (like Imran Khan), this system accepts external parameters and can work with any username, search query, tweet content, or profile URL.

## Files

- `generic_like_human.ts` - Core like functionality with human-like behavior
- `http-like-server.ts` - HTTP REST API server for like operations
- `test-like-server.ts` - Test client for the like server

## Features

### 🎯 Flexible Search Criteria
- **Username**: Target specific users (e.g., "elonmusk", "github")
- **Search Query**: Find tweets by keywords (e.g., "AI technology", "climate change")
- **Tweet Content**: Match specific content in tweets
- **Profile URL**: Direct profile URLs (e.g., "https://twitter.com/openai")

### 🤖 Human-like Behavior
- Variable scrolling speeds and patterns
- Random pauses and reading simulation
- Natural mouse movements and hover effects
- Intelligent tweet selection (avoids always picking first tweet)
- Feed browsing before profile visits

### ⚙️ Configurable Options
- **Like Count**: 1-10 tweets per operation
- **Scroll Time**: 1-60 seconds of feed browsing
- **Search Strategy**: Feed search, profile visit, or both
- **Error Handling**: Graceful fallbacks and retries

## Quick Start

### 1. Start the Like Server

```bash
npm run like-server
```

The server will start on `http://localhost:3002`

### 2. Test the Server

```bash
npm run test-like-server
```

### 3. API Documentation

Visit `http://localhost:3002/docs` for complete API documentation.

## API Usage

### Basic Examples

#### Like by Username
```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{
    "username": "elonmusk",
    "likeCount": 2
  }'
```

#### Like by Search Query
```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{
    "searchQuery": "artificial intelligence",
    "scrollTime": 15000
  }'
```

#### Like by Tweet Content
```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{
    "tweetContent": "climate change",
    "searchInFeed": true,
    "visitProfile": false
  }'
```

#### Like by Profile URL
```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{
    "profileUrl": "https://twitter.com/openai",
    "likeCount": 1
  }'
```

#### Combined Criteria
```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{
    "username": "github",
    "searchQuery": "open source",
    "likeCount": 3,
    "scrollTime": 20000
  }'
```

### JavaScript/Node.js Example

```javascript
const response = await fetch('http://localhost:3002/like', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'ImranKhanPTI',
    searchQuery: 'Pakistan politics',
    likeCount: 2,
    scrollTime: 12000,
    searchInFeed: true,
    visitProfile: true
  })
});

const result = await response.json();
console.log(result);
```

### Python Example

```python
import requests

response = requests.post('http://localhost:3002/like', json={
    'username': 'elonmusk',
    'searchQuery': 'space technology',
    'likeCount': 1,
    'scrollTime': 10000
})

result = response.json()
print(result)
```

## Parameters

### Required (At least one must be provided)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `username` | string | Target username without @ | `"elonmusk"` |
| `searchQuery` | string | Search terms for tweets | `"AI technology"` |
| `tweetContent` | string | Content to find in tweets | `"climate change"` |
| `profileUrl` | string | Direct profile URL | `"https://twitter.com/openai"` |

### Optional

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `likeCount` | number | `1` | Number of tweets to like (1-10) |
| `scrollTime` | number | `10000` | Feed browsing time in ms (1000-60000) |
| `searchInFeed` | boolean | `true` | Search in home feed first |
| `visitProfile` | boolean | `true` | Visit profile if feed search fails |

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Like operation completed successfully with human-like behavior",
  "data": {
    "likeOperation": {
      "criteria": {
        "username": "elonmusk",
        "searchQuery": null,
        "tweetContent": null,
        "profileUrl": null
      },
      "options": {
        "likeCount": 2,
        "scrollTime": 10000,
        "searchInFeed": true,
        "visitProfile": true
      }
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "At least one of username, searchQuery, tweetContent, or profileUrl must be provided",
  "details": null,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Integration Examples

### n8n Workflow
```json
{
  "method": "POST",
  "url": "http://localhost:3002/like",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "username": "{{ $json.targetUser }}",
    "likeCount": "{{ $json.likeCount }}",
    "searchQuery": "{{ $json.keywords }}"
  }
}
```

### Webhook Integration
```javascript
// Express.js webhook handler
app.post('/webhook/like-tweets', async (req, res) => {
  const { username, keywords, count } = req.body;
  
  try {
    const response = await fetch('http://localhost:3002/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        searchQuery: keywords,
        likeCount: count || 1
      })
    });
    
    const result = await response.json();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Server Management

### Health Check
```bash
curl http://localhost:3002/health
```

### Server Logs
The server provides detailed logging including:
- Request processing
- Browser connection status
- Like operation progress
- Error details and stack traces
- Performance metrics

### Graceful Shutdown
The server handles SIGTERM and SIGINT signals for graceful shutdown:
- Closes browser connections
- Completes ongoing operations
- Provides shutdown status

## Error Handling

The system includes comprehensive error handling:

1. **Validation Errors**: Invalid parameters return 400 status
2. **Browser Errors**: Connection issues return 500 status
3. **Network Errors**: Timeout and connectivity issues
4. **Tweet Not Found**: Graceful handling when no matching tweets found

## Human-like Behavior Patterns

The system implements sophisticated human-like behaviors:

### Scrolling Patterns
- Variable scroll distances (300-700px)
- Random pauses between scrolls (200-1000ms)
- Occasional longer pauses to "read" content
- Natural scrolling curves

### Interaction Patterns
- Hover before clicking
- Variable typing speeds
- Reading simulation pauses
- Non-predictable tweet selection

### Navigation Patterns
- Feed browsing before targeted actions
- Search functionality usage
- Profile navigation
- Return to home page after actions

## Performance and Limits

### Rate Limiting
- Maximum 10 likes per request
- Built-in delays between actions
- Human-like timing to avoid detection

### Resource Usage
- Persistent browser connection
- Automatic reconnection on failure
- Memory-efficient screenshot handling
- Optimized DOM queries

## Troubleshooting

### Common Issues

1. **Server Won't Start**
   - Check if port 3002 is available
   - Verify WebSocket endpoint in .env file

2. **Browser Connection Failed**
   - Ensure AdsPower browser is running
   - Check WebSocket URL format
   - Verify network connectivity

3. **No Tweets Found**
   - Try different search criteria
   - Increase scroll time
   - Enable both feed search and profile visit

4. **Tweets Already Liked**
   - System skips already-liked tweets
   - Try different users or content

### Debug Information

Enable debug mode by setting `NODE_ENV=development`:
```bash
NODE_ENV=development npm run like-server
```

This provides:
- Detailed error stack traces
- Additional logging
- Screenshot captures at each step

## Comparison with Original System

| Feature | Original (like_imran_tweet_human.ts) | New Generic System |
|---------|-------------------------------------|-------------------|
| Target Users | Hardcoded "Imran Khan" | Any username via parameter |
| Search Terms | Fixed "Imran Khan PTI" | Flexible search queries |
| API Integration | None | Full REST API |
| Configuration | Code changes required | External parameters |
| Reusability | Single use case | Multiple use cases |
| Error Handling | Basic | Comprehensive |
| Documentation | Minimal | Complete API docs |

The new system maintains all the human-like behavior patterns of the original while providing complete flexibility and external parameter support.
