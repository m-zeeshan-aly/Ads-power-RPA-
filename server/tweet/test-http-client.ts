// test-http-client.ts
import * as http from 'http';

const SERVER_URL = 'http://localhost:3001';

// Helper function to make HTTP requests
function makeRequest(path: string, method: string = 'GET', data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVER_URL);
    const postData = data ? JSON.stringify(data) : undefined;
    
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (error) {
          resolve({ body, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Test functions
async function testHealthCheck(): Promise<void> {
  console.log('\n🏥 Testing Health Check...');
  try {
    const response = await makeRequest('/health', 'GET');
    console.log('✅ Health Check Response:', JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('❌ Health Check Failed:', error.message);
  }
}

async function testBasicTweet(): Promise<void> {
  console.log('\n📝 Testing Basic Tweet...');
  try {
    const tweetData = {
      message: 'Hello from the HTTP Tweet Server! This is a test message.',
      hashtags: ['automation', 'testing', 'bot'],
      mentions: []
    };
    
    console.log('Sending tweet data:', JSON.stringify(tweetData, null, 2));
    const response = await makeRequest('/tweet', 'POST', tweetData);
    console.log('✅ Tweet Response:', JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('❌ Basic Tweet Failed:', error.message);
  }
}

async function testTweetWithStringHashtags(): Promise<void> {
  console.log('\n📝 Testing Tweet with String Hashtags...');
  try {
    const tweetData = {
      message: 'Testing with comma-separated hashtags and mentions!',
      hashtags: 'test,automation,comma-separated',
      mentions: 'friend1,friend2'
    };
    
    console.log('Sending tweet data:', JSON.stringify(tweetData, null, 2));
    const response = await makeRequest('/tweet', 'POST', tweetData);
    console.log('✅ Tweet Response:', JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('❌ String Hashtags Tweet Failed:', error.message);
  }
}

async function testInvalidTweet(): Promise<void> {
  console.log('\n❌ Testing Invalid Tweet (no message)...');
  try {
    const tweetData = {
      hashtags: ['test']
      // Missing message
    };
    
    const response = await makeRequest('/tweet', 'POST', tweetData);
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

async function testTooLongTweet(): Promise<void> {
  console.log('\n📏 Testing Tweet Too Long...');
  try {
    const longMessage = 'This is a very long message that exceeds the Twitter character limit. '.repeat(10);
    const tweetData = {
      message: longMessage,
      hashtags: ['verylonghashtag', 'anotherlonghashtag', 'yetanotherlonghashtag']
    };
    
    console.log(`Message length: ${longMessage.length} characters`);
    const response = await makeRequest('/tweet', 'POST', tweetData);
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

async function testApiDocs(): Promise<void> {
  console.log('\n📖 Testing API Documentation...');
  try {
    const response = await makeRequest('/docs', 'GET');
    console.log('✅ API Docs Response:', JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('❌ API Docs Failed:', error.message);
  }
}

// Main test function
async function runTests(): Promise<void> {
  console.log('🤖 HTTP Tweet Server Test Client');
  console.log('================================');
  console.log(`Testing server at: ${SERVER_URL}`);
  
  // Run all tests
  await testHealthCheck();
  await testApiDocs();
  await testInvalidTweet();
  await testTooLongTweet();
  
  console.log('\n⚠️  The following tests will actually post tweets if the server is connected:');
  console.log('   - testBasicTweet()');
  console.log('   - testTweetWithStringHashtags()');
  console.log('\n   Uncomment these lines in the code to run them:');
  
  // Uncomment these lines to actually post tweets:
  // await testBasicTweet();
  // await testTweetWithStringHashtags();
  
  console.log('\n✅ All safe tests completed!');
}

// Example usage functions
function printCurlExamples(): void {
  console.log('\n📋 Example curl commands:');
  console.log('========================');
  
  console.log('\n1. Health Check:');
  console.log(`curl -X GET ${SERVER_URL}/health`);
  
  console.log('\n2. API Documentation:');
  console.log(`curl -X GET ${SERVER_URL}/docs`);
  
  console.log('\n3. Post a simple tweet:');
  console.log(`curl -X POST ${SERVER_URL}/tweet \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"message": "Hello from automation!", "hashtags": ["bot", "test"]}'`);
  
  console.log('\n4. Post with comma-separated hashtags:');
  console.log(`curl -X POST ${SERVER_URL}/tweet \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"message": "Testing with strings", "hashtags": "ai,automation,test", "mentions": "friend1,friend2"}'`);
  
  console.log('\n5. Post with mentions:');
  console.log(`curl -X POST ${SERVER_URL}/tweet \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"message": "Hey everyone!", "mentions": ["user1", "user2"]}'`);
}

// Command line interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--curl-examples') || args.includes('-c')) {
    printCurlExamples();
    return;
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('HTTP Tweet Server Test Client');
    console.log('Usage: ts-node test-http-client.ts [options]');
    console.log('');
    console.log('Options:');
    console.log('  --curl-examples, -c    Show curl command examples');
    console.log('  --help, -h             Show this help message');
    console.log('');
    console.log('Default: Run test suite');
    return;
  }
  
  await runTests();
  printCurlExamples();
}

// Export for potential reuse
export {
  makeRequest,
  testHealthCheck,
  testBasicTweet,
  testTweetWithStringHashtags,
  testInvalidTweet,
  testTooLongTweet,
  testApiDocs
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
