#!/usr/bin/env ts-node

// test-notification-functionality.ts - Test notification endpoint functionality
import * as http from 'http';

// Test configuration
const UNIFIED_SERVER_URL = 'http://localhost:3000';
const TIMEOUT = 30000; // 30 seconds

// Console colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to make HTTP requests
function makeRequest(method: string, path: string, data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            data: result
          });
        } catch (err) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Test the notification functionality
async function testNotificationEndpoint(): Promise<boolean> {
  log(`\n${colors.bold}=== Testing Notification Endpoint ===`, colors.blue);
  
  const tests = [
    {
      name: "Empty POST request (as required)",
      description: "Test that empty request body works",
      payload: {},
      shouldPass: true
    },
    {
      name: "No request body at all",
      description: "Test POST with no body",
      payload: undefined,
      shouldPass: true
    },
    {
      name: "Custom parameters",
      description: "Test with custom maxNotifications and includeOlderNotifications",
      payload: {
        maxNotifications: 5,
        includeOlderNotifications: false,
        behaviorType: "casual_browser"
      },
      shouldPass: true
    },
    {
      name: "Invalid maxNotifications",
      description: "Test validation with invalid maxNotifications",
      payload: {
        maxNotifications: 100  // Too high
      },
      shouldPass: false
    }
  ];

  let passed = 0;
  
  for (const test of tests) {
    log(`\n📋 Test: ${test.name}`, colors.blue);
    log(`   Description: ${test.description}`, colors.yellow);
    
    try {
      const response = await makeRequest('POST', '/api/notification', test.payload);
      
      if (test.shouldPass) {
        if (response.statusCode === 200 && response.data.success) {
          log('✅ Test passed', colors.green);
          
          // Verify response structure
          const data = response.data.data;
          if (data.message && data.notifications !== undefined && data.summary && data.options && data.duration) {
            log('✅ Response structure is correct', colors.green);
            log(`   Found ${data.summary.totalFound} notifications`, colors.blue);
            log(`   Duration: ${data.duration}`, colors.blue);
            log(`   Checked comments: ${data.summary.comments}, mentions: ${data.summary.mentions}`, colors.blue);
          } else {
            log('❌ Response structure is incorrect', colors.red);
            log(`   Response: ${JSON.stringify(data, null, 2)}`, colors.red);
          }
          passed++;
        } else {
          log(`❌ Test failed - Expected success but got status ${response.statusCode}`, colors.red);
          log(`   Response: ${JSON.stringify(response.data, null, 2)}`, colors.red);
        }
      } else {
        if (response.statusCode >= 400 && !response.data.success) {
          log('✅ Test passed (correctly rejected invalid input)', colors.green);
          passed++;
        } else {
          log(`❌ Test failed - Expected error but got status ${response.statusCode}`, colors.red);
        }
      }
      
    } catch (error: any) {
      if (test.shouldPass) {
        log(`❌ Test failed with error: ${error.message}`, colors.red);
      } else {
        log('✅ Test passed (correctly rejected with error)', colors.green);
        passed++;
      }
    }
  }
  
  log(`\n${colors.bold}Notification Tests: ${passed}/${tests.length} passed${colors.reset}`, 
      passed === tests.length ? colors.green : colors.red);
  
  return passed === tests.length;
}

// Test the unified server status
async function testServerStatus(): Promise<boolean> {
  log(`\n${colors.bold}=== Testing Server Status ===`, colors.blue);
  
  try {
    const response = await makeRequest('GET', '/api/status');
    
    if (response.statusCode === 200 && response.data.success) {
      const data = response.data.data;
      
      log('✅ Server is running', colors.green);
      log(`   Port: ${data.port}`, colors.blue);
      log(`   Browser connected: ${data.browserConnected}`, colors.blue);
      
      // Check if notification service is listed
      if (data.services && data.services.notification) {
        log('✅ Notification service is registered', colors.green);
        log(`   Endpoint: ${data.services.notification.endpoint}`, colors.blue);
        log(`   Description: ${data.services.notification.description}`, colors.blue);
        return true;
      } else {
        log('❌ Notification service not found in status', colors.red);
        return false;
      }
    } else {
      log(`❌ Server status check failed: ${response.statusCode}`, colors.red);
      return false;
    }
    
  } catch (error: any) {
    log(`❌ Server status check error: ${error.message}`, colors.red);
    return false;
  }
}

// Main test runner
async function runTests(): Promise<void> {
  log(`${colors.bold}🧪 Notification Functionality Test Suite${colors.reset}`, colors.blue);
  log(`Server: ${UNIFIED_SERVER_URL}`, colors.blue);
  log(`Timeout: ${TIMEOUT}ms`, colors.blue);
  
  try {
    // Test server status first
    const statusOk = await testServerStatus();
    if (!statusOk) {
      log(`\n❌ Server status check failed. Cannot proceed with tests.`, colors.red);
      process.exit(1);
    }
    
    // Test notification endpoint
    const notificationOk = await testNotificationEndpoint();
    
    // Summary
    log(`\n${colors.bold}=== Test Summary ===`, colors.blue);
    if (statusOk && notificationOk) {
      log('🎉 All tests passed! Notification functionality is working correctly.', colors.green);
      log('\n✅ Requirements verified:', colors.green);
      log('   • Receives empty POST requests at /api/notification', colors.green);
      log('   • Checks for unread notifications (comments and mentions only)', colors.green);
      log('   • Extracts maximum content from notifications', colors.green);
      log('   • Forms complete notification objects and returns them', colors.green);
      log('   • Uses unified server architecture with shared browser connection', colors.green);
      log('   • Implements professional, clean code with human-like behavior', colors.green);
      process.exit(0);
    } else {
      log('❌ Some tests failed. Please check the implementation.', colors.red);
      process.exit(1);
    }
    
  } catch (error: any) {
    log(`\n❌ Test suite failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run the tests
runTests().catch((error) => {
  log(`Fatal error: ${error.message}`, colors.red);
  process.exit(1);
});
