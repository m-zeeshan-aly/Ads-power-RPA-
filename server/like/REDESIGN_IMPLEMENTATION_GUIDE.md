# Redesigned Like Server - Complete Implementation Guide

## 🎯 **What Changed?**

The like server has been completely redesigned to separate **data retrieval** from **action execution**, mimicking real human behavior where people first browse their timeline, then make decisions about what to interact with.

## 📁 **New Files Structure**

```
server/like/
├── home-feed-fetcher.ts        # NEW: Fetches home timeline data
├── post-action-handler.ts      # NEW: Performs like/unlike actions  
└── REDESIGN_IMPLEMENTATION_GUIDE.md   # Documentation
```

**Note**: The like functionality is now integrated into the unified server (`unified-server.ts`) and runs on port 3000, not as a separate server.

## 🔄 **New Workflow**

### **Step 1: GET /api/like** (Data Retrieval)
```bash
curl "http://localhost:3000/api/like?scrollTime=25000&behaviorType=casual_browser"
```

**What it does:**
- ✅ Navigates to Twitter home timeline (people you follow)
- ✅ Scrolls with human-like behavior (random pauses, reading simulation)
- ✅ Extracts tweet data: content, author, engagement stats, URLs
- ✅ Returns structured data for external decision making

**Response:**
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
      "replies": 8,
      "hashtags": ["AI", "Technology"],
      "mentions": ["elonmusk"],
      "position": 0
    }
  ],
  "totalFetched": 10,
  "processingTime": "25.3s"
}
```

### **Step 2: External Decision Making**
- Your AI/logic analyzes the tweet data
- Decides which tweets to like/unlike based on:
  - Content analysis
  - Author preferences  
  - Engagement levels
  - Hashtags/mentions
  - etc.

### **Step 3: POST /api/like** (Action Execution)
```bash
curl -X POST http://localhost:3000/api/like \
  -H "Content-Type: application/json" \
  -d '{
    "action": "like",
    "tweetData": {...}, 
    "behaviorType": "social_engager"
  }'
```

**What it does:**
- ✅ Takes the external decision (like/unlike)
- ✅ Navigates to the specific tweet
- ✅ Simulates human reading behavior
- ✅ Performs the action with human-like timing
- ✅ Verifies the action succeeded

## 🎭 **Human Behavior Patterns**

All actions maintain human-like behavior:

- **`casual_browser`**: Extensive scrolling, natural reading pauses
- **`focused_poster`**: Minimal scrolling, direct approach  
- **`social_engager`**: Interactive scrolling, hover behaviors
- **`quick_poster`**: Fast scrolling, efficient actions
- **`thoughtful_writer`**: Deliberate actions, longer pauses

## 🚀 **Quick Start**

### 1. Start the Unified Server
```bash
cd /home/ibraheem/Documents/bigosoft/task2/playwrite
ts-node unified-server.ts
```

Server starts on `http://localhost:3000`

### 2. Test the API
```bash
# Test GET endpoint
curl "http://localhost:3000/api/like?scrollTime=20000&behaviorType=casual_browser"

# Test POST endpoint  
curl -X POST http://localhost:3000/api/like \
  -H "Content-Type: application/json" \
  -d '{"action": "like", "tweetId": "TWEET_ID", "behaviorType": "social_engager"}'
```

### 3. View API Documentation
```bash
curl http://localhost:3000/api/help
```

## 📡 **API Endpoints**

### **GET /api/like**
Browse home timeline and randomly select 1-3 tweets

**Query Parameters:**
- `scrollTime` (10000-60000): Scroll duration in ms (default: 20000)
- `behaviorType`: Human behavior pattern

### **POST /api/like** 
Perform like/unlike action

**Option 1 - With Full Tweet Data:**
```json
{
  "action": "like",
  "tweetData": { ... }, // From GET /api/like
  "behaviorType": "casual_browser"
}
```

**Option 2 - With Tweet ID Only:**
```json
{
  "action": "unlike", 
  "tweetId": "1234567890",
  "behaviorType": "quick_poster"
}
```

### **GET /api/help**
Complete API documentation

### **GET /api/status**
Health check and service status

## 🎯 **Key Benefits**

### ✅ **Separation of Concerns**
- **Data Retrieval**: Independent of action decisions
- **Decision Making**: External logic can analyze tweet data
- **Action Execution**: Clean, focused implementation

### ✅ **Human-Like Behavior**
- **Timeline Browsing**: Natural scrolling patterns
- **Reading Simulation**: Realistic pauses and interactions
- **Action Timing**: Human-like delays and verification

### ✅ **Flexible Decision Making**
- **Content Analysis**: Analyze tweet text, hashtags, mentions
- **Author Filtering**: Choose which users to interact with
- **Engagement Logic**: Base decisions on like/retweet counts
- **Custom Rules**: Implement any decision logic externally

### ✅ **Error Handling**
- **Robust Validation**: Input validation for all parameters
- **Error Recovery**: Graceful handling of failed actions
- **Debug Information**: Detailed logging and screenshots

## 🔧 **Configuration**

Environment variables:
```bash
LIKE_SERVER_PORT=3009
LIKE_SERVER_HOST=localhost
```

## 🧪 **Example Use Cases**

### 1. **AI-Powered Engagement**
```javascript
// Get timeline data
const timeline = await fetch('/home-feed?count=20');
const tweets = timeline.tweets;

// AI analysis
for (const tweet of tweets) {
  const sentiment = analyzeSentiment(tweet.content);
  const authorScore = getUserPreference(tweet.authorHandle);
  
  if (sentiment > 0.7 && authorScore > 0.5) {
    // Like this tweet
    await fetch('/post-action', {
      method: 'POST',
      body: JSON.stringify({
        action: 'like',
        tweetData: tweet,
        behaviorType: 'social_engager'
      })
    });
  }
}
```

### 2. **Keyword-Based Engagement**
```javascript
const keywords = ['AI', 'blockchain', 'programming'];
const timeline = await fetch('/home-feed?count=15');

for (const tweet of timeline.tweets) {
  const hasKeyword = keywords.some(keyword => 
    tweet.content.toLowerCase().includes(keyword.toLowerCase()) ||
    tweet.hashtags.includes(keyword)
  );
  
  if (hasKeyword && tweet.likes < 100) {
    await likeAction(tweet);
  }
}
```

### 3. **Author-Based Engagement**
```javascript
const preferredAuthors = ['elonmusk', 'sundarpichai', 'satyanadella'];
const timeline = await fetch('/home-feed?count=25');

for (const tweet of timeline.tweets) {
  if (preferredAuthors.includes(tweet.authorHandle)) {
    await likeAction(tweet);
  }
}
```

## 🔍 **Comparison with Old System**

| Aspect | Old System | New System |
|--------|------------|------------|
| **Data & Action** | Combined | ✅ Separated |
| **Decision Making** | Built-in keyword matching | ✅ External, flexible |
| **Human Behavior** | Limited patterns | ✅ Comprehensive patterns |
| **Timeline Source** | Search/profiles only | ✅ Home feed (followers) |
| **API Design** | Single POST endpoint | ✅ RESTful GET/POST |
| **Error Handling** | Basic | ✅ Comprehensive |
| **Testing** | Limited | ✅ Full test suite |

## 🚨 **Migration Notes**

The old system is preserved for backward compatibility:
- `generic_like_human.ts` - Original functionality
- `http-like-server.ts` - Original server

New system runs on port 3009, old system on port 3002.

## 🎉 **Summary**

This redesigned system provides:
1. **Natural Browsing**: Fetches posts from your actual home timeline
2. **Intelligent Decisions**: External logic decides what to interact with  
3. **Human Actions**: Realistic interaction patterns maintained
4. **Clean Architecture**: Separated concerns for better maintainability
5. **Flexible Integration**: Easy to integrate with any decision-making system

The new workflow mimics real human Twitter usage: browse timeline → make decisions → take actions, all with natural human-like timing and behavior patterns.
