// custom_tweet_human.ts
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

// Define tweet input interface
interface TweetInput {
  message: string;
  hashtags?: string[];
  mentions?: string[];
}

// Define human behavior types
enum BehaviorType {
  CASUAL_BROWSER = 'casual_browser',
  FOCUSED_POSTER = 'focused_poster',
  SOCIAL_ENGAGER = 'social_engager',
  QUICK_POSTER = 'quick_poster',
  THOUGHTFUL_WRITER = 'thoughtful_writer'
}

// Define behavior patterns
interface BehaviorPattern {
  name: string;
  description: string;
  preScrollTime: { min: number; max: number };
  typingSpeed: { min: number; max: number };
  thinkingPauseChance: number;
  thinkingPauseDuration: { min: number; max: number };
  reviewTime: { min: number; max: number };
  postScrollTime: { min: number; max: number };
  hoverTime: { min: number; max: number };
  actionDelays: { min: number; max: number };
}

// Human behavior configurations
const HUMAN_BEHAVIORS: Record<BehaviorType, BehaviorPattern> = {
  [BehaviorType.CASUAL_BROWSER]: {
    name: 'Casual Browser',
    description: 'Scrolls extensively, types casually, takes time to think',
    preScrollTime: { min: 8000, max: 15000 },
    typingSpeed: { min: 80, max: 200 },
    thinkingPauseChance: 0.15,
    thinkingPauseDuration: { min: 800, max: 2000 },
    reviewTime: { min: 3000, max: 6000 },
    postScrollTime: { min: 4000, max: 8000 },
    hoverTime: { min: 400, max: 800 },
    actionDelays: { min: 1000, max: 2500 }
  },
  
  [BehaviorType.FOCUSED_POSTER]: {
    name: 'Focused Poster',
    description: 'Minimal scrolling, direct approach, steady typing',
    preScrollTime: { min: 2000, max: 5000 },
    typingSpeed: { min: 60, max: 120 },
    thinkingPauseChance: 0.08,
    thinkingPauseDuration: { min: 300, max: 800 },
    reviewTime: { min: 1500, max: 3000 },
    postScrollTime: { min: 1000, max: 3000 },
    hoverTime: { min: 200, max: 400 },
    actionDelays: { min: 500, max: 1200 }
  },
  
  [BehaviorType.SOCIAL_ENGAGER]: {
    name: 'Social Engager',
    description: 'Moderate scrolling, checks engagement, thoughtful posting',
    preScrollTime: { min: 6000, max: 12000 },
    typingSpeed: { min: 70, max: 150 },
    thinkingPauseChance: 0.12,
    thinkingPauseDuration: { min: 500, max: 1500 },
    reviewTime: { min: 2500, max: 5000 },
    postScrollTime: { min: 3000, max: 6000 },
    hoverTime: { min: 300, max: 600 },
    actionDelays: { min: 800, max: 1800 }
  },
  
  [BehaviorType.QUICK_POSTER]: {
    name: 'Quick Poster',
    description: 'Fast typing, minimal delays, efficient posting',
    preScrollTime: { min: 1000, max: 3000 },
    typingSpeed: { min: 40, max: 80 },
    thinkingPauseChance: 0.05,
    thinkingPauseDuration: { min: 200, max: 500 },
    reviewTime: { min: 800, max: 1500 },
    postScrollTime: { min: 500, max: 2000 },
    hoverTime: { min: 150, max: 300 },
    actionDelays: { min: 300, max: 800 }
  },
  
  [BehaviorType.THOUGHTFUL_WRITER]: {
    name: 'Thoughtful Writer',
    description: 'Long pauses, careful typing, extensive review',
    preScrollTime: { min: 10000, max: 20000 },
    typingSpeed: { min: 100, max: 250 },
    thinkingPauseChance: 0.20,
    thinkingPauseDuration: { min: 1000, max: 3000 },
    reviewTime: { min: 4000, max: 8000 },
    postScrollTime: { min: 5000, max: 10000 },
    hoverTime: { min: 500, max: 1000 },
    actionDelays: { min: 1500, max: 3000 }
  }
};

// Helper function to log with timestamps
function logWithTimestamp(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(path.join(logsDir, 'custom_tweet_human.log'), logMessage + '\n');
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
    const buffer = await page.screenshot();
    fs.writeFileSync(filePath, buffer);
    logWithTimestamp(`Screenshot saved to ${filename}`);
  } catch (error: any) {
    logWithTimestamp(`Failed to save screenshot (${filename}): ${error.message}`);
  }
}

// Function to get random value within range
function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to simulate human-like reading pause based on behavior
async function simulateReading(behavior: BehaviorPattern): Promise<void> {
  const readTime = getRandomInRange(behavior.reviewTime.min, behavior.reviewTime.max);
  logWithTimestamp(`Simulating reading for ${readTime/1000} seconds`);
  await new Promise(resolve => setTimeout(resolve, readTime));
}

// Function to simulate human typing with behavior-specific patterns
async function humanTypeText(
  page: puppeteer.Page, 
  selector: string, 
  text: string, 
  behavior: BehaviorPattern
): Promise<void> {
  await page.focus(selector);
  
  logWithTimestamp(`Typing with ${behavior.name} behavior: "${text}"`);
  
  for (let i = 0; i < text.length; i++) {
    const typingSpeed = getRandomInRange(behavior.typingSpeed.min, behavior.typingSpeed.max);
    
    await page.keyboard.type(text[i], { delay: typingSpeed });
    
    // Behavior-specific thinking pauses
    if (Math.random() < behavior.thinkingPauseChance) {
      const thinkingTime = getRandomInRange(
        behavior.thinkingPauseDuration.min, 
        behavior.thinkingPauseDuration.max
      );
      logWithTimestamp(`Thinking pause: ${thinkingTime}ms`);
      await new Promise(resolve => setTimeout(resolve, thinkingTime));
    }
  }
}

// Function to scroll like a human based on behavior
async function humanScroll(
  page: puppeteer.Page, 
  duration: number, 
  behavior: BehaviorPattern, 
  screenshotPrefix: string
): Promise<void> {
  const startTime = Date.now();
  let scrollCount = 0;
  
  logWithTimestamp(`Starting ${behavior.name} scrolling for ${duration/1000} seconds`);
  
  while (Date.now() - startTime < duration) {
    scrollCount++;
    
    const scrollAmount = Math.floor(Math.random() * 400) + 300;
    
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    
    if (scrollCount % (Math.random() > 0.5 ? 2 : 3) === 0) {
      await saveScreenshot(page, `${screenshotPrefix}_scroll_${scrollCount}.png`);
    }
    
    const pauseTime = getRandomInRange(behavior.actionDelays.min, behavior.actionDelays.max);
    await new Promise(resolve => setTimeout(resolve, pauseTime));
    
    // Behavior-specific reading pauses
    if (Math.random() < 0.25) {
      await simulateReading(behavior);
    }
  }
  
  logWithTimestamp(`Completed scrolling (${scrollCount} scrolls)`);
}

// Function to get WebSocket URL from .env file
async function getWebSocketUrl(): Promise<string> {
  try {
    logWithTimestamp('Getting WebSocket URL from .env file...');
    
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
      30000,
      'Connection to browser timed out'
    );
    
    const version = await browser.version();
    logWithTimestamp(`Successfully connected to browser. Version: ${version}`);
    
    return browser;
  } catch (error: any) {
    logWithTimestamp(`Failed to connect to browser: ${error.message}`);
    throw error;
  }
}

// Function to select random behavior
function selectRandomBehavior(): { type: BehaviorType; pattern: BehaviorPattern } {
  const behaviorTypes = Object.keys(HUMAN_BEHAVIORS) as BehaviorType[];
  const selectedType = behaviorTypes[Math.floor(Math.random() * behaviorTypes.length)];
  const pattern = HUMAN_BEHAVIORS[selectedType];
  
  logWithTimestamp(`Selected behavior: ${pattern.name} - ${pattern.description}`);
  return { type: selectedType, pattern };
}

// Function to format tweet text with hashtags and mentions
function formatTweetText(input: TweetInput): string {
  let tweetText = input.message;
  
  // Add mentions if provided
  if (input.mentions && input.mentions.length > 0) {
    const mentionsText = input.mentions.map(mention => 
      mention.startsWith('@') ? mention : `@${mention}`
    ).join(' ');
    tweetText = `${mentionsText} ${tweetText}`;
  }
  
  // Add hashtags if provided
  if (input.hashtags && input.hashtags.length > 0) {
    const hashtagsText = input.hashtags.map(hashtag => 
      hashtag.startsWith('#') ? hashtag : `#${hashtag}`
    ).join(' ');
    tweetText = `${tweetText} ${hashtagsText}`;
  }
  
  return tweetText.trim();
}

// Function to validate tweet input
function validateTweetInput(input: TweetInput): void {
  if (!input.message || input.message.trim().length === 0) {
    throw new Error('Tweet message cannot be empty');
  }
  
  const formattedText = formatTweetText(input);
  if (formattedText.length > 280) {
    throw new Error(`Tweet too long: ${formattedText.length} characters (max 280)`);
  }
  
  logWithTimestamp(`Tweet validation passed: ${formattedText.length} characters`);
}

// Main function to post a custom tweet with human-like behavior
async function postCustomTweetHuman(browser: puppeteer.Browser, tweetInput: TweetInput): Promise<void> {
  // Validate input
  validateTweetInput(tweetInput);
  
  // Select random behavior
  const { pattern: behavior } = selectRandomBehavior();
  
  const tweetText = formatTweetText(tweetInput);
  logWithTimestamp(`Starting custom tweet posting with behavior: ${behavior.name}`);
  logWithTimestamp(`Tweet content: "${tweetText}"`);
  
  try {
    // Get all pages and use the first one
    const pages = await browser.pages();
    if (pages.length === 0) {
      logWithTimestamp('No browser pages found. Creating a new page...');
      await browser.newPage();
      const newPages = await browser.pages();
      if (newPages.length === 0) {
        throw new Error('Failed to create a new page');
      }
    }
    
    const page = (await browser.pages())[0];
    logWithTimestamp(`Current page URL: ${await page.url()}`);
    
    // Take a screenshot of initial state
    await saveScreenshot(page, 'custom_tweet_initial.png');
    
    // Step 1: Navigate to Twitter home
    const twitterHomeUrl = 'https://twitter.com/home';
    logWithTimestamp(`Navigating to Twitter home page: ${twitterHomeUrl}`);
    
    try {
      await promiseWithTimeout(
        page.goto(twitterHomeUrl, { waitUntil: 'networkidle2' }),
        60000,
        'Navigation to Twitter home page timed out'
      );
    } catch (navError: any) {
      logWithTimestamp(`Initial navigation attempt failed: ${navError.message}`);
      logWithTimestamp('Trying again with different waitUntil strategy...');
      
      await promiseWithTimeout(
        page.goto(twitterHomeUrl, { waitUntil: 'load' }),
        60000,
        'Second navigation attempt to Twitter home page timed out'
      );
    }
    
    logWithTimestamp('Successfully navigated to Twitter home page');
    await saveScreenshot(page, 'twitter_home_custom.png');
    
    // Step 2: Behavior-specific pre-posting browsing
    logWithTimestamp(`Starting ${behavior.name} pre-posting behavior...`);
    
    const preScrollTime = getRandomInRange(behavior.preScrollTime.min, behavior.preScrollTime.max);
    await new Promise(resolve => setTimeout(resolve, getRandomInRange(1000, 2000)));
    
    await humanScroll(page, preScrollTime, behavior, 'pre_posting');
    
    await saveScreenshot(page, 'after_browsing_behavior.png');
    
    // Behavior-specific pause before composing
    await simulateReading(behavior);
    
    // Step 3: Find compose box or button
    logWithTimestamp('Looking for tweet compose options...');
    
    const composeBoxSelectors = [
      '[role="textbox"][tabindex="0"]',
      'div[role="textbox"]',
      'div[data-testid="tweetTextarea_0"]',
      'div[aria-label="Tweet text"]',
      'div[contenteditable="true"]'
    ];
    
    const composeButtonSelectors = [
      'a[data-testid="SideNav_NewTweet_Button"]',
      '[data-testid="SideNav_NewTweet_Button"]',
      '[aria-label="Tweet"]',
      '[data-testid="FloatingActionButton_Label"]',
      '[data-testid="NewTweetButton_text"]'
    ];
    
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
            
            // Behavior-specific hover and click timing
            const hoverTime = getRandomInRange(behavior.hoverTime.min, behavior.hoverTime.max);
            await page.hover(selector);
            await new Promise(resolve => setTimeout(resolve, hoverTime));
            
            await composeButton.click();
            composeButtonFound = true;
            logWithTimestamp('Clicked compose button');
            
            const waitTime = getRandomInRange(behavior.actionDelays.min, behavior.actionDelays.max);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      if (composeButtonFound) {
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
    
    if (!composeBox) {
      await saveScreenshot(page, 'compose_box_not_found_custom.png');
      throw new Error('Could not find tweet compose box with known selectors');
    }
    
    // Find working textarea selector
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
    
    // Behavior-specific pause before typing
    const preTypingPause = getRandomInRange(behavior.actionDelays.min, behavior.actionDelays.max);
    logWithTimestamp(`Pausing ${preTypingPause/1000}s before typing (${behavior.name} behavior)`);
    await new Promise(resolve => setTimeout(resolve, preTypingPause));
    
    // Step 4: Type the tweet with behavior-specific patterns
    await saveScreenshot(page, 'before_typing_custom.png');
    
    await page.click(textareaSelector);
    await new Promise(resolve => setTimeout(resolve, getRandomInRange(200, 500)));
    
    await humanTypeText(page, textareaSelector, tweetText, behavior);
    logWithTimestamp('Finished typing tweet text');
    
    // Behavior-specific review time
    await simulateReading(behavior);
    
    await saveScreenshot(page, 'typed_custom_tweet.png');
    
    // Step 5: Find and click the tweet button
    logWithTimestamp('Looking for tweet button...');
    
    const tweetButtonSelectors = [
      '[data-testid="tweetButtonInline"]',
      'div[data-testid="tweetButtonInline"]',
      '[data-testid="tweetButton"]',
      'div[data-testid="tweetButton"]'
    ];
    
    // Behavior-specific pause before clicking tweet button
    const preClickPause = getRandomInRange(behavior.reviewTime.min, behavior.reviewTime.max);
    logWithTimestamp(`Final review pause: ${preClickPause/1000}s`);
    await new Promise(resolve => setTimeout(resolve, preClickPause));
    
    await saveScreenshot(page, 'before_tweet_button_click_custom.png');
    
    let tweetButtonSelector = '';
    let tweetButtonFound = false;
    
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
      await saveScreenshot(page, 'tweet_button_not_found_custom.png');
      throw new Error('Could not find tweet button with known selectors');
    }
    
    // Behavior-specific hover and click
    const hoverTime = getRandomInRange(behavior.hoverTime.min, behavior.hoverTime.max);
    logWithTimestamp(`Hovering over tweet button for ${hoverTime}ms`);
    await page.hover(tweetButtonSelector);
    await new Promise(resolve => setTimeout(resolve, hoverTime));
    
    // Click with behavior-specific timing
    logWithTimestamp('Clicking tweet button to send the tweet...');
    
    const maxAttempts = 3;
    let clickSuccess = false;
    
    for (let attempt = 1; attempt <= maxAttempts && !clickSuccess; attempt++) {
      logWithTimestamp(`Tweet button click attempt ${attempt}/${maxAttempts} (${behavior.name} behavior)`);
      
      try {
        if (attempt > 1) {
          await page.focus(tweetButtonSelector);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const clickDelay = getRandomInRange(50, 150);
        await page.click(tweetButtonSelector, { delay: clickDelay });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const composeBoxStillVisible = await page.$(textareaSelector).then(el => !!el).catch(() => false);
        if (!composeBoxStillVisible) {
          logWithTimestamp('Tweet button click seems successful (compose box gone)');
          clickSuccess = true;
          break;
        }
        
        // Fallback click method
        logWithTimestamp('First click may not have worked, trying forceful click...');
        await new Promise(resolve => setTimeout(resolve, getRandomInRange(200, 400)));
        
        await page.evaluate((selector) => {
          const button = document.querySelector(selector);
          if (button) {
            ['mousedown', 'mouseup', 'click'].forEach(eventType => {
              const event = new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
                buttons: 1
              });
              button.dispatchEvent(event);
            });
            (button as HTMLElement).click();
          }
        }, tweetButtonSelector);
        
        const thinkingPause = getRandomInRange(behavior.thinkingPauseDuration.min, behavior.thinkingPauseDuration.max);
        await new Promise(resolve => setTimeout(resolve, thinkingPause));
        
        const composeBoxGoneNow = await page.$(textareaSelector).then(el => !!el).catch(() => false);
        if (!composeBoxGoneNow) {
          logWithTimestamp('Forceful click seems successful (compose box gone)');
          clickSuccess = true;
          break;
        }
      } catch (clickErr: any) {
        logWithTimestamp(`Error during click attempt ${attempt}: ${clickErr.message}`);
      }
      
      if (!clickSuccess && attempt < maxAttempts) {
        const retryPause = getRandomInRange(behavior.actionDelays.min, behavior.actionDelays.max);
        await new Promise(resolve => setTimeout(resolve, retryPause));
      }
    }
    
    if (!clickSuccess) {
      logWithTimestamp('⚠️ Could not confirm successful tweet button click after multiple attempts');
    } else {
      logWithTimestamp('✅ Tweet button clicked successfully');
    }
    
    // Wait for tweet to be processed
    const postWaitTime = getRandomInRange(behavior.actionDelays.min * 2, behavior.actionDelays.max * 2);
    logWithTimestamp(`Waiting ${postWaitTime/1000} seconds for tweet to be processed...`);
    await new Promise(resolve => setTimeout(resolve, postWaitTime));
    
    await saveScreenshot(page, 'after_custom_tweet_sent.png');
    
    // Step 6: Behavior-specific post-posting activity
    logWithTimestamp(`Starting ${behavior.name} post-posting behavior...`);
    
    const postScrollTime = getRandomInRange(behavior.postScrollTime.min, behavior.postScrollTime.max);
    await humanScroll(page, postScrollTime, behavior, 'post_posting');
    
    await saveScreenshot(page, 'final_custom_tweet_state.png');
    
    logWithTimestamp(`✅ Successfully posted custom tweet with ${behavior.name} behavior!`);
    logWithTimestamp(`Tweet content: "${tweetText}"`);
    
  } catch (error: any) {
    logWithTimestamp(`Error during custom tweet posting: ${error.message}`);
    
    try {
      const page = (await browser.pages())[0];
      await saveScreenshot(page, 'custom_tweet_error.png');
    } catch (err) {
      logWithTimestamp('Could not take error screenshot');
    }
    
    throw error;
  }
}

// Function to get user input (for CLI usage)
function getUserInput(): TweetInput {
  // This would be replaced with actual CLI input or API input
  // For now, using example input
  return {
    message: "This is a test tweet from the custom tweet system!",
    hashtags: ["automation", "twitter", "humanlike"],
    mentions: ["example_user"]
  };
}

// Main function
async function main() {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('Starting Custom Human-like Tweet Posting System');
  logWithTimestamp('='.repeat(50));
  
  // Log system info for debugging
  logWithTimestamp(`Node.js version: ${process.version}`);
  logWithTimestamp(`Platform: ${process.platform}`);
  logWithTimestamp(`Working directory: ${process.cwd()}`);
  
  let browser: puppeteer.Browser | null = null;
  
  try {
    // Get user input
    const tweetInput = getUserInput();
    logWithTimestamp(`Received tweet input: ${JSON.stringify(tweetInput)}`);
    
    // Get WebSocket URL
    const wsEndpoint = await getWebSocketUrl();
    
    // Connect to browser
    browser = await connectToBrowser(wsEndpoint);
    
    // Post custom tweet with human-like behavior
    await postCustomTweetHuman(browser, tweetInput);
    
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

// Export functions for external use
export {
  TweetInput,
  BehaviorType,
  HUMAN_BEHAVIORS,
  postCustomTweetHuman,
  connectToBrowser,
  getWebSocketUrl
};

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    logWithTimestamp(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}