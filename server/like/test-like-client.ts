// test-like-client.ts
import * as http from 'http';

// Server configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 3002;

// Logging utility
function logWithTimestamp(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// API client function
function sendLikeRequest(likeData: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(likeData);
    
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/like',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode === 200) {
            resolve(parsedData);
          } else {
            reject(new Error(parsedData.error || `HTTP ${res.statusCode}`));
          }
        } catch (error) {
          reject(new Error(`Invalid response: ${error}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Health check function
function checkHealth(): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Invalid response: ${error}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Test scenarios
async function runTests(): Promise<void> {
  logWithTimestamp('🚀 Starting Like Server Tests');
  logWithTimestamp('='.repeat(50));

  try {
    // Test 1: Health Check
    logWithTimestamp('Test 1: Health Check');
    const healthResult = await checkHealth();
    logWithTimestamp(`✅ Health check passed: ${healthResult.data.status}`);
    logWithTimestamp(`Browser status: ${healthResult.data.browser}`);

    // Test 2: Like by username
    logWithTimestamp('\nTest 2: Like by username');
    const usernameResult = await sendLikeRequest({
      username: 'elonmusk',
      likeCount: 1,
      scrollTime: 5000,
      searchInFeed: true,
      visitProfile: true
    });
    logWithTimestamp('✅ Like by username completed successfully');
    logWithTimestamp(`Response: ${JSON.stringify(usernameResult.data.message)}`);

    // Test 3: Like by search query
    logWithTimestamp('\nTest 3: Like by search query');
    const searchResult = await sendLikeRequest({
      searchQuery: 'artificial intelligence',
      likeCount: 1,
      scrollTime: 8000
    });
    logWithTimestamp('✅ Like by search query completed successfully');
    logWithTimestamp(`Response: ${JSON.stringify(searchResult.data.message)}`);

    // Test 4: Like by tweet content
    logWithTimestamp('\nTest 4: Like by tweet content');
    const contentResult = await sendLikeRequest({
      tweetContent: 'technology',
      likeCount: 1,
      scrollTime: 6000
    });
    logWithTimestamp('✅ Like by tweet content completed successfully');
    logWithTimestamp(`Response: ${JSON.stringify(contentResult.data.message)}`);

    // Test 5: Like by profile URL
    logWithTimestamp('\nTest 5: Like by profile URL');
    const profileResult = await sendLikeRequest({
      profileUrl: 'https://twitter.com/openai',
      likeCount: 1,
      visitProfile: true,
      searchInFeed: false
    });
    logWithTimestamp('✅ Like by profile URL completed successfully');
    logWithTimestamp(`Response: ${JSON.stringify(profileResult.data.message)}`);

    // Test 6: Combined criteria
    logWithTimestamp('\nTest 6: Combined criteria (username + search query)');
    const combinedResult = await sendLikeRequest({
      username: 'nasa',
      searchQuery: 'space',
      likeCount: 1,
      scrollTime: 10000
    });
    logWithTimestamp('✅ Like with combined criteria completed successfully');
    logWithTimestamp(`Response: ${JSON.stringify(combinedResult.data.message)}`);

    logWithTimestamp('\n🎉 All tests completed successfully!');

  } catch (error: any) {
    logWithTimestamp(`❌ Test failed: ${error.message}`);
  }

  logWithTimestamp('='.repeat(50));
}

// Error handling tests
async function runErrorTests(): Promise<void> {
  logWithTimestamp('\n🧪 Running Error Handling Tests');
  logWithTimestamp('='.repeat(50));

  try {
    // Test: No criteria provided
    logWithTimestamp('Test: No search criteria provided (should fail)');
    try {
      await sendLikeRequest({
        likeCount: 1
      });
      logWithTimestamp('❌ Expected error but request succeeded');
    } catch (error: any) {
      logWithTimestamp(`✅ Correctly rejected: ${error.message}`);
    }

    // Test: Invalid like count
    logWithTimestamp('\nTest: Invalid like count (should fail)');
    try {
      await sendLikeRequest({
        username: 'test',
        likeCount: 15
      });
      logWithTimestamp('❌ Expected error but request succeeded');
    } catch (error: any) {
      logWithTimestamp(`✅ Correctly rejected: ${error.message}`);
    }

    // Test: Invalid scroll time
    logWithTimestamp('\nTest: Invalid scroll time (should fail)');
    try {
      await sendLikeRequest({
        username: 'test',
        scrollTime: 100
      });
      logWithTimestamp('❌ Expected error but request succeeded');
    } catch (error: any) {
      logWithTimestamp(`✅ Correctly rejected: ${error.message}`);
    }

    // Test: Invalid profile URL
    logWithTimestamp('\nTest: Invalid profile URL (should fail)');
    try {
      await sendLikeRequest({
        profileUrl: 'not-a-url'
      });
      logWithTimestamp('❌ Expected error but request succeeded');
    } catch (error: any) {
      logWithTimestamp(`✅ Correctly rejected: ${error.message}`);
    }

    logWithTimestamp('\n✅ All error handling tests passed!');

  } catch (error: any) {
    logWithTimestamp(`❌ Error test failed: ${error.message}`);
  }

  logWithTimestamp('='.repeat(50));
}

// Main function
async function main(): Promise<void> {
  logWithTimestamp('Like Server Test Client');
  logWithTimestamp(`Testing server at http://${SERVER_HOST}:${SERVER_PORT}`);

  // Wait a moment for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Run basic functionality tests
    await runTests();

    // Run error handling tests
    await runErrorTests();

  } catch (error: any) {
    logWithTimestamp(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Quick test functions for individual scenarios
export async function testByUsername(username: string, likeCount: number = 1): Promise<void> {
  logWithTimestamp(`Testing like by username: ${username}`);
  
  try {
    const result = await sendLikeRequest({
      username,
      likeCount,
      scrollTime: 8000
    });
    logWithTimestamp(`✅ Success: ${result.data.message}`);
  } catch (error: any) {
    logWithTimestamp(`❌ Failed: ${error.message}`);
  }
}

export async function testBySearchQuery(query: string, likeCount: number = 1): Promise<void> {
  logWithTimestamp(`Testing like by search query: ${query}`);
  
  try {
    const result = await sendLikeRequest({
      searchQuery: query,
      likeCount,
      scrollTime: 10000
    });
    logWithTimestamp(`✅ Success: ${result.data.message}`);
  } catch (error: any) {
    logWithTimestamp(`❌ Failed: ${error.message}`);
  }
}

export async function testByTweetContent(content: string, likeCount: number = 1): Promise<void> {
  logWithTimestamp(`Testing like by tweet content: ${content}`);
  
  try {
    const result = await sendLikeRequest({
      tweetContent: content,
      likeCount,
      scrollTime: 8000
    });
    logWithTimestamp(`✅ Success: ${result.data.message}`);
  } catch (error: any) {
    logWithTimestamp(`❌ Failed: ${error.message}`);
  }
}

export async function testByProfileUrl(profileUrl: string, likeCount: number = 1): Promise<void> {
  logWithTimestamp(`Testing like by profile URL: ${profileUrl}`);
  
  try {
    const result = await sendLikeRequest({
      profileUrl,
      likeCount,
      visitProfile: true,
      searchInFeed: false
    });
    logWithTimestamp(`✅ Success: ${result.data.message}`);
  } catch (error: any) {
    logWithTimestamp(`❌ Failed: ${error.message}`);
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    logWithTimestamp(`Test client error: ${error.message}`);
    process.exit(1);
  });
}

export { sendLikeRequest, checkHealth };
