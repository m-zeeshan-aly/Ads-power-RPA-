#!/bin/bash

# Account Tweets API Testing Script
# This demonstrates the n-count functionality with various scenarios

echo "🧪 Testing Account Tweets API with Variable Count Parameter"
echo "=========================================================="

SERVER="http://localhost:3008"

echo ""
echo "📋 Test 1: Default count (should be 30)"
echo "Command: curl \"$SERVER/api/account-tweets?username=ImranKhanPTI\""
echo "Expected: count: 30 in the response"
echo ""
curl -s "$SERVER/api/account-tweets?username=ImranKhanPTI" | grep -o '"count":[0-9]*' | head -1
echo ""

echo "📋 Test 2: Custom count - 5 tweets"
echo "Command: curl \"$SERVER/api/account-tweets?username=ImranKhanPTI&count=5\""
echo "Expected: count: 5 and totalFetched: 5"
echo ""
response=$(curl -s "$SERVER/api/account-tweets?username=ImranKhanPTI&count=5")
echo "$response" | grep -o '"count":[0-9]*' | head -1
echo "$response" | grep -o '"totalFetched":[0-9]*'
echo ""

echo "📋 Test 3: Custom count - 10 tweets (POST method)"
echo "Command: curl -X POST with {\"username\": \"ImranKhanPTI\", \"count\": 10}"
echo "Expected: count: 10 and totalFetched: 10"
echo ""
response=$(curl -s -X POST "$SERVER/api/account-tweets" -H "Content-Type: application/json" -d '{"username": "ImranKhanPTI", "count": 10}')
echo "$response" | grep -o '"count":[0-9]*' | head -1
echo "$response" | grep -o '"totalFetched":[0-9]*'
echo ""

echo "📋 Test 4: Testing maximum limit (should fail)"
echo "Command: curl -X POST with count: 250"
echo "Expected: Error message about exceeding 200 limit"
echo ""
curl -s -X POST "$SERVER/api/account-tweets" -H "Content-Type: application/json" -d '{"username": "ImranKhanPTI", "count": 250}' | grep -o '"error":"[^"]*"'
echo ""

echo "📋 Test 5: Testing edge case - count: 1"
echo "Command: curl \"$SERVER/api/account-tweets?username=ImranKhanPTI&count=1\""
echo "Expected: count: 1 and totalFetched: 1"
echo ""
response=$(curl -s "$SERVER/api/account-tweets?username=ImranKhanPTI&count=1")
echo "$response" | grep -o '"count":[0-9]*' | head -1
echo "$response" | grep -o '"totalFetched":[0-9]*'
echo ""

echo "📋 Test 6: Testing maximum allowed count: 200"
echo "Command: curl \"$SERVER/api/account-tweets?username=ImranKhanPTI&count=200\""
echo "Expected: count: 200 and starts fetching"
echo ""
response=$(curl -s "$SERVER/api/account-tweets?username=ImranKhanPTI&count=200" --max-time 5)
echo "$response" | grep -o '"count":[0-9]*' | head -1
if [[ "$response" == *"success"* ]]; then
    echo "✅ Request accepted (may take longer to complete)"
else
    echo "❌ Request failed or timed out"
fi
echo ""

echo "🎉 Testing completed!"
echo ""
echo "📖 Summary of implemented functionality:"
echo "✅ Default count: 30 tweets (when count parameter not provided)"
echo "✅ Custom count: User can specify any number from 1-200"
echo "✅ Maximum limit: 200 tweets (for performance reasons)"
echo "✅ Validation: Proper error messages for invalid counts"
echo "✅ Both GET and POST methods supported"
echo "✅ Backward compatibility: Existing API calls work without changes"
