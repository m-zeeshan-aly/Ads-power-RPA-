// retweet-demo.ts
// Demo script showing the Generic Retweet Server with different human behavior types

const http = require('http');

// Server configuration
const SERVER_URL = 'http://localhost:3006';

// Make HTTP request utility
function makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SERVER_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Retweet-Demo-Client/1.0'
      }
    };

    const req = http.request(options, (res: any) => {
      let body = '';
      res.on('data', (chunk: any) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          resolve({ rawBody: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Logging utility
function log(message: string, type: 'INFO' | 'SUCCESS' | 'ERROR' = 'INFO'): void {
  const timestamp = new Date().toISOString();
  const color = type === 'SUCCESS' ? '\x1b[32m' : type === 'ERROR' ? '\x1b[31m' : '\x1b[36m';
  console.log(`${color}[${timestamp}] ${message}\x1b[0m`);
}

// Demo functions
async function demoServerStatus(): Promise<void> {
  log('🔍 Testing server status...');
  try {
    const response = await makeRequest('GET', '/status');
    if (response.success) {
      log('✅ Server is running!', 'SUCCESS');
      log(`   Available behavior types: ${response.data.availableBehaviorTypes.join(', ')}`);
      log(`   Server uptime: ${response.data.uptime} seconds`);
    } else {
      log('❌ Server status check failed', 'ERROR');
    }
  } catch (error: any) {
    log(`❌ Failed to connect to server: ${error.message}`, 'ERROR');
  }
}

async function demoBehaviorTypes(): Promise<void> {
  log('📚 Available Human Behavior Types:');
  
  const behaviors = [
    'casual_browser',
    'focused_poster', 
    'social_engager',
    'quick_poster',
    'thoughtful_writer'
  ];

  for (const behavior of behaviors) {
    log(`   🎭 ${behavior.toUpperCase().replace('_', ' ')}`);
  }
}

async function demoRetweetRequest(behaviorType: string, username: string): Promise<void> {
  log(`🔄 Demo: Retweeting with ${behaviorType} behavior for ${username}...`);
  
  const requestData = {
    username: username,
    behaviorType: behaviorType,
    retweetCount: 1,
    scrollTime: 8000,
    searchInFeed: true,
    visitProfile: true
  };

  log(`   Request: ${JSON.stringify(requestData, null, 2)}`);
  
  // Note: We won't actually send this request in the demo since it requires browser connection
  log('   (This would execute the retweet with the specified behavior pattern)', 'INFO');
}

// Main demo function
async function runDemo(): Promise<void> {
  console.log('🚀 Generic Retweet Server Demo');
  console.log('=' .repeat(50));
  
  // Test server connectivity
  await demoServerStatus();
  console.log('');
  
  // Show available behavior types
  await demoBehaviorTypes();
  console.log('');
  
  // Demo different behavior patterns
  log('🎯 Example Usage with Different Behaviors:');
  console.log('');
  
  await demoRetweetRequest('casual_browser', 'ImranKhanPTI');
  console.log('');
  
  await demoRetweetRequest('quick_poster', 'PTIofficial');
  console.log('');
  
  await demoRetweetRequest('thoughtful_writer', 'ImranKhanPTI');
  console.log('');
  
  log('💡 Key Features:', 'SUCCESS');
  log('   ✅ 5 different human behavior patterns');
  log('   ✅ Flexible targeting (username, search, content, profile URL)');
  log('   ✅ Configurable timing and scroll behavior');
  log('   ✅ Human-like reading, hovering, and clicking patterns');
  log('   ✅ HTTP API compatible with all programming languages');
  
  console.log('');
  console.log('🌐 Server Endpoints:');
  console.log(`   POST ${SERVER_URL}/retweet   - Execute retweet with behavior`);
  console.log(`   GET  ${SERVER_URL}/status    - Check server status`);
  console.log(`   GET  ${SERVER_URL}/help      - API documentation`);
  
  console.log('');
  console.log('Demo completed! The Generic Retweet Server is ready for use.');
}

// Run the demo
runDemo().catch((error) => {
  log(`Demo error: ${error.message}`, 'ERROR');
});
