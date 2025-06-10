# Twitter Automation with Puppeteer and AdsPower

This project contains multiple Twitter automation scripts using Puppeteer and AdsPower. Each script has two versions:
- **Regular version**: Standard automation behavior
- **Human version**: Includes human-like delays, scrolling, and typing patterns

## 🚀 NEW: Unified Server System

**The project now includes a unified server system that consolidates all social media automation services into one clean, professional API.**

### Quick Start - Unified Server
```bash
# Start the unified server (recommended)
npm run unified-server
# Server starts at http://localhost:3000

# Test all services
npm run test-unified
```

### Unified API Endpoints
- `POST /api/tweet` - Post tweets with human-like behavior
- `POST /api/like` - Like tweets based on search criteria  
- `POST /api/comment` - Comment on tweets
- `POST /api/retweet` - Retweet posts with behavior patterns
- `GET /api/status` - Server health check
- `GET /api/help` - Complete API documentation

**For detailed information, see: [UNIFIED_SERVER_IMPLEMENTATION.md](./UNIFIED_SERVER_IMPLEMENTATION.md)**

---

## Available Scripts

### Generic Like System (NEW) 🎯
- `generic_like_human.ts` - Generic like functionality for any user/content
- `http-like-server.ts` - HTTP REST API server for like operations
- `test-like-server.ts` - Test client for the like server

### HTTP Tweet Server 📡
- `custom_tweet_human.ts` - Generic tweet posting with human behavior
- `server/http-tweet-server.ts` - HTTP REST API for tweet posting
- `server/test-server.ts` - Test client for tweet server

### PTI Comment Scripts
- `pti_comment.ts` - Comments on PTI tweets
- `pti_comment_human.ts` - Human-like version of PTI commenting
- `pti_comment_retweet.ts` - Combined PTI actions (like, comment, retweet)

### Imran Khan Tweet Scripts  
- `like_imran_tweet.ts` - Likes Imran Khan's tweets (hardcoded)
- `like_imran_tweet_human.ts` - Human-like version (hardcoded)
- `imran_retweet.ts` - Retweets Imran Khan's tweets
- `imran_retweet_human.ts` - Human-like version of retweeting

### Animal Tweet Scripts
- `post_animal_tweet.ts` - Posts animal-related tweets
- `post_animal_tweet_human.ts` - Human-like version of posting animal tweets

## Prerequisites

- Node.js installed
- AdsPower browser installed and running
- Valid AdsPower WebSocket endpoint URL

## Installation

```bash
# Install dependencies
npm install
```

## Usage

1. Start your AdsPower browser instance
2. Obtain the WebSocket endpoint URL from AdsPower
3. Create a `.env` file in the project root with:
   
   ```
   WS_ENDPOINT=ws://127.0.0.1:PORT/devtools/browser/ID
   ```

### Running Scripts

#### HTTP Servers (Recommended for external integration):
```bash
npm run like-server       # Start like API server on port 3002
npm run http-server        # Start tweet API server on port 3001
npm run test-like-server   # Test the like server
npm run test-http          # Test the tweet server
```

#### Generic Systems:
```bash
npm run generic-like       # Generic like with parameters
npm run custom-tweet       # Generic tweet posting
```

#### Regular versions (hardcoded for specific accounts):
```bash
npm run comment        # PTI comment
npm run like           # Like Imran Khan tweet (hardcoded)
npm run retweet        # Retweet Imran Khan tweet  
npm run post           # Post animal tweet
npm run pti-action     # Combined PTI actions
```

#### Human-like versions (hardcoded for specific accounts):
```bash
npm run commenth       # PTI comment (human-like)
npm run likeh          # Like Imran Khan tweet (human-like, hardcoded)
npm run retweeth       # Retweet Imran Khan tweet (human-like)
npm run posth          # Post animal tweet (human-like)
```

## Key Features

### 🎯 Generic Like System
The new like system is completely flexible and accepts external parameters:
- **Any username**: Target any Twitter user (not hardcoded)
- **Search queries**: Find tweets by keywords or content
- **Profile URLs**: Direct profile targeting
- **Configurable options**: Like count, scroll time, search strategy
- **HTTP API**: REST endpoint for external integration
- **Human-like behavior**: Natural scrolling, pauses, and interactions

**Quick Example:**
```bash
# Start the like server
npm run like-server

# Like tweets from any user
curl -X POST http://localhost:3002/like \
  -H "Content-Type: application/json" \
  -d '{"username": "elonmusk", "likeCount": 2}'
```

See `GENERIC_LIKE_README.md` for complete documentation.

### 📡 HTTP Tweet Server
Generic tweet posting system with REST API:
- **Custom messages**: Any tweet content
- **Hashtags and mentions**: Flexible tagging
- **Human behavior**: Natural typing and posting patterns
- **HTTP API**: Integration-ready endpoint

### 🔄 Legacy Scripts (Hardcoded)
The original scripts are still available but are hardcoded for specific accounts:
- PTI and Imran Khan specific functionality
- Fixed search terms and usernames
- No external parameter support

## Output

- Console logs showing the progress of the automation
- Screenshots saved in the `debug_logs` directory for debugging
- Detailed log files for each script in the `debug_logs` directory

## Troubleshooting

- If the script fails to connect to AdsPower, ensure the WebSocket URL is correct and AdsPower is running
- Check the log files in the `debug_logs` directory for detailed error information
- Make sure your AdsPower profile is already logged into Twitter
- If Twitter interactions fail, the scripts will try to continue with the next steps

## File Structure

- **Regular scripts**: Standard automation with minimal delays
- **Human scripts**: Include realistic human behavior patterns (scrolling, typing delays, etc.)
- **Combined script**: `pti_comment_retweet.ts` performs multiple PTI-related actions in sequence
