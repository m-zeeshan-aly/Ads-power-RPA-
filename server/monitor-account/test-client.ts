// test-client.ts - Simple test client for the post URL fetcher
import * as http from 'http';

function makeRequest(hostname: string, port: number, path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port,
      path,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testServer() {
  console.log('🧪 Testing Post URL Fetcher Server...\n');
  
  const hostname = 'localhost';
  const port = 3007;
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Health Check...');
    const health = await makeRequest(hostname, port, '/health');
    console.log('✅ Health:', health.status);
    console.log('');
    
    // Test 2: Get post URL for mzeeshanaly
    console.log('2️⃣ Getting latest post for @mzeeshanaly...');
    const result1 = await makeRequest(hostname, port, '/get-post?username=mzeeshanaly');
    console.log('Response:', JSON.stringify(result1, null, 2));
    console.log('');
    
    // Test 3: Get post URL for different user
    console.log('3️⃣ Getting latest post for @ImranKhanPTI...');
    const result2 = await makeRequest(hostname, port, '/get-post?username=ImranKhanPTI');
    console.log('Response:', JSON.stringify(result2, null, 2));
    console.log('');
    
    // Test 4: Error case - missing username
    console.log('4️⃣ Testing error case (missing username)...');
    const error = await makeRequest(hostname, port, '/get-post');
    console.log('Error response:', JSON.stringify(error, null, 2));
    console.log('');
    
    console.log('✅ All tests completed!');
    console.log('\n📋 Usage:');
    console.log(`curl "http://${hostname}:${port}/get-post?username=mzeeshanaly"`);
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Make sure the server is running:');
    console.log('npm run post-server');
  }
}

testServer().catch(console.error);
