// test-account-tweets-client.ts - Test client for the account tweets fetcher
import * as http from 'http';

const SERVER_URL = 'http://localhost:3008';

// Utility function to make HTTP requests
function makeRequest(options: any, data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: response });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAccountTweetsFetcher() {
  console.log('🧪 Testing Account Tweets Fetcher Service');
  console.log('==========================================');

  try {
    // Test 1: Health Check
    console.log('\n📋 Test 1: Health Check');
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3008,
      path: '/health',
      method: 'GET'
    });
    console.log(`Status: ${healthResponse.statusCode}`);
    console.log('Response:', JSON.stringify(healthResponse.data, null, 2));

    // Test 2: Get Help Documentation
    console.log('\n📋 Test 2: API Documentation');
    const helpResponse = await makeRequest({
      hostname: 'localhost',
      port: 3008,
      path: '/help',
      method: 'GET'
    });
    console.log(`Status: ${helpResponse.statusCode}`);
    console.log('Available endpoints:', Object.keys(helpResponse.data.data?.endpoints || {}));

    // Test 3: Fetch tweets using POST (Full request)
    console.log('\n📋 Test 3: Fetch tweets via POST method');
    const postData = {
      username: 'elonmusk',
      count: 10,
      includeReplies: false,
      includeRetweets: true
    };
    
    const postResponse = await makeRequest({
      hostname: 'localhost',
      port: 3008,
      path: '/fetch-tweets',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, postData);
    
    console.log(`Status: ${postResponse.statusCode}`);
    if (postResponse.data.success) {
      console.log(`✅ Successfully fetched ${postResponse.data.totalFetched} tweets from @${postResponse.data.username}`);
      console.log(`Processing time: ${postResponse.data.processingTime}`);
      
      if (postResponse.data.tweets && postResponse.data.tweets.length > 0) {
        const firstTweet = postResponse.data.tweets[0];
        console.log('\n📝 Sample tweet data:');
        console.log(`- ID: ${firstTweet.tweetId}`);
        console.log(`- Content: ${firstTweet.content.substring(0, 100)}...`);
        console.log(`- Likes: ${firstTweet.likes}, Retweets: ${firstTweet.retweets}, Replies: ${firstTweet.replies}`);
        console.log(`- Posted: ${firstTweet.relativeTime}`);
        console.log(`- URL: ${firstTweet.url}`);
        console.log(`- Media: ${firstTweet.mediaCount} attachments`);
        console.log(`- Hashtags: [${firstTweet.hashtags.join(', ')}]`);
        console.log(`- Mentions: [${firstTweet.mentions.join(', ')}]`);
      }
    } else {
      console.log(`❌ Failed to fetch tweets: ${postResponse.data.error}`);
    }

    // Test 4: Fetch tweets using GET (Quick request)
    console.log('\n📋 Test 4: Fetch tweets via GET method');
    const getResponse = await makeRequest({
      hostname: 'localhost',
      port: 3008,
      path: '/get-tweets?username=ImranKhanPTI&count=5&includeReplies=false',
      method: 'GET'
    });
    
    console.log(`Status: ${getResponse.statusCode}`);
    if (getResponse.data.success) {
      console.log(`✅ Successfully fetched ${getResponse.data.totalFetched} tweets from @${getResponse.data.username}`);
      console.log(`Processing time: ${getResponse.data.processingTime}`);
    } else {
      console.log(`❌ Failed to fetch tweets: ${getResponse.data.error}`);
    }

    // Test 5: Error handling - Invalid username
    console.log('\n📋 Test 5: Error handling - Invalid request');
    const errorResponse = await makeRequest({
      hostname: 'localhost',
      port: 3008,
      path: '/fetch-tweets',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { count: 10 }); // Missing username
    
    console.log(`Status: ${errorResponse.statusCode}`);
    console.log(`Expected error response: ${errorResponse.data.error}`);

    // Test 6: Test with different account
    console.log('\n📋 Test 6: Test with different account (PTI Official)');
    const ptiResponse = await makeRequest({
      hostname: 'localhost',
      port: 3008,
      path: '/get-tweets?username=PTIofficial&count=8',
      method: 'GET'
    });
    
    console.log(`Status: ${ptiResponse.statusCode}`);
    if (ptiResponse.data.success) {
      console.log(`✅ Successfully fetched ${ptiResponse.data.totalFetched} tweets from @${ptiResponse.data.username}`);
      
      // Show tweet types
      const tweets = ptiResponse.data.tweets || [];
      const retweets = tweets.filter((t: any) => t.isRetweet).length;
      const regularTweets = tweets.length - retweets;
      console.log(`- Regular tweets: ${regularTweets}, Retweets: ${retweets}`);
      
      // Show engagement stats
      const totalLikes = tweets.reduce((sum: number, t: any) => sum + t.likes, 0);
      const totalRetweets = tweets.reduce((sum: number, t: any) => sum + t.retweets, 0);
      console.log(`- Total engagement: ${totalLikes} likes, ${totalRetweets} retweets`);
    } else {
      console.log(`❌ Failed to fetch tweets: ${ptiResponse.data.error}`);
    }

    console.log('\n🎉 Testing completed!');
    console.log('==========================================');

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    console.log('Make sure the Account Tweets server is running on port 3008');
    console.log('Start it with: npm run account-tweets-server');
  }
}

// Run tests
testAccountTweetsFetcher();
