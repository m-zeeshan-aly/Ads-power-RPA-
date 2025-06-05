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
  fs.appendFileSync(path.join(logsDir, 'pti_action.log'), logMessage + '\n');
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

// Function to perform actions on PTI and Imran Khan's Twitter accounts
async function performPTIActions(browser: puppeteer.Browser): Promise<void> {
  logWithTimestamp('Starting PTI actions (like, comment, retweet)');
  
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
    await saveScreenshot(page, 'pti_action_initial.png');
    
    // Step 1: Navigate to PTI's Twitter profile
    const ptiProfileUrl = 'https://twitter.com/PTIofficial';
    logWithTimestamp(`Navigating to PTI's Twitter profile: ${ptiProfileUrl}`);
    
    try {
      try {
        await promiseWithTimeout(
          page.goto(ptiProfileUrl, { waitUntil: 'networkidle2' }),
          60000, // 60 second timeout
          'Navigation to PTI\'s profile timed out'
        );
      } catch (navError: any) {
        logWithTimestamp(`Initial navigation attempt failed: ${navError.message}`);
        logWithTimestamp('Trying again with different waitUntil strategy...');
        
        // Try again with a different navigation strategy
        await promiseWithTimeout(
          page.goto(ptiProfileUrl, { waitUntil: 'load' }),
          60000,
          'Second navigation attempt to PTI\'s profile timed out'
        );
      }
      
      logWithTimestamp('Successfully navigated to PTI\'s profile');
      
      // Take a screenshot of the profile page
      await saveScreenshot(page, 'pti_profile_page.png');
      
      // Wait for tweets to load
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
      
      // STEP 1: Like the first tweet
      logWithTimestamp('Looking for a tweet to like...');
      await saveScreenshot(page, 'before_pti_like.png');
      
      // Find like button in the first tweet
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
      
      logWithTimestamp('Like button found. Clicking it...');
      
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
      await saveScreenshot(page, 'after_pti_like.png');
      
      logWithTimestamp('✅ Successfully liked a PTI tweet');
      
      // STEP 2: Comment on the first tweet
      logWithTimestamp('Looking for a tweet to comment on...');
      
      // Find reply button in the first tweet
      const possibleReplySelectors = [
        'article[data-testid="tweet"] div[data-testid="reply"]',
        'article div[data-testid="reply"]',
        'article[role="article"] div[data-testid="reply"]',
        'div[data-testid="reply"]',
        '[data-testid="reply"]'
      ];
      
      logWithTimestamp('Trying multiple possible reply button selectors...');
      
      let replyButtonSelector = '';
      for (const selector of possibleReplySelectors) {
        logWithTimestamp(`Trying selector: ${selector}`);
        const exists = await page.$(selector);
        if (exists) {
          replyButtonSelector = selector;
          logWithTimestamp(`Found working reply selector: ${selector}`);
          break;
        }
      }
      
      if (!replyButtonSelector) {
        throw new Error('Could not find any reply button with known selectors');
      }
      
      await promiseWithTimeout(
        page.waitForSelector(replyButtonSelector, { visible: true }),
        20000,
        'Reply button not found'
      );
      
      // Click the reply button to open comment box
      logWithTimestamp('Reply button found. Clicking it to open comment box...');
      await promiseWithTimeout(
        page.click(replyButtonSelector),
        10000,
        'Failed to click the reply button'
      );
      
      // Wait for the reply dialog to appear
      logWithTimestamp('Waiting for reply dialog to appear...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take screenshot after reply button clicked
      await saveScreenshot(page, 'reply_dialog_pti.png');
      
      // Look for the tweet textarea to type our reply
      const possibleTextareaSelectors = [
        'div[data-testid="tweetTextarea_0"]',
        'div[role="textbox"]',
        'div[contenteditable="true"]',
        '[data-testid="tweetTextarea_0"]'
      ];
      
      let textareaSelector = '';
      for (const selector of possibleTextareaSelectors) {
        logWithTimestamp(`Trying textarea selector: ${selector}`);
        const exists = await page.$(selector);
        if (exists) {
          textareaSelector = selector;
          logWithTimestamp(`Found working textarea selector: ${selector}`);
          break;
        }
      }
      
      if (!textareaSelector) {
        throw new Error('Could not find reply textarea with known selectors');
      }
      
      // Type reply comment
      const replyText = "Great work PTI! #StandWithImranKhan #PTI";
      logWithTimestamp(`Typing reply: "${replyText}"`);
      await page.type(textareaSelector, replyText);
      
      // Wait a moment after typing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take screenshot of typed reply
      await saveScreenshot(page, 'typed_pti_reply.png');
      
      // Find and click the reply button
      const possibleReplySubmitSelectors = [
        'div[data-testid="tweetButton"]',
        '[data-testid="tweetButton"]',
        'div[data-testid="tweetButtonInline"]',
        '[role="button"]:has-text("Reply")',
        'div[role="button"]:has-text("Reply")'
      ];
      
      let replySubmitSelector = '';
      for (const selector of possibleReplySubmitSelectors) {
        logWithTimestamp(`Trying reply submit selector: ${selector}`);
        const exists = await page.$(selector);
        if (exists) {
          replySubmitSelector = selector;
          logWithTimestamp(`Found working reply submit selector: ${selector}`);
          break;
        }
      }
      
      if (!replySubmitSelector) {
        throw new Error('Could not find reply submit button with known selectors');
      }
      
      // Click reply button to send the comment
      logWithTimestamp('Clicking Reply button to send comment...');
      await promiseWithTimeout(
        page.click(replySubmitSelector),
        10000,
        'Failed to click the reply submit button'
      );
      
      // Wait for the reply to be sent
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take screenshot after sending reply
      await saveScreenshot(page, 'after_pti_comment_sent.png');
      
      logWithTimestamp('✅ Successfully commented on a PTI tweet');
      
      // STEP 3: Navigate to Imran Khan's profile to retweet
      const imranProfileUrl = 'https://twitter.com/ImranKhanPTI';
      logWithTimestamp(`Navigating to Imran Khan's Twitter profile: ${imranProfileUrl}`);
      
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
      
      // Take a screenshot of Imran Khan's profile page
      await saveScreenshot(page, 'imran_profile_for_retweet.png');
      
      // Wait for tweets to load
      logWithTimestamp('Waiting for Imran Khan tweets to load...');
      
      let imranTweetsLoaded = false;
      for (const selector of possibleTweetSelectors) {
        logWithTimestamp(`Trying to find Imran tweets with selector: ${selector}`);
        const tweetExists = await page.$(selector).catch(() => null);
        if (tweetExists) {
          logWithTimestamp(`Found Imran tweets with selector: ${selector}`);
          imranTweetsLoaded = true;
          await promiseWithTimeout(
            page.waitForSelector(selector, { visible: true }),
            10000,
            `Waiting for Imran tweets with selector ${selector} to be visible`
          );
          break;
        }
      }
      
      if (!imranTweetsLoaded) {
        throw new Error('Imran Khan tweets failed to load with any known selector');
      }
      
      // Find retweet button in the first tweet
      logWithTimestamp('Looking for a tweet to retweet...');
      
      // Take screenshot before retweet
      await saveScreenshot(page, 'before_imran_retweet.png');
      
      const possibleRetweetSelectors = [
        'article[data-testid="tweet"] div[data-testid="retweet"]',
        'article div[data-testid="retweet"]',
        'article[role="article"] div[data-testid="retweet"]',
        'div[data-testid="retweet"]',
        '[data-testid="retweet"]'
      ];
      
      logWithTimestamp('Trying multiple possible retweet button selectors...');
      
      let retweetButtonSelector = '';
      for (const selector of possibleRetweetSelectors) {
        logWithTimestamp(`Trying selector: ${selector}`);
        const exists = await page.$(selector);
        if (exists) {
          retweetButtonSelector = selector;
          logWithTimestamp(`Found working retweet selector: ${selector}`);
          break;
        }
      }
      
      if (!retweetButtonSelector) {
        throw new Error('Could not find any retweet button with known selectors');
      }
      
      // Click on retweet button
      logWithTimestamp('Clicking retweet button...');
      await promiseWithTimeout(
        page.click(retweetButtonSelector),
        10000,
        'Failed to click the retweet button'
      );
      
      // Wait for retweet confirmation menu to appear
      await new Promise(resolve => setTimeout(resolve, 1500));
      await saveScreenshot(page, 'retweet_confirmation.png');
      
      // Find and click on "Retweet" confirmation button
      const possibleRetweetConfirmSelectors = [
        '[data-testid="retweetConfirm"]',
        'div[data-testid="retweetConfirm"]',
        '[role="menuitem"]:has-text("Retweet")'
      ];
      
      logWithTimestamp('Looking for retweet confirmation button...');
      
      let retweetConfirmSelector = '';
      for (const selector of possibleRetweetConfirmSelectors) {
        logWithTimestamp(`Trying retweet confirm selector: ${selector}`);
        const exists = await page.$(selector);
        if (exists) {
          retweetConfirmSelector = selector;
          logWithTimestamp(`Found working retweet confirm selector: ${selector}`);
          break;
        }
      }
      
      if (!retweetConfirmSelector) {
        throw new Error('Could not find retweet confirmation button');
      }
      
      // Click the confirmation button
      logWithTimestamp('Clicking retweet confirmation button...');
      await promiseWithTimeout(
        page.click(retweetConfirmSelector),
        10000,
        'Failed to click the retweet confirmation button'
      );
      
      // Wait for retweet to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take screenshot after retweet
      await saveScreenshot(page, 'after_imran_retweet.png');
      
      logWithTimestamp('✅ Successfully retweeted an Imran Khan tweet');
      
      logWithTimestamp('All Twitter actions completed successfully');
      
    } catch (error: any) {
      logWithTimestamp(`Error during PTI/Imran Khan actions: ${error.message}`);
      await saveScreenshot(page, 'pti_actions_error.png');
      throw error;
    }
  } catch (error: any) {
    logWithTimestamp(`Failed to perform PTI actions: ${error.message}`);
    throw error;
  }
}

// Main function
async function main() {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('Starting PTI Comment & Imran Khan Retweet Script');
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
    
    // Perform PTI like & comment and Imran Khan retweet actions
    await performPTIActions(browser);
    
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
