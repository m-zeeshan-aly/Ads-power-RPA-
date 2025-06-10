# HTTP Retweet Server Setup Guide

This guide will help you set up and run the HTTP Retweet Server for automated Twitter retweet operations.

## Quick Start

### 1. Prerequisites
- Node.js (v14 or higher)
- A running Chrome/Chromium browser with remote debugging enabled
- Required npm packages: `puppeteer-core`, `dotenv`

### 2. Installation
```bash
# Navigate to the retweet server directory
cd server/retweet

# Install dependencies (if not already installed)
npm install puppeteer-core dotenv

# Set up environment variables
cp .env.example .env  # Create from template or manually
```

### 3. Environment Configuration
Create a `.env` file in the retweet directory:

```bash
# Browser WebSocket endpoint
WS_ENDPOINT=ws://localhost:9222/devtools/browser/your-browser-session-id

# Server configuration
PORT=3003
HOST=localhost

# Optional: Additional settings
NODE_ENV=development
```

### 4. Start the Server
```bash
# Start the HTTP server
node http-retweet-server.js

# Or with TypeScript
ts-node http-retweet-server.ts
```

The server will start on `http://localhost:3003` by default.

## Browser Setup

### Chrome/Chromium with Remote Debugging

1. **Start Chrome with debugging enabled:**
   ```bash
   # Linux/Mac
   google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

   # Windows
   chrome.exe --remote-debugging-port=9222 --user-data-dir=c:\temp\chrome-debug
   ```

2. **Get the WebSocket endpoint:**
   - Visit `http://localhost:9222/json` in a browser
   - Find your browser session and copy the `webSocketDebuggerUrl`
   - Add it to your `.env` file as `WS_ENDPOINT`

3. **Login to Twitter:**
   - Open Twitter in the debugging Chrome instance
   - Login to your account
   - Leave the browser open while using the server

## API Endpoints

### POST /retweet
Retweet tweets based on search criteria.

**Example Request:**
```bash
curl -X POST http://localhost:3006/retweet \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ImranKhanPTI",
    "retweetCount": 1,
    "behaviorType": "social_engager"
  }'
```

### GET /status
Check server and browser status.

```bash
curl http://localhost:3003/status
```

### GET /help
Get API documentation.

```bash
curl http://localhost:3003/help
```

## Configuration Options

### Server Configuration
Customize the server via environment variables:

```bash
# .env file
PORT=3003                    # Server port
HOST=localhost               # Server host
WS_ENDPOINT=ws://...         # Browser WebSocket URL
NODE_ENV=development         # Environment mode
```

### Request Parameters

#### Required (at least one):
- `username`: Target Twitter username
- `searchQuery`: Keywords to search for
- `tweetContent`: Specific content to find
- `profileUrl`: Direct profile URL

#### Optional:
- `retweetCount`: Number of tweets to retweet (1-10, default: 1)
- `scrollTime`: Time to scroll in milliseconds (1000-60000, default: 10000)
- `searchInFeed`: Search home feed first (boolean, default: true)
- `visitProfile`: Visit profile if needed (boolean, default: true)
- `behaviorType`: Human behavior pattern (default: "social_engager")

#### Behavior Types:
- `casual_browser`: Relaxed browsing, extensive scrolling
- `focused_poster`: Direct approach, minimal scrolling
- `social_engager`: Balanced interaction (default)
- `quick_poster`: Fast, efficient retweeting
- `thoughtful_writer`: Careful, extended reading

## Testing

### Run Test Suite
```bash
# Run all tests
node test-retweet-client.js test

# Test specific functionality
node test-retweet-client.js status
node test-retweet-client.js validation
```

### Manual Testing
```bash
# Test with different behavior types
curl -X POST http://localhost:3003/retweet \
  -H "Content-Type: application/json" \
  -d '{
    "username": "PTIofficial",
    "behaviorType": "casual_browser",
    "retweetCount": 2
  }'

# Test with search query
curl -X POST http://localhost:3003/retweet \
  -H "Content-Type: application/json" \
  -d '{
    "searchQuery": "Pakistan politics",
    "behaviorType": "focused_poster"
  }'
```

## Monitoring & Debugging

### Log Files
Check the `debug_logs` directory for:
- `generic_retweet_human.log`: Detailed operation logs
- Screenshots: Visual debugging at each step

### Server Status
Monitor server health:
```bash
# Check if server is running
curl http://localhost:3003/status

# Response includes:
# - Server uptime
# - Browser connection status
# - Memory usage
# - Available behavior types
```

### Common Monitoring Commands
```bash
# Check server process
ps aux | grep node

# Monitor logs in real-time
tail -f debug_logs/generic_retweet_human.log

# Check port usage
netstat -tlnp | grep 3003
```

## Production Deployment

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
PORT=3003
HOST=0.0.0.0
WS_ENDPOINT=ws://your-browser-host:9222/devtools/browser/session-id

# Security considerations
ALLOWED_ORIGINS=https://your-domain.com
API_KEY=your-secure-api-key  # If implementing authentication
```

### Process Management
```bash
# Using PM2
npm install -g pm2
pm2 start http-retweet-server.js --name "retweet-server"
pm2 startup
pm2 save

# Using systemd
sudo systemctl enable retweet-server
sudo systemctl start retweet-server
```

### Reverse Proxy (nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/retweet/ {
        proxy_pass http://localhost:3003/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Considerations

### Browser Security
- Use a dedicated browser instance for automation
- Isolate from personal browsing data
- Consider running in a container or VM
- Regularly update browser versions

### API Security
- Implement rate limiting
- Add authentication for production use
- Validate all input parameters
- Monitor for unusual activity patterns

### Network Security
- Use HTTPS in production
- Secure WebSocket connections
- Consider VPN or proxy usage
- Monitor network traffic

## Troubleshooting

### Server Won't Start
```bash
# Check if port is in use
lsof -i :3003

# Check environment variables
cat .env
echo $WS_ENDPOINT

# Check Node.js version
node --version
```

### Browser Connection Issues
```bash
# Verify browser is running with debugging
curl http://localhost:9222/json

# Check WebSocket endpoint format
# Should be: ws://localhost:9222/devtools/browser/[session-id]

# Test browser connectivity
telnet localhost 9222
```

### Permission Errors
```bash
# Check file permissions
ls -la *.js *.ts

# Fix permissions if needed
chmod +x http-retweet-server.js
chmod +x test-retweet-client.js
```

### Memory Issues
```bash
# Monitor memory usage
top -p $(pgrep -f "http-retweet-server")

# Increase Node.js memory limit
node --max-old-space-size=4096 http-retweet-server.js
```

## Performance Optimization

### Server Optimization
- Enable response compression
- Implement connection pooling
- Use clustering for multiple CPU cores
- Monitor and limit concurrent requests

### Browser Optimization
- Reuse browser connections
- Implement browser restart intervals
- Monitor browser memory usage
- Clear browser data periodically

## Support & Maintenance

### Regular Maintenance
- Update browser selectors if Twitter UI changes
- Monitor rate limiting and adjust delays
- Update dependencies regularly
- Review and clean log files

### Health Checks
```bash
# Automated health check script
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/status)
if [ $response -eq 200 ]; then
    echo "Server is healthy"
else
    echo "Server issue detected: HTTP $response"
    # Add alert/restart logic here
fi
```

### Backup & Recovery
- Backup configuration files
- Document custom modifications
- Maintain rollback procedures
- Monitor system dependencies

For additional support, check the logs in `debug_logs/` and refer to the main documentation in `GENERIC_RETWEET_README.md`.
