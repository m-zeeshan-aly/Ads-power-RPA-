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
  fs.appendFileSync(path.join(logsDir, 'pti_comment.log'), logMessage + '\n');
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

// Function to comment on a PTI tweet
async function commentOnPtiTweet(browser: puppeteer.Browser): Promise<void> {
  logWithTimestamp('Starting PTI tweet commenting operation');
  
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
    await saveScreenshot(page, 'pti_comment_initial.png');
    
    // Navigate to PTI's Twitter profile
    const ptiProfileUrl = 'https://twitter.com/PTIofficial';
    logWithTimestamp(`Navigating to PTI profile: ${ptiProfileUrl}`);
    
    try {
      logWithTimestamp('Starting Twitter PTI profile navigation...');
      await promiseWithTimeout(
        page.goto(ptiProfileUrl, { waitUntil: 'load' }),
        60000, // 60 second timeout for navigation
        'Navigation to PTI Twitter profile timed out'
      );
      
      // Check if we're actually on Twitter
      const currentUrl = await page.url();
      logWithTimestamp(`Current URL after navigation: ${currentUrl}`);
      
      const isTwitter = currentUrl.includes('twitter.com') || currentUrl.includes('x.com');
      logWithTimestamp(`Is on Twitter/X: ${isTwitter}`);
      if (!isTwitter) {
        throw new Error('Navigation did not lead to Twitter/X');
      }
      
      logWithTimestamp('Successfully navigated to PTI Twitter profile');
      
      // Wait for the page content to load properly
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Take screenshot of profile page
      await saveScreenshot(page, 'pti_profile_page.png');
      
      // Check if we can find tweet articles first
      const tweetArticles = await page.$$('article');
      logWithTimestamp(`Found ${tweetArticles.length} tweet articles on profile`);
      
      // Take screenshot before looking for reply button
      await saveScreenshot(page, 'before_reply.png');
      
      // Using the selector pattern from index.ts that works
      logWithTimestamp('Looking for reply button using index.ts selector pattern...');
      
      // Try to find the reply button (this is what works in index.ts)
      const replySelector = 'article [data-testid="reply"]';
      
      // Check if selector exists
      const replyButtonExists = await page.$(replySelector);
      if (!replyButtonExists) {
        logWithTimestamp(`Reply button not found with selector: ${replySelector}`);
        
        // Try to find any buttons for debugging
        const allButtons = await page.$$('button');
        logWithTimestamp(`Found ${allButtons.length} buttons on page`);
        
        // Save HTML for debugging
        const htmlContent = await page.content();
        fs.writeFileSync(path.join(logsDir, 'pti_profile_html.txt'), htmlContent);
        logWithTimestamp('Saved page HTML for inspection');
        
        throw new Error('Reply button not found');
      }
      
      logWithTimestamp('Reply button found, clicking it...');
      await page.click(replySelector);
      
      // Wait for the reply dialog to appear
      logWithTimestamp('Waiting for reply dialog to appear...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take screenshot after clicking reply button
      await saveScreenshot(page, 'after_reply_click.png');
      
      // Wait for and find the textbox using pattern from index.ts
      const textboxSelector = '[role="textbox"]';
      
      // Wait for the textbox to be available
      logWithTimestamp('Waiting for reply textbox to appear...');
      try {
        await promiseWithTimeout(
          page.waitForSelector(textboxSelector),
          5000,
          'Reply textbox not found'
        );
      } catch (error) {
        // Take screenshot of the error state
        await saveScreenshot(page, 'reply_textbox_error.png');
        
        // Save HTML for debugging
        const htmlContent = await page.content();
        fs.writeFileSync(path.join(logsDir, 'reply_dialog_html.txt'), htmlContent);
        
        throw error;
      }
      
      logWithTimestamp('Reply textbox found, typing message...');
      await page.type(textboxSelector, 'Great work PTI! #StandWithImranKhan #PTI 🇵🇰');
      
      // Take screenshot after typing reply
      await saveScreenshot(page, 'typed_pti_reply.png');
      
      // Now look for the reply button using the pattern from index.ts
      const replySubmitSelector = '[data-testid="tweetButton"]';
      
      // Wait for the reply button to be available
      logWithTimestamp('Waiting for reply submit button to appear...');
      try {
        await promiseWithTimeout(
          page.waitForSelector(replySubmitSelector),
          5000,
          'Reply submit button not found'
        );
      } catch (error) {
        // Take screenshot of the error state
        await saveScreenshot(page, 'reply_submit_button_error.png');
        
        // Try to find any buttons for debugging
        const allButtons = await page.$$('button');
        logWithTimestamp(`Found ${allButtons.length} buttons in reply dialog`);
        
        // Save HTML for debugging
        const htmlContent = await page.content();
        fs.writeFileSync(path.join(logsDir, 'reply_dialog_html.txt'), htmlContent);
        
        throw error;
      }
      
      // Try to click on the reply button with multiple attempts
      logWithTimestamp('Reply submit button found, clicking it...');
      
      // Try to click the submit button with multiple attempts
      const maxClickAttempts = 3;
      let clickSuccess = false;
      
      for (let attempt = 1; attempt <= maxClickAttempts && !clickSuccess; attempt++) {
        try {
          logWithTimestamp(`Click attempt ${attempt}/${maxClickAttempts}...`);
          
          // First try regular click
          await page.click(replySubmitSelector);
          logWithTimestamp('Regular click performed');
          
          // Wait a moment to see if the click worked
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check if the textbox is still visible (if not, likely comment was sent)
          const textboxStillVisible = await page.$(textboxSelector).then(el => !!el).catch(() => false);
          if (!textboxStillVisible) {
            logWithTimestamp('Textbox no longer visible, comment likely sent successfully');
            clickSuccess = true;
            break;
          }
          
          // If first click didn't work, try with JavaScript
          logWithTimestamp('First click may not have worked, trying forceful click...');
          await page.evaluate((selector) => {
            const button = document.querySelector(selector);
            if (button) {
              // Create and dispatch mouse events for more reliable clicking
              ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                const event = new MouseEvent(eventType, {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                  buttons: 1
                });
                button.dispatchEvent(event);
              });
              // Also try direct click as fallback
              (button as HTMLElement).click();
            }
          }, replySubmitSelector);
          
          // Wait longer after the forceful click
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Check again if the comment was sent
          const textboxGoneNow = await page.$(textboxSelector).then(el => !!el).catch(() => false);
          if (!textboxGoneNow) {
            logWithTimestamp('Textbox gone after forceful click, comment likely sent successfully');
            clickSuccess = true;
            break;
          }
          
        } catch (err) {
          logWithTimestamp(`Error during click attempt ${attempt}: ${err}`);
          
          if (attempt === maxClickAttempts) {
            throw err;
          }
        }
        
        // Wait before next attempt
        if (!clickSuccess && attempt < maxClickAttempts) {
          logWithTimestamp(`Waiting before retry attempt ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!clickSuccess) {
        logWithTimestamp('⚠️ Could not confirm successful comment submission');
        throw new Error('Failed to submit comment after multiple attempts');
      }
      
      // Wait for the comment to be processed
      logWithTimestamp('Waiting for comment to be processed...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Take screenshot after sending comment
      await saveScreenshot(page, 'after_pti_comment_sent.png');
      
      logWithTimestamp('✅ Successfully commented on a PTI tweet');
      
    } catch (error: any) {
      logWithTimestamp(`Error during comment operation: ${error.message}`);
      await saveScreenshot(page, 'pti_comment_error.png');
      throw error;
    }
  } catch (error: any) {
    logWithTimestamp(`Failed to comment on PTI tweet: ${error.message}`);
    throw error;
  }
}

// Main function
async function main() {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('Starting PTI Tweet Comment Script');
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
    
    // Comment on a PTI tweet
    await commentOnPtiTweet(browser);
    
    logWithTimestamp('Script completed successfully');
  } catch (error: any) {
    logWithTimestamp(`Script failed: ${error.message}`);
    process.exit(1);
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
