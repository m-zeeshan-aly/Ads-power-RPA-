// test-account-tweets-quick.ts - Quick test for account tweets fetcher
import * as puppeteer from 'puppeteer-core';
import { getAccountTweets } from './server/account-tweets/account-tweets-fetcher';

async function testAccountTweets() {
  console.log('🧪 Testing Account Tweets Fetcher');
  console.log('================================');

  let browser;
  try {
    // Launch browser with basic settings
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    console.log('✅ Browser launched successfully');
    
    // Test with a known account - testing the new unlimited count feature
    const testUsername = 'ImranKhanPTI';
    console.log(`\n📋 Testing with account: @${testUsername}`);
    
    const result = await getAccountTweets(browser, {
      username: testUsername,
      count: 5, // Testing with a small number first
      includeReplies: false,
      includeRetweets: true
    });
    
    console.log('\n📊 Results:');
    console.log(`Success: ${result.success}`);
    console.log(`Total Fetched: ${result.totalFetched || 0}`);
    console.log(`Processing Time: ${result.processingTime}`);
    
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }
    
    if (result.tweets && result.tweets.length > 0) {
      console.log('\n📝 Sample Tweets:');
      result.tweets.slice(0, 3).forEach((tweet, index) => {
        console.log(`\n${index + 1}. Tweet ID: ${tweet.tweetId}`);
        console.log(`   Content: ${tweet.content.substring(0, 100)}...`);
        console.log(`   URL: ${tweet.url}`);
        console.log(`   Engagement: ${tweet.likes} likes, ${tweet.retweets} retweets, ${tweet.replies} replies`);
        console.log(`   Posted: ${tweet.relativeTime}`);
        console.log(`   Is Retweet: ${tweet.isRetweet}`);
      });
    } else {
      console.log('\n❌ No tweets were extracted');
    }
    
  } catch (error: any) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  } finally {
    if (browser) {
      console.log('🔧 Closing browser...');
      await browser.close();
    }
  }
}

// Run the test
testAccountTweets().catch(console.error);
