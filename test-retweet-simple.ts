// test-retweet-simple.ts
console.log('Testing retweet server dependencies...');

try {
  console.log('1. Testing generic_retweet_human import...');
  const retweetModule = require('./server/retweet/generic_retweet_human');
  console.log('✅ Successfully imported generic_retweet_human');
  console.log('Available exports:', Object.keys(retweetModule));
  
  console.log('2. Testing http-retweet-server import...');
  const serverModule = require('./server/retweet/http-retweet-server');
  console.log('✅ Successfully imported http-retweet-server');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
