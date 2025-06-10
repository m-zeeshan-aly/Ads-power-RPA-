// test-comment-client.ts
import * as http from 'http';

// Configuration
const COMMENT_SERVER_URL = 'http://localhost:3003';

// Utility function for making HTTP requests
function makeRequest(
  method: string, 
  endpoint: string, 
  data?: any
): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, COMMENT_SERVER_URL);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Comment-Test-Client/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({ statusCode: res.statusCode || 0, body: parsedBody });
        } catch (error) {
          resolve({ statusCode: res.statusCode || 0, body: { rawBody: body } });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Logging utility
function logWithTimestamp(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Test server status
async function testServerStatus(): Promise<boolean> {
  try {
    logWithTimestamp('🔍 Testing server status...');
    const response = await makeRequest('GET', '/status');
    
    if (response.statusCode === 200 && response.body.success) {
      logWithTimestamp('✅ Server status check passed');
      logWithTimestamp(`   Service: ${response.body.data.service}`);
      logWithTimestamp(`   Status: ${response.body.data.status}`);
      logWithTimestamp(`   Browser Connected: ${response.body.data.browserConnected}`);
      return true;
    } else {
      logWithTimestamp('❌ Server status check failed');
      logWithTimestamp(`   Status Code: ${response.statusCode}`);
      logWithTimestamp(`   Response: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Failed to connect to comment server: ${error.message}`);
    logWithTimestamp('   Make sure the comment server is running on port 3003');
    return false;
  }
}

// Test API documentation
async function testApiDocumentation(): Promise<void> {
  try {
    logWithTimestamp('📖 Fetching API documentation...');
    const response = await makeRequest('GET', '/help');
    
    if (response.statusCode === 200 && response.body.success) {
      logWithTimestamp('✅ API documentation retrieved successfully');
      logWithTimestamp(`   Service: ${response.body.data.service}`);
      logWithTimestamp(`   Available endpoints: ${Object.keys(response.body.data.endpoints).length}`);
    } else {
      logWithTimestamp('❌ Failed to retrieve API documentation');
      logWithTimestamp(`   Status Code: ${response.statusCode}`);
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Error fetching API documentation: ${error.message}`);
  }
}

// Test comment with username
async function testCommentByUsername(): Promise<void> {
  try {
    logWithTimestamp('🧪 Testing comment by username...');
    
    const requestData = {
      username: 'ImranKhanPTI',
      commentText: 'Great message! Keep up the excellent work! 👏',
      commentCount: 1,
      scrollTime: 8000,
      searchInFeed: true,
      visitProfile: true
    };
    
    logWithTimestamp(`   Sending request: ${JSON.stringify(requestData, null, 2)}`);
    
    const response = await makeRequest('POST', '/comment', requestData);
    
    if (response.statusCode === 200 && response.body.success) {
      logWithTimestamp('✅ Comment by username test completed successfully');
      logWithTimestamp(`   Duration: ${response.body.data.duration}`);
      logWithTimestamp(`   Comments Posted: ${response.body.data.input.commentCount}`);
    } else {
      logWithTimestamp('❌ Comment by username test failed');
      logWithTimestamp(`   Status Code: ${response.statusCode}`);
      logWithTimestamp(`   Error: ${response.body.error || 'Unknown error'}`);
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Comment by username test error: ${error.message}`);
  }
}

// Test comment with search query
async function testCommentBySearchQuery(): Promise<void> {
  try {
    logWithTimestamp('🔍 Testing comment by search query...');
    
    const requestData = {
      searchQuery: 'Pakistan politics',
      comments: [
        'Very interesting perspective! 🤔',
        'Thanks for sharing this insight! 👍',
        'This is exactly what Pakistan needs! 🇵🇰'
      ],
      commentCount: 1,
      scrollTime: 12000,
      searchInFeed: true,
      visitProfile: false
    };
    
    logWithTimestamp(`   Sending request: ${JSON.stringify(requestData, null, 2)}`);
    
    const response = await makeRequest('POST', '/comment', requestData);
    
    if (response.statusCode === 200 && response.body.success) {
      logWithTimestamp('✅ Comment by search query test completed successfully');
      logWithTimestamp(`   Duration: ${response.body.data.duration}`);
      logWithTimestamp(`   Custom Comments Available: ${response.body.data.input.hasCustomComments}`);
    } else {
      logWithTimestamp('❌ Comment by search query test failed');
      logWithTimestamp(`   Status Code: ${response.statusCode}`);
      logWithTimestamp(`   Error: ${response.body.error || 'Unknown error'}`);
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Comment by search query test error: ${error.message}`);
  }
}

// Test comment with profile URL
async function testCommentByProfileUrl(): Promise<void> {
  try {
    logWithTimestamp('🔗 Testing comment by profile URL...');
    
    const requestData = {
      profileUrl: 'https://twitter.com/PTIofficial',
      commentText: 'Excellent work team PTI! Pakistan is proud! 🇵🇰❤️',
      commentCount: 1,
      scrollTime: 10000,
      searchInFeed: false,
      visitProfile: true
    };
    
    logWithTimestamp(`   Sending request: ${JSON.stringify(requestData, null, 2)}`);
    
    const response = await makeRequest('POST', '/comment', requestData);
    
    if (response.statusCode === 200 && response.body.success) {
      logWithTimestamp('✅ Comment by profile URL test completed successfully');
      logWithTimestamp(`   Duration: ${response.body.data.duration}`);
      logWithTimestamp(`   Has Custom Text: ${response.body.data.input.hasCustomText}`);
    } else {
      logWithTimestamp('❌ Comment by profile URL test failed');
      logWithTimestamp(`   Status Code: ${response.statusCode}`);
      logWithTimestamp(`   Error: ${response.body.error || 'Unknown error'}`);
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Comment by profile URL test error: ${error.message}`);
  }
}

// Test comment with tweet content search
async function testCommentByTweetContent(): Promise<void> {
  try {
    logWithTimestamp('📝 Testing comment by tweet content...');
    
    const requestData = {
      tweetContent: 'Pakistan justice leadership',
      commentText: 'Absolutely agree with this important message! 💯',
      commentCount: 1,
      scrollTime: 15000,
      searchInFeed: true,
      visitProfile: true
    };
    
    logWithTimestamp(`   Sending request: ${JSON.stringify(requestData, null, 2)}`);
    
    const response = await makeRequest('POST', '/comment', requestData);
    
    if (response.statusCode === 200 && response.body.success) {
      logWithTimestamp('✅ Comment by tweet content test completed successfully');
      logWithTimestamp(`   Duration: ${response.body.data.duration}`);
    } else {
      logWithTimestamp('❌ Comment by tweet content test failed');
      logWithTimestamp(`   Status Code: ${response.statusCode}`);
      logWithTimestamp(`   Error: ${response.body.error || 'Unknown error'}`);
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Comment by tweet content test error: ${error.message}`);
  }
}

// Test multiple comments
async function testMultipleComments(): Promise<void> {
  try {
    logWithTimestamp('🔢 Testing multiple comments...');
    
    const requestData = {
      username: 'PTIofficial',
      comments: [
        'Great work! Keep it up! 👏',
        'This is inspiring! Thank you! 🌟',
        'Pakistan needs more leaders like this! 🇵🇰',
        'Excellent message! Fully support this! 💪',
        'Thank you for your dedication! ❤️'
      ],
      commentCount: 2,
      scrollTime: 20000,
      searchInFeed: true,
      visitProfile: true
    };
    
    logWithTimestamp(`   Sending request: ${JSON.stringify(requestData, null, 2)}`);
    
    const response = await makeRequest('POST', '/comment', requestData);
    
    if (response.statusCode === 200 && response.body.success) {
      logWithTimestamp('✅ Multiple comments test completed successfully');
      logWithTimestamp(`   Duration: ${response.body.data.duration}`);
      logWithTimestamp(`   Comments Requested: ${response.body.data.input.commentCount}`);
      logWithTimestamp(`   Custom Comments Pool: ${response.body.data.input.hasCustomComments}`);
    } else {
      logWithTimestamp('❌ Multiple comments test failed');
      logWithTimestamp(`   Status Code: ${response.statusCode}`);
      logWithTimestamp(`   Error: ${response.body.error || 'Unknown error'}`);
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Multiple comments test error: ${error.message}`);
  }
}

// Test error handling
async function testErrorHandling(): Promise<void> {
  try {
    logWithTimestamp('⚠️  Testing error handling...');
    
    // Test with invalid input (no targeting criteria)
    const invalidRequestData = {
      commentText: 'This should fail',
      commentCount: 1
    };
    
    logWithTimestamp('   Testing request with no targeting criteria...');
    const response = await makeRequest('POST', '/comment', invalidRequestData);
    
    if (response.statusCode === 500 && !response.body.success) {
      logWithTimestamp('✅ Error handling test passed (correctly rejected invalid input)');
      logWithTimestamp(`   Error message: ${response.body.error}`);
    } else {
      logWithTimestamp('❌ Error handling test failed (should have rejected invalid input)');
      logWithTimestamp(`   Status Code: ${response.statusCode}`);
      logWithTimestamp(`   Response: ${JSON.stringify(response.body, null, 2)}`);
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Error handling test error: ${error.message}`);
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  logWithTimestamp('🚀 Starting Comment Server Test Suite');
  logWithTimestamp('='.repeat(60));
  
  // Test server connectivity
  const serverReady = await testServerStatus();
  if (!serverReady) {
    logWithTimestamp('❌ Server is not ready. Please start the comment server first.');
    logWithTimestamp('   Run: npm run comment-server');
    process.exit(1);
  }
  
  // Test API documentation
  await testApiDocumentation();
  logWithTimestamp('');
  
  // Wait between tests to avoid overwhelming the server
  const waitBetweenTests = 3000; // 3 seconds
  
  try {
    // Test different comment scenarios
    await testCommentByUsername();
    await new Promise(resolve => setTimeout(resolve, waitBetweenTests));
    
    await testCommentBySearchQuery();
    await new Promise(resolve => setTimeout(resolve, waitBetweenTests));
    
    await testCommentByProfileUrl();
    await new Promise(resolve => setTimeout(resolve, waitBetweenTests));
    
    await testCommentByTweetContent();
    await new Promise(resolve => setTimeout(resolve, waitBetweenTests));
    
    await testMultipleComments();
    await new Promise(resolve => setTimeout(resolve, waitBetweenTests));
    
    // Test error scenarios
    await testErrorHandling();
    
  } catch (error: any) {
    logWithTimestamp(`❌ Test suite error: ${error.message}`);
  }
  
  logWithTimestamp('');
  logWithTimestamp('='.repeat(60));
  logWithTimestamp('🏁 Comment Server Test Suite Completed');
  logWithTimestamp('='.repeat(60));
}

// Command line interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    await runAllTests();
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'status':
      await testServerStatus();
      break;
    case 'help':
      await testApiDocumentation();
      break;
    case 'username':
      await testCommentByUsername();
      break;
    case 'search':
      await testCommentBySearchQuery();
      break;
    case 'profile':
      await testCommentByProfileUrl();
      break;
    case 'content':
      await testCommentByTweetContent();
      break;
    case 'multiple':
      await testMultipleComments();
      break;
    case 'errors':
      await testErrorHandling();
      break;
    case 'all':
      await runAllTests();
      break;
    default:
      console.log('Usage: npm run test-comment-client [command]');
      console.log('Commands:');
      console.log('  status     - Test server status');
      console.log('  help       - Get API documentation');
      console.log('  username   - Test comment by username');
      console.log('  search     - Test comment by search query');
      console.log('  profile    - Test comment by profile URL');
      console.log('  content    - Test comment by tweet content');
      console.log('  multiple   - Test multiple comments');
      console.log('  errors     - Test error handling');
      console.log('  all        - Run all tests (default)');
      break;
  }
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    logWithTimestamp(`❌ Test client error: ${error.message}`);
    process.exit(1);
  });
}

export { 
  makeRequest, 
  testServerStatus, 
  testCommentByUsername, 
  testCommentBySearchQuery, 
  testCommentByProfileUrl,
  testCommentByTweetContent,
  testMultipleComments,
  testErrorHandling,
  runAllTests 
};
