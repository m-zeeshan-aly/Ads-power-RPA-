# Generic Like Server

A powerful HTTP server for liking tweets on Twitter with human-like behavior based on flexible search criteria.

## Quick Start

### 1. Setup
```bash
# Make sure your browser is running with remote debugging
# and WS_ENDPOINT is set in your .env file

# Start the like server
npm run like-server
```

### 2. Test the server
```bash
# In another terminal, run the test client
npm run test-like-client

# Or test manually with curl
curl http://localhost:3002/health
```

### 3. Like tweets by username
```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{"username":"elonmusk","likeCount":2}'
```

## Features

✅ **Generic & Flexible**: Works with any username, search query, tweet content, or profile URL  
✅ **Human-like Behavior**: Natural scrolling, reading pauses, variable timing  
✅ **Multiple Search Options**: Combine different search criteria  
✅ **REST API**: Simple JSON-based HTTP interface  
✅ **Input Validation**: Comprehensive error handling  
✅ **Browser Management**: Automatic connection handling  

## API Endpoints

- `POST /like` - Like tweets based on search criteria
- `GET /health` - Server and browser status
- `GET /` - API documentation

## Search Options (At least one required)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `username` | string | Target username (without @) | `"elonmusk"` |
| `searchQuery` | string | Search terms | `"artificial intelligence"` |
| `tweetContent` | string | Specific content to find | `"climate change"` |
| `profileUrl` | string | Direct profile URL | `"https://twitter.com/openai"` |

## Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `likeCount` | number | 1 | Number of tweets to like (1-10) |
| `scrollTime` | number | 10000 | Time to scroll in ms (1000-60000) |
| `searchInFeed` | boolean | true | Search home feed first |
| `visitProfile` | boolean | true | Visit profile if needed |

## Example Requests

### Like by Username
```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{"username":"nasa","likeCount":2}'
```

### Like by Search Query
```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{"searchQuery":"machine learning","likeCount":1,"scrollTime":15000}'
```

### Like by Tweet Content
```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{"tweetContent":"breaking news","likeCount":3}'
```

### Like by Profile URL
```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{"profileUrl":"https://twitter.com/openai","likeCount":1,"visitProfile":true,"searchInFeed":false}'
```

### Combined Criteria
```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{"username":"nasa","searchQuery":"space exploration","likeCount":2}'
```

## Server Response

### Success Response
```json
{
  "success": true,
  "data": {
    "message": "Tweets liked successfully with human-like behavior",
    "likeData": {
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
  "timestamp": "2025-06-10T18:43:59.526Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "At least one of the following must be provided: username, searchQuery, tweetContent, or profileUrl",
  "timestamp": "2025-06-10T18:43:59.526Z"
}
```

## Scripts

- `npm run like-server` - Start the like server
- `npm run test-like-client` - Run comprehensive tests
- `npm run generic-like` - Run generic like directly (CLI)

## File Structure

- `like-server.ts` - Main HTTP server (clean, similar to tweet-server.ts)
- `test-like-client.ts` - Comprehensive test client
- `generic_like_human.ts` - Core like functionality with human behavior
- `HTTP_LIKE_SERVER_GUIDE.md` - Complete documentation

## Differences from Old Implementation

| Old (`like_imran_tweet_human.ts`) | New (`like-server.ts`) |
|------|------|
| ❌ Hardcoded for Imran Khan only | ✅ Generic, works with any criteria |
| ❌ No HTTP API | ✅ Full REST API |
| ❌ Fixed behavior | ✅ Configurable parameters |
| ❌ No error handling | ✅ Comprehensive validation |
| ❌ CLI only | ✅ HTTP server + CLI |

## Integration Examples

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3002/like', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'elonmusk',
    likeCount: 2
  })
});

const result = await response.json();
console.log(result.success ? 'Success!' : 'Error:', result);
```

### Python
```python
import requests

response = requests.post('http://localhost:3002/like', json={
    'searchQuery': 'artificial intelligence',
    'likeCount': 1
})

result = response.json()
print('Success!' if result['success'] else f"Error: {result['error']}")
```

### curl
```bash
# Health check
curl http://localhost:3002/health

# Like tweets
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{"username":"nasa","likeCount":1}'
```

## Troubleshooting

1. **Server won't start**: Check if port 3002 is available
2. **Browser connection failed**: Verify WS_ENDPOINT in .env file
3. **No tweets found**: Try broader search criteria or increase scrollTime
4. **Rate limiting**: Increase delays between requests

## Documentation

- See `HTTP_LIKE_SERVER_GUIDE.md` for complete documentation
- Check `debug_logs/` for screenshots and detailed logs
- Use `GET http://localhost:3002/` for API info
