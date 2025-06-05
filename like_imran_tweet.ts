import * as puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

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
  fs.appendFileSync(path.join(logsDir, 'imran_like.log'), logMessage + '\n');
}

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

// Function to get WebSocket URL from .env file
async function getWebSocketUrl(): Promise<string> {
  try {
    logWithTimestamp('Getting WebSocket URL from .env file...');
    
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
      logWithTimestamp('No WebSocket URL found in .env file. Please add WS_ENDPOINT to the .env file.');
      logWithTimestamp('Check HOW_TO_GET_WEBSOCKET_URL.md for instructions.');
      process.exit(1);
    }
    
    return wsEndpoint;
  } catch (error: any) {
    logWithTimestamp(`Error getting WebSocket URL: ${error.message}`);
    throw error;
  }
}

// Function to connect to browser with Puppeteer
async function connectToBrowser(wsEndpoint: string): Promise<puppeteer.Browser> {
  logWithTimestamp(`Attempting to connect with Puppeteer using WebSocket URL: ${wsEndpoint.substring(0, 30)}...`);
  
  try {
    const browser = await promiseWithTimeout(
      puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        defaultViewport: null
      }),
      30000, // 30 second timeout
      'Connection to browser timed out'
    );
    
    // Test if the connection is actually working
    logWithTimestamp('Testing browser connection...');
    const version = await browser.version();
    logWithTimestamp(`Successfully connected to browser. Version: ${version}`);
    
    return browser;
  } catch (error: any) {
    logWithTimestamp(`Failed to connect to browser: ${error.message}`);
    throw error;
  }
}

// Function to save a screenshot
async function saveScreenshot(page: puppeteer.Page, filename: string): Promise<void> {
  try {
    const filePath = path.join(logsDir, filename);
    // Workaround for TypeScript issues with screenshot path
    const buffer = await page.screenshot();
    fs.writeFileSync(filePath, buffer);
    logWithTimestamp(`Screenshot saved to ${filename}`);
  } catch (error: any) {
    logWithTimestamp(`Failed to save screenshot (${filename}): ${error.message}`);
  }
}

// Function to like an Imran Khan tweet
async function likeImranKhanTweet(browser: puppeteer.Browser): Promise<void> {
  logWithTimestamp('Starting Imran Khan tweet like operation');
  
  try {
    // Get all pages and use the first one
    const pages = await browser.pages();
    if (pages.length === 0) {
      logWithTimestamp('No browser pages found. Creating a new page...');
      await browser.newPage();
      // Refresh pages list
      const newPages = await browser.pages();
      if (newPages.length === 0) {
        throw new Error('Failed to create a new page');
      }
    }
    
    const page = (await browser.pages())[0];
    logWithTimestamp(`Current page URL: ${await page.url()}`);
    
    // Take a screenshot of initial state
    logWithTimestamp('Taking screenshot of initial state...');
    await saveScreenshot(page, 'imran_like_initial.png');
    
    // Navigate to Imran Khan's Twitter profile
    const imranProfileUrl = 'https://twitter.com/ImranKhanPTI';
    logWithTimestamp(`Navigating to Imran Khan's Twitter profile: ${imranProfileUrl}`);
    
    try {
      try {
        await promiseWithTimeout(
          page.goto(imranProfileUrl, { waitUntil: 'networkidle2' }),
          60000, // 60 second timeout
          'Navigation to Imran Khan\'s profile timed out'
        );
      } catch (navError: any) {
        logWithTimestamp(`Initial navigation attempt failed: ${navError.message}`);
        logWithTimestamp('Trying again with different waitUntil strategy...');
        
        // Try again with a different navigation strategy
        await promiseWithTimeout(
          page.goto(imranProfileUrl, { waitUntil: 'load' }),
          60000,
          'Second navigation attempt to Imran Khan\'s profile timed out'
        );
      }
      
      logWithTimestamp('Successfully navigated to Imran Khan\'s profile');
      
      // Take a screenshot of the profile page
      await saveScreenshot(page, 'imran_profile_page.png');
      
      // Wait for tweets to load - using multiple possible selectors
      logWithTimestamp('Waiting for tweets to load...');
      
      const possibleTweetSelectors = [
        'article[data-testid="tweet"]',
        'article[role="article"]',
        'article',
        'div[data-testid="cellInnerDiv"]',
        '[data-testid="tweetText"]',
        'div[data-testid="tweetTextarea_0"]'
      ];
      
      let tweetsLoaded = false;
      for (const selector of possibleTweetSelectors) {
        logWithTimestamp(`Trying to find tweets with selector: ${selector}`);
        const tweetExists = await page.$(selector).catch(() => null);
        if (tweetExists) {
          logWithTimestamp(`Found tweets with selector: ${selector}`);
          tweetsLoaded = true;
          await promiseWithTimeout(
            page.waitForSelector(selector, { visible: true }),
            10000,
            `Waiting for tweets with selector ${selector} to be visible`
          );
          break;
        }
      }
      
      if (!tweetsLoaded) {
        throw new Error('Tweets failed to load with any known selector');
      }
      
      logWithTimestamp('Tweets loaded successfully');
      
      // Find the first tweet and like it
      logWithTimestamp('Looking for the first tweet to like...');
      
      // Take screenshot before like
      await saveScreenshot(page, 'before_like_action.png');
      
      // Find like button in the first tweet - use multiple possible selectors
      const possibleLikeSelectors = [
        'article[data-testid="tweet"] div[data-testid="like"]',
        'article div[data-testid="like"]',
        'article[role="article"] div[data-testid="like"]',
        'div[data-testid="like"]',
        '[data-testid="like"]'
      ];
      
      logWithTimestamp('Trying multiple possible like button selectors...');
      
      let likeButtonSelector = '';
      for (const selector of possibleLikeSelectors) {
        logWithTimestamp(`Trying selector: ${selector}`);
        const exists = await page.$(selector);
        if (exists) {
          likeButtonSelector = selector;
          logWithTimestamp(`Found working selector: ${selector}`);
          break;
        }
      }
      
      if (!likeButtonSelector) {
        throw new Error('Could not find any like button with known selectors');
      }
      
      await promiseWithTimeout(
        page.waitForSelector(likeButtonSelector, { visible: true }),
        20000,
        'Like button not found'
      );
      
      logWithTimestamp('Like button found. Attempting to click...');
      
      // Click the like button
      await promiseWithTimeout(
        page.click(likeButtonSelector),
        10000,
        'Failed to click the like button'
      );
      
      logWithTimestamp('Successfully clicked the like button');
      
      // Wait a moment for the like action to register
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take a screenshot after liking
      await saveScreenshot(page, 'after_like_action.png');
      
      logWithTimestamp('✅ Successfully liked an Imran Khan tweet');
      
    } catch (error: any) {
      logWithTimestamp(`Error during navigation or liking: ${error.message}`);
      
      // Take a screenshot of the error state
      await saveScreenshot(page, 'like_error_state.png');
      
      throw error;
    }
  } catch (error: any) {
    logWithTimestamp(`Failed to like Imran Khan tweet: ${error.message}`);
    throw error;
  }
}

// Main function
async function main() {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('Starting Imran Khan tweet like script');
  logWithTimestamp('='.repeat(50));
  
  // Log system info for debugging
  logWithTimestamp(`Node.js version: ${process.version}`);
  logWithTimestamp(`Platform: ${process.platform}`);
  logWithTimestamp(`Working directory: ${process.cwd()}`);
  
  let browser: puppeteer.Browser | null = null;
  
  try {
    // Get WebSocket URL
    const wsEndpoint = await getWebSocketUrl();
    
    // Connect to browser
    browser = await connectToBrowser(wsEndpoint);
    
    // Like an Imran Khan tweet
    await likeImranKhanTweet(browser);
    
    logWithTimestamp('Script completed successfully');
  } catch (error: any) {
    logWithTimestamp(`Script failed: ${error.message}`);
  } finally {
    // Clean up
    if (browser) {
      logWithTimestamp('Closing browser connection...');
      await browser.disconnect();
      logWithTimestamp('Browser connection closed');
    }
    
    logWithTimestamp('='.repeat(50));
    logWithTimestamp('Script execution finished');
    logWithTimestamp('='.repeat(50));
  }
}

// Run the main function
main().catch((error) => {
  logWithTimestamp(`Unhandled error: ${error.message}`);
  process.exit(1);
});
