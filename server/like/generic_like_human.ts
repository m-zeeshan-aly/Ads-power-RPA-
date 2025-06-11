// generic_like_human.ts - Refactored to use shared utilities
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
  selectHumanLikeIndex
} from '../shared/human-actions';
import { 
  logWithTimestamp, 
  promiseWithTimeout, 
  saveScreenshot, 
  randomBetween,
  cleanUsername,
  formatTwitterProfileUrl,
  enhancedPostMatch,
  PostMatchResult
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

// Define like input interface
export interface LikeInput {
  // At least one of these must be provided
  username?: string;        // Target username (e.g., "ImranKhanPTI", "PTIofficial")
  searchQuery?: string;     // Search terms to find tweets (e.g., "Imran Khan", "PTI politics")
  tweetContent?: string;    // Specific content to look for in tweets
  profileUrl?: string;      // Direct profile URL to visit
  
  // Optional parameters
  likeCount?: number;       // Number of tweets to like (default: 1)
  scrollTime?: number;      // Time to scroll in milliseconds (default: 20000)
  searchInFeed?: boolean;   // Whether to search in home feed first (default: true)
  visitProfile?: boolean;   // Whether to visit profile if feed search fails (default: true)
  behaviorType?: BehaviorType; // Human behavior pattern to use
}

// Function to validate like input
function validateLikeInput(input: LikeInput): { isValid: boolean; error?: string } {
  if (!input.username && !input.searchQuery && !input.tweetContent && !input.profileUrl) {
    return {
      isValid: false,
      error: 'At least one of username, searchQuery, tweetContent, or profileUrl must be provided'
    };
  }
  
  if (input.likeCount && (input.likeCount < 1 || input.likeCount > 10)) {
    return {
      isValid: false,
      error: 'likeCount must be between 1 and 10'
    };
  }
  
  return { isValid: true };
}

// Enhanced function to check if a post matches the criteria with fuzzy matching
function doesPostMatch(postText: string, input: LikeInput): boolean {
  const matchResult = enhancedPostMatch(postText, {
    username: input.username,
    searchQuery: input.searchQuery,
    tweetContent: input.tweetContent
  }, {
    exactMatchThreshold: 1.0,
    fuzzyMatchThreshold: 0.75,  // Set to 75% minimum threshold as required
    enableFuzzyFallback: true
  });
  
  // Only accept high-quality matches - no fuzzy fallbacks unless score is very high
  if (matchResult.isMatch && !matchResult.fallbackMatch) {
    // Exact match found - good to proceed
    logWithTimestamp(
      `Found exact match (score: ${matchResult.score.toFixed(2)}) - ${matchResult.matchedCriteria.join(', ')}`, 
      'LIKE'
    );
    logWithTimestamp(`Post preview: "${postText.substring(0, 100)}..."`, 'LIKE');
    return true;
  }
   if (matchResult.isMatch && matchResult.fallbackMatch && matchResult.score >= 0.75) {
    // High fuzzy match with 75% threshold - acceptable
    logWithTimestamp(
      `Found high-quality fuzzy match (score: ${matchResult.score.toFixed(2)}) - ${matchResult.matchedCriteria.join(', ')}`, 
      'LIKE'
    );
    logWithTimestamp(`Post preview: "${postText.substring(0, 100)}..."`, 'LIKE');
    return true;
  }

  // Log why post was rejected for debugging
  if (matchResult.score > 0) {
    logWithTimestamp(`Post rejected - insufficient match score: ${matchResult.score.toFixed(3)} (required: 0.75)`, 'LIKE');
  }
  
  return false;
}

// Function to like posts in the current page
async function likePostsOnCurrentPage(
  page: puppeteer.Page, 
  input: LikeInput, 
  behavior: BehaviorPattern,
  targetCount: number
): Promise<number> {
  let likesCompleted = 0;
  
  try {
    // Find all tweet containers using shared selectors
    const tweetContainers = await findTweetsWithText(page, ''); // Get all tweets
    
    if (tweetContainers.length === 0) {
      logWithTimestamp('No tweet containers found on current page', 'LIKE');
      return 0;
    }
    
    logWithTimestamp(`Found ${tweetContainers.length} tweet containers`, 'LIKE');
    
    // Filter tweets that match our criteria
    const matchingIndices: number[] = [];
    
    for (let i = 0; i < tweetContainers.length && likesCompleted < targetCount; i++) {
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
      logWithTimestamp('No matching posts found on current page', 'LIKE');
      return 0;
    }
    
    logWithTimestamp(`Found ${matchingIndices.length} matching posts`, 'LIKE');
    
    // Like matching posts
    for (const postIndex of matchingIndices) {
      if (likesCompleted >= targetCount) break;
      
      try {
        // Scroll to the post using human-like behavior
        await page.evaluate((index) => {
          const containers = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
          if (containers[index]) {
            containers[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, postIndex);
        
        // Human pause after scrolling
        await simulateReading(behavior);
        
        // Get the tweet element for this post
        const tweetElement = await page.evaluateHandle((index) => {
          const containers = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
          return containers[index];
        }, postIndex);
        
        if (!tweetElement) {
          logWithTimestamp(`Could not find tweet element for post ${postIndex}`, 'LIKE');
          continue;
        }
        
        // Try to click like button for this specific tweet
        const likeSuccess = await clickButtonInTweet(tweetElement, TWITTER_SELECTORS.LIKE_BUTTONS);
        
        if (likeSuccess) {
          likesCompleted++;
          logWithTimestamp(`✅ Successfully liked post ${likesCompleted}/${targetCount}`, 'LIKE');
          
          // Human-like delay after liking
          await humanDelay(behavior);
          
          await saveScreenshot(page, `after_like_post_${likesCompleted}.png`);
          
          if (likesCompleted < targetCount) {
            // Pause between likes
            await humanDelay(behavior, { min: 1000, max: 3000 });
          }
        } else {
          logWithTimestamp(`Could not like post ${postIndex} (may already be liked)`, 'LIKE');
        }
      } catch (err: any) {
        logWithTimestamp(`Error liking post ${postIndex}: ${err.message}`, 'LIKE');
        continue;
      }
    }
  } catch (error: any) {
    logWithTimestamp(`Error in likePostsOnCurrentPage: ${error.message}`, 'LIKE');
  }
  
  return likesCompleted;
}

// Function to search and like in home feed
async function searchInHomeFeed(
  page: puppeteer.Page, 
  input: LikeInput, 
  behavior: BehaviorPattern
): Promise<number> {
  logWithTimestamp('Searching for matching posts in home feed...', 'LIKE');
  
  // Ensure we're on Twitter home
  await ensureOnTwitterHome(page);
  
  await saveScreenshot(page, 'twitter_home_page.png');
  
  const scrollTime = input.scrollTime || 45000; // Increased to 45 seconds for better post discovery
  const likeCount = input.likeCount || 1;
  let likesCompleted = 0;
  
  // Human-like scrolling and searching using shared utilities
  logWithTimestamp(`Scrolling feed for ${scrollTime}ms looking for matching posts...`, 'LIKE');
  
  const scrollStartTime = Date.now();
  let scrollCount = 0;
  
  while (Date.now() - scrollStartTime < scrollTime && likesCompleted < likeCount) {
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
    if (scrollCount % 3 === 0) {
      await saveScreenshot(page, `feed_scroll_${scrollCount}.png`);
    }
    
    // Try to like posts on current view
    const likesInThisView = await likePostsOnCurrentPage(page, input, behavior, likeCount - likesCompleted);
    likesCompleted += likesInThisView;
    
    if (likesCompleted >= likeCount) {
      logWithTimestamp(`Completed ${likesCompleted} likes in home feed`, 'LIKE');
      break;
    }
    
    // Human-like pause between scrolls using shared utilities
    const pauseTime = randomBetween(behavior.scrollPauseTime.min, behavior.scrollPauseTime.max);
    await new Promise(resolve => setTimeout(resolve, pauseTime));
    
    // Occasional thinking pauses based on behavior
    if (Math.random() < behavior.thinkingPauseChance) {
      await simulateReading(behavior);
    }
  }
  
  return likesCompleted;
}

// Function to search and like on profile page
async function searchOnProfile(
  page: puppeteer.Page, 
  input: LikeInput, 
  behavior: BehaviorPattern
): Promise<number> {
  logWithTimestamp('Searching for posts on profile page...', 'LIKE');
  
  let profileUrl = input.profileUrl;
  
  // If no direct profile URL, try to construct one from username
  if (!profileUrl && input.username) {
    profileUrl = formatTwitterProfileUrl(input.username);
    logWithTimestamp(`Constructed profile URL: ${profileUrl}`, 'LIKE');
  }
  
  // If still no profile URL, try to search for the profile
  if (!profileUrl && (input.username || input.searchQuery)) {
    const searchTerm = input.username || input.searchQuery;
    logWithTimestamp(`Searching for profile: ${searchTerm}`, 'LIKE');
    
    // Navigate to search and look for profile
    await humanNavigate(page, `https://twitter.com/search?q=${encodeURIComponent(searchTerm!)}&src=typed_query&f=user`, behavior);
    
    await humanDelay(behavior, { min: 2000, max: 4000 });
    await saveScreenshot(page, 'search_results.png');
    
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
  
  await saveScreenshot(page, 'profile_page.png');
  
  // Wait for tweets to load using shared utilities
  const tweetsLoaded = await waitForAnySelector(page, [
    'article[data-testid="tweet"]',
    'article[role="article"]',
    'div[data-testid="cellInnerDiv"]',
    '[data-testid="tweetText"]'
  ], 10000).catch(() => null);
  
  if (!tweetsLoaded) {
    logWithTimestamp('No tweets found on profile page', 'LIKE');
    return 0;
  }
  
  logWithTimestamp('Profile tweets loaded successfully', 'LIKE');
  
  const likeCount = input.likeCount || 1;
  let likesCompleted = 0;
  
  // Scroll down profile to find tweets to like
  logWithTimestamp('Scrolling down profile to find tweets to like...', 'LIKE');
  
  for (let i = 0; i < 3 && likesCompleted < likeCount; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, randomBetween(200, 400));
    });
    
    await humanDelay(behavior, { min: 400, max: 800 });
  }
  
  await saveScreenshot(page, 'profile_after_scroll.png');
  
  // Like posts on profile using shared utilities
  likesCompleted = await likePostsOnCurrentPage(page, input, behavior, likeCount);
  
  return likesCompleted;
}

// Main function to like tweets with human-like behavior
export async function likeGenericTweetHuman(browser: puppeteer.Browser, input: LikeInput): Promise<void> {
  logWithTimestamp('Starting human-like browsing and like operation', 'LIKE');
  
  // Validate input
  const validation = validateLikeInput(input);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  // Set defaults and get behavior pattern
  const likeCount = input.likeCount || 1;
  const searchInFeed = input.searchInFeed !== false;
  const visitProfile = input.visitProfile !== false;
  const behavior = getBehaviorOrDefault(input.behaviorType);
  
  logWithTimestamp(`Using behavior pattern: ${behavior.name}`, 'LIKE');
  logWithTimestamp(`Target: ${JSON.stringify({
    username: input.username,
    searchQuery: input.searchQuery,
    likeCount,
    searchInFeed,
    visitProfile
  })}`, 'LIKE');
  
  try {
    const pages = await browser.pages();
    if (pages.length === 0) {
      logWithTimestamp('No browser pages found. Creating a new page...', 'LIKE');
      await browser.newPage();
    }
    
    const page = (await browser.pages())[0];
    logWithTimestamp(`Current page URL: ${await page.url()}`, 'LIKE');
    
    await saveScreenshot(page, 'like_operation_initial.png');
    
    let likesCompleted = 0;
    
    // Step 1: Try searching in home feed first (if enabled)
    if (searchInFeed && likesCompleted < likeCount) {
      try {
        logWithTimestamp('Attempting to find posts in home feed...', 'LIKE');
        const feedLikes = await searchInHomeFeed(page, input, behavior);
        likesCompleted += feedLikes;
        
        if (likesCompleted >= likeCount) {
          logWithTimestamp(`✅ Completed all ${likesCompleted} likes in home feed`, 'LIKE');
          return;
        }
      } catch (feedError: any) {
        logWithTimestamp(`Home feed search failed: ${feedError.message}`, 'LIKE');
      }
    }
    
    // Step 2: Try profile page if we still need more likes (if enabled)
    if (visitProfile && likesCompleted < likeCount) {
      try {
        logWithTimestamp(`Need ${likeCount - likesCompleted} more likes, trying profile page...`, 'LIKE');
        const profileLikes = await searchOnProfile(page, input, behavior);
        likesCompleted += profileLikes;
        
        if (likesCompleted >= likeCount) {
          logWithTimestamp(`✅ Completed all ${likesCompleted} likes including profile page`, 'LIKE');
        }
      } catch (profileError: any) {
        logWithTimestamp(`Profile search failed: ${profileError.message}`, 'LIKE');
      }
    }
    
    // Final results
    if (likesCompleted === 0) {
      throw new Error('Could not like any tweets. No matching posts found.');
    } else if (likesCompleted < likeCount) {
      logWithTimestamp(`⚠️ Partially completed: ${likesCompleted}/${likeCount} likes`, 'LIKE');
    } else {
      logWithTimestamp(`✅ Successfully completed all ${likesCompleted} likes`, 'LIKE');
    }
    
    // Final screenshot
    await saveScreenshot(page, 'like_operation_complete.png');
    
  } catch (error: any) {
    logWithTimestamp(`Error during like operation: ${error.message}`, 'LIKE');
    
    try {
      const page = (await browser.pages())[0];
      await saveScreenshot(page, 'like_operation_error.png');
    } catch (err) {
      logWithTimestamp('Could not take error screenshot', 'LIKE');
    }
    
    throw error;
  }
}

// Export everything needed by other modules
export {
  connectToBrowser,
  getWebSocketUrl
} from '../shared/browser-connection';

// Export utilities that other modules might need
export {
  logWithTimestamp,
  saveScreenshot
} from '../shared/utilities';
