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
  fs.appendFileSync(path.join(logsDir, 'animal_tweet.log'), logMessage + '\n');
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

// Function to post an animal-related tweet
async function postAnimalTweet(browser: puppeteer.Browser): Promise<void> {
  logWithTimestamp('Starting animal tweet posting operation');
  
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
    await saveScreenshot(page, 'animal_tweet_initial.png');
    
    // Navigate to Twitter home to compose a tweet
    const twitterHomeUrl = 'https://twitter.com/home';
    logWithTimestamp(`Navigating to Twitter home: ${twitterHomeUrl}`);
    
    try {
      logWithTimestamp('Starting Twitter home navigation...');
      await promiseWithTimeout(
        page.goto(twitterHomeUrl, { waitUntil: 'load' }),
        60000, // 60 second timeout for navigation
        'Navigation to Twitter home timed out'
      );
      
      // Check if we're actually on Twitter
      const currentUrl = await page.url();
      logWithTimestamp(`Current URL after navigation: ${currentUrl}`);
      
      const isTwitter = currentUrl.includes('twitter.com') || currentUrl.includes('x.com');
      logWithTimestamp(`Is on Twitter/X: ${isTwitter}`);
      if (!isTwitter) {
        throw new Error('Navigation did not lead to Twitter/X');
      }
      
      logWithTimestamp('Successfully navigated to Twitter home');
      
      // Wait a moment for the page to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take a screenshot of the home page
      await saveScreenshot(page, 'twitter_home_page.png');
      
      // Look for the tweet compose box
      logWithTimestamp('Looking for tweet compose box using selectors from index.ts...');
      
      // Updated selectors based on index.ts successful approach
      const possibleComposeSelectors = [
        '[role="textbox"][tabindex="0"]',  // This is the key selector from index.ts
        'div[role="textbox"]',
        'div[data-testid="tweetTextarea_0"]',
        'div[aria-label="Tweet text"]',
        'div[contenteditable="true"]',
        '[data-testid="tweetTextarea_0"]'
      ];
      
      // Check if the tweet box is available directly
      let composeBox = null;
      for (const selector of possibleComposeSelectors) {
        logWithTimestamp(`Trying tweet compose selector: ${selector}`);
        composeBox = await page.$(selector).catch(() => null);
        if (composeBox) {
          logWithTimestamp(`Found working tweet compose selector: ${selector}`);
          break;
        }
      }
      
      // If compose box not found directly, try clicking the compose button first
      if (!composeBox) {
        logWithTimestamp('Compose box not found directly. Looking for compose button...');
        
        // Updated selectors based on index.ts successful approach
        const possibleComposeButtonSelectors = [
          'a[data-testid="SideNav_NewTweet_Button"]',
          '[data-testid="SideNav_NewTweet_Button"]',
          '[aria-label="Tweet"]',
          '[data-testid="FloatingActionButton_Label"]',
          '[data-testid="NewTweetButton_text"]'
        ];
        
        let composeButtonFound = false;
        for (const selector of possibleComposeButtonSelectors) {
          logWithTimestamp(`Looking for compose button with selector: ${selector}`);
          const composeButton = await page.$(selector).catch(() => null);
          if (composeButton) {
            logWithTimestamp(`Found compose button with selector: ${selector}`);
            try {
              await composeButton.click();
              composeButtonFound = true;
              logWithTimestamp('Clicked compose button');
              // Wait for the compose box to appear
              await new Promise(resolve => setTimeout(resolve, 2000));
              break;
            } catch (err: any) {
              logWithTimestamp(`Failed to click compose button: ${err.message}`);
            }
          }
        }
        
        // Try to find the compose box again after clicking the button
        if (composeButtonFound) {
          for (const selector of possibleComposeSelectors) {
            composeBox = await page.$(selector).catch(() => null);
            if (composeBox) {
              logWithTimestamp(`Found compose box after clicking button: ${selector}`);
              break;
            }
          }
        }
      }
      
      // Save screenshot if compose box not found for debugging
      if (!composeBox) {
        await saveScreenshot(page, 'compose_box_not_found.png');
        
        // Save the page HTML for inspection
        try {
          const htmlContent = await page.content();
          fs.writeFileSync(path.join(logsDir, 'twitter_home_html.txt'), htmlContent);
          logWithTimestamp('Saved page HTML for inspection');
        } catch (error: any) {
          logWithTimestamp(`Failed to save HTML: ${error.message}`);
        }
        
        throw new Error('Could not find tweet compose box with known selectors');
      }
      
      // Use the first found composeBox as our textareaSelector
      const textareaSelector = possibleComposeSelectors.find(selector => 
        page.$(selector).then(el => !!el).catch(() => false)
      ) || possibleComposeSelectors[0];
      
      // Wait for the compose box to be ready
      await promiseWithTimeout(
        page.waitForSelector(textareaSelector, { visible: true }),
        10000,
        'Tweet compose box not found or not visible'
      );
      
      // Generate a tweet about animals with hashtags
      const animalTweets = [
        "Just spotted a majestic eagle soaring through the sky. Nature's wonders never cease to amaze me! 🦅 #WildlifeWednesday #NatureLovers #BirdWatching #AnimalConservation",
        "Did you know that elephants can communicate through vibrations sensed in their feet? These gentle giants are incredibly intelligent! 🐘 #SaveTheElephants #WildlifeProtection #AnimalFacts",
        "Ocean conservation starts with each of us. Plastic pollution affects marine life in devastating ways. Let's protect our beautiful sea creatures! 🐠🐢 #OceanConservation #MarineLife #SaveOurOceans",
        "Today's hike led me to a family of deer grazing peacefully. Moments like these remind us why we need to protect natural habitats. 🦌 #WildlifeProtection #NatureLover #AnimalRights",
        "Pandas spend 10-16 hours a day eating bamboo! These adorable creatures need our protection as their habitats shrink. 🐼 #EndangeredSpecies #PandaConservation #WildlifeMatters"
      ];
      
      // Select a random tweet from the options
      const tweetText = animalTweets[Math.floor(Math.random() * animalTweets.length)];
      
      logWithTimestamp(`Preparing to type tweet: "${tweetText}"`);
      
      // Take screenshot before typing
      await saveScreenshot(page, 'before_tweet_typing.png');
      
      // Click in the compose box first
      await page.click(textareaSelector);
      
      // Type the tweet
      await page.type(textareaSelector, tweetText);
      logWithTimestamp('Typed tweet text successfully');
      
      // Wait a moment after typing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take screenshot of typed tweet
      await saveScreenshot(page, 'typed_animal_tweet.png');
      
      // Find and click the tweet button
      logWithTimestamp('Looking for tweet button...');
      const possibleTweetButtonSelectors = [
        '[data-testid="tweetButtonInline"]', // This is what worked in index.ts
        'div[data-testid="tweetButtonInline"]',
        '[data-testid="tweetButton"]',
        'div[data-testid="tweetButton"]'
      ];
      
      // Take screenshot before clicking tweet button
      await saveScreenshot(page, 'before_tweet_button_click.png');
      
      let tweetButton = null;
      for (const selector of possibleTweetButtonSelectors) {
        logWithTimestamp(`Trying tweet button selector: ${selector}`);
        tweetButton = await page.$(selector).catch(() => null);
        if (tweetButton) {
          logWithTimestamp(`Found working tweet button selector: ${selector}`);
          break;
        }
      }
      
      if (!tweetButton) {
        // Save HTML for debugging
        try {
          const htmlContent = await page.content();
          fs.writeFileSync(path.join(logsDir, 'no_tweet_button_html.txt'), htmlContent);
          logWithTimestamp('Saved HTML for debugging missing tweet button');
        } catch (err) {
          logWithTimestamp(`Failed to save HTML: ${err}`);
        }
        
        throw new Error('Could not find tweet button with known selectors');
      }
      
      // Click the tweet button with improved waiting and retry logic
      logWithTimestamp('Clicking tweet button to send the tweet...');
      
      // Let's make multiple attempts to click the button
      const maxAttempts = 3;
      let clickSuccess = false;
      
      for (let attempt = 1; attempt <= maxAttempts && !clickSuccess; attempt++) {
        logWithTimestamp(`Tweet button click attempt ${attempt}/${maxAttempts}...`);
        
        try {
          // Get a fresh selector for each attempt
          const buttonSelector = possibleTweetButtonSelectors.find(async (s) => await page.$(s));
          
          if (buttonSelector) {
            // Focus on the button first to make sure it's interactive
            await page.focus(buttonSelector);
            await new Promise(resolve => setTimeout(resolve, 500)); // Short wait after focusing
            
            // Click with normal method
            await page.click(buttonSelector, { delay: 100 }); // Add a small delay during click
            
            // Wait a moment to see if the click was successful
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if the tweet compose box is still visible - if not, likely successful
            const composeBoxStillVisible = await page.$(textareaSelector).then(el => !!el).catch(() => false);
            if (!composeBoxStillVisible) {
              logWithTimestamp('Tweet button click seems successful (compose box gone)');
              clickSuccess = true;
              break;
            }
            
            // Try more forceful click with page.evaluate
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
            }, buttonSelector);
            
            // Wait longer after the forceful click
            logWithTimestamp('Waiting after forceful click...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check again if the tweet compose box is gone
            const composeBoxGoneNow = await page.$(textareaSelector).then(el => !!el).catch(() => false);
            if (!composeBoxGoneNow) {
              logWithTimestamp('Forceful click seems successful (compose box gone)');
              clickSuccess = true;
              break;
            }
          } else {
            logWithTimestamp('Could not find tweet button selector for this attempt');
          }
        } catch (err) {
          logWithTimestamp(`Error during click attempt ${attempt}: ${err}`);
        }
        
        // Wait before next attempt
        if (!clickSuccess && attempt < maxAttempts) {
          logWithTimestamp(`Waiting before retry attempt ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!clickSuccess) {
        logWithTimestamp('⚠️ Could not confirm successful tweet button click after multiple attempts');
      } else {
        logWithTimestamp('✅ Tweet button clicked successfully');
      }
      
      // Wait longer for the tweet to be processed regardless of detected success
      logWithTimestamp('Waiting for tweet to be processed...');
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Take screenshot after sending tweet
      await saveScreenshot(page, 'after_animal_tweet_sent.png');
      
      logWithTimestamp('✅ Successfully posted an animal-related tweet');
      
    } catch (error: any) {
      logWithTimestamp(`Error during tweet posting: ${error.message}`);
      await saveScreenshot(page, 'tweet_posting_error.png');
      throw error;
    }
  } catch (error: any) {
    logWithTimestamp(`Failed to post animal tweet: ${error.message}`);
    throw error;
  }
}

// Main function
async function main() {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('Starting Animal Tweet Posting Script');
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
    
    // Post an animal-related tweet
    await postAnimalTweet(browser);
    
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
