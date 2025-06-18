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

## 2. POST Like Action (Perform Like/Unlike)

### Option A: Using tweet data from GET request

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

### Option B: Using just tweet ID

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

### POST /api/like  
- `action` (required): "like" or "unlike"
- `tweetData` (option 1): Tweet object from GET request
- `tweetId` (option 2): Tweet ID string
- `behaviorType` (optional): Human behavior pattern

## Key Features

✅ **Randomly selects 1-3 tweets** each time GET is called
✅ **Human-like browsing behavior** while scrolling
✅ **Selects tweets during scrolling** (not after)
✅ **Integrated into unified server** (no separate port)
✅ **External decision making** - GET fetches data, POST performs actions
✅ **Natural timing and pauses** throughout the process
