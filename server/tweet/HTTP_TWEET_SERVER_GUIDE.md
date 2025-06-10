# HTTP Tweet Server Guide

## Overview

The HTTP Tweet Server provides a RESTful API for posting tweets with human-like behavior patterns. It accepts HTTP POST requests with tweet content and posts them to Twitter using the existing human behavior system.

## Features

- **HTTP API Interface**: Simple JSON-based REST API
- **Human-like Behavior**: Integrates with existing human behavior patterns (typing delays, scrolling, reading pauses)
- **Flexible Input**: Supports hashtags and mentions as arrays or comma-separated strings
- **Input Validation**: Comprehensive validation including character count limits
- **Error Handling**: Detailed error responses with timestamps
- **CORS Support**: Ready for web application integration
- **Browser Connection Management**: Automatic reconnection and connection pooling

## Setup

### Prerequisites

1. **AdsPower Browser**: Must be installed and running
2. **WebSocket Endpoint**: AdsPower WebSocket URL in `.env` file
3. **Node.js Dependencies**: Installed via `npm install`

### Starting the Server

```bash
# Start with browser connection test
npm run http-server

# Start without browser test (for testing HTTP endpoints only)
SKIP_BROWSER_TEST=true npm run http-server
```

The server will start on `http://localhost:3001` by default.

## API Endpoints

### 1. POST /tweet

Posts a tweet with human-like behavior.

**Request Body:**
```json
{
  "message": "string (required) - The main tweet content",
  "hashtags": "string[] | string (optional) - Hashtags as array or comma-separated",
  "mentions": "string[] | string (optional) - Mentions as array or comma-separated"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tweet posted successfully with human-like behavior",
  "data": {
    "tweet": {
      "message": "Your tweet message",
      "hashtags": ["hashtag1", "hashtag2"],
      "mentions": ["user1"],
      "fullText": "@user1 Your tweet message #hashtag1 #hashtag2",
      "characterCount": 45
    }
  },
  "timestamp": "2025-06-08T18:43:59.526Z"
}
```

### 2. GET /health

Check server health and status.

**Response:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "server": "HTTP Tweet Server",
    "status": "running",
    "version": "1.0.0",
    "uptime": 21.98,
    "browserConnected": false
  }
}
```

### 3. GET /docs

Returns complete API documentation.

## Usage Examples

### Basic Tweet

```bash
curl -X POST http://localhost:3001/tweet \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from automation!"}'
```

### Tweet with Hashtags (Array)

```bash
curl -X POST http://localhost:3001/tweet \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Exploring automation technologies", 
    "hashtags": ["automation", "tech", "AI"]
  }'
```

### Tweet with Hashtags (String)

```bash
curl -X POST http://localhost:3001/tweet \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Learning new things every day", 
    "hashtags": "learning,growth,development"
  }'
```

### Tweet with Mentions

```bash
curl -X POST http://localhost:3001/tweet \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Thanks for the great discussion!", 
    "mentions": ["friend1", "colleague2"],
    "hashtags": ["networking", "grateful"]
  }'
```

## n8n Integration

### Basic n8n HTTP Request Node Configuration

1. **Method**: POST
2. **URL**: `http://localhost:3001/tweet`
3. **Headers**: 
   - `Content-Type: application/json`
4. **Body**:
   ```json
   {
     "message": "{{ $json.message }}",
     "hashtags": "{{ $json.hashtags }}",
     "mentions": "{{ $json.mentions }}"
   }
   ```

### n8n Workflow Example

```json
{
  "nodes": [
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3001/tweet",
        "authentication": "none",
        "requestMethod": "POST",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyContentType": "json",
        "jsonBody": "={{ {\n  \"message\": $json.message,\n  \"hashtags\": $json.hashtags || [],\n  \"mentions\": $json.mentions || []\n} }}"
      }
    }
  ]
}
```

## Input Validation

### Message Requirements
- **Required**: Must be provided and non-empty
- **Type**: String
- **Length**: Combined tweet (message + hashtags + mentions) must be ≤ 280 characters

### Hashtags
- **Optional**: Can be omitted
- **Formats**: 
  - Array: `["hashtag1", "hashtag2"]`
  - String: `"hashtag1,hashtag2,hashtag3"`
- **Processing**: 
  - `#` symbols are automatically removed
  - Empty hashtags are filtered out
  - Trimmed for whitespace

### Mentions
- **Optional**: Can be omitted
- **Formats**:
  - Array: `["user1", "user2"]`
  - String: `"user1,user2,user3"`
- **Processing**:
  - `@` symbols are automatically removed
  - Empty mentions are filtered out
  - Trimmed for whitespace

## Error Handling

### Common Errors

1. **Missing Message**
   ```json
   {
     "success": false,
     "error": "Message is required and must be a non-empty string"
   }
   ```

2. **Tweet Too Long**
   ```json
   {
     "success": false,
     "error": "Tweet too long: 285/280 characters. Please shorten your message or reduce hashtags/mentions."
   }
   ```

3. **Browser Not Connected**
   ```json
   {
     "success": false,
     "error": "Failed to post tweet",
     "details": {
       "error": "Browser connection failed. Please ensure the browser is running and WebSocket endpoint is correct."
     }
   }
   ```

4. **Invalid JSON**
   ```json
   {
     "success": false,
     "error": "Invalid request body format"
   }
   ```

## Testing

### Test Script
```bash
npm run test-http
```

This runs comprehensive tests including:
- Health check endpoint
- API documentation endpoint
- Input validation tests
- Character count validation
- Error handling verification

### Manual Testing
```bash
# Test health endpoint
curl -X GET http://localhost:3001/health

# Test API docs
curl -X GET http://localhost:3001/docs

# Test tweet validation (should fail - no message)
curl -X POST http://localhost:3001/tweet \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Environment Configuration

### Environment Variables

- `PORT`: Server port (default: 3001)
- `HOST`: Server host (default: localhost)
- `SKIP_BROWSER_TEST`: Skip browser connection test on startup (true/false)
- `NODE_ENV`: Environment mode (development shows error stack traces)

### .env File
```
WS_ENDPOINT=ws://127.0.0.1:PORT/devtools/browser/ID
```

## Troubleshooting

### Server Won't Start
1. Check if port 3001 is already in use
2. Verify Node.js dependencies are installed
3. Check for TypeScript compilation errors

### Browser Connection Failed
1. Ensure AdsPower is running
2. Verify WebSocket endpoint in `.env` is correct
3. Check if the browser profile is logged into Twitter
4. Test connection with individual scripts first

### Tweets Not Posting
1. Verify browser connection is successful
2. Check Twitter login status
3. Review character count limits
4. Check for Twitter rate limiting

### Input Validation Errors
1. Ensure message is provided and non-empty
2. Verify total character count is under 280
3. Check hashtag/mention format (array or comma-separated string)

## Performance Notes

- The server maintains a persistent browser connection for better performance
- Browser connection is automatically retried if lost
- Each tweet request uses human-like behavior patterns (2-8 second delays)
- Multiple requests are queued and processed sequentially

## Security Considerations

- No authentication implemented (add if needed for production)
- CORS enabled for all origins (restrict if needed)
- Error details include stack traces in development mode only
- WebSocket endpoint should be secured in production

## Integration with Existing Scripts

The HTTP server uses the same core functions as the existing scripts:
- `custom_tweet_human.ts` - Core tweet posting with human behavior
- `post_animal_tweet_human.ts` - Human behavior patterns
- All existing human behavior types (CASUAL_BROWSER, FOCUSED_POSTER, etc.)

This ensures consistency across all tweet posting methods.
