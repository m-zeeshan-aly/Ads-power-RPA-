// test-unified-client.ts
import * as http from 'http';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration from environment
const SERVER_HOST = process.env.UNIFIED_SERVER_HOST || 'localhost';
const SERVER_PORT = Number(process.env.UNIFIED_SERVER_PORT) || 3000;
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

// Color codes for console output
const Colors = {
  Reset: '\x1b[0m',
  Red: '\x1b[31m',
  Green: '\x1b[32m',
  Yellow: '\x1b[33m',
  Blue: '\x1b[34m',
  Magenta: '\x1b[35m',
  Cyan: '\x1b[36m',
  White: '\x1b[37m'
};

// Logging utility
function log(message: string, color: string = Colors.White): void {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${Colors.Reset}`);
}

// HTTP request utility
function makeRequest(
  method: string, 
  endpoint: string, 
  data?: any
): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SERVER_URL);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Unified-Test-Client/1.0'
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
          resolve({ statusCode: res.statusCode || 0, data: parsedBody });
        } catch (error) {
          resolve({ statusCode: res.statusCode || 0, data: { rawBody: body } });
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

// Test server status
async function testServerStatus(): Promise<void> {
  log('Testing unified server status...', Colors.Blue);
  
  try {
    const response = await makeRequest('GET', '/api/status');
    
    if (response.statusCode === 200 && response.data.success) {
      log('✅ Server status check passed', Colors.Green);
      log(`   Service: ${response.data.data.service}`, Colors.White);
      log(`   Status: ${response.data.data.status}`, Colors.White);
      log(`   Browser Connected: ${response.data.data.browser.connected}`, Colors.White);
      log(`   Available Services: ${Object.keys(response.data.data.services).join(', ')}`, Colors.White);
    } else {
      log('❌ Server status check failed', Colors.Red);
      log(`   Status Code: ${response.statusCode}`, Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Failed to connect to unified server: ${error.message}`, Colors.Red);
    log('   Make sure the unified server is running', Colors.Yellow);
  }
}

// Test API documentation
async function testApiDocumentation(): Promise<void> {
  log('Testing API documentation...', Colors.Blue);
  
  try {
    const response = await makeRequest('GET', '/api/help');
    
    if (response.statusCode === 200 && response.data.success) {
      log('✅ API documentation retrieved successfully', Colors.Green);
      log(`   Service: ${response.data.data.service}`, Colors.White);
      log(`   Available Services: ${Object.keys(response.data.data.services).length}`, Colors.White);
      log(`   Behavior Types: ${Object.keys(response.data.data.behaviorTypes).length}`, Colors.White);
    } else {
      log('❌ Failed to retrieve API documentation', Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Error fetching API documentation: ${error.message}`, Colors.Red);
  }
}

// Test tweet posting
async function testTweetPosting(): Promise<void> {
  log('🐦 Testing tweet posting...', Colors.Blue);
  
  const tweetData = {
    message: 'Hello from the unified automation server! 🚀',
    hashtags: ['automation', 'nodejs', 'testing'],
    mentions: ['test_user']
  };
  
  try {
    log(`   Sending tweet: "${tweetData.message}"`, Colors.Cyan);
    
    const response = await makeRequest('POST', '/api/tweet', tweetData);
    
    if (response.statusCode === 200 && response.data.success) {
      log('✅ Tweet posted successfully', Colors.Green);
      log(`   Duration: ${response.data.data.duration}`, Colors.White);
      log(`   Character Count: ${response.data.data.tweet.characterCount}`, Colors.White);
    } else {
      log('❌ Tweet posting failed', Colors.Red);
      log(`   Error: ${response.data.error || 'Unknown error'}`, Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Tweet posting error: ${error.message}`, Colors.Red);
  }
}

// Test like functionality
async function testLikeFunctionality(): Promise<void> {
  log('❤️ Testing like functionality...', Colors.Blue);
  
  const likeData = {
    username: 'elonmusk',
    likeCount: 1,
    scrollTime: 8000,
    searchInFeed: true,
    visitProfile: true
  };
  
  try {
    log(`   Targeting username: ${likeData.username}`, Colors.Cyan);
    
    const response = await makeRequest('POST', '/api/like', likeData);
    
    if (response.statusCode === 200 && response.data.success) {
      log('✅ Like operation completed successfully', Colors.Green);
      log(`   Duration: ${response.data.data.duration}`, Colors.White);
      log(`   Likes Count: ${response.data.data.input.likeCount}`, Colors.White);
    } else {
      log('❌ Like operation failed', Colors.Red);
      log(`   Error: ${response.data.error || 'Unknown error'}`, Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Like operation error: ${error.message}`, Colors.Red);
  }
}

// Test comment functionality
async function testCommentFunctionality(): Promise<void> {
  log('💬 Testing comment functionality...', Colors.Blue);
  
  const commentData = {
    searchQuery: 'artificial intelligence technology',
    commentText: 'Very interesting perspective on AI development! 🤖',
    commentCount: 1,
    scrollTime: 10000
  };
  
  try {
    log(`   Search query: ${commentData.searchQuery}`, Colors.Cyan);
    log(`   Comment: "${commentData.commentText}"`, Colors.Cyan);
    
    const response = await makeRequest('POST', '/api/comment', commentData);
    
    if (response.statusCode === 200 && response.data.success) {
      log('✅ Comment operation completed successfully', Colors.Green);
      log(`   Duration: ${response.data.data.duration}`, Colors.White);
      log(`   Comments Posted: ${response.data.data.input.commentCount}`, Colors.White);
    } else {
      log('❌ Comment operation failed', Colors.Red);
      log(`   Error: ${response.data.error || 'Unknown error'}`, Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Comment operation error: ${error.message}`, Colors.Red);
  }
}

// Test retweet functionality
async function testRetweetFunctionality(): Promise<void> {
  log('🔄 Testing retweet functionality...', Colors.Blue);
  
  const retweetData = {
    username: 'ImranKhanPTI',
    retweetCount: 1,
    behaviorType: 'social_engager',
    scrollTime: 12000
  };
  
  try {
    log(`   Targeting username: ${retweetData.username}`, Colors.Cyan);
    log(`   Behavior Type: ${retweetData.behaviorType}`, Colors.Cyan);
    
    const response = await makeRequest('POST', '/api/retweet', retweetData);
    
    if (response.statusCode === 200 && response.data.success) {
      log('✅ Retweet operation completed successfully', Colors.Green);
      log(`   Duration: ${response.data.data.duration}`, Colors.White);
      log(`   Retweets Count: ${response.data.data.input.retweetCount}`, Colors.White);
      log(`   Behavior Used: ${response.data.data.input.behaviorType}`, Colors.White);
    } else {
      log('❌ Retweet operation failed', Colors.Red);
      log(`   Error: ${response.data.error || 'Unknown error'}`, Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Retweet operation error: ${error.message}`, Colors.Red);
  }
}

// Test error handling
async function testErrorHandling(): Promise<void> {
  log('⚠️ Testing error handling...', Colors.Blue);
  
  // Test invalid endpoint
  try {
    log('   Testing invalid endpoint...', Colors.Cyan);
    const response = await makeRequest('GET', '/invalid-endpoint');
    
    if (response.statusCode === 404 && !response.data.success) {
      log('✅ Invalid endpoint correctly rejected', Colors.Green);
    } else {
      log('❌ Invalid endpoint test failed', Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Invalid endpoint test error: ${error.message}`, Colors.Red);
  }
  
  // Test invalid request data
  try {
    log('   Testing invalid tweet data (no message)...', Colors.Cyan);
    const response = await makeRequest('POST', '/api/tweet', {});
    
    if (response.statusCode === 400 && !response.data.success) {
      log('✅ Invalid tweet data correctly rejected', Colors.Green);
      log(`   Error message: ${response.data.error}`, Colors.White);
    } else {
      log('❌ Invalid tweet data test failed', Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Invalid tweet data test error: ${error.message}`, Colors.Red);
  }
}

// Wait function
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main test function
async function runAllTests(): Promise<void> {
  log('🚀 Starting Unified Automation Server Test Suite', Colors.Magenta);
  log('='.repeat(80), Colors.Magenta);
  log(`Testing server at: ${SERVER_URL}`, Colors.White);
  log('', Colors.White);
  
  // Test server connectivity first
  await testServerStatus();
  await wait(1000);
  
  // Test API documentation
  await testApiDocumentation();
  await wait(1000);
  
  // Test error handling
  await testErrorHandling();
  await wait(1000);
  
  log('', Colors.White);
  log('⚠️ The following tests will perform actual actions if browser is connected:', Colors.Yellow);
  log('   - Tweet posting', Colors.Yellow);
  log('   - Like operations', Colors.Yellow);
  log('   - Comment posting', Colors.Yellow);
  log('   - Retweet operations', Colors.Yellow);
  log('', Colors.White);
  log('Continuing with action tests...', Colors.White);
  log('', Colors.White);
  
  // Test actual functionality (with delays between tests)
  await testTweetPosting();
  await wait(3000); // 3 second delay between tests
  
  await testLikeFunctionality();
  await wait(3000);
  
  await testCommentFunctionality();
  await wait(3000);
  
  await testRetweetFunctionality();
  
  log('', Colors.White);
  log('='.repeat(80), Colors.Magenta);
  log('🏁 Unified Automation Server Test Suite Completed', Colors.Magenta);
  log('='.repeat(80), Colors.Magenta);
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
    case 'tweet':
      await testTweetPosting();
      break;
    case 'like':
      await testLikeFunctionality();
      break;
    case 'comment':
      await testCommentFunctionality();
      break;
    case 'retweet':
      await testRetweetFunctionality();
      break;
    case 'errors':
      await testErrorHandling();
      break;
    case 'all':
      await runAllTests();
      break;
    default:
      console.log('Usage: npm run test-unified [command]');
      console.log('Commands:');
      console.log('  status     - Test server status');
      console.log('  help       - Get API documentation');
      console.log('  tweet      - Test tweet posting');
      console.log('  like       - Test like functionality');
      console.log('  comment    - Test comment functionality');
      console.log('  retweet    - Test retweet functionality');
      console.log('  errors     - Test error handling');
      console.log('  all        - Run all tests (default)');
      break;
  }
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    log(`❌ Test client error: ${error.message}`, Colors.Red);
    process.exit(1);
  });
}

export { 
  makeRequest, 
  testServerStatus, 
  testTweetPosting,
  testLikeFunctionality,
  testCommentFunctionality, 
  testRetweetFunctionality,
  testErrorHandling,
  runAllTests 
};
