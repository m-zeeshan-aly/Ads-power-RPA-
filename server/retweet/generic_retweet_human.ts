// generic_retweet_human.ts - Refactored to use shared utilities
import * as puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';

// Import shared utilities
import { 
  BehaviorType, 
  BehaviorPattern,
  getRandomBehavior,
  getBehaviorOrDefault 
} from '../shared/human-behavior';
import { 
  humanScroll, 
  humanTypeText, 
  simulateReading, 
  humanClick,
  humanDelay,
  humanHover,
  humanNavigate,
  selectHumanLikeIndex,
  simulateThinking
} from '../shared/human-actions';
import { 
  logWithTimestamp, 
  promiseWithTimeout, 
  saveScreenshot, 
  randomBetween,
  cleanUsername,
  formatTwitterProfileUrl
} from '../shared/utilities';
import { 
  TWITTER_SELECTORS,
  waitForAnySelector,
  clickWithSelectors,
  findTweetsWithText,
  clickButtonInTweet,
  ensureOnTwitterHome
} from '../shared/selectors';
import { getBrowserConnection } from '../shared/browser-connection';

// Load environment variables from .env file
dotenv.config();

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

// Function to validate retweet input
function validateRetweetInput(input: RetweetInput): { isValid: boolean; error?: string } {
  if (!input.username && !input.searchQuery && !input.tweetContent && !input.profileUrl) {
    return {
      isValid: false,
      error: 'At least one of username, searchQuery, tweetContent, or profileUrl must be provided'
    };
  }
  
  if (input.retweetCount && (input.retweetCount < 1 || input.retweetCount > 10)) {
    return {
      isValid: false,
      error: 'retweetCount must be between 1 and 10'
    };
  }
  
  return { isValid: true };
}

// Function to check if a post matches the criteria
function doesPostMatch(postText: string, input: RetweetInput): boolean {
  const lowerText = postText.toLowerCase();
  
  // Check username
  if (input.username) {
    const username = cleanUsername(input.username);
    if (lowerText.includes(username)) return true;
  }
  
  // Check search query
  if (input.searchQuery) {
    const queryTerms = input.searchQuery.toLowerCase().split(' ');
    if (queryTerms.some(term => lowerText.includes(term))) return true;
  }
  
  // Check tweet content
  if (input.tweetContent) {
    const contentTerms = input.tweetContent.toLowerCase().split(' ');
    if (contentTerms.some(term => lowerText.includes(term))) return true;
  }
  
  return false;
}

// Function to perform retweet action with behavior patterns
async function performRetweet(
  page: puppeteer.Page, 
  behavior: BehaviorPattern, 
  postIndex: number
): Promise<boolean> {
  try {
    // Scroll to the post using human-like behavior
    await page.evaluate((index) => {
      const containers = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
      if (containers[index]) {
        containers[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, postIndex);
    
    // Human pause after scrolling to read the post
    await simulateReading(behavior);
    
    // Take screenshot before retweeting
    await saveScreenshot(page, `before_retweet_post_${postIndex}.png`);
    
    // Get the tweet element for this post
    const tweetElement = await page.evaluateHandle((index) => {
      const containers = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
      return containers[index];
    }, postIndex);
    
    if (!tweetElement) {
      logWithTimestamp(`Could not find tweet element for post ${postIndex}`, 'RETWEET');
      return false;
    }
    
    // Try to click retweet button for this specific tweet
    const retweetClicked = await clickButtonInTweet(tweetElement, TWITTER_SELECTORS.RETWEET_BUTTONS);
    
    if (!retweetClicked) {
      logWithTimestamp(`Could not click retweet button for post ${postIndex}`, 'RETWEET');
      return false;
    }
    
    // Wait for retweet menu to appear with human-like delay
    await humanDelay(behavior, { min: 500, max: 1500 });
    await saveScreenshot(page, `retweet_menu_${postIndex}.png`);
    
    // Find and click the "Retweet" confirmation button
    const confirmButton = await waitForAnySelector(page, [
      '[data-testid="retweetConfirm"]',
      'div[data-testid="retweetConfirm"]',
      '[role="menuitem"]:has-text("Retweet")',
      '[role="menuitem"] span:has-text("Retweet")'
    ], 5000).catch(() => null);
    
    if (confirmButton) {
      // Use shared humanHover and humanClick for consistent behavior
      await humanHover(page, confirmButton.selector, behavior);
      await humanClick(page, confirmButton.selector, behavior);
      
      // Wait for retweet to complete
      await humanDelay(behavior, { min: 1000, max: 2000 });
      await saveScreenshot(page, `after_retweet_${postIndex}.png`);
      
      logWithTimestamp(`Successfully retweeted post ${postIndex}`, 'RETWEET');
      return true;
    } else {
      logWithTimestamp(`Could not find retweet confirmation button for post ${postIndex}`, 'RETWEET');
      return false;
    }
    
  } catch (error: any) {
    logWithTimestamp(`Error retweeting post ${postIndex}: ${error.message}`, 'RETWEET');
    return false;
  }
}

// Function to retweet posts in the current page
async function retweetPostsOnCurrentPage(
  page: puppeteer.Page, 
  input: RetweetInput, 
  behavior: BehaviorPattern,
  targetCount: number
): Promise<number> {
  let retweetsCompleted = 0;
  
  try {
    // Find all tweet containers using shared selectors
    const tweetContainers = await findTweetsWithText(page, ''); // Get all tweets
    
    if (tweetContainers.length === 0) {
      logWithTimestamp('No tweet containers found on current page', 'RETWEET');
      return 0;
    }
    
    logWithTimestamp(`Found ${tweetContainers.length} tweet containers`, 'RETWEET');
    
    // Filter tweets that match our criteria
    const matchingIndices: number[] = [];
    
    for (let i = 0; i < tweetContainers.length && retweetsCompleted < targetCount; i++) {
      try {
        const tweetText = await page.evaluate((index) => {
          const containers = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
          return containers[index]?.textContent || '';
        }, i);
        
        if (doesPostMatch(tweetText, input)) {
          matchingIndices.push(i);
        }
      } catch (err) {
        continue;
      }
    }
    
    if (matchingIndices.length === 0) {
      logWithTimestamp('No matching posts found on current page', 'RETWEET');
      return 0;
    }
    
    logWithTimestamp(`Found ${matchingIndices.length} matching posts`, 'RETWEET');
    
    // Retweet matching posts
    for (const postIndex of matchingIndices) {
      if (retweetsCompleted >= targetCount) break;
      
      // Check if already retweeted
      const alreadyRetweeted = await page.evaluate((index) => {
        const containers = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
        if (containers[index]) {
          const retweetButton = containers[index].querySelector('[data-testid="retweet"]');
          return retweetButton?.getAttribute('aria-pressed') === 'true';
        }
        return false;
      }, postIndex);
      
      if (alreadyRetweeted) {
        logWithTimestamp(`Post ${postIndex} already retweeted, skipping`, 'RETWEET');
        continue;
      }
      
      const success = await performRetweet(page, behavior, postIndex);
      if (success) {
        retweetsCompleted++;
        logWithTimestamp(`✅ Successfully retweeted post ${retweetsCompleted}/${targetCount}`, 'RETWEET');
        
        if (retweetsCompleted < targetCount) {
          // Pause between retweets using behavior-specific timing
          await humanDelay(behavior, { 
            min: behavior.actionDelays.min * 2, 
            max: behavior.actionDelays.max * 2 
          });
          
          // Small scroll to potentially find more content
          await humanScroll(page, 2000, behavior);
        }
      }
    }
  } catch (error: any) {
    logWithTimestamp(`Error in retweetPostsOnCurrentPage: ${error.message}`, 'RETWEET');
  }
  
  return retweetsCompleted;
}

// Function to search and retweet in home feed
async function searchInHomeFeed(
  page: puppeteer.Page, 
  input: RetweetInput, 
  behavior: BehaviorPattern
): Promise<number> {
  logWithTimestamp('Searching for matching posts in home feed...', 'RETWEET');
  
  // Ensure we're on Twitter home
  await ensureOnTwitterHome(page);
  
  await saveScreenshot(page, 'twitter_home_retweet.png');
  
  const scrollTime = input.scrollTime || 10000;
  const retweetCount = input.retweetCount || 1;
  let retweetsCompleted = 0;
  
  // Behavior-specific pre-scroll activity
  const preScrollTime = randomBetween(behavior.preScrollTime.min, behavior.preScrollTime.max);
  logWithTimestamp(`Pre-scrolling for ${preScrollTime/1000}s with ${behavior.name} behavior`, 'RETWEET');
  await humanScroll(page, preScrollTime, behavior);
  
  // Human-like scrolling and searching using shared utilities
  logWithTimestamp(`Scrolling feed for ${scrollTime}ms looking for matching posts...`, 'RETWEET');
  
  const scrollStartTime = Date.now();
  let scrollCount = 0;
  
  while (Date.now() - scrollStartTime < scrollTime && retweetsCompleted < retweetCount) {
    scrollCount++;
    
    // Use shared humanScroll with behavior-specific patterns
    const scrollDistance = randomBetween(
      behavior.scrollBehavior.scrollDistance.min, 
      behavior.scrollBehavior.scrollDistance.max
    );
    
    await page.evaluate((distance) => {
      window.scrollBy(0, distance);
    }, scrollDistance);
    
    // Take occasional screenshots
    if (scrollCount % 2 === 0) {
      await saveScreenshot(page, `feed_scroll_retweet_${scrollCount}.png`);
    }
    
    // Try to retweet posts on current view
    const retweetsInThisView = await retweetPostsOnCurrentPage(page, input, behavior, retweetCount - retweetsCompleted);
    retweetsCompleted += retweetsInThisView;
    
    if (retweetsCompleted >= retweetCount) {
      logWithTimestamp(`Completed ${retweetsCompleted} retweets in home feed`, 'RETWEET');
      break;
    }
    
    // Human-like pause between scrolls using shared utilities
    const pauseTime = randomBetween(behavior.scrollPauseTime.min, behavior.scrollPauseTime.max);
    await new Promise(resolve => setTimeout(resolve, pauseTime));
    
    // Occasional thinking pauses based on behavior
    await simulateThinking(behavior);
  }
  
  return retweetsCompleted;
}

// Function to search and retweet on profile page
async function searchOnProfile(
  page: puppeteer.Page, 
  input: RetweetInput, 
  behavior: BehaviorPattern
): Promise<number> {
  logWithTimestamp('Searching for posts on profile page...', 'RETWEET');
  
  let profileUrl = input.profileUrl;
  
  // If no direct profile URL, try to construct one from username
  if (!profileUrl && input.username) {
    profileUrl = formatTwitterProfileUrl(input.username);
    logWithTimestamp(`Constructed profile URL: ${profileUrl}`, 'RETWEET');
  }
  
  // If still no profile URL, try to search for the profile
  if (!profileUrl && (input.username || input.searchQuery)) {
    const searchTerm = input.username || input.searchQuery;
    logWithTimestamp(`Searching for profile: ${searchTerm}`, 'RETWEET');
    
    // Navigate to search and look for profile
    await humanNavigate(page, `https://twitter.com/search?q=${encodeURIComponent(searchTerm!)}&src=typed_query&f=user`, behavior);
    
    await humanDelay(behavior, { min: 2000, max: 4000 });
    await saveScreenshot(page, 'search_results_retweet.png');
    
    // Try to find profile link in search results
    const profileLink = await waitForAnySelector(page, [
      `a[href="/${cleanUsername(searchTerm!)}"]`,
      'div[data-testid="UserCell"] a[role="link"]',
      'div[data-testid="TypeaheadUser"] a'
    ], 5000).catch(() => null);
    
    if (profileLink) {
      await humanClick(page, profileLink.selector, behavior);
      await humanDelay(behavior, { min: 2000, max: 4000 });
    } else {
      throw new Error(`Could not find profile for: ${searchTerm}`);
    }
  } else if (profileUrl) {
    // Navigate directly to profile
    await humanNavigate(page, profileUrl, behavior);
  } else {
    throw new Error('No way to determine profile to visit');
  }
  
  await saveScreenshot(page, 'profile_page_retweet.png');
  
  // Wait for tweets to load using shared utilities
  const tweetsLoaded = await waitForAnySelector(page, [
    'article[data-testid="tweet"]',
    'article[role="article"]',
    'div[data-testid="cellInnerDiv"]',
    '[data-testid="tweetText"]'
  ], 10000).catch(() => null);
  
  if (!tweetsLoaded) {
    logWithTimestamp('No tweets found on profile page', 'RETWEET');
    return 0;
  }
  
  logWithTimestamp('Profile tweets loaded successfully', 'RETWEET');
  
  // Behavior-specific browsing of profile
  await simulateReading(behavior);
  
  const retweetCount = input.retweetCount || 1;
  let retweetsCompleted = 0;
  
  // Scroll down profile to find tweets to retweet
  logWithTimestamp('Scrolling down profile to find tweets to retweet...', 'RETWEET');
  
  const scrollActions = randomBetween(
    behavior.scrollBehavior.scrollsPerAction.min,
    behavior.scrollBehavior.scrollsPerAction.max
  );
  
  for (let i = 0; i < scrollActions && retweetsCompleted < retweetCount; i++) {
    const scrollDistance = randomBetween(
      behavior.scrollBehavior.scrollDistance.min,
      behavior.scrollBehavior.scrollDistance.max
    );
    
    await page.evaluate((distance) => {
      window.scrollBy(0, distance);
    }, scrollDistance);
    
    await humanDelay(behavior, { min: 400, max: 800 });
  }
  
  await saveScreenshot(page, 'profile_after_scroll_retweet.png');
  
  // Retweet posts on profile using shared utilities
  retweetsCompleted = await retweetPostsOnCurrentPage(page, input, behavior, retweetCount);
  
  return retweetsCompleted;
}

// Main function to retweet tweets with human-like behavior
export async function retweetGenericTweetHuman(
  browser: puppeteer.Browser, 
  input: RetweetInput
): Promise<boolean> {
  logWithTimestamp('='.repeat(50), 'RETWEET');
  logWithTimestamp('Starting generic retweet operation with human-like behavior', 'RETWEET');
  logWithTimestamp('='.repeat(50), 'RETWEET');
  
  // Validate input
  const validation = validateRetweetInput(input);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  // Set defaults and get behavior pattern
  const retweetCount = input.retweetCount || 1;
  const searchInFeed = input.searchInFeed !== false;
  const visitProfile = input.visitProfile !== false;
  const behavior = getBehaviorOrDefault(input.behaviorType);
  
  logWithTimestamp(`Using behavior pattern: ${behavior.name} - ${behavior.description}`, 'RETWEET');
  logWithTimestamp(`Input: ${JSON.stringify(input, null, 2)}`, 'RETWEET');
  
  try {
    const pages = await browser.pages();
    let page: puppeteer.Page;
    
    if (pages.length === 0) {
      logWithTimestamp('No browser pages found. Creating a new page...', 'RETWEET');
      page = await browser.newPage();
    } else {
      page = pages[0];
    }
    
    logWithTimestamp(`Current page URL: ${await page.url()}`, 'RETWEET');
    await saveScreenshot(page, 'retweet_operation_initial.png');
    
    let retweetsCompleted = 0;
    let retweetSuccess = false;
    
    // Step 1: Try searching in home feed first (if enabled)
    if (searchInFeed && retweetsCompleted < retweetCount) {
      try {
        logWithTimestamp('Attempting to find posts in home feed...', 'RETWEET');
        const feedRetweets = await searchInHomeFeed(page, input, behavior);
        retweetsCompleted += feedRetweets;
        
        if (retweetsCompleted >= retweetCount) {
          retweetSuccess = true;
        }
      } catch (feedError: any) {
        logWithTimestamp(`Home feed search failed: ${feedError.message}`, 'RETWEET');
      }
    }
    
    // Step 2: Try profile page if we still need more retweets (if enabled)
    if (visitProfile && retweetsCompleted < retweetCount) {
      try {
        logWithTimestamp(`Need ${retweetCount - retweetsCompleted} more retweets, trying profile page...`, 'RETWEET');
        const profileRetweets = await searchOnProfile(page, input, behavior);
        retweetsCompleted += profileRetweets;
        
        if (retweetsCompleted >= retweetCount) {
          retweetSuccess = true;
        }
      } catch (profileError: any) {
        logWithTimestamp(`Profile search failed: ${profileError.message}`, 'RETWEET');
      }
    }
    
    // Human-like: Return to home page if successful
    if (retweetSuccess) {
      logWithTimestamp('Retweet operation successful, returning to home page...', 'RETWEET');
      
      await humanDelay(behavior);
      
      // Try to find home button using shared selectors
      const homeButton = await waitForAnySelector(page, [
        'a[aria-label="Home"]',
        'a[href="/home"]',
        'a[data-testid="AppTabBar_Home_Link"]'
      ], 5000).catch(() => null);
      
      if (homeButton) {
        await humanHover(page, homeButton.selector, behavior);
        await humanClick(page, homeButton.selector, behavior);
      } else {
        await humanNavigate(page, 'https://twitter.com/home', behavior);
      }
      
      // Final human-like browsing
      await humanDelay(behavior, { min: 2000, max: 4000 });
      await saveScreenshot(page, 'final_home_page_retweet.png');
      
      // Brief final scroll using shared utilities
      await humanScroll(page, 3000, behavior);
    }
    
    // Final results
    if (retweetsCompleted === 0) {
      logWithTimestamp('❌ Could not retweet any tweets. No matching posts found or all were already retweeted.', 'RETWEET');
      return false;
    } else if (retweetsCompleted < retweetCount) {
      logWithTimestamp(`⚠️ Partially completed: ${retweetsCompleted}/${retweetCount} retweets`, 'RETWEET');
      return retweetsCompleted > 0;
    } else {
      logWithTimestamp(`✅ Successfully completed all ${retweetsCompleted} retweets`, 'RETWEET');
      return true;
    }
    
  } catch (error: any) {
    logWithTimestamp(`❌ Error during retweet operation: ${error.message}`, 'RETWEET');
    
    try {
      const page = (await browser.pages())[0];
      await saveScreenshot(page, 'retweet_operation_error.png');
    } catch (err) {
      logWithTimestamp('Could not take error screenshot', 'RETWEET');
    }
    
    throw error;
  }
}

// Export everything needed
export {
  BehaviorType
};
