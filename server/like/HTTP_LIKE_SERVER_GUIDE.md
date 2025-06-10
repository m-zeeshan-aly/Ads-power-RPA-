# HTTP Like Server Guide

## Overview

The HTTP Like Server provides a RESTful API for liking tweets on Twitter with human-like behavior patterns. Unlike the original hardcoded implementation that only worked with specific accounts (like Imran Khan), this generic server accepts external parameters and can work with any search criteria.

## Features

- **HTTP API Interface**: Simple JSON-based REST API
- **Generic Search Criteria**: Support for multiple search parameters
- **Human-like Behavior**: Integrates with existing human behavior patterns (scrolling, reading pauses, variable timing)
- **Flexible Input**: Multiple search criteria options that can be combined
- **Input Validation**: Comprehensive validation including parameter limits
- **Error Handling**: Detailed error responses with timestamps
- **CORS Support**: Ready for web application integration
- **Browser Connection Management**: Automatic reconnection and connection pooling

## Setup

### Prerequisites

1. **Browser Setup**: Ensure your browser is running and accessible via WebSocket
2. **WebSocket URL**: Make sure you have the correct WebSocket endpoint in your `.env` file
3. **Dependencies**: Install required npm packages

### Installation

```bash
# Install dependencies (if not already installed)
npm install

# Start the like server
npm run like-server
# OR
node like-server.ts
# OR
ts-node like-server.ts
```

The server will start on `http://localhost:3002` by default.

## API Endpoints

### 1. POST /like

Likes tweets based on the provided search criteria with human-like behavior.

**Request Body:**

At least one of the following search criteria must be provided:

```json
{
  // Search criteria (at least one required)
  "username": "string",        // Target username without @ symbol
  "searchQuery": "string",     // Search terms to find tweets
  "tweetContent": "string",    // Specific content to look for in tweets
  "profileUrl": "string",      // Direct profile URL to visit
  
  // Optional parameters
  "likeCount": "number",       // Number of tweets to like (1-10, default: 1)
  "scrollTime": "number",      // Time to scroll in milliseconds (1000-60000, default: 10000)
  "searchInFeed": "boolean",   // Search in home feed first (default: true)
  "visitProfile": "boolean"    // Visit profile if feed search fails (default: true)
}
```

**Response:**

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

### 2. GET /health

Check server health and browser connection status.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "browser": "connected",
    "uptime": 123.456,
    "timestamp": "2025-06-10T18:43:59.526Z"
  }
}
```

### 3. GET /

Get API information and documentation.

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "Tweet Like API",
    "version": "1.0.0",
    "description": "HTTP API for liking tweets with human-like behavior based on search criteria",
    "endpoints": {
      "POST /like": "Like tweets based on search criteria",
      "GET /health": "Health check",
      "GET /": "API information"
    },
    "requestFormat": { /* ... */ },
    "examples": [ /* ... */ ]
  }
}
```

## Usage Examples

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
    "likeCount": 1,
    "scrollTime": 15000
  }'
```

#### Like by Tweet Content

```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{
    "tweetContent": "climate change",
    "likeCount": 3,
    "scrollTime": 20000
  }'
```

#### Like by Profile URL

```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{
    "profileUrl": "https://twitter.com/openai",
    "likeCount": 1,
    "visitProfile": true,
    "searchInFeed": false
  }'
```

#### Combined Criteria

```bash
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nasa",
    "searchQuery": "space exploration",
    "likeCount": 2,
    "scrollTime": 25000
  }'
```

### JavaScript/Node.js Examples

```javascript
const likeData = {
  username: 'elonmusk',
  likeCount: 2,
  scrollTime: 15000
};

fetch('http://localhost:3002/like', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(likeData)
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('Tweets liked successfully:', data.data.message);
  } else {
    console.error('Error:', data.error);
  }
})
.catch(error => {
  console.error('Request failed:', error);
});
```

### Python Example

```python
import requests
import json

like_data = {
    "searchQuery": "machine learning",
    "likeCount": 1,
    "scrollTime": 12000
}

response = requests.post(
    'http://localhost:3002/like',
    headers={'Content-Type': 'application/json'},
    json=like_data
)

result = response.json()
if result['success']:
    print(f"Success: {result['data']['message']}")
else:
    print(f"Error: {result['error']}")
```

## Search Criteria

### Username
- **Format**: String without @ symbol
- **Example**: `"elonmusk"`, `"nasa"`, `"openai"`
- **Behavior**: Searches for tweets from this specific user or mentions of this username

### Search Query
- **Format**: String with search terms
- **Example**: `"artificial intelligence"`, `"climate change"`, `"space exploration"`
- **Behavior**: Searches for tweets containing these terms in the home feed and via Twitter search

### Tweet Content
- **Format**: String with specific content to find
- **Example**: `"breaking news"`, `"new technology"`, `"important announcement"`
- **Behavior**: Looks for tweets containing this specific content

### Profile URL
- **Format**: Valid HTTP/HTTPS Twitter profile URL
- **Example**: `"https://twitter.com/elonmusk"`, `"https://twitter.com/nasa"`
- **Behavior**: Directly visits the profile and likes tweets from there

## Optional Parameters

### Like Count
- **Range**: 1-10
- **Default**: 1
- **Description**: Number of tweets to like during the operation

### Scroll Time
- **Range**: 1000-60000 milliseconds (1-60 seconds)
- **Default**: 10000 (10 seconds)
- **Description**: Time spent scrolling through feeds looking for matching tweets

### Search In Feed
- **Type**: Boolean
- **Default**: true
- **Description**: Whether to search in the home timeline first before visiting profiles

### Visit Profile
- **Type**: Boolean
- **Default**: true
- **Description**: Whether to visit user profiles if feed search doesn't find enough tweets

## Error Handling

### Common Errors

| Status Code | Error | Description |
|-------------|--------|-------------|
| 400 | Missing search criteria | At least one search criterion must be provided |
| 400 | Invalid like count | Like count must be between 1 and 10 |
| 400 | Invalid scroll time | Scroll time must be between 1000 and 60000 milliseconds |
| 400 | Invalid profile URL | Profile URL must be a valid HTTP/HTTPS URL |
| 500 | Browser connection failed | Browser is not connected or WebSocket endpoint is invalid |
| 500 | Internal server error | Unexpected server error |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2025-06-10T18:43:59.526Z"
}
```

## Testing

### Using the Test Client

```bash
# Run comprehensive tests
node test-like-client.ts

# Or test specific scenarios
npm run test-like-server
```

### Manual Testing

```bash
# Health check
curl http://localhost:3002/health

# API information
curl http://localhost:3002/

# Simple like test
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{"username":"nasa","likeCount":1}'
```

## Environment Configuration

### Required Environment Variables

```bash
# .env file
WS_ENDPOINT=ws://127.0.0.1:9222/devtools/browser/your-browser-id
PORT=3002
HOST=localhost
NODE_ENV=development
```

### Port Configuration

The server uses port 3002 by default. You can change this by:
- Setting the `PORT` environment variable
- Modifying the PORT constant in the code

## Human-Like Behavior

The server implements several human-like behaviors:

- **Variable Timing**: Random delays between actions
- **Natural Scrolling**: Human-like scroll patterns and speeds
- **Reading Pauses**: Simulated reading time before liking
- **Smart Selection**: Doesn't always like the first tweet found
- **Contextual Navigation**: Intelligent search and navigation patterns

## Performance Notes

- **Browser Reuse**: The server maintains a persistent browser connection for better performance
- **Connection Pooling**: Automatically handles browser disconnections and reconnections
- **Memory Management**: Graceful shutdown procedures to clean up resources
- **Rate Limiting**: Human-like delays prevent API rate limiting

## Security Considerations

- **CORS Support**: Configured for cross-origin requests
- **Input Validation**: All inputs are validated and sanitized
- **Error Sanitization**: Error messages don't expose sensitive information
- **Resource Limits**: Built-in limits on like counts and execution time

## Integration Examples

### With n8n (No-code automation)

```json
{
  "method": "POST",
  "url": "http://localhost:3002/like",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "username": "{{$json.target_username}}",
    "likeCount": "{{$json.like_count}}",
    "scrollTime": 15000
  }
}
```

### With Zapier

Configure a webhook action with:
- **URL**: `http://localhost:3002/like`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**: Map your trigger data to the API format

### With Other Automation Tools

The server accepts standard HTTP POST requests with JSON payloads, making it compatible with any automation tool that supports HTTP requests.

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if port 3002 is available
   - Verify Node.js installation
   - Check for missing dependencies

2. **Browser connection failed**
   - Verify WebSocket endpoint in .env file
   - Ensure browser is running with remote debugging enabled
   - Check firewall settings

3. **Likes not working**
   - Verify Twitter is accessible
   - Check browser authentication status
   - Ensure human-like delays are sufficient

4. **No tweets found**
   - Try broader search criteria
   - Increase scroll time for more thorough searching
   - Verify the target content exists

### Debug Logs

The server creates debug logs in the `debug_logs` directory with:
- Screenshot captures at key moments
- Detailed operation logs
- Error state information

### Getting Help

1. Check the server logs for detailed error messages
2. Use the health endpoint to verify server status
3. Run the test client to validate functionality
4. Review the debug screenshots for visual debugging

## Advanced Usage

### Custom Behavior Patterns

The like server inherits the human behavior patterns from the generic like system, including:
- Variable scroll speeds
- Random pause durations
- Natural click timing
- Intelligent content recognition

### Batch Operations

You can like multiple different criteria by making multiple requests:

```javascript
const targets = [
  { username: 'elonmusk', likeCount: 1 },
  { searchQuery: 'AI technology', likeCount: 2 },
  { tweetContent: 'breaking news', likeCount: 1 }
];

for (const target of targets) {
  await fetch('http://localhost:3002/like', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(target)
  });
  
  // Human-like delay between batch operations
  await new Promise(resolve => setTimeout(resolve, 30000));
}
```

### Monitoring and Analytics

Track your like operations by parsing the response data:

```javascript
const response = await fetch('http://localhost:3002/like', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(likeData)
});

const result = await response.json();
if (result.success) {
  console.log('Operation completed:', {
    criteria: result.data.likeData.criteria,
    options: result.data.likeData.options,
    timestamp: result.timestamp
  });
}
```
