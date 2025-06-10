// example-usage.ts
// Example usage of the Tweet Posting API

import * as http from 'http';

// Server configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 3000;

// Logging utility
function logWithTimestamp(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// API client function
function postTweet(tweetData: {
  message: string;
  hashtags?: string[];
  mentions?: string[];
}): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(tweetData);
    
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/tweet',
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

// Example usage scenarios
async function runExamples(): Promise<void> {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('📝 Tweet API Usage Examples');
  logWithTimestamp('='.repeat(50));

  // Example 1: Simple tweet
  try {
    logWithTimestamp('Example 1: Simple tweet message');
    const response1 = await postTweet({
      message: 'Hello world! This is a test from the API.'
    });
    logWithTimestamp('✅ Simple tweet posted successfully');
    logWithTimestamp(`   Response: ${JSON.stringify(response1.data, null, 2)}`);
  } catch (error: any) {
    logWithTimestamp(`❌ Simple tweet failed: ${error.message}`);
  }

  logWithTimestamp('');

  // Example 2: Tweet with hashtags
  try {
    logWithTimestamp('Example 2: Tweet with hashtags');
    const response2 = await postTweet({
      message: 'Check out this amazing automation system!',
      hashtags: ['automation', 'nodejs', 'twitter', 'api']
    });
    logWithTimestamp('✅ Tweet with hashtags posted successfully');
  } catch (error: any) {
    logWithTimestamp(`❌ Tweet with hashtags failed: ${error.message}`);
  }

  logWithTimestamp('');

  // Example 3: Tweet with mentions
  try {
    logWithTimestamp('Example 3: Tweet with mentions');
    const response3 = await postTweet({
      message: 'Thanks for the inspiration!',
      mentions: ['nodejs', 'github']
    });
    logWithTimestamp('✅ Tweet with mentions posted successfully');
  } catch (error: any) {
    logWithTimestamp(`❌ Tweet with mentions failed: ${error.message}`);
  }

  logWithTimestamp('');

  // Example 4: Complete tweet with message, hashtags, and mentions
  try {
    logWithTimestamp('Example 4: Complete tweet (message + hashtags + mentions)');
    const response4 = await postTweet({
      message: 'Just launched a new feature! The community support has been incredible.',
      hashtags: ['opensource', 'community', 'launch'],
      mentions: ['supporters', 'developers']
    });
    logWithTimestamp('✅ Complete tweet posted successfully');
  } catch (error: any) {
    logWithTimestamp(`❌ Complete tweet failed: ${error.message}`);
  }

  logWithTimestamp('');

  // Example 5: Error handling - empty message
  try {
    logWithTimestamp('Example 5: Error handling (empty message)');
    await postTweet({
      message: '',
      hashtags: ['test']
    });
    logWithTimestamp('❌ This should have failed!');
  } catch (error: any) {
    logWithTimestamp('✅ Error handling works correctly');
    logWithTimestamp(`   Error: ${error.message}`);
  }

  logWithTimestamp('');

  // Example 6: Error handling - too long message
  try {
    logWithTimestamp('Example 6: Error handling (message too long)');
    const longMessage = 'A'.repeat(300); // 300 characters
    await postTweet({
      message: longMessage,
      hashtags: ['toolong']
    });
    logWithTimestamp('❌ This should have failed!');
  } catch (error: any) {
    logWithTimestamp('✅ Length validation works correctly');
    logWithTimestamp(`   Error: ${error.message}`);
  }

  logWithTimestamp('');
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('Examples completed!');
  logWithTimestamp('='.repeat(50));
}

// n8n Integration Example
function printN8nExample(): void {
  logWithTimestamp('');
  logWithTimestamp('🔗 n8n Integration Example:');
  logWithTimestamp('');
  logWithTimestamp('1. Add an HTTP Request node in n8n');
  logWithTimestamp('2. Configure it as follows:');
  logWithTimestamp('   - Method: POST');
  logWithTimestamp('   - URL: http://localhost:3000/tweet');
  logWithTimestamp('   - Headers: Content-Type = application/json');
  logWithTimestamp('   - Body (JSON):');
  logWithTimestamp('     {');
  logWithTimestamp('       "message": "{{ $json.message }}",');
  logWithTimestamp('       "hashtags": {{ $json.hashtags || "[]" }},');
  logWithTimestamp('       "mentions": {{ $json.mentions || "[]" }}');
  logWithTimestamp('     }');
  logWithTimestamp('');
}

// curl Examples
function printCurlExamples(): void {
  logWithTimestamp('📡 curl Examples:');
  logWithTimestamp('');
  logWithTimestamp('# Simple tweet:');
  logWithTimestamp('curl -X POST http://localhost:3000/tweet \\');
  logWithTimestamp('  -H "Content-Type: application/json" \\');
  logWithTimestamp('  -d \'{"message":"Hello from curl!"}\'');
  logWithTimestamp('');
  logWithTimestamp('# Tweet with hashtags and mentions:');
  logWithTimestamp('curl -X POST http://localhost:3000/tweet \\');
  logWithTimestamp('  -H "Content-Type: application/json" \\');
  logWithTimestamp('  -d \'{');
  logWithTimestamp('    "message":"Amazing automation tool!",');
  logWithTimestamp('    "hashtags":["automation","api"],');
  logWithTimestamp('    "mentions":["developers"]');
  logWithTimestamp('  }\'');
  logWithTimestamp('');
  logWithTimestamp('# Health check:');
  logWithTimestamp('curl http://localhost:3000/health');
  logWithTimestamp('');
}

// Main function
async function main(): Promise<void> {
  // Check if server is running first
  try {
    await postTweet({ message: 'connection-test' });
  } catch (error: any) {
    if (error.message.includes('ECONNREFUSED')) {
      logWithTimestamp('❌ Cannot connect to the server!');
      logWithTimestamp('   Make sure the server is running:');
      logWithTimestamp('   npm run server');
      logWithTimestamp('');
      process.exit(1);
    }
  }

  // Run examples
  await runExamples();
  
  // Show integration examples
  printN8nExample();
  printCurlExamples();
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    logWithTimestamp(`Example error: ${error.message}`);
    process.exit(1);
  });
}

export { postTweet };
