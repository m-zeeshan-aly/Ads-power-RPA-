# Tweet Posting HTTP Server

A REST API server that integrates with the custom tweet posting system to accept requests from n8n workflows and other external systems.

## Features

- **HTTP REST API** for posting tweets
- **Human-like behavior patterns** (5 different behavior types)
- **CORS support** for web applications
- **Health check endpoint** for monitoring
- **Graceful shutdown** handling
- **Input validation** and error handling
- **Browser connection management** with auto-reconnection

## API Endpoints

### POST /tweet
Posts a new tweet with human-like behavior.

**Request Body:**
```json
{
  "message": "Your tweet message here",
  "hashtags": ["optional", "hashtags"],
  "mentions": ["optional_user"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Tweet posted successfully",
    "tweetData": {
      "message": "Your tweet message here",
      "hashtags": ["optional", "hashtags"],
      "mentions": ["optional_user"]
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### GET /health
Health check endpoint for monitoring server status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "browser": "connected",
    "uptime": 123.45,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### GET /
API information and documentation.

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: localhost)
- `WS_ENDPOINT` - Browser WebSocket endpoint (required)
- `NODE_ENV` - Environment (development/production)

## Usage

### Starting the Server

```bash
# Using npm script (recommended)
npm run server

# Or directly with ts-node
ts-node server/tweet-server.ts
```

### Example Requests

#### Using curl:
```bash
# Post a simple tweet
curl -X POST http://localhost:3000/tweet \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello world from the API!"}'

# Post a tweet with hashtags and mentions
curl -X POST http://localhost:3000/tweet \
  -H "Content-Type: application/json" \
  -d '{
    "message":"Check out this amazing automation!",
    "hashtags":["automation","nodejs","twitter"],
    "mentions":["example_user"]
  }'

# Health check
curl http://localhost:3000/health
```

#### Using JavaScript/Node.js:
```javascript
const response = await fetch('http://localhost:3000/tweet', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Posted from JavaScript!',
    hashtags: ['javascript', 'api'],
    mentions: ['nodejs']
  })
});

const result = await response.json();
console.log(result);
```

#### Using Python:
```python
import requests

response = requests.post('http://localhost:3000/tweet', json={
    'message': 'Posted from Python!',
    'hashtags': ['python', 'automation'],
    'mentions': ['python_user']
})

print(response.json())
```

## Integration with n8n

### HTTP Request Node Configuration:
- **URL**: `http://localhost:3000/tweet`
- **Method**: POST
- **Content Type**: application/json
- **Body**: 
```json
{
  "message": "{{ $json.message }}",
  "hashtags": {{ $json.hashtags }},
  "mentions": {{ $json.mentions }}
}
```

### Example n8n Workflow:
1. **Trigger Node** (webhook, schedule, etc.)
2. **Set Node** to prepare tweet data
3. **HTTP Request Node** to POST to `/tweet` endpoint
4. **Optional**: Error handling and logging nodes

## Human Behavior Types

The server automatically selects from 5 different human behavior patterns:

1. **Casual Browser** - Extensive scrolling, casual typing, lots of thinking pauses
2. **Focused Poster** - Minimal browsing, efficient typing, quick posting
3. **Social Engager** - Moderate browsing, careful typing, social-aware behavior
4. **Quick Poster** - Fast actions, minimal delays, rapid posting
5. **Thoughtful Writer** - Extended review times, careful typing, thorough behavior

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

Error responses include detailed error messages:
```json
{
  "success": false,
  "error": "Message is required and must be a non-empty string",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Security Considerations

- The server runs on localhost by default for security
- Input validation prevents injection attacks
- Tweet length validation (280 characters)
- Graceful error handling prevents server crashes
- Browser connection management prevents resource leaks

## Monitoring

- Use the `/health` endpoint for uptime monitoring
- Check server logs for detailed operation information
- Monitor browser connection status through health endpoint

## Troubleshooting

### Common Issues:

1. **Browser connection failed**
   - Ensure WS_ENDPOINT is correctly set in .env file
   - Check if the browser is running and accessible

2. **Port already in use**
   - Change the PORT environment variable
   - Check for other processes using the same port

3. **Tweet posting failed**
   - Check Twitter login status in the browser
   - Verify tweet content meets Twitter's requirements

4. **Server not responding**
   - Check server logs for errors
   - Verify network connectivity and firewall settings
