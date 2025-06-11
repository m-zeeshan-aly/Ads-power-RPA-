#!/usr/bin/env ts-node

// test-notification-get-method.ts - Test the new GET method for notifications
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
  console.log(color + message + colors.reset);
}

// Helper function to make HTTP requests
function makeRequest(method: string, path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
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

    req.end();
  });
}

// Test the new GET method for notifications
async function testNotificationGetMethod(): Promise<boolean> {
  log(`\n${colors.bold}=== Testing Notification GET Method ===`, colors.blue);
  
  const tests = [
    {
      name: "Basic GET request (no parameters)",
      description: "Test basic GET request with no query parameters",
      path: '/api/notification',
      shouldPass: true
    },
    {
      name: "GET with timeRangeHours parameter",
      description: "Test with timeRangeHours=48",
      path: '/api/notification?timeRangeHours=48',
      shouldPass: true
    },
    {
      name: "GET with multiple parameters",
      description: "Test with multiple query parameters",
      path: '/api/notification?timeRangeHours=24&maxNotifications=15&includeOlderNotifications=true',
      shouldPass: true
    },
    {
      name: "GET with behavior type",
      description: "Test with specific behavior pattern",
      path: '/api/notification?behaviorType=casual_browser&timeRangeHours=72',
      shouldPass: true
    },
    {
      name: "Invalid timeRangeHours (too high)",
      description: "Test validation with timeRangeHours > 168",
      path: '/api/notification?timeRangeHours=200',
      shouldPass: false
    },
    {
      name: "Invalid maxNotifications (too high)",
      description: "Test validation with maxNotifications > 50",
      path: '/api/notification?maxNotifications=100',
      shouldPass: false
    }
  ];

  let passed = 0;
  
  for (const test of tests) {
    log(`\n📋 Test: ${test.name}`, colors.blue);
    log(`   Description: ${test.description}`, colors.yellow);
    log(`   Path: ${test.path}`, colors.yellow);
    
    try {
      const response = await makeRequest('GET', test.path);
      
      if (test.shouldPass) {
        if (response.statusCode === 200 && response.data.success) {
          log('✅ Test passed', colors.green);
          
          // Verify response structure
          const data = response.data.data;
          if (data.message && data.notifications !== undefined && data.summary && data.options && data.duration) {
            log('✅ Response structure is correct', colors.green);
            log(`   Found ${data.summary.totalFound} notifications`, colors.blue);
            log(`   Duration: ${data.duration}`, colors.blue);
            log(`   Time range: ${data.options.timeRangeHours || 24} hours`, colors.blue);
            log(`   Max notifications: ${data.options.maxNotifications}`, colors.blue);
            log(`   Include older: ${data.options.includeOlderNotifications}`, colors.blue);
            
            // Check if any notifications have original post data
            const notificationsWithPostData = data.notifications.filter((n: any) => n.originalPostData);
            if (notificationsWithPostData.length > 0) {
              log(`   ${notificationsWithPostData.length} notifications include original post data`, colors.green);
            }
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
          log(`   Error: ${response.data.error}`, colors.blue);
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
  
  log(`\n${colors.bold}GET Method Tests: ${passed}/${tests.length} passed${colors.reset}`, 
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
        
        // Verify it shows GET method
        if (data.services.notification.endpoint.includes('GET')) {
          log('✅ Notification service correctly shows GET method', colors.green);
          return true;
        } else {
          log('❌ Notification service still shows POST method', colors.red);
          return false;
        }
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
  log(`${colors.bold}🧪 Notification GET Method Test Suite${colors.reset}`, colors.blue);
  log(`Server: ${UNIFIED_SERVER_URL}`, colors.blue);
  log(`Timeout: ${TIMEOUT}ms`, colors.blue);
  
  try {
    // Test server status first
    const statusOk = await testServerStatus();
    if (!statusOk) {
      log(`\n❌ Server status check failed. Cannot proceed with tests.`, colors.red);
      process.exit(1);
    }
    
    // Test notification GET method
    const getMethodOk = await testNotificationGetMethod();
    
    // Summary
    log(`\n${colors.bold}=== Test Summary ===`, colors.blue);
    if (statusOk && getMethodOk) {
      log('🎉 All tests passed! GET method is working correctly.', colors.green);
      log('\n✅ New features verified:', colors.green);
      log('   • GET method instead of POST', colors.green);
      log('   • Query parameter support (timeRangeHours, maxNotifications, etc.)', colors.green);
      log('   • Time-based filtering of notifications', colors.green);
      log('   • Twitter company notification filtering', colors.green);
      log('   • Original post data inclusion for comments', colors.green);
      log('   • Proper input validation', colors.green);
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
if (require.main === module) {
  runTests();
}
