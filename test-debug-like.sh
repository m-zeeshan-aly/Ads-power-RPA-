#!/bin/bash

# Test script to verify the flattened structure is working with the new like-action-handler.ts

echo "🧪 Testing Like Action Handler with Flattened Structure"
echo "======================================================="

echo "🔥 TEST 1: Flattened structure (new preferred format)"
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

echo -e "\n\n⚡ TEST 2: Minimal structure (just required fields)"
curl -X POST http://localhost:3000/api/like \
  -H "Content-Type: application/json" \
  -d '{
    "action": "like",
    "tweetId": "1886257050193191167"
  }'

echo -e "\n\n🔄 TEST 3: Legacy structure (backward compatibility)"
curl -X POST http://localhost:3000/api/like \
  -H "Content-Type: application/json" \
  -d '{
    "action": "like",
    "tweetData": {
      "tweetId": "1886257050193191167",
      "url": "https://x.com/locofy_ai/status/1886257050193191167/analytics",
      "authorHandle": "locofy_ai",
      "content": "AI is revolutionizing the way we design"
    },
    "behaviorType": "casual_browser"
  }'

echo -e "\n\n🔍 Check the server logs above to see:"
echo "1. Flattened structure processing (TEST 1 & 2)"
echo "2. Legacy structure fallback (TEST 3)" 
echo "3. Data source identification in logs"
echo "4. Complete input data received"
echo "5. URL extraction and username processing"
