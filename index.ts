import { chromium, Browser, Page } from 'playwright';
import * as puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Create a logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'debug_logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Helper function to log with timestamps
function logWithTimestamp(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(path.join(logsDir, 'automation.log'), logMessage + '\n');
}

// Load environment variables from .env file
dotenv.config();

// Helper function to set a timeout for a promise
function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  }).catch((error) => {
    clearTimeout(timeoutHandle);
    throw error;
  });
}

// Function to get a fresh WebSocket URL from AdsPower API
async function getFreshWebSocketUrl(): Promise<string> {
  try {
    logWithTimestamp('Requesting fresh WebSocket URL from AdsPower API...');
    
    // AdsPower seems to be using port 50325 for its API based on the process list
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch('http://127.0.0.1:50325/api/v1/browser/start?user_id=kywy1tc', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    logWithTimestamp(`API Response: ${JSON.stringify(data).substring(0, 100)}...`);
    
    // For Puppeteer, use puppeteer URL
    if (data.code === 0 && data.msg === 'success' && data.data.ws.puppeteer) {
      const wsUrl = data.data.ws.puppeteer;
      logWithTimestamp(`Got fresh Puppeteer WebSocket URL: ${wsUrl.substring(0, 30)}...`);
      
      // Update the .env file with the new URL
      fs.writeFileSync(path.join(__dirname, '.env'), `WS_ENDPOINT=${wsUrl}`);
      logWithTimestamp('Updated .env file with new WebSocket URL');
      
      return wsUrl;
    } else {
      throw new Error(`Failed to get WebSocket URL: ${JSON.stringify(data)}`);
    }
  } catch (error: any) {
    logWithTimestamp(`Error getting fresh WebSocket URL: ${error.message}`);
    throw error;
  }
}

// Function to ensure Puppeteer connection first
async function connectWithPuppeteer(): Promise<puppeteer.Browser> {
  logWithTimestamp('Ensuring connection to browser with Puppeteer...');
  
  try {
    // First try reading the .env file manually to ensure we get the latest value
    let wsEndpoint: string;
    try {
      const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      const wsMatch = envContent.match(/WS_ENDPOINT=(.+)/);
      wsEndpoint = wsMatch ? wsMatch[1].trim() : '';
      if (wsEndpoint) {
        logWithTimestamp(`Found WebSocket endpoint in .env: ${wsEndpoint.substring(0, 30)}...`);
      }
    } catch (err: any) {
      logWithTimestamp(`Could not read .env file directly: ${err.message}`);
      wsEndpoint = process.env.WS_ENDPOINT || '';
    }
    
    if (!wsEndpoint || wsEndpoint.trim() === '') {
      logWithTimestamp('No WebSocket URL found in .env file, requesting a fresh one');
      wsEndpoint = await getFreshWebSocketUrl();
    }
    
    logWithTimestamp(`Attempting to connect with Puppeteer using WebSocket URL: ${wsEndpoint.substring(0, 30)}...`);
    
    try {
      // Try to connect with the current WebSocket URL with extended timeout
      const browser = await promiseWithTimeout(
        puppeteer.connect({ 
          browserWSEndpoint: wsEndpoint,
          defaultViewport: null
        }),
        30000, // 30 second timeout
        'Connection to browser timed out with the current WebSocket URL'
      );
      
      // Test if the connection is actually working
      logWithTimestamp('Testing Puppeteer browser connection...');
      await browser.version();
      logWithTimestamp('Puppeteer connection test successful');
      return browser;
    } catch (error: any) {
      logWithTimestamp(`Initial Puppeteer connection failed: ${error.message || 'Unknown error'}`);
      logWithTimestamp('Getting a fresh WebSocket URL...');
      
      // If connection fails, request a fresh WebSocket URL
      wsEndpoint = await getFreshWebSocketUrl();
      
      // Try again with the fresh WebSocket URL
      logWithTimestamp(`Attempting to connect again with fresh URL: ${wsEndpoint.substring(0, 30)}...`);
      return await promiseWithTimeout(
        puppeteer.connect({ 
          browserWSEndpoint: wsEndpoint,
          defaultViewport: null
        }),
        30000, // 30 second timeout for the second attempt
        'Connection to browser timed out even with a fresh WebSocket URL'
      );
    }
  } catch (error: any) {
    logWithTimestamp(`Failed to establish Puppeteer connection after multiple attempts: ${error.message}`);
    throw error;
  }
}

// Main function
(async () => {
  logWithTimestamp('Script started');
  let puppeteerBrowser: puppeteer.Browser | null = null;
  
  try {
    // First connect with Puppeteer to ensure we can access the browser
    puppeteerBrowser = await connectWithPuppeteer();
    logWithTimestamp('Puppeteer browser connection established');
    const version = await puppeteerBrowser.version();
    logWithTimestamp(`Browser version via Puppeteer: ${version}`);
    
    // Get the first page from Puppeteer
    const puppeteerPages = await puppeteerBrowser.pages();
    if (puppeteerPages.length === 0) {
      throw new Error('No pages found in Puppeteer browser');
    }
    
    // Get the current page's URL - we'll use this when connecting with Playwright
    const currentUrl = await puppeteerPages[0].url();
    logWithTimestamp(`Current page URL: ${currentUrl}`);
    
    // For Playwright, we need to create a new browser using the endpoint from Puppeteer
    // Create a temporary file with CDP port info that Playwright can use
    const endpoint = await puppeteerBrowser.wsEndpoint();
    const cdpEndpoint = endpoint;
    logWithTimestamp(`Using CDP endpoint for Playwright: ${cdpEndpoint}`);
    
    // Now launch Playwright using the same CDP endpoint
    const browser: Browser = await chromium.connectOverCDP(cdpEndpoint);
    logWithTimestamp('Playwright connection established through CDP');
    logWithTimestamp(`Playwright browser version: ${await browser.version()}`);
  
    logWithTimestamp('Retrieving browser contexts...');
    const contexts = await browser.contexts();
    logWithTimestamp(`Found ${contexts.length} browser contexts`);
    if (!contexts.length) {
      throw new Error('No browser contexts found');
    }
    
    logWithTimestamp('Retrieving pages from first context...');
    const pages: Page[] = await contexts[0].pages();
    logWithTimestamp(`Found ${pages.length} pages`);
    if (!pages.length) {
      throw new Error('No pages found in the browser context');
    }
    
    const page = pages[0]; // Use the first opened page/tab
    logWithTimestamp(`Current URL: ${await page.url()}`);
    logWithTimestamp(`Page title: ${await page.title()}`);
    
    // Take a screenshot of initial state
    await page.screenshot({ path: path.join(logsDir, 'initial_state.png') });
    
    logWithTimestamp('✅ Connected to AdsPower profile');

  // -----------------------------------------------
  // Step 1: Search PTI-related tweets
  logWithTimestamp('Navigating to Twitter search page for PTI tweets...');
  try {
    // Check if we need to handle login first
    const currentUrl = await page.url();
    logWithTimestamp(`Current URL before navigation: ${currentUrl}`);
    
    if (currentUrl.includes('login') || currentUrl.includes('sign-in')) {
      logWithTimestamp('⚠️ Login page detected - please ensure you are logged in through AdsPower');
      await page.screenshot({ path: path.join(logsDir, 'login_required.png') });
      throw new Error('Twitter login required');
    }
    
    logWithTimestamp('Starting Twitter search navigation...');
    await page.goto('https://twitter.com/search?q=PTI&src=typed_query&f=live', { 
      waitUntil: 'load',
      timeout: 60000 // 60 second timeout for navigation
    });
    logWithTimestamp('Navigation completed, waiting for content to load...');
    // Replace waitForTimeout with page.evaluate for consistency
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000))); // Wait for search results to load
    
    // Take screenshot of search results
    await page.screenshot({ path: path.join(logsDir, 'search_results.png') });
    logWithTimestamp(`Current URL after navigation: ${await page.url()}`);
    logWithTimestamp(`Page title: ${await page.title()}`);
    
    // Check if we're actually on Twitter (now X)
    const isTwitter = await page.url().includes('twitter.com') || await page.url().includes('x.com');
    logWithTimestamp(`Is on Twitter/X: ${isTwitter}`);
    if (!isTwitter) {
      throw new Error('Navigation did not lead to Twitter/X');
    }
  } catch (error) {
    logWithTimestamp(`Failed to navigate to Twitter search page: ${error}`);
    await page.screenshot({ path: path.join(logsDir, 'navigation_error.png') });
    throw new Error('Twitter search page navigation failed');
  }

  // Scroll to load more tweets
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  // Retweet the first tweet
  logWithTimestamp('Attempting to retweet the first tweet...');
  try {
    // Take screenshot before looking for retweet button
    await page.screenshot({ path: path.join(logsDir, 'before_retweet.png') });
    
    // Check if we can find tweet articles first
    const tweetArticles = await page.$$('article');
    logWithTimestamp(`Found ${tweetArticles.length} tweet articles`);
    
    // Try to find the retweet button
    logWithTimestamp('Looking for retweet button...');
    const retweetBtn = await page.waitForSelector('article [data-testid="retweet"]', { timeout: 10000 }).catch(() => null);
    
    if (retweetBtn) {
      logWithTimestamp('Retweet button found, clicking it...');
      await retweetBtn.click();
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1500)));
      
      // Take screenshot after clicking retweet
      await page.screenshot({ path: path.join(logsDir, 'after_retweet_click.png') });
      
      const confirmRetweet = await page.waitForSelector('[data-testid="retweetConfirm"]', { timeout: 5000 }).catch(() => null);
      if (confirmRetweet) {
        logWithTimestamp('Retweet confirm button found, clicking it...');
        await confirmRetweet.click();
        logWithTimestamp('✅ Retweeted a PTI tweet');
      } else {
        logWithTimestamp('⚠️ Could not find retweet confirmation button');
        await page.screenshot({ path: path.join(logsDir, 'no_retweet_confirm.png') });
      }
    } else {
      logWithTimestamp('⚠️ No retweet button found');
      await page.screenshot({ path: path.join(logsDir, 'no_retweet_button.png') });

      // Check if we can find any buttons for debugging
      const allButtons = await page.$$('button');
      logWithTimestamp(`Found ${allButtons.length} buttons on page`);

      // Check if X/Twitter has changed their data-testid
      const htmlContent = await page.content();
      fs.writeFileSync(path.join(logsDir, 'page_html.txt'), htmlContent);
      logWithTimestamp('Saved page HTML for inspection');
    }
  } catch (error) {
    logWithTimestamp(`Error during retweet process: ${error}`);
    await page.screenshot({ path: path.join(logsDir, 'retweet_error.png') });
    logWithTimestamp('⚠️ Continuing to next step despite retweet error');
  }

  // -----------------------------------------------
  // Step 2: Go to Imran Khan's profile
  logWithTimestamp('Navigating to Imran Khan\'s Twitter profile...');
  try {
    await page.goto('https://twitter.com/ImranKhanPTI', { 
      waitUntil: 'load',
      timeout: 60000
    });
    logWithTimestamp('Navigation completed, waiting for profile to load...');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000))); // Wait for profile to load
    
    // Take screenshot of profile
    await page.screenshot({ path: path.join(logsDir, 'profile_page.png') });
    logWithTimestamp(`Current URL after navigation: ${await page.url()}`);
    logWithTimestamp(`Page title: ${await page.title()}`);
  } catch (error) {
    logWithTimestamp(`Failed to navigate to Imran Khan's profile: ${error}`);
    await page.screenshot({ path: path.join(logsDir, 'profile_navigation_error.png') });
    throw new Error('Profile navigation failed');
  }

  // Like the first tweet
  logWithTimestamp('Attempting to like a tweet...');
  try {
    // Check for tweets first
    const tweetArticles = await page.$$('article');
    logWithTimestamp(`Found ${tweetArticles.length} tweet articles on profile`);
    
    // Take screenshot before looking for like button
    await page.screenshot({ path: path.join(logsDir, 'before_like.png') });
    
    // Try to find the like button
    const likeBtn = await page.waitForSelector('article [data-testid="like"]', { timeout: 10000 }).catch(() => null);
    if (likeBtn) {
      logWithTimestamp('Like button found, clicking it...');
      await likeBtn.click();
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000))); // Short wait to confirm click
      logWithTimestamp('✅ Liked Imran Khan tweet');
      await page.screenshot({ path: path.join(logsDir, 'after_like.png') });
    } else {
      logWithTimestamp('⚠️ No like button found');
      
      // Check if we can find any buttons for debugging
      const allButtons = await page.$$('button');
      logWithTimestamp(`Found ${allButtons.length} buttons on page`);
      await page.screenshot({ path: path.join(logsDir, 'no_like_button.png') });
    }
  } catch (error) {
    logWithTimestamp(`Error during like process: ${error}`);
    await page.screenshot({ path: path.join(logsDir, 'like_error.png') });
    logWithTimestamp('⚠️ Continuing to next step despite like error');
  }

  // Reply to the first tweet
  logWithTimestamp('Attempting to reply to a tweet...');
  try {
    // Take screenshot before looking for reply button
    await page.screenshot({ path: path.join(logsDir, 'before_reply.png') });
    
    const replyBtn = await page.waitForSelector('article [data-testid="reply"]', { timeout: 10000 }).catch(() => null);
    if (replyBtn) {
      logWithTimestamp('Reply button found, clicking it...');
      await replyBtn.click();
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
      
      // Take screenshot after clicking reply
      await page.screenshot({ path: path.join(logsDir, 'after_reply_click.png') });

      const replyBox = await page.waitForSelector('[role="textbox"]', { timeout: 5000 }).catch(() => null);
      if (replyBox) {
        logWithTimestamp('Reply textbox found, typing message...');
        await replyBox.type('Great leadership! 🇵🇰');
        
        // Take screenshot after typing reply
        await page.screenshot({ path: path.join(logsDir, 'typed_reply.png') });
        
        const replySend = await page.waitForSelector('[data-testid="tweetButton"]', { timeout: 5000 }).catch(() => null);
        if (replySend) {
          logWithTimestamp('Reply send button found, clicking it...');
          await replySend.click();
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000))); // Wait for reply to send
          logWithTimestamp('✅ Replied to Imran Khan tweet');
          await page.screenshot({ path: path.join(logsDir, 'after_reply_sent.png') });
        } else {
          logWithTimestamp('⚠️ Could not find send button for reply');
          await page.screenshot({ path: path.join(logsDir, 'no_reply_send_button.png') });
        }
      } else {
        logWithTimestamp('⚠️ Could not find reply text box');
        await page.screenshot({ path: path.join(logsDir, 'no_reply_textbox.png') });
      }
    } else {
      logWithTimestamp('⚠️ No reply button found');
      await page.screenshot({ path: path.join(logsDir, 'no_reply_button.png') });
    }
  } catch (error) {
    logWithTimestamp(`Error during reply process: ${error}`);
    await page.screenshot({ path: path.join(logsDir, 'reply_error.png') });
    logWithTimestamp('⚠️ Continuing to next step despite reply error');
  }

  // -----------------------------------------------
  // Step 3: Compose a tweet supporting #crypto #pti #imrankhan
  logWithTimestamp('Navigating to Twitter home to compose a tweet...');
  try {
    await page.goto('https://twitter.com/home', { 
      waitUntil: 'load',
      timeout: 60000
    });
    
    logWithTimestamp('Waiting for tweet compose box to appear...');
    const tweetBoxExists = await page.waitForSelector('[role="textbox"][tabindex="0"]', { timeout: 15000 }).catch(() => null);
    
    if (!tweetBoxExists) {
      logWithTimestamp('⚠️ Could not find tweet compose box');
      await page.screenshot({ path: path.join(logsDir, 'no_compose_box.png') });
      
      // Save the page HTML for inspection
      const htmlContent = await page.content();
      fs.writeFileSync(path.join(logsDir, 'home_page_html.txt'), htmlContent);
      logWithTimestamp('Saved home page HTML for inspection');
    } else {
      logWithTimestamp('Composing tweet...');
      const tweetBox = await page.$('[role="textbox"][tabindex="0"]');
      if (tweetBox) {
        await tweetBox.click();
        await tweetBox.type('Supporting the truth. #crypto #pti #imrankhan 🇵🇰🔥');
        
        // Take screenshot after typing tweet
        await page.screenshot({ path: path.join(logsDir, 'typed_tweet.png') });
        
        const tweetButton = await page.waitForSelector('[data-testid="tweetButtonInline"]', { timeout: 5000 }).catch(() => null);
        if (tweetButton) {
          logWithTimestamp('Tweet button found, clicking it...');
          await tweetButton.click();
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000))); // Wait for tweet to post
          logWithTimestamp('✅ Tweeted: Supporting the truth. #crypto #pti #imrankhan');
          await page.screenshot({ path: path.join(logsDir, 'after_tweet_sent.png') });
        } else {
          logWithTimestamp('⚠️ Could not find tweet button');
          await page.screenshot({ path: path.join(logsDir, 'no_tweet_button.png') });
        }
      } else {
        logWithTimestamp('⚠️ Could not find tweet composition box');
        await page.screenshot({ path: path.join(logsDir, 'no_tweet_box.png') });
      }
    }
  } catch (error) {
    logWithTimestamp(`Error during tweet composition process: ${error}`);
    await page.screenshot({ path: path.join(logsDir, 'tweet_error.png') });
    logWithTimestamp('⚠️ Continuing to final step despite tweet error');
  }

  // Final screenshot
  logWithTimestamp('Taking final screenshot...');
  try {
    await page.screenshot({ path: path.join(logsDir, 'rpa_output.png'), fullPage: true });
    logWithTimestamp('✅ Screenshot saved as rpa_output.png');
  } catch (error) {
    logWithTimestamp(`Error taking screenshot: ${error}`);
  }

  logWithTimestamp('✅ RPA completed in existing AdsPower tab.');
  
  // Clean up
  await browser.close();
  if (puppeteerBrowser) {
    await puppeteerBrowser.disconnect();
  }
  } catch (error) {
    logWithTimestamp(`Error during automation: ${error}`);
    // Clean up Puppeteer connection if it exists
    if (puppeteerBrowser) {
      try {
        await puppeteerBrowser.disconnect();
      } catch (err) {
        logWithTimestamp(`Error disconnecting Puppeteer: ${err}`);
      }
    }
    process.exit(1);
  }
})();

