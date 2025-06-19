# Like API - CURL Commands

## Start the Unified Server

```bash
cd /home/ibraheem/Documents/bigosoft/task2/playwrite
ts-node unified-server.ts
```

Server runs on: `http://localhost:3000`

## 1. GET Home Feed (Browse Timeline - Selects 1-3 tweets randomly)

```bash
# Basic request - randomly selects 1-3 tweets from home timeline
curl -X GET "http://localhost:3000/api/like"

# With custom scroll time and behavior
curl -X GET "http://localhost:3000/api/like?scrollTime=25000&behaviorType=casual_browser"

# Quick browsing
curl -X GET "http://localhost:3000/api/like?scrollTime=15000&behaviorType=quick_poster"
```

**Response Example:**
```json
{
  "success": true,
  "tweets": [
    {
      "tweetId": "1234567890",
      "content": "This is an amazing post about AI...",
      "author": "John Doe",
      "authorHandle": "johndoe", 
      "url": "https://x.com/johndoe/status/1234567890",
      "likes": 42,
      "retweets": 15,
      "replies": 8
    }
  ],
  "selectedCount": 1,
  "totalAvailable": 25,
  "processingTime": "22.1s",
  "note": "Randomly selected 1 tweets during human-like browsing"
}
```

## 2. POST Like Action (Improved Human-Like Behavior)

### Smart Like Process:
1. **First tries to find post in home timeline** (human-like scrolling)
2. **If not found, searches for the post** using author and content
3. **If still not found, uses direct URL** as last resort
4. **Likes the post when found**
5. **Waits 1 second, then scrolls back to top** (as requested)

### ⭐ NEW: Flattened Structure (Recommended)

All fields are now at the top level for easier integration:

```bash
curl -X POST http://localhost:3000/api/like \
  -H "Content-Type: application/json" \
  -d '{
    "action": "like",
    "tweetId": "1886257050193191167",
    "content": "AI is changing the world",
    "url": "https://x.com/locofy_ai/status/1886257050193191167/analytics",
    "authorHandle": "locofy_ai",
    "behaviorType": "casual_browser"
  }'
```

### Minimal Required Structure:

```bash
curl -X POST http://localhost:3000/api/like \
  -H "Content-Type: application/json" \
  -d '{
    "action": "like",
    "tweetId": "1886257050193191167"
  }'
```

### Legacy Option A: Using tweet data from GET request (Deprecated)

```bash
curl -X POST http://localhost:3000/api/like \
  -H "Content-Type: application/json" \
  -d '{
    "action": "like",
    "tweetData": {
      "tweetId": "1234567890",
      "url": "https://x.com/johndoe/status/1234567890",
      "author": "John Doe",
      "authorHandle": "johndoe",
      "content": "This is an amazing post about AI..."
    },
    "behaviorType": "social_engager"
  }'
```

### Legacy Option B: Using just tweet ID (Old Format)

```bash
curl -X POST http://localhost:3000/api/like \
  -H "Content-Type: application/json" \
  -d '{
    "action": "unlike",
    "tweetId": "1234567890",
    "behaviorType": "quick_poster"
  }'
```

## 3. Complete Workflow Example

```bash
# Step 1: Browse home timeline and get random tweets
RESPONSE=$(curl -s -X GET "http://localhost:3000/api/like?scrollTime=20000")

echo "Browsed timeline: $RESPONSE"

# Step 2: Extract first tweet data (you would do this programmatically)
# Then like it:
curl -X POST http://localhost:3000/api/like \
  -H "Content-Type: application/json" \
  -d '{
    "action": "like",
    "tweetData": {
      "tweetId": "REPLACE_WITH_ACTUAL_ID",
      "url": "REPLACE_WITH_ACTUAL_URL",
      "author": "REPLACE_WITH_ACTUAL_AUTHOR",
      "authorHandle": "REPLACE_WITH_ACTUAL_HANDLE"
    },
    "behaviorType": "casual_browser"
  }'
```

## Available Behavior Types

- `casual_browser` - Extensive scrolling, natural reading pauses
- `social_engager` - Interactive scrolling, hover behaviors  
- `focused_poster` - Minimal scrolling, direct approach
- `quick_poster` - Fast scrolling, efficient actions
- `thoughtful_writer` - Deliberate actions, longer pauses

## Parameters

### GET /api/like
- `scrollTime` (optional): 10000-60000ms, default: 20000
- `behaviorType` (optional): Human behavior pattern

### POST /api/like (Flattened Structure - Recommended)
- `action` (required): "like" or "unlike"
- `tweetId` (required): Tweet ID string
- `content` (optional): Tweet content for better finding
- `url` (optional): Tweet URL
- `authorHandle` (optional): Author username (without @)
- `behaviorType` (optional): Human behavior pattern

### POST /api/like (Legacy Structure - Deprecated)
- `action` (required): "like" or "unlike"
- `tweetData` (deprecated): Tweet object from GET request
- `behaviorType` (optional): Human behavior pattern

## Key Features

⭐ **NEW: Flattened structure** - No nested objects, all fields at top level
✅ **Backward compatible** - Legacy tweetData structure still supported
✅ **Randomly selects 1-3 tweets** each time GET is called
✅ **Human-like browsing behavior** while scrolling
✅ **Selects tweets during scrolling** (not after)
✅ **Integrated into unified server** (no separate port)
✅ **External decision making** - GET fetches data, POST performs actions
✅ **Natural timing and pauses** throughout the process
✅ **Smart like process**: Tries home timeline → search → direct URL
✅ **Human-like post finding**: Scrolls naturally to locate posts
✅ **Auto scroll to top**: After liking, waits 1 second and scrolls back to top
✅ **Flexible input**: Works with minimal data (just tweetId) or full context
