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
  fs.appendFileSync(path.join(logsDir, 'animal_tweet_human.log'), logMessage + '\n');
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

// Function to simulate human-like reading pause
async function simulateReading(): Promise<void> {
  // Simulate a reading pause between 2-8 seconds
  const readTime = Math.floor(Math.random() * 6000) + 2000;
  await new Promise(resolve => setTimeout(resolve, readTime));
}

// Function to simulate human typing with variable speed
async function humanTypeText(page: puppeteer.Page, selector: string, text: string): Promise<void> {
  // Focus on the element
  await page.focus(selector);
  
  // Type each character with variable speed
  for (let i = 0; i < text.length; i++) {
    // Variable typing speed (between 50ms and 250ms per character)
    const typingSpeed = Math.floor(Math.random() * 200) + 50;
    
    // Type the character
    await page.keyboard.type(text[i], { delay: typingSpeed });
    
    // Occasionally pause for longer as if thinking (1 in 10 chance)
    if (Math.random() < 0.1) {
      const thinkingPause = Math.floor(Math.random() * 1000) + 300;
      await new Promise(resolve => setTimeout(resolve, thinkingPause));
    }
  }
}

// Function to scroll like a human
async function humanScroll(page: puppeteer.Page, duration: number = 10000): Promise<void> {
  const startTime = Date.now();
  let scrollCount = 0;
  
  // Continue scrolling until the duration is met
  while (Date.now() - startTime < duration) {
    scrollCount++;
    
    // Random scroll distance (300-700px)
    const scrollAmount = Math.floor(Math.random() * 400) + 300;
    
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    
    // Take occasional screenshot (every 2-3 scrolls)
    if (scrollCount % (Math.random() > 0.5 ? 2 : 3) === 0) {
      await saveScreenshot(page, `human_scroll_tweet_${scrollCount}.png`);
    }
    
    // Random pause between scrolls (200-1200ms)
    const pauseTime = Math.floor(Math.random() * 1000) + 200;
    await new Promise(resolve => setTimeout(resolve, pauseTime));
    
    // Occasionally pause longer as if reading content (1 in 4 chance)
    if (Math.random() < 0.25) {
      await simulateReading();
    }
  }
  
  return;
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

// Function to generate an animal-related tweet with more human-like variation
function generateAnimalTweet(): string {
  const animalTweets = [
    "Just spotted a majestic eagle soaring through the sky. Nature's wonders never cease to amaze me! 🦅 #WildlifeWednesday #NatureLovers",
    "Did you know that elephants can communicate through vibrations sensed in their feet? These gentle giants are incredibly intelligent! 🐘 #SaveTheElephants",
    "Ocean conservation starts with each of us. Plastic pollution affects marine life in devastating ways. Let's protect our sea creatures! 🐠🐢 #OceanConservation",
    "Today's hike led me to a family of deer grazing peacefully. Moments like these remind us why we need to protect natural habitats. 🦌 #WildlifeProtection",
    "Pandas spend 10-16 hours a day eating bamboo! These adorable creatures need our protection as their habitats shrink. 🐼 #EndangeredSpecies",
    "Just watched an incredible documentary about wolves. Their family structures and communication are fascinating! 🐺 #WildlifeDocumentary",
    "The monarch butterfly migration is one of nature's most incredible journeys. They travel thousands of miles! 🦋 #SaveTheMonarchs",
    "Saw the most beautiful bird today with vibrant colors! Anyone know what type it might be? 📸 #BirdWatching #NaturePhotography",
    "Tigers are down to just a few thousand in the wild. We need to do more to protect these magnificent creatures from extinction. 🐅 #SaveTheTigers",
    "Sea turtles have existed for over 100 million years, yet now they're endangered. Let's ensure they survive another million! 🐢 #MarineConservation"
  ];
  
  // Add some random hashtags to make tweets more varied and human-like
  const additionalHashtags = [
    "#AnimalLover",
    "#WildlifePhotography",
    "#NatureIsBeautiful",
    "#EarthDay",
    "#AnimalConservation",
    "#BiodiversityMatters",
    "#PlanetEarth",
    "#AnimalRights",
    "#Ecosystem",
    "#ProtectWildlife"
  ];
  
  // Select a base tweet
  const baseTweet = animalTweets[Math.floor(Math.random() * animalTweets.length)];
  
  // Decide whether to add additional hashtags (70% chance)
  if (Math.random() < 0.7) {
    // Add 1-3 random additional hashtags
    const numHashtags = Math.floor(Math.random() * 3) + 1;
    const selectedHashtags: string[] = [];
    
    // Select unique hashtags
    while (selectedHashtags.length < numHashtags) {
      const hashtag = additionalHashtags[Math.floor(Math.random() * additionalHashtags.length)];
      if (!selectedHashtags.includes(hashtag) && !baseTweet.includes(hashtag)) {
        selectedHashtags.push(hashtag);
      }
    }
    
    return baseTweet + ' ' + selectedHashtags.join(' ');
  }
  
  return baseTweet;
}

// Function to post an animal-related tweet with human-like behavior
async function postAnimalTweetHuman(browser: puppeteer.Browser): Promise<void> {
  logWithTimestamp('Starting human-like Twitter browsing and animal tweet posting operation');
  
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
    await saveScreenshot(page, 'animal_tweet_human_initial.png');
    
    // Step 1: First navigate to Twitter home - human-like behavior
    const twitterHomeUrl = 'https://twitter.com/home';
    logWithTimestamp(`Navigating to Twitter home page: ${twitterHomeUrl}`);
    
    try {
      await promiseWithTimeout(
        page.goto(twitterHomeUrl, { waitUntil: 'networkidle2' }),
        60000, // 60 second timeout
        'Navigation to Twitter home page timed out'
      );
    } catch (navError: any) {
      logWithTimestamp(`Initial navigation attempt failed: ${navError.message}`);
      logWithTimestamp('Trying again with different waitUntil strategy...');
      
      // Try again with a different navigation strategy
      await promiseWithTimeout(
        page.goto(twitterHomeUrl, { waitUntil: 'load' }),
        60000,
        'Second navigation attempt to Twitter home page timed out'
      );
    }
    
    logWithTimestamp('Successfully navigated to Twitter home page');
    await saveScreenshot(page, 'twitter_home_human_tweet.png');
    
    // Step 2: Human-like scrolling on home page for a bit before posting
    logWithTimestamp('Scrolling down the feed like a human user would before posting...');
    
    // Human-like: Wait a moment before starting to scroll
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
    
    // Scroll for about 5-15 seconds before posting (browsing behavior)
    const scrollTime = Math.floor(Math.random() * 10000) + 5000;
    await humanScroll(page, scrollTime);
    
    logWithTimestamp(`Finished scrolling for ${scrollTime/1000} seconds, now preparing to post`);
    await saveScreenshot(page, 'after_feed_scrolling_tweet.png');
    
    // Human-like: Pause to simulate deciding to post something
    await simulateReading();
    
    // Step 3: Look for the compose button or box
    logWithTimestamp('Looking for tweet compose options...');
    
    // Compose box selectors
    const composeBoxSelectors = [
      '[role="textbox"][tabindex="0"]',
      'div[role="textbox"]',
      'div[data-testid="tweetTextarea_0"]',
      'div[aria-label="Tweet text"]',
      'div[contenteditable="true"]'
    ];
    
    // Compose button selectors
    const composeButtonSelectors = [
      'a[data-testid="SideNav_NewTweet_Button"]',
      '[data-testid="SideNav_NewTweet_Button"]',
      '[aria-label="Tweet"]',
      '[data-testid="FloatingActionButton_Label"]',
      '[data-testid="NewTweetButton_text"]'
    ];
    
    // First check if compose box is directly available
    let composeBox = null;
    for (const selector of composeBoxSelectors) {
      try {
        composeBox = await page.$(selector);
        if (composeBox) {
          logWithTimestamp(`Found compose box directly with selector: ${selector}`);
          break;
        }
      } catch (err) {
        continue;
      }
    }
    
    // If no compose box found directly, look for a compose button
    if (!composeBox) {
      logWithTimestamp('Compose box not found directly. Looking for compose button...');
      
      let composeButtonFound = false;
      for (const selector of composeButtonSelectors) {
        try {
          const composeButton = await page.$(selector);
          if (composeButton) {
            logWithTimestamp(`Found compose button with selector: ${selector}`);
            
            // Human-like: Hover over button first, pause, then click
            await page.hover(selector);
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 800) + 300));
            
            await composeButton.click();
            composeButtonFound = true;
            logWithTimestamp('Clicked compose button');
            
            // Human-like: Wait a variable amount of time for the compose box to appear
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1500) + 1000));
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      // Try to find the compose box again after clicking the button
      if (composeButtonFound) {
        // Add a small extra wait for the compose box to fully appear
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        for (const selector of composeBoxSelectors) {
          try {
            composeBox = await page.$(selector);
            if (composeBox) {
              logWithTimestamp(`Found compose box after clicking button: ${selector}`);
              break;
            }
          } catch (err) {
            continue;
          }
        }
      }
    }
    
    // If still no compose box found, take screenshots and throw error
    if (!composeBox) {
      await saveScreenshot(page, 'compose_box_not_found_human.png');
      
      // Save the page HTML for inspection
      try {
        const htmlContent = await page.content();
        fs.writeFileSync(path.join(logsDir, 'twitter_home_html_human.txt'), htmlContent);
        logWithTimestamp('Saved page HTML for inspection');
      } catch (error: any) {
        logWithTimestamp(`Failed to save HTML: ${error.message}`);
      }
      
      throw new Error('Could not find tweet compose box with known selectors');
    }
    
    // Find a working textareaSelector
    let textareaSelector = '';
    for (const selector of composeBoxSelectors) {
      try {
        const exists = await page.$(selector);
        if (exists) {
          textareaSelector = selector;
          logWithTimestamp(`Using compose box selector: ${selector}`);
          break;
        }
      } catch (err) {
        continue;
      }
    }
    
    // Human-like: Take a moment before typing as if thinking what to write
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 3000) + 1500));
    
    // Step 4: Generate a tweet about animals with random variation
    const tweetText = generateAnimalTweet();
    logWithTimestamp(`Preparing to type human-like tweet: "${tweetText}"`);
    
    // Take screenshot before typing
    await saveScreenshot(page, 'before_human_tweet_typing.png');
    
    // Human-like: Click in the compose box first, pause slightly
    await page.click(textareaSelector);
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 200));
    
    // Human-like: Type with variable speed
    await humanTypeText(page, textareaSelector, tweetText);
    logWithTimestamp('Finished typing tweet text with human-like timing');
    
    // Human-like: Pause after typing as if reviewing the tweet
    await simulateReading();
    
    // Take screenshot of typed tweet
    await saveScreenshot(page, 'typed_animal_tweet_human.png');
    
    // Step 5: Find and click the tweet button
    logWithTimestamp('Looking for tweet button...');
    
    const tweetButtonSelectors = [
      '[data-testid="tweetButtonInline"]',
      'div[data-testid="tweetButtonInline"]',
      '[data-testid="tweetButton"]',
      'div[data-testid="tweetButton"]'
    ];
    
    // Human-like: Take a moment before clicking tweet button as if reviewing one last time
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
    
    // Take screenshot before clicking tweet button
    await saveScreenshot(page, 'before_human_tweet_button_click.png');
    
    let tweetButtonSelector = '';
    let tweetButtonFound = false;
    
    // Try multiple attempts to find the tweet button (sometimes it may need a moment to become available)
    for (let attempt = 0; attempt < 3 && !tweetButtonFound; attempt++) {
      if (attempt > 0) {
        logWithTimestamp(`Retry attempt ${attempt} to find tweet button...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      for (const selector of tweetButtonSelectors) {
        try {
          const exists = await page.$(selector);
          if (exists) {
            tweetButtonSelector = selector;
            tweetButtonFound = true;
            logWithTimestamp(`Found tweet button with selector: ${selector}`);
            break;
          }
        } catch (err) {
          continue;
        }
      }
    }
    
    if (!tweetButtonSelector) {
      // Take a screenshot specifically for this error
      await saveScreenshot(page, 'tweet_button_not_found_human.png');
      throw new Error('Could not find tweet button with known selectors');
    }
    
    // Human-like: Hover over the tweet button first
    logWithTimestamp('Hovering over tweet button before clicking...');
    await page.hover(tweetButtonSelector);
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 700) + 300));
    
    // Click the tweet button with improved waiting and retry logic
    logWithTimestamp('Clicking tweet button to send the tweet...');
    
    const maxAttempts = 3;
    let clickSuccess = false;
    
    for (let attempt = 1; attempt <= maxAttempts && !clickSuccess; attempt++) {
      logWithTimestamp(`Tweet button click attempt ${attempt}/${maxAttempts}...`);
      
      try {
        if (attempt > 1) {
          // Focus on the button first to make sure it's interactive
          await page.focus(tweetButtonSelector);
          await new Promise(resolve => setTimeout(resolve, 500)); // Short wait after focusing
        }
        
        // Add a natural-looking delay during click (human-like)
        const clickDelay = Math.floor(Math.random() * 150) + 50;
        await page.click(tweetButtonSelector, { delay: clickDelay });
        
        // Wait a moment to see if the click was successful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if the tweet compose box is still visible - if not, likely successful
        const composeBoxStillVisible = await page.$(textareaSelector).then(el => !!el).catch(() => false);
        if (!composeBoxStillVisible) {
          logWithTimestamp('Tweet button click seems successful (compose box gone)');
          clickSuccess = true;
          break;
        }
        
        // Try more forceful click with page.evaluate (but still with human-like timing)
        logWithTimestamp('First click may not have worked, trying forceful click...');
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 400) + 200));
        
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
        }, tweetButtonSelector);
        
        // Wait longer after the forceful click (human-like pause)
        const thinkingPause = Math.floor(Math.random() * 1000) + 1500;
        logWithTimestamp(`Waiting ${thinkingPause/1000}s after forceful click...`);
        await new Promise(resolve => setTimeout(resolve, thinkingPause));
        
        // Check again if the tweet compose box is gone
        const composeBoxGoneNow = await page.$(textareaSelector).then(el => !!el).catch(() => false);
        if (!composeBoxGoneNow) {
          logWithTimestamp('Forceful click seems successful (compose box gone)');
          clickSuccess = true;
          break;
        }
      } catch (clickErr: any) {
        logWithTimestamp(`Error during click attempt ${attempt}: ${clickErr.message}`);
      }
      
      // Wait before next attempt (human-like pause)
      if (!clickSuccess && attempt < maxAttempts) {
        const retryPause = Math.floor(Math.random() * 1000) + 1500;
        logWithTimestamp(`Waiting ${retryPause/1000}s before retry attempt ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, retryPause));
      }
    }
    
    if (!clickSuccess) {
      logWithTimestamp('⚠️ Could not confirm successful tweet button click after multiple attempts');
    } else {
      logWithTimestamp('✅ Tweet button clicked successfully');
    }
    
    // Human-like: Wait varying amount of time for tweet to process
    const postWaitTime = Math.floor(Math.random() * 3000) + 5000;
    logWithTimestamp(`Waiting ${postWaitTime/1000} seconds for tweet to be processed...`);
    await new Promise(resolve => setTimeout(resolve, postWaitTime));
    
    // Take screenshot after sending tweet
    await saveScreenshot(page, 'after_human_animal_tweet_sent.png');
    
    // Step 6: Human-like - Scroll the feed again a bit after posting
    logWithTimestamp('Tweet posted! Now scrolling feed for a bit like a human would...');
    
    // Human-like: Variable scroll time after posting
    const afterPostScrollTime = Math.floor(Math.random() * 7000) + 3000;
    await humanScroll(page, afterPostScrollTime);
    
    logWithTimestamp(`Scrolled feed for ${afterPostScrollTime/1000} seconds after posting`);
    await saveScreenshot(page, 'final_feed_after_human_tweet.png');
    
    logWithTimestamp('✅ Successfully posted an animal-related tweet with human-like behavior');
    
  } catch (error: any) {
    logWithTimestamp(`Error during human-like tweet posting: ${error.message}`);
    
    // Take a screenshot of the error state
    try {
      const page = (await browser.pages())[0];
      await saveScreenshot(page, 'human_tweet_posting_error.png');
    } catch (err) {
      logWithTimestamp('Could not take error screenshot');
    }
    
    throw error;
  }
}

// Main function
async function main() {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('Starting Human-like Animal Tweet Posting Script');
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
    
    // Post an animal-related tweet with human-like behavior
    await postAnimalTweetHuman(browser);
    
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
