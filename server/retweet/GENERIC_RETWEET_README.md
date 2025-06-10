# Generic Retweet System

A flexible, human-like Twitter retweet automation system with configurable behavior patterns.

## Overview

The Generic Retweet System provides a powerful and flexible way to automatically retweet tweets based on various search criteria while mimicking natural human browsing behavior. Unlike hardcoded implementations, this system allows you to specify:

- **Target Selection**: Username, search query, tweet content, or direct profile URL
- **Behavior Patterns**: 5 different human-like interaction patterns
- **Flexible Configuration**: Multiple tweets, timing controls, search strategies

## Features

### 🎯 Flexible Target Selection
- **Username**: Target specific users (e.g., "ImranKhanPTI", "PTIofficial")
- **Search Query**: Find tweets by keywords (e.g., "Pakistan politics", "PTI")
- **Tweet Content**: Look for specific content in tweets
- **Profile URL**: Direct navigation to specific profiles

### 🤖 Human-Like Behavior Patterns
1. **Casual Browser**: Extensive scrolling, natural pauses, thoughtful interaction
2. **Focused Poster**: Direct approach, minimal scrolling, quick decisions
3. **Social Engager**: Moderate activity, careful selection, balanced interaction
4. **Quick Poster**: Fast scrolling, minimal delays, efficient retweeting
5. **Thoughtful Writer**: Extensive reading, long pauses, careful consideration

### ⚙️ Advanced Configuration
- **Multiple Retweets**: Retweet 1-10 tweets in a single operation
- **Search Strategy**: Choose between home feed search and profile visits
- **Timing Control**: Customize scroll times and interaction delays
- **Smart Fallbacks**: Automatic fallback from feed search to profile visit

## Core Components

### 1. `generic_retweet_human.ts`
The main retweet engine with human behavior simulation.

**Key Functions:**
- `retweetGenericTweetHuman()`: Main retweet function
- `searchInHomeFeed()`: Search for tweets in the home timeline
- `searchForProfile()`: Find and navigate to user profiles
- `performRetweet()`: Execute the retweet action with human-like timing

### 2. `http-retweet-server.ts`
HTTP REST API server for remote retweet operations.

**Endpoints:**
- `POST /retweet`: Execute retweet operations
- `GET /status`: Server health and browser status
- `GET /help`: API documentation

### 3. `test-retweet-client.ts`
Comprehensive test client for validating functionality.

## Usage Examples

### Basic Username Retweet
```typescript
import { retweetGenericTweetHuman, BehaviorType } from './generic_retweet_human';

const input = {
  username: 'ImranKhanPTI',
  retweetCount: 1,
  behaviorType: BehaviorType.SOCIAL_ENGAGER
};

const success = await retweetGenericTweetHuman(browser, input);
```

### Search Query Retweet
```typescript
const input = {
  searchQuery: 'Pakistan politics',
  retweetCount: 2,
  behaviorType: BehaviorType.CASUAL_BROWSER,
  scrollTime: 15000
};

const success = await retweetGenericTweetHuman(browser, input);
```

### Profile-Only Retweet
```typescript
const input = {
  profileUrl: 'https://twitter.com/PTIofficial',
  retweetCount: 1,
  searchInFeed: false,  // Skip home feed search
  visitProfile: true,   // Go directly to profile
  behaviorType: BehaviorType.FOCUSED_POSTER
};

const success = await retweetGenericTweetHuman(browser, input);
```

### HTTP API Usage
```bash
# Retweet by username
curl -X POST http://localhost:3003/retweet \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ImranKhanPTI",
    "retweetCount": 1,
    "behaviorType": "social_engager"
  }'

# Retweet by search with custom behavior
curl -X POST http://localhost:3003/retweet \
  -H "Content-Type: application/json" \
  -d '{
    "searchQuery": "Pakistan election",
    "retweetCount": 2,
    "behaviorType": "casual_browser",
    "scrollTime": 12000
  }'
```

## Configuration Options

### RetweetInput Interface
```typescript
interface RetweetInput {
  // Required: At least one must be provided
  username?: string;        // Target username
  searchQuery?: string;     // Search keywords
  tweetContent?: string;    // Specific tweet content
  profileUrl?: string;      // Direct profile URL
  
  // Optional configuration
  retweetCount?: number;    // Number of tweets (1-10, default: 1)
  scrollTime?: number;      // Scroll duration in ms (default: 10000)
  searchInFeed?: boolean;   // Search home feed first (default: true)
  visitProfile?: boolean;   // Visit profile if needed (default: true)
  behaviorType?: BehaviorType; // Behavior pattern (default: SOCIAL_ENGAGER)
}
```

### Behavior Types
- `CASUAL_BROWSER`: Relaxed, extensive browsing (8-15s pre-scroll)
- `FOCUSED_POSTER`: Direct, efficient approach (2-5s pre-scroll)
- `SOCIAL_ENGAGER`: Balanced interaction (6-12s pre-scroll)
- `QUICK_POSTER`: Fast, minimal delays (1-3s pre-scroll)
- `THOUGHTFUL_WRITER`: Careful, extended reading (10-20s pre-scroll)

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install puppeteer-core dotenv
   ```

2. **Environment Configuration**
   Create `.env` file:
   ```
   WS_ENDPOINT=ws://localhost:9222/devtools/browser/your-browser-id
   PORT=3003
   HOST=localhost
   ```

3. **Start the Server**
   ```bash
   node http-retweet-server.js
   ```

4. **Test the System**
   ```bash
   node test-retweet-client.js test
   ```

## API Reference

### POST /retweet

Retweet tweets based on search criteria with human-like behavior.

**Request Body:**
```json
{
  "username": "ImranKhanPTI",           // Optional: Target username
  "searchQuery": "Pakistan politics",   // Optional: Search keywords
  "tweetContent": "specific content",   // Optional: Content to find
  "profileUrl": "https://twitter.com/user", // Optional: Direct URL
  "retweetCount": 2,                    // Optional: Number to retweet (1-10)
  "scrollTime": 10000,                  // Optional: Scroll time in ms
  "searchInFeed": true,                 // Optional: Search home feed
  "visitProfile": true,                 // Optional: Visit profile
  "behaviorType": "social_engager"      // Optional: Behavior pattern
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully retweeted 2 tweet(s) using social_engager behavior",
  "data": {
    "retweetInput": { /* input configuration */ },
    "duration": 45000,
    "completed": true
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /status

Get server and browser status information.

### GET /help

Get complete API documentation and usage examples.

## Error Handling

The system includes comprehensive error handling:

- **Validation Errors**: Invalid input parameters
- **Network Errors**: Connection timeouts and failures
- **Browser Errors**: Browser disconnection or page issues
- **Element Errors**: Missing UI elements or selectors

All errors are logged with timestamps and include detailed error information.

## Security Considerations

- Use environment variables for sensitive configuration
- Implement rate limiting for production use
- Monitor browser resource usage
- Secure WebSocket endpoint access
- Consider proxy usage for IP rotation

## Troubleshooting

### Common Issues

1. **Browser Connection Failed**
   - Check WebSocket endpoint in `.env`
   - Ensure browser is running with remote debugging
   - Verify network connectivity

2. **No Tweets Found**
   - Check search criteria accuracy
   - Verify target user exists and has public tweets
   - Adjust scroll time for better coverage

3. **Retweet Button Not Found**
   - Twitter UI may have changed selectors
   - Check if tweets are already retweeted
   - Verify account permissions

### Debugging

Enable detailed logging by checking the `debug_logs` directory:
- `generic_retweet_human.log`: Detailed operation logs
- Screenshots: Visual debugging at each step

## Contributing

When adding new features:

1. Follow the existing human behavior pattern structure
2. Add comprehensive error handling
3. Include test cases in the test client
4. Update documentation
5. Maintain TypeScript type safety

## License

This system is designed for educational and automation purposes. Ensure compliance with Twitter's Terms of Service and rate limiting guidelines.
