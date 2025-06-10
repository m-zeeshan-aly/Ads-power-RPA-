// test-like-server.ts
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
function sendLikeRequest(likeData: any): Promise<{ statusCode: number; data: any }> {
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
          resolve({
            statusCode: res.statusCode || 0,
            data: parsedData
          });
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
function checkHealth(): Promise<{ statusCode: number; data: any }> {
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
          resolve({
            statusCode: res.statusCode || 0,
            data: parsedData
          });
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

// Test functions
async function testHealthCheck(): Promise<boolean> {
  logWithTimestamp('Testing health check endpoint...');
  
  try {
    const response = await checkHealth();
    
    if (response.statusCode === 200 && response.data.success) {
      logWithTimestamp('✅ Health check successful');
      logWithTimestamp(`   Server: ${response.data.data.server}`);
      logWithTimestamp(`   Status: ${response.data.data.status}`);
      logWithTimestamp(`   Browser Connected: ${response.data.data.browserConnected}`);
      return true;
    } else {
      logWithTimestamp('❌ Health check failed');
      logWithTimestamp(`   Status: ${response.statusCode}`);
      logWithTimestamp(`   Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Health check error: ${error.message}`);
    return false;
  }
}

async function testLikeValidation(): Promise<boolean> {
  logWithTimestamp('Testing like validation (empty request should fail)...');
  
  try {
    const response = await sendLikeRequest({});
    
    if (response.statusCode === 400) {
      logWithTimestamp('✅ Like validation test passed');
      logWithTimestamp(`   Error message: ${response.data.error}`);
      return true;
    } else {
      logWithTimestamp('❌ Like validation test failed');
      logWithTimestamp(`   Expected 400, got ${response.statusCode}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Like validation test error: ${error.message}`);
    return false;
  }
}

async function testLikeByUsername(): Promise<boolean> {
  logWithTimestamp('Testing like by username...');
  logWithTimestamp('⚠️  This will attempt to like real tweets if browser is connected!');
  
  const likeRequest = {
    username: 'elonmusk',
    likeCount: 1,
    scrollTime: 5000,
    searchInFeed: true,
    visitProfile: true
  };

  try {
    const response = await sendLikeRequest(likeRequest);
    
    if (response.statusCode === 200 && response.data.success) {
      logWithTimestamp('✅ Like by username successful');
      logWithTimestamp(`   Username: ${likeRequest.username}`);
      return true;
    } else {
      logWithTimestamp('❌ Like by username failed');
      logWithTimestamp(`   Status: ${response.statusCode}`);
      logWithTimestamp(`   Error: ${response.data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Like by username error: ${error.message}`);
    return false;
  }
}

async function testLikeBySearchQuery(): Promise<boolean> {
  logWithTimestamp('Testing like by search query...');
  logWithTimestamp('⚠️  This will attempt to like real tweets if browser is connected!');
  
  const likeRequest = {
    searchQuery: 'artificial intelligence',
    likeCount: 1,
    scrollTime: 8000,
    searchInFeed: true,
    visitProfile: false
  };

  try {
    const response = await sendLikeRequest(likeRequest);
    
    if (response.statusCode === 200 && response.data.success) {
      logWithTimestamp('✅ Like by search query successful');
      logWithTimestamp(`   Search Query: "${likeRequest.searchQuery}"`);
      return true;
    } else {
      logWithTimestamp('❌ Like by search query failed');
      logWithTimestamp(`   Status: ${response.statusCode}`);
      logWithTimestamp(`   Error: ${response.data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Like by search query error: ${error.message}`);
    return false;
  }
}

async function testLikeByTweetContent(): Promise<boolean> {
  logWithTimestamp('Testing like by tweet content...');
  logWithTimestamp('⚠️  This will attempt to like real tweets if browser is connected!');
  
  const likeRequest = {
    tweetContent: 'technology innovation',
    likeCount: 1,
    scrollTime: 10000
  };

  try {
    const response = await sendLikeRequest(likeRequest);
    
    if (response.statusCode === 200 && response.data.success) {
      logWithTimestamp('✅ Like by tweet content successful');
      logWithTimestamp(`   Tweet Content: "${likeRequest.tweetContent}"`);
      return true;
    } else {
      logWithTimestamp('❌ Like by tweet content failed');
      logWithTimestamp(`   Status: ${response.statusCode}`);
      logWithTimestamp(`   Error: ${response.data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Like by tweet content error: ${error.message}`);
    return false;
  }
}

async function testLikeByProfileUrl(): Promise<boolean> {
  logWithTimestamp('Testing like by profile URL...');
  logWithTimestamp('⚠️  This will attempt to like real tweets if browser is connected!');
  
  const likeRequest = {
    profileUrl: 'https://twitter.com/OpenAI',
    likeCount: 1,
    searchInFeed: false,
    visitProfile: true
  };

  try {
    const response = await sendLikeRequest(likeRequest);
    
    if (response.statusCode === 200 && response.data.success) {
      logWithTimestamp('✅ Like by profile URL successful');
      logWithTimestamp(`   Profile URL: ${likeRequest.profileUrl}`);
      return true;
    } else {
      logWithTimestamp('❌ Like by profile URL failed');
      logWithTimestamp(`   Status: ${response.statusCode}`);
      logWithTimestamp(`   Error: ${response.data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Like by profile URL error: ${error.message}`);
    return false;
  }
}

async function testCombinedCriteria(): Promise<boolean> {
  logWithTimestamp('Testing combined criteria...');
  logWithTimestamp('⚠️  This will attempt to like real tweets if browser is connected!');
  
  const likeRequest = {
    username: 'github',
    searchQuery: 'open source',
    likeCount: 2,
    scrollTime: 12000
  };

  try {
    const response = await sendLikeRequest(likeRequest);
    
    if (response.statusCode === 200 && response.data.success) {
      logWithTimestamp('✅ Combined criteria like successful');
      logWithTimestamp(`   Username: ${likeRequest.username}`);
      logWithTimestamp(`   Search Query: "${likeRequest.searchQuery}"`);
      return true;
    } else {
      logWithTimestamp('❌ Combined criteria like failed');
      logWithTimestamp(`   Status: ${response.statusCode}`);
      logWithTimestamp(`   Error: ${response.data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Combined criteria like error: ${error.message}`);
    return false;
  }
}

async function checkServerConnection(): Promise<boolean> {
  logWithTimestamp('Checking if like server is running...');
  
  try {
    const response = await checkHealth();
    
    if (response.statusCode === 200) {
      logWithTimestamp('✅ Like server is running');
      return true;
    } else {
      logWithTimestamp('❌ Like server returned unexpected status');
      return false;
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      logWithTimestamp('❌ Like server is not running');
      logWithTimestamp('   Please start the server with: npm run like-server');
    } else {
      logWithTimestamp(`❌ Connection error: ${error.message}`);
    }
    return false;
  }
}

// Main test function
async function runTests(): Promise<void> {
  logWithTimestamp('='.repeat(60));
  logWithTimestamp('🧪 HTTP Like Server Test Suite');
  logWithTimestamp('='.repeat(60));
  
  // Check if server is running
  const serverRunning = await checkServerConnection();
  if (!serverRunning) {
    logWithTimestamp('❌ Cannot run tests - server is not available');
    process.exit(1);
  }
  
  logWithTimestamp('');
  
  // Test 1: Health check
  const healthPassed = await testHealthCheck();
  logWithTimestamp('');
  
  // Test 2: Validation
  const validationPassed = await testLikeValidation();
  logWithTimestamp('');
  
  // Warning about real actions
  logWithTimestamp('⚠️  WARNING: The following tests will perform REAL like actions on Twitter!');
  logWithTimestamp('⚠️  Make sure you are using a test account and are okay with liking tweets.');
  logWithTimestamp('⚠️  Press Ctrl+C to cancel, or wait 10 seconds to continue...');
  
  // Wait 10 seconds
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  logWithTimestamp('🚀 Proceeding with live tests...');
  logWithTimestamp('');
  
  // Test 3: Like by username
  const usernamePassed = await testLikeByUsername();
  logWithTimestamp('');
  
  // Test 4: Like by search query
  const searchQueryPassed = await testLikeBySearchQuery();
  logWithTimestamp('');
  
  // Test 5: Like by tweet content
  const tweetContentPassed = await testLikeByTweetContent();
  logWithTimestamp('');
  
  // Test 6: Like by profile URL
  const profileUrlPassed = await testLikeByProfileUrl();
  logWithTimestamp('');
  
  // Test 7: Combined criteria
  const combinedPassed = await testCombinedCriteria();
  logWithTimestamp('');
  
  // Summary
  const tests = [
    { name: 'Health Check', passed: healthPassed },
    { name: 'Validation', passed: validationPassed },
    { name: 'Like by Username', passed: usernamePassed },
    { name: 'Like by Search Query', passed: searchQueryPassed },
    { name: 'Like by Tweet Content', passed: tweetContentPassed },
    { name: 'Like by Profile URL', passed: profileUrlPassed },
    { name: 'Combined Criteria', passed: combinedPassed }
  ];
  
  const passedCount = tests.filter(t => t.passed).length;
  const totalCount = tests.length;
  
  logWithTimestamp('='.repeat(60));
  logWithTimestamp('📊 TEST RESULTS SUMMARY');
  logWithTimestamp('='.repeat(60));
  
  tests.forEach(test => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    logWithTimestamp(`${status} - ${test.name}`);
  });
  
  logWithTimestamp('');
  logWithTimestamp(`TOTAL: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    logWithTimestamp('🎉 All tests passed!');
  } else {
    logWithTimestamp('⚠️  Some tests failed. Check the logs above for details.');
  }
  
  logWithTimestamp('='.repeat(60));
}

// Run the tests
if (require.main === module) {
  runTests().catch((error) => {
    logWithTimestamp(`Unhandled error in test suite: ${error.message}`);
    process.exit(1);
  });
}

export { sendLikeRequest, checkHealth };
