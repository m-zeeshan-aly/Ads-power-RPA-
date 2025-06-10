// generic_retweet_human.ts
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

// Define retweet input interface
export interface RetweetInput {
  // At least one of these must be provided
  username?: string;        // Target username (e.g., "ImranKhanPTI", "PTIofficial")
  searchQuery?: string;     // Search terms to find tweets (e.g., "Imran Khan", "PTI politics")
  tweetContent?: string;    // Specific content to look for in tweets
  profileUrl?: string;      // Direct profile URL to visit
  
  // Optional parameters
  retweetCount?: number;    // Number of tweets to retweet (default: 1)
  scrollTime?: number;      // Time to scroll in milliseconds (default: 10000)
  searchInFeed?: boolean;   // Whether to search in home feed first (default: true)
  visitProfile?: boolean;   // Whether to visit profile if feed search fails (default: true)
  behaviorType?: BehaviorType; // Human behavior pattern to use (default: SOCIAL_ENGAGER)
}

// Define human behavior types
export enum BehaviorType {
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
  scrollPauseTime: { min: number; max: number };
  hoverTime: { min: number; max: number };
  readingTime: { min: number; max: number };
  actionDelays: { min: number; max: number };
  thinkingPauseChance: number;
  thinkingPauseDuration: { min: number; max: number };
  scrollBehavior: { scrollsPerAction: { min: number; max: number }; scrollDistance: { min: number; max: number } };
}

// Human behavior configurations
const HUMAN_BEHAVIORS: Record<BehaviorType, BehaviorPattern> = {
  [BehaviorType.CASUAL_BROWSER]: {
    name: 'Casual Browser',
    description: 'Scrolls extensively, takes time to read, natural pauses',
    preScrollTime: { min: 8000, max: 15000 },
    scrollPauseTime: { min: 800, max: 1500 },
    hoverTime: { min: 400, max: 800 },
    readingTime: { min: 2000, max: 4000 },
    actionDelays: { min: 1000, max: 2500 },
    thinkingPauseChance: 0.15,
    thinkingPauseDuration: { min: 1000, max: 2500 },
    scrollBehavior: { scrollsPerAction: { min: 3, max: 6 }, scrollDistance: { min: 250, max: 450 } }
  },
  
  [BehaviorType.FOCUSED_POSTER]: {
    name: 'Focused Poster',
    description: 'Minimal scrolling, direct approach, quick decisions',
    preScrollTime: { min: 2000, max: 5000 },
    scrollPauseTime: { min: 300, max: 600 },
    hoverTime: { min: 200, max: 400 },
    readingTime: { min: 800, max: 1500 },
    actionDelays: { min: 500, max: 1200 },
    thinkingPauseChance: 0.08,
    thinkingPauseDuration: { min: 300, max: 800 },
    scrollBehavior: { scrollsPerAction: { min: 1, max: 3 }, scrollDistance: { min: 200, max: 350 } }
  },
  
  [BehaviorType.SOCIAL_ENGAGER]: {
    name: 'Social Engager',
    description: 'Moderate scrolling, careful selection, thoughtful interaction',
    preScrollTime: { min: 6000, max: 12000 },
    scrollPauseTime: { min: 500, max: 1000 },
    hoverTime: { min: 300, max: 600 },
    readingTime: { min: 1500, max: 3000 },
    actionDelays: { min: 800, max: 1800 },
    thinkingPauseChance: 0.12,
    thinkingPauseDuration: { min: 500, max: 1500 },
    scrollBehavior: { scrollsPerAction: { min: 2, max: 4 }, scrollDistance: { min: 200, max: 400 } }
  },
  
  [BehaviorType.QUICK_POSTER]: {
    name: 'Quick Poster',
    description: 'Fast scrolling, minimal delays, efficient retweeting',
    preScrollTime: { min: 1000, max: 3000 },
    scrollPauseTime: { min: 200, max: 400 },
    hoverTime: { min: 150, max: 300 },
    readingTime: { min: 500, max: 1000 },
    actionDelays: { min: 300, max: 800 },
    thinkingPauseChance: 0.05,
    thinkingPauseDuration: { min: 200, max: 500 },
    scrollBehavior: { scrollsPerAction: { min: 1, max: 2 }, scrollDistance: { min: 300, max: 500 } }
  },
  
  [BehaviorType.THOUGHTFUL_WRITER]: {
    name: 'Thoughtful Writer',
    description: 'Extensive reading, long pauses, careful consideration',
    preScrollTime: { min: 10000, max: 20000 },
    scrollPauseTime: { min: 1000, max: 2000 },
    hoverTime: { min: 500, max: 1000 },
    readingTime: { min: 3000, max: 6000 },
    actionDelays: { min: 1500, max: 3000 },
    thinkingPauseChance: 0.20,
    thinkingPauseDuration: { min: 1000, max: 3000 },
    scrollBehavior: { scrollsPerAction: { min: 4, max: 8 }, scrollDistance: { min: 150, max: 300 } }
  }
};

// Helper function to log with timestamps
function logWithTimestamp(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(path.join(logsDir, 'generic_retweet_human.log'), logMessage + '\n');
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

// Function to get WebSocket URL from .env file
export async function getWebSocketUrl(): Promise<string> {
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
      throw new Error('WebSocket endpoint not configured');
    }
    
    return wsEndpoint;
  } catch (error: any) {
    logWithTimestamp(`Error getting WebSocket URL: ${error.message}`);
    throw error;
  }
}

// Function to connect to browser
export async function connectToBrowser(wsEndpoint: string): Promise<puppeteer.Browser> {
  try {
    logWithTimestamp('Connecting to browser...');
    const browser = await puppeteer.connect({ 
      browserWSEndpoint: wsEndpoint,
      defaultViewport: null
    });
    
    logWithTimestamp('Successfully connected to browser');
    return browser;
  } catch (error: any) {
    logWithTimestamp(`Failed to connect to browser: ${error.message}`);
    throw error;
  }
}

// Function to generate random number within range
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to simulate human-like reading pause
async function simulateReading(behavior: BehaviorPattern): Promise<void> {
  const readingTime = randomBetween(behavior.readingTime.min, behavior.readingTime.max);
  logWithTimestamp(`Simulating reading for ${readingTime}ms...`);
  await new Promise(resolve => setTimeout(resolve, readingTime));
}

// Function to simulate human thinking pause
async function simulateThinking(behavior: BehaviorPattern): Promise<void> {
  if (Math.random() < behavior.thinkingPauseChance) {
    const thinkingTime = randomBetween(behavior.thinkingPauseDuration.min, behavior.thinkingPauseDuration.max);
    logWithTimestamp(`Taking a thinking pause for ${thinkingTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, thinkingTime));
  }
}

// Function to perform human-like scrolling
async function humanScroll(page: puppeteer.Page, behavior: BehaviorPattern, duration: number = 10000): Promise<void> {
  logWithTimestamp(`Starting human-like scrolling for ${duration}ms with ${behavior.name} behavior`);
  
  const scrollStartTime = Date.now();
  let scrollCount = 0;
  
  while (Date.now() - scrollStartTime < duration) {
    scrollCount++;
    
    // Random scroll distance based on behavior
    const scrollDistance = randomBetween(
      behavior.scrollBehavior.scrollDistance.min, 
      behavior.scrollBehavior.scrollDistance.max
    );
    
    await page.evaluate((distance) => {
      window.scrollBy(0, distance);
    }, scrollDistance);
    
    // Pause between scrolls
    const pauseTime = randomBetween(behavior.scrollPauseTime.min, behavior.scrollPauseTime.max);
    await new Promise(resolve => setTimeout(resolve, pauseTime));
    
    // Occasional thinking pauses
    await simulateThinking(behavior);
  }
  
  logWithTimestamp(`Completed scrolling (${scrollCount} scrolls)`);
}

// Function to search for tweets in home feed
async function searchInHomeFeed(
  page: puppeteer.Page, 
  input: RetweetInput, 
  behavior: BehaviorPattern
): Promise<boolean> {
  logWithTimestamp('Starting search in home feed...');
  
  try {
    // Navigate to Twitter home if not already there
    const currentUrl = await page.url();
    if (!currentUrl.includes('twitter.com/home') && !currentUrl.includes('x.com/home')) {
      logWithTimestamp('Navigating to Twitter home page...');
      await promiseWithTimeout(
        page.goto('https://twitter.com/home', { waitUntil: 'networkidle2' }),
        60000,
        'Navigation to Twitter home page timed out'
      );
    }
    
    await saveScreenshot(page, 'twitter_home_for_retweet.png');
    
    // Human-like pre-scrolling behavior
    const preScrollTime = randomBetween(behavior.preScrollTime.min, behavior.preScrollTime.max);
    logWithTimestamp(`Pre-scrolling for ${preScrollTime}ms before looking for tweets...`);
    await humanScroll(page, behavior, preScrollTime);
    
    // Look for matching tweets while scrolling
    const searchTerms = [
      input.username ? input.username : '',
      input.searchQuery ? input.searchQuery : '',
      input.tweetContent ? input.tweetContent : ''
    ].filter(term => term.length > 0);
    
    if (searchTerms.length === 0) {
      logWithTimestamp('No search terms provided for home feed search');
      return false;
    }
    
    logWithTimestamp(`Searching for tweets containing: ${searchTerms.join(', ')}`);
    
    // Scroll and search for matching content
    const searchStartTime = Date.now();
    const maxSearchTime = input.scrollTime || 15000; // Default 15 seconds
    let foundTargetPost = false;
    
    while (Date.now() - searchStartTime < maxSearchTime && !foundTargetPost) {
      // Check for matching tweets
      const matchingPosts = await page.evaluate((terms) => {
        const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
        const matching = posts.filter(post => {
          if (!post.textContent) return false;
          return terms.some(term => 
            post.textContent!.toLowerCase().includes(term.toLowerCase())
          );
        });
        return matching.length;
      }, searchTerms);
      
      if (matchingPosts > 0) {
        logWithTimestamp(`Found ${matchingPosts} matching posts in home feed`);
        foundTargetPost = true;
        break;
      }
      
      // Continue scrolling
      const scrollDistance = randomBetween(
        behavior.scrollBehavior.scrollDistance.min,
        behavior.scrollBehavior.scrollDistance.max
      );
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, scrollDistance);
      
      await new Promise(resolve => setTimeout(resolve, 
        randomBetween(behavior.scrollPauseTime.min, behavior.scrollPauseTime.max)
      ));
    }
    
    return foundTargetPost;
    
  } catch (error: any) {
    logWithTimestamp(`Error during home feed search: ${error.message}`);
    return false;
  }
}

// Function to search for profile via search box
async function searchForProfile(
  page: puppeteer.Page, 
  input: RetweetInput, 
  behavior: BehaviorPattern
): Promise<boolean> {
  logWithTimestamp('Attempting to search for profile using search box...');
  
  try {
    // Find search box
    const searchBoxSelectors = [
      'input[aria-label="Search query"]',
      'input[data-testid="SearchBox_Search_Input"]',
      'input[placeholder="Search Twitter"]',
      'input[placeholder="Search"]'
    ];
    
    let searchBoxFound = false;
    for (const selector of searchBoxSelectors) {
      try {
        const searchBox = await page.$(selector);
        if (searchBox) {
          logWithTimestamp(`Found search box with selector: ${selector}`);
          
          // Human-like hover and pause before clicking
          await page.hover(selector);
          await new Promise(resolve => setTimeout(resolve, 
            randomBetween(behavior.hoverTime.min, behavior.hoverTime.max)
          ));
          await page.click(selector);
          
          searchBoxFound = true;
          break;
        }
      } catch (err) {
        continue;
      }
    }
    
    if (!searchBoxFound) {
      logWithTimestamp('Could not find search box');
      return false;
    }
    
    // Determine search query
    const searchQuery = input.username || input.searchQuery || '';
    if (!searchQuery) {
      logWithTimestamp('No search query available');
      return false;
    }
    
    logWithTimestamp(`Typing search query: "${searchQuery}"`);
    
    // Human-like typing
    for (let i = 0; i < searchQuery.length; i++) {
      await page.keyboard.type(searchQuery[i], { 
        delay: randomBetween(50, 150)
      });
      await simulateThinking(behavior);
    }
    
    // Pause before pressing Enter
    await new Promise(resolve => setTimeout(resolve, 
      randomBetween(behavior.actionDelays.min, behavior.actionDelays.max)
    ));
    await page.keyboard.press('Enter');
    
    // Wait for search results
    await new Promise(resolve => setTimeout(resolve, 3000));
    await saveScreenshot(page, 'search_results_retweet.png');
    
    // Look for profile in results
    const profileSelectors = [
      `a[href="/${input.username}"]`,
      'div[data-testid="UserCell"] a[role="link"]',
      'div[data-testid="TypeaheadUser"]'
    ];
    
    for (const selector of profileSelectors) {
      try {
        const profileLink = await page.$(selector);
        if (profileLink) {
          logWithTimestamp(`Found profile link with selector: ${selector}`);
          
          // Human-like hover and click
          await profileLink.hover();
          await new Promise(resolve => setTimeout(resolve, 
            randomBetween(behavior.hoverTime.min, behavior.hoverTime.max)
          ));
          await profileLink.click();
          
          // Wait for profile to load
          await new Promise(resolve => setTimeout(resolve, 3000));
          return true;
        }
      } catch (err) {
        continue;
      }
    }
    
    return false;
    
  } catch (error: any) {
    logWithTimestamp(`Error during profile search: ${error.message}`);
    return false;
  }
}

// Function to navigate directly to profile
async function navigateToProfile(
  page: puppeteer.Page, 
  input: RetweetInput, 
  behavior: BehaviorPattern
): Promise<boolean> {
  logWithTimestamp('Navigating directly to profile...');
  
  try {
    let profileUrl = input.profileUrl;
    
    // If no direct URL provided, construct from username
    if (!profileUrl && input.username) {
      profileUrl = `https://twitter.com/${input.username}`;
    }
    
    if (!profileUrl) {
      logWithTimestamp('No profile URL available for direct navigation');
      return false;
    }
    
    logWithTimestamp(`Navigating to profile: ${profileUrl}`);
    
    // Human-like pause before navigation
    await new Promise(resolve => setTimeout(resolve, 
      randomBetween(behavior.actionDelays.min, behavior.actionDelays.max)
    ));
    
    try {
      await promiseWithTimeout(
        page.goto(profileUrl, { waitUntil: 'networkidle2' }),
        60000,
        'Navigation to profile timed out'
      );
    } catch (navError: any) {
      logWithTimestamp(`Initial navigation failed: ${navError.message}. Trying with different strategy...`);
      await promiseWithTimeout(
        page.goto(profileUrl, { waitUntil: 'load' }),
        60000,
        'Second navigation attempt failed'
      );
    }
    
    await saveScreenshot(page, 'profile_page_retweet.png');
    
    // Human-like pause to "read" the profile
    await simulateReading(behavior);
    
    return true;
    
  } catch (error: any) {
    logWithTimestamp(`Error during direct profile navigation: ${error.message}`);
    return false;
  }
}

// Function to perform retweet action
async function performRetweet(
  page: puppeteer.Page, 
  behavior: BehaviorPattern, 
  isProfilePage: boolean = false
): Promise<boolean> {
  logWithTimestamp(`Attempting to retweet on ${isProfilePage ? 'profile' : 'feed'} page...`);
  
  try {
    // Wait for tweets to load
    const tweetSelectors = [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      'div[data-testid="cellInnerDiv"]',
      '[data-testid="tweetText"]'
    ];
    
    let tweetsLoaded = false;
    for (const selector of tweetSelectors) {
      try {
        await promiseWithTimeout(
          page.waitForSelector(selector, { timeout: 10000 }),
          10000,
          `Waiting for tweets with selector ${selector} timed out`
        );
        logWithTimestamp(`Found tweets with selector: ${selector}`);
        tweetsLoaded = true;
        break;
      } catch (err) {
        continue;
      }
    }
    
    if (!tweetsLoaded) {
      logWithTimestamp('No tweets found to retweet');
      return false;
    }
    
    // If on profile page, scroll a bit to see more tweets
    if (isProfilePage) {
      logWithTimestamp('Scrolling profile page to see tweets...');
      const scrollCount = randomBetween(
        behavior.scrollBehavior.scrollsPerAction.min,
        behavior.scrollBehavior.scrollsPerAction.max
      );
      
      for (let i = 0; i < scrollCount; i++) {
        const scrollDistance = randomBetween(
          behavior.scrollBehavior.scrollDistance.min,
          behavior.scrollBehavior.scrollDistance.max
        );
        await page.evaluate((distance) => {
          window.scrollBy(0, distance);
        }, scrollDistance);
        
        await new Promise(resolve => setTimeout(resolve, 
          randomBetween(behavior.scrollPauseTime.min, behavior.scrollPauseTime.max)
        ));
      }
    }
    
    await saveScreenshot(page, 'before_retweet_action.png');
    
    // Find retweet buttons
    const retweetButtons = await page.$$('[data-testid="retweet"]');
    
    if (retweetButtons.length === 0) {
      logWithTimestamp('No retweet buttons found');
      return false;
    }
    
    logWithTimestamp(`Found ${retweetButtons.length} retweet buttons`);
    
    // Human-like selection - don't always choose the first button
    const buttonIndex = retweetButtons.length > 2 ? 
      randomBetween(1, Math.min(retweetButtons.length - 1, 3)) : 0;
    
    logWithTimestamp(`Selecting retweet button #${buttonIndex + 1}`);
    
    // Check if already retweeted
    const isAlreadyRetweeted = await page.evaluate((idx) => {
      const buttons = Array.from(document.querySelectorAll('[data-testid="retweet"]'));
      if (idx >= buttons.length) return true;
      return buttons[idx].getAttribute('aria-pressed') === 'true';
    }, buttonIndex);
    
    if (isAlreadyRetweeted) {
      logWithTimestamp('Selected tweet is already retweeted, trying another...');
      
      // Try a different button
      const newIndex = buttonIndex === 0 ? 
        (retweetButtons.length > 1 ? 1 : 0) : 0;
      
      const alsoRetweeted = await page.evaluate((idx) => {
        const buttons = Array.from(document.querySelectorAll('[data-testid="retweet"]'));
        if (idx >= buttons.length) return true;
        return buttons[idx].getAttribute('aria-pressed') === 'true';
      }, newIndex);
      
      if (alsoRetweeted) {
        logWithTimestamp('Multiple tweets already retweeted, skipping...');
        return false;
      }
    }
    
    const targetIndex = isAlreadyRetweeted ? 
      (buttonIndex === 0 ? (retweetButtons.length > 1 ? 1 : 0) : 0) : buttonIndex;
    
    // Human-like hover before clicking
    await retweetButtons[targetIndex].hover();
    await new Promise(resolve => setTimeout(resolve, 
      randomBetween(behavior.hoverTime.min, behavior.hoverTime.max)
    ));
    
    // Click retweet button
    await retweetButtons[targetIndex].click();
    
    // Wait for retweet menu to appear
    await new Promise(resolve => setTimeout(resolve, 
      randomBetween(behavior.actionDelays.min, behavior.actionDelays.max)
    ));
    
    await saveScreenshot(page, 'retweet_menu.png');
    
    // Find and click retweet confirmation
    const confirmSelectors = [
      '[data-testid="retweetConfirm"]',
      'div[data-testid="retweetConfirm"]',
      '[role="menuitem"]:has-text("Retweet")'
    ];
    
    for (const selector of confirmSelectors) {
      try {
        const confirmButton = await page.$(selector);
        if (confirmButton) {
          logWithTimestamp(`Found retweet confirmation with selector: ${selector}`);
          
          // Human-like hover and pause
          await confirmButton.hover();
          await new Promise(resolve => setTimeout(resolve, 
            randomBetween(behavior.hoverTime.min, behavior.hoverTime.max)
          ));
          
          await confirmButton.click();
          
          // Wait for retweet to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          await saveScreenshot(page, 'after_retweet.png');
          
          logWithTimestamp('Successfully retweeted!');
          return true;
        }
      } catch (err) {
        continue;
      }
    }
    
    logWithTimestamp('Could not find retweet confirmation button');
    return false;
    
  } catch (error: any) {
    logWithTimestamp(`Error during retweet action: ${error.message}`);
    return false;
  }
}

// Main function to retweet tweets with human-like behavior
export async function retweetGenericTweetHuman(
  browser: puppeteer.Browser, 
  input: RetweetInput
): Promise<boolean> {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('Starting generic retweet operation with human-like behavior');
  logWithTimestamp('='.repeat(50));
  
  // Get behavior pattern
  const behaviorType = input.behaviorType || BehaviorType.SOCIAL_ENGAGER;
  const behavior = HUMAN_BEHAVIORS[behaviorType];
  
  logWithTimestamp(`Using behavior pattern: ${behavior.name} - ${behavior.description}`);
  logWithTimestamp(`Input: ${JSON.stringify(input, null, 2)}`);
  
  try {
    // Get or create page
    const pages = await browser.pages();
    let page: puppeteer.Page;
    
    if (pages.length === 0) {
      logWithTimestamp('No browser pages found. Creating a new page...');
      page = await browser.newPage();
    } else {
      page = pages[0];
    }
    
    logWithTimestamp(`Current page URL: ${await page.url()}`);
    await saveScreenshot(page, 'retweet_initial_state.png');
    
    let retweetSuccess = false;
    const retweetCount = input.retweetCount || 1;
    let completedRetweets = 0;
    
    // Step 1: Search in home feed (if enabled)
    if (input.searchInFeed !== false) { // Default is true
      logWithTimestamp('Step 1: Searching for tweets in home feed...');
      
      const foundInFeed = await searchInHomeFeed(page, input, behavior);
      
      if (foundInFeed) {
        logWithTimestamp('Found matching content in home feed, attempting to retweet...');
        
        for (let i = 0; i < retweetCount && completedRetweets < retweetCount; i++) {
          const success = await performRetweet(page, behavior, false);
          if (success) {
            completedRetweets++;
            logWithTimestamp(`Completed retweet ${completedRetweets}/${retweetCount}`);
            
            if (completedRetweets < retweetCount) {
              // Pause between retweets
              await new Promise(resolve => setTimeout(resolve, 
                randomBetween(behavior.actionDelays.min * 2, behavior.actionDelays.max * 2)
              ));
              
              // Scroll a bit to find more content
              await humanScroll(page, behavior, 5000);
            }
          }
        }
        
        if (completedRetweets >= retweetCount) {
          retweetSuccess = true;
        }
      }
    }
    
    // Step 2: Search for profile (if not enough retweets from feed and enabled)
    if (completedRetweets < retweetCount && input.visitProfile !== false) {
      logWithTimestamp(`Step 2: Need ${retweetCount - completedRetweets} more retweets, searching for profile...`);
      
      let profileFound = false;
      
      // Try search box first
      if (input.username || input.searchQuery) {
        profileFound = await searchForProfile(page, input, behavior);
      }
      
      // Fall back to direct navigation
      if (!profileFound) {
        profileFound = await navigateToProfile(page, input, behavior);
      }
      
      if (profileFound) {
        logWithTimestamp('Successfully found profile, attempting to retweet...');
        
        // Wait for profile to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        for (let i = completedRetweets; i < retweetCount; i++) {
          const success = await performRetweet(page, behavior, true);
          if (success) {
            completedRetweets++;
            logWithTimestamp(`Completed retweet ${completedRetweets}/${retweetCount}`);
            
            if (completedRetweets < retweetCount) {
              // Pause between retweets
              await new Promise(resolve => setTimeout(resolve, 
                randomBetween(behavior.actionDelays.min * 2, behavior.actionDelays.max * 2)
              ));
              
              // Scroll to find more tweets
              await humanScroll(page, behavior, 3000);
            }
          } else {
            logWithTimestamp('Failed to retweet, trying to scroll and find more tweets...');
            await humanScroll(page, behavior, 5000);
          }
        }
        
        if (completedRetweets >= retweetCount) {
          retweetSuccess = true;
        }
      }
    }
    
    // Human-like: Return to home page if successful
    if (retweetSuccess) {
      logWithTimestamp('Retweet operation successful, returning to home page...');
      
      await new Promise(resolve => setTimeout(resolve, 
        randomBetween(behavior.actionDelays.min, behavior.actionDelays.max)
      ));
      
      // Try to find home button
      const homeSelectors = [
        'a[aria-label="Home"]',
        'a[href="/home"]',
        'a[data-testid="AppTabBar_Home_Link"]'
      ];
      
      let homeFound = false;
      for (const selector of homeSelectors) {
        try {
          const homeButton = await page.$(selector);
          if (homeButton) {
            await homeButton.hover();
            await new Promise(resolve => setTimeout(resolve, 
              randomBetween(behavior.hoverTime.min, behavior.hoverTime.max)
            ));
            await homeButton.click();
            homeFound = true;
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      if (!homeFound) {
        await page.goto('https://twitter.com/home', { waitUntil: 'load' });
      }
      
      // Final human-like browsing
      await new Promise(resolve => setTimeout(resolve, 3000));
      await saveScreenshot(page, 'final_home_page.png');
      
      // Brief final scroll
      await humanScroll(page, behavior, 3000);
    }
    
    logWithTimestamp(`Retweet operation completed. Success: ${retweetSuccess}, Completed: ${completedRetweets}/${retweetCount}`);
    return retweetSuccess;
    
  } catch (error: any) {
    logWithTimestamp(`Error during generic retweet operation: ${error.message}`);
    
    try {
      const pages = await browser.pages();
      if (pages.length > 0) {
        await saveScreenshot(pages[0], 'retweet_error.png');
      }
    } catch (err) {
      logWithTimestamp('Could not take error screenshot');
    }
    
    return false;
  }
}

// Export behavior types for external use
export { HUMAN_BEHAVIORS };
