// test-retweet-client.ts
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

// Configuration
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const SERVER_PORT = Number(process.env.SERVER_PORT) || 3006;
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
    const fullUrl = `${SERVER_URL}${endpoint}`;
    const parsedUrl = url.parse(fullUrl);
    
    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Generic-Retweet-Test-Client/1.0'
      }
    };

    const requestModule = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = requestModule.request(options, (res) => {
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
        } catch (parseError) {
          resolve({
            statusCode: res.statusCode || 0,
            data: { raw: responseData }
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    if (data && (method === 'POST' || method === 'PUT')) {
      const jsonData = JSON.stringify(data);
      req.write(jsonData);
    }

    req.end();
  });
}

// Test server status
async function testServerStatus(): Promise<void> {
  log('Testing server status...', Colors.Blue);
  
  try {
    const response = await makeRequest('GET', '/status');
    
    if (response.statusCode === 200) {
      log('✅ Server status check passed', Colors.Green);
      log(`Server uptime: ${response.data.data.uptime} seconds`, Colors.Cyan);
      log(`Browser status: ${response.data.data.browser.status}`, Colors.Cyan);
      log(`Available behavior types: ${response.data.data.behaviorTypes.join(', ')}`, Colors.Cyan);
    } else {
      log(`❌ Server status check failed with status ${response.statusCode}`, Colors.Red);
      log(JSON.stringify(response.data, null, 2), Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Server status check error: ${error.message}`, Colors.Red);
  }
}

// Test API documentation
async function testApiDocumentation(): Promise<void> {
  log('Testing API documentation...', Colors.Blue);
  
  try {
    const response = await makeRequest('GET', '/help');
    
    if (response.statusCode === 200) {
      log('✅ API documentation retrieved successfully', Colors.Green);
      log(`API Title: ${response.data.data.title}`, Colors.Cyan);
      log(`Available endpoints: ${Object.keys(response.data.data.endpoints).join(', ')}`, Colors.Cyan);
    } else {
      log(`❌ API documentation failed with status ${response.statusCode}`, Colors.Red);
      log(JSON.stringify(response.data, null, 2), Colors.Red);
    }
  } catch (error: any) {
    log(`❌ API documentation error: ${error.message}`, Colors.Red);
  }
}

// Test retweet by username
async function testRetweetByUsername(): Promise<void> {
  log('Testing retweet by username...', Colors.Blue);
  
  const testData = {
    username: 'ImranKhanPTI',
    retweetCount: 1,
    behaviorType: 'focused_poster',
    scrollTime: 5000
  };
  
  try {
    log(`Sending retweet request: ${JSON.stringify(testData, null, 2)}`, Colors.Yellow);
    
    const response = await makeRequest('POST', '/retweet', testData);
    
    if (response.statusCode === 200) {
      log('✅ Retweet by username test passed', Colors.Green);
      log(`Duration: ${response.data.data.duration}ms`, Colors.Cyan);
      log(`Behavior used: ${response.data.data.retweetInput.behaviorType}`, Colors.Cyan);
    } else {
      log(`❌ Retweet by username test failed with status ${response.statusCode}`, Colors.Red);
      log(JSON.stringify(response.data, null, 2), Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Retweet by username test error: ${error.message}`, Colors.Red);
  }
}

// Test retweet by search query
async function testRetweetBySearchQuery(): Promise<void> {
  log('Testing retweet by search query...', Colors.Blue);
  
  const testData = {
    searchQuery: 'Pakistan politics',
    retweetCount: 1,
    behaviorType: 'casual_browser',
    scrollTime: 8000,
    searchInFeed: true
  };
  
  try {
    log(`Sending retweet request: ${JSON.stringify(testData, null, 2)}`, Colors.Yellow);
    
    const response = await makeRequest('POST', '/retweet', testData);
    
    if (response.statusCode === 200) {
      log('✅ Retweet by search query test passed', Colors.Green);
      log(`Duration: ${response.data.data.duration}ms`, Colors.Cyan);
      log(`Search in feed: ${response.data.data.retweetInput.searchInFeed}`, Colors.Cyan);
    } else {
      log(`❌ Retweet by search query test failed with status ${response.statusCode}`, Colors.Red);
      log(JSON.stringify(response.data, null, 2), Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Retweet by search query test error: ${error.message}`, Colors.Red);
  }
}

// Test retweet by profile URL
async function testRetweetByProfileUrl(): Promise<void> {
  log('Testing retweet by profile URL...', Colors.Blue);
  
  const testData = {
    profileUrl: 'https://twitter.com/PTIofficial',
    retweetCount: 1,
    behaviorType: 'social_engager',
    searchInFeed: false,
    visitProfile: true
  };
  
  try {
    log(`Sending retweet request: ${JSON.stringify(testData, null, 2)}`, Colors.Yellow);
    
    const response = await makeRequest('POST', '/retweet', testData);
    
    if (response.statusCode === 200) {
      log('✅ Retweet by profile URL test passed', Colors.Green);
      log(`Duration: ${response.data.data.duration}ms`, Colors.Cyan);
      log(`Visit profile: ${response.data.data.retweetInput.visitProfile}`, Colors.Cyan);
    } else {
      log(`❌ Retweet by profile URL test failed with status ${response.statusCode}`, Colors.Red);
      log(JSON.stringify(response.data, null, 2), Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Retweet by profile URL test error: ${error.message}`, Colors.Red);
  }
}

// Test multiple retweets with different behavior
async function testMultipleRetweetsWithBehavior(): Promise<void> {
  log('Testing multiple retweets with thoughtful behavior...', Colors.Blue);
  
  const testData = {
    username: 'PTIofficial',
    retweetCount: 2,
    behaviorType: 'thoughtful_writer',
    scrollTime: 12000
  };
  
  try {
    log(`Sending retweet request: ${JSON.stringify(testData, null, 2)}`, Colors.Yellow);
    
    const response = await makeRequest('POST', '/retweet', testData);
    
    if (response.statusCode === 200) {
      log('✅ Multiple retweets test passed', Colors.Green);
      log(`Duration: ${response.data.data.duration}ms`, Colors.Cyan);
      log(`Retweet count: ${response.data.data.retweetInput.retweetCount}`, Colors.Cyan);
      log(`Behavior: ${response.data.data.retweetInput.behaviorType}`, Colors.Cyan);
    } else {
      log(`❌ Multiple retweets test failed with status ${response.statusCode}`, Colors.Red);
      log(JSON.stringify(response.data, null, 2), Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Multiple retweets test error: ${error.message}`, Colors.Red);
  }
}

// Test quick poster behavior
async function testQuickPosterBehavior(): Promise<void> {
  log('Testing quick poster behavior...', Colors.Blue);
  
  const testData = {
    username: 'ImranKhanPTI',
    retweetCount: 1,
    behaviorType: 'quick_poster',
    scrollTime: 3000
  };
  
  try {
    log(`Sending retweet request: ${JSON.stringify(testData, null, 2)}`, Colors.Yellow);
    
    const response = await makeRequest('POST', '/retweet', testData);
    
    if (response.statusCode === 200) {
      log('✅ Quick poster behavior test passed', Colors.Green);
      log(`Duration: ${response.data.data.duration}ms`, Colors.Cyan);
      log(`Behavior: ${response.data.data.retweetInput.behaviorType}`, Colors.Cyan);
    } else {
      log(`❌ Quick poster behavior test failed with status ${response.statusCode}`, Colors.Red);
      log(JSON.stringify(response.data, null, 2), Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Quick poster behavior test error: ${error.message}`, Colors.Red);
  }
}

// Test validation errors
async function testValidationErrors(): Promise<void> {
  log('Testing validation errors...', Colors.Blue);
  
  const invalidTests = [
    {
      name: 'Empty data',
      data: {}
    },
    {
      name: 'Invalid behavior type',
      data: {
        username: 'test',
        behaviorType: 'invalid_behavior'
      }
    },
    {
      name: 'Invalid retweet count',
      data: {
        username: 'test',
        retweetCount: 20
      }
    },
    {
      name: 'Invalid scroll time',
      data: {
        username: 'test',
        scrollTime: 100000
      }
    }
  ];
  
  for (const test of invalidTests) {
    try {
      log(`Testing validation: ${test.name}`, Colors.Yellow);
      
      const response = await makeRequest('POST', '/retweet', test.data);
      
      if (response.statusCode === 400) {
        log(`✅ Validation test "${test.name}" passed (correctly rejected)`, Colors.Green);
      } else {
        log(`❌ Validation test "${test.name}" failed (should have been rejected)`, Colors.Red);
        log(JSON.stringify(response.data, null, 2), Colors.Red);
      }
    } catch (error: any) {
      log(`❌ Validation test "${test.name}" error: ${error.message}`, Colors.Red);
    }
  }
}

// Test route not found
async function testRouteNotFound(): Promise<void> {
  log('Testing route not found...', Colors.Blue);
  
  try {
    const response = await makeRequest('GET', '/nonexistent');
    
    if (response.statusCode === 404) {
      log('✅ Route not found test passed', Colors.Green);
    } else {
      log(`❌ Route not found test failed with status ${response.statusCode}`, Colors.Red);
      log(JSON.stringify(response.data, null, 2), Colors.Red);
    }
  } catch (error: any) {
    log(`❌ Route not found test error: ${error.message}`, Colors.Red);
  }
}

// Wait function
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main test function
async function runAllTests(): Promise<void> {
  log('🧪 Starting Generic Retweet Server Test Suite', Colors.Magenta);
  log('='.repeat(60), Colors.Magenta);
  log(`Testing server at: ${SERVER_URL}`, Colors.Cyan);
  log('='.repeat(60), Colors.Magenta);
  
  try {
    // Basic tests
    await testServerStatus();
    await wait(1000);
    
    await testApiDocumentation();
    await wait(1000);
    
    await testRouteNotFound();
    await wait(1000);
    
    await testValidationErrors();
    await wait(2000);
    
    // Retweet functionality tests (comment out if testing without browser)
    log('Starting retweet functionality tests...', Colors.Yellow);
    log('⚠️  These tests require a valid browser connection and may take time', Colors.Yellow);
    
    // Uncomment these tests when you have a browser connected:
    /*
    await testRetweetByUsername();
    await wait(5000);
    
    await testRetweetBySearchQuery();
    await wait(5000);
    
    await testRetweetByProfileUrl();
    await wait(5000);
    
    await testQuickPosterBehavior();
    await wait(5000);
    
    await testMultipleRetweetsWithBehavior();
    */
    
    log('⚠️  Retweet functionality tests are commented out', Colors.Yellow);
    log('   Uncomment them in the test file to run with a connected browser', Colors.Yellow);
    
  } catch (error: any) {
    log(`❌ Test suite error: ${error.message}`, Colors.Red);
  }
  
  log('='.repeat(60), Colors.Magenta);
  log('🏁 Test Suite Completed', Colors.Magenta);
  log('='.repeat(60), Colors.Magenta);
}

// Command line interface
function showUsage(): void {
  console.log(`
Usage: node test-retweet-client.js [command]

Commands:
  test              Run all tests
  status            Check server status only
  help              Show API documentation
  retweet-username  Test retweet by username
  retweet-query     Test retweet by search query
  retweet-profile   Test retweet by profile URL
  quick-test        Test quick poster behavior
  multi-test        Test multiple retweets
  validation        Test validation errors only

Environment Variables:
  SERVER_HOST       Server hostname (default: localhost)
  SERVER_PORT       Server port (default: 3003)

Examples:
  node test-retweet-client.js test
  SERVER_PORT=3003 node test-retweet-client.js status
  `);
}

// Parse command line arguments
const command = process.argv[2] || 'test';

async function main(): Promise<void> {
  switch (command) {
    case 'test':
      await runAllTests();
      break;
    case 'status':
      await testServerStatus();
      break;
    case 'help':
      await testApiDocumentation();
      break;
    case 'retweet-username':
      await testRetweetByUsername();
      break;
    case 'retweet-query':
      await testRetweetBySearchQuery();
      break;
    case 'retweet-profile':
      await testRetweetByProfileUrl();
      break;
    case 'quick-test':
      await testQuickPosterBehavior();
      break;
    case 'multi-test':
      await testMultipleRetweetsWithBehavior();
      break;
    case 'validation':
      await testValidationErrors();
      break;
    default:
      log(`Unknown command: ${command}`, Colors.Red);
      showUsage();
      process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main().catch((error) => {
    log(`Test runner error: ${error.message}`, Colors.Red);
    process.exit(1);
  });
}
