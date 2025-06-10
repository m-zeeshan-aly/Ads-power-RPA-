// test-server.ts
import * as http from 'http';

// Configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 3000;
const BASE_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

// Logging utility
function logWithTimestamp(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Make HTTP request utility
function makeRequest(
  method: string, 
  path: string, 
  data?: any
): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Tweet-Server-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode || 0,
            data: parsedData
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error}`));
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

// Test functions
async function testHealthCheck(): Promise<boolean> {
  logWithTimestamp('Testing health check endpoint...');
  
  try {
    const response = await makeRequest('GET', '/health');
    
    if (response.statusCode === 200 && response.data.success) {
      logWithTimestamp('✅ Health check passed');
      logWithTimestamp(`   Browser status: ${response.data.data.browser}`);
      logWithTimestamp(`   Uptime: ${response.data.data.uptime}s`);
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

async function testApiInfo(): Promise<boolean> {
  logWithTimestamp('Testing API info endpoint...');
  
  try {
    const response = await makeRequest('GET', '/');
    
    if (response.statusCode === 200 && response.data.success) {
      logWithTimestamp('✅ API info endpoint works');
      logWithTimestamp(`   API Name: ${response.data.data.name}`);
      logWithTimestamp(`   Version: ${response.data.data.version}`);
      return true;
    } else {
      logWithTimestamp('❌ API info endpoint failed');
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ API info error: ${error.message}`);
    return false;
  }
}

async function testInvalidEndpoint(): Promise<boolean> {
  logWithTimestamp('Testing invalid endpoint (should return 404)...');
  
  try {
    const response = await makeRequest('GET', '/invalid-endpoint');
    
    if (response.statusCode === 404) {
      logWithTimestamp('✅ 404 handling works correctly');
      return true;
    } else {
      logWithTimestamp('❌ 404 handling failed');
      logWithTimestamp(`   Expected 404, got ${response.statusCode}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Invalid endpoint test error: ${error.message}`);
    return false;
  }
}

async function testInvalidMethod(): Promise<boolean> {
  logWithTimestamp('Testing invalid method on /tweet (should return 405)...');
  
  try {
    const response = await makeRequest('GET', '/tweet');
    
    if (response.statusCode === 405) {
      logWithTimestamp('✅ Method validation works correctly');
      return true;
    } else {
      logWithTimestamp('❌ Method validation failed');
      logWithTimestamp(`   Expected 405, got ${response.statusCode}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Invalid method test error: ${error.message}`);
    return false;
  }
}

async function testTweetValidation(): Promise<boolean> {
  logWithTimestamp('Testing tweet validation (empty message should fail)...');
  
  try {
    const response = await makeRequest('POST', '/tweet', {
      message: '',
      hashtags: ['test']
    });
    
    if (response.statusCode === 400) {
      logWithTimestamp('✅ Tweet validation works correctly');
      logWithTimestamp(`   Error message: ${response.data.error}`);
      return true;
    } else {
      logWithTimestamp('❌ Tweet validation failed');
      logWithTimestamp(`   Expected 400, got ${response.statusCode}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Tweet validation test error: ${error.message}`);
    return false;
  }
}

async function testTweetPosting(): Promise<boolean> {
  logWithTimestamp('Testing actual tweet posting...');
  logWithTimestamp('⚠️  This will post a real tweet if browser is connected!');
  
  // Ask for confirmation in a real scenario
  const testTweet = {
    message: `Test tweet from HTTP API - ${new Date().toISOString()}`,
    hashtags: ['automation', 'testing', 'nodejs'],
    mentions: ['api_test']
  };

  try {
    const response = await makeRequest('POST', '/tweet', testTweet);
    
    if (response.statusCode === 200 && response.data.success) {
      logWithTimestamp('✅ Tweet posting successful');
      logWithTimestamp(`   Message: "${testTweet.message}"`);
      return true;
    } else {
      logWithTimestamp('❌ Tweet posting failed');
      logWithTimestamp(`   Status: ${response.statusCode}`);
      logWithTimestamp(`   Error: ${response.data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error: any) {
    logWithTimestamp(`❌ Tweet posting error: ${error.message}`);
    return false;
  }
}

async function checkServerConnection(): Promise<boolean> {
  logWithTimestamp('Checking if server is running...');
  
  try {
    const response = await makeRequest('GET', '/health');
    return response.statusCode === 200;
  } catch (error: any) {
    logWithTimestamp(`❌ Cannot connect to server: ${error.message}`);
    logWithTimestamp(`   Make sure the server is running on ${BASE_URL}`);
    logWithTimestamp(`   Start it with: npm run server`);
    return false;
  }
}

// Main test function
async function runTests(): Promise<void> {
  logWithTimestamp('='.repeat(60));
  logWithTimestamp('🧪 Tweet Server Test Suite');
  logWithTimestamp('='.repeat(60));
  logWithTimestamp(`Testing server at: ${BASE_URL}`);
  logWithTimestamp('');

  // Check if server is running
  const isServerRunning = await checkServerConnection();
  if (!isServerRunning) {
    logWithTimestamp('');
    logWithTimestamp('❌ Cannot proceed with tests - server not accessible');
    process.exit(1);
  }

  logWithTimestamp('');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'API Info', fn: testApiInfo },
    { name: 'Invalid Endpoint (404)', fn: testInvalidEndpoint },
    { name: 'Invalid Method (405)', fn: testInvalidMethod },
    { name: 'Tweet Validation', fn: testTweetValidation },
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  // Run basic tests
  for (const test of tests) {
    logWithTimestamp(`Running ${test.name} test...`);
    const passed = await test.fn();
    if (passed) passedTests++;
    logWithTimestamp('');
  }

  // Ask about tweet posting test
  logWithTimestamp('⚠️  WARNING: The next test will post a real tweet!');
  logWithTimestamp('   Only run this if you want to test actual posting.');
  logWithTimestamp('   Skipping for safety in automated testing.');
  logWithTimestamp('');
  logWithTimestamp('   To test tweet posting manually:');
  logWithTimestamp('   curl -X POST http://localhost:3000/tweet \\');
  logWithTimestamp('     -H "Content-Type: application/json" \\');
  logWithTimestamp('     -d \'{"message":"Test tweet","hashtags":["test"]}\'');
  logWithTimestamp('');

  // Summary
  logWithTimestamp('='.repeat(60));
  logWithTimestamp('📊 Test Results Summary');
  logWithTimestamp('='.repeat(60));
  logWithTimestamp(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    logWithTimestamp('✅ All tests passed! Server is working correctly.');
  } else {
    logWithTimestamp(`❌ ${totalTests - passedTests} test(s) failed. Check the logs above.`);
  }
  
  logWithTimestamp('');
  logWithTimestamp('Server endpoints:');
  logWithTimestamp(`  GET  ${BASE_URL}/        - API info`);
  logWithTimestamp(`  GET  ${BASE_URL}/health  - Health check`);
  logWithTimestamp(`  POST ${BASE_URL}/tweet   - Post tweet`);
  logWithTimestamp('='.repeat(60));
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch((error) => {
    logWithTimestamp(`Test suite error: ${error.message}`);
    process.exit(1);
  });
}
