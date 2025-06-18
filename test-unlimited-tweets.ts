// Test script to verify unlimited tweet count functionality
import * as puppeteer from 'puppeteer-core';
import { getAccountTweets } from './server/account-tweets/account-tweets-fetcher';

async function testUnlimitedTweets() {
  console.log('🧪 Testing Unlimited Tweet Count Feature');
  console.log('=========================================');

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
    
    const testCases = [
      { count: 30, description: 'Default count (30 tweets)' },
      { count: 5, description: 'Small count (5 tweets)' },
      { count: 75, description: 'Large count (75 tweets)' },
      { count: 100, description: 'Very large count (100 tweets)' }
    ];
    
    const testUsername = 'ImranKhanPTI';
    
    for (const testCase of testCases) {
      console.log(`\n📋 ${testCase.description}`);
      console.log(`   Testing @${testUsername} with count: ${testCase.count}`);
      
      const startTime = Date.now();
      const result = await getAccountTweets(browser, {
        username: testUsername,
        count: testCase.count,
        includeReplies: false,
        includeRetweets: true
      });
      const duration = Date.now() - startTime;
      
      console.log(`   Success: ${result.success}`);
      console.log(`   Requested: ${testCase.count} tweets`);
      console.log(`   Fetched: ${result.totalFetched || 0} tweets`);
      console.log(`   Processing Time: ${Math.round(duration / 1000)}s`);
      
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
      } else {
        console.log(`   ✅ Success: Fetched ${result.tweets?.length || 0} tweets`);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Test default behavior (no count specified)
    console.log(`\n📋 Testing default behavior (no count specified)`);
    const defaultResult = await getAccountTweets(browser, {
      username: testUsername,
      includeReplies: false,
      includeRetweets: true
    });
    
    console.log(`   Success: ${defaultResult.success}`);
    console.log(`   Default fetched: ${defaultResult.totalFetched || 0} tweets (should be 30)`);
    
    if (defaultResult.totalFetched === 30 || (defaultResult.tweets && defaultResult.tweets.length <= 30)) {
      console.log(`   ✅ Default count working correctly`);
    } else {
      console.log(`   ⚠️  Default count might not be working as expected`);
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔒 Browser closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testUnlimitedTweets()
    .then(() => {
      console.log('\n🎉 Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { testUnlimitedTweets };
