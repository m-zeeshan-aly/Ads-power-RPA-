// post-action-handler.ts - Module to perform actions on specific posts
import * as puppeteer from 'puppeteer-core';
import { logWithTimestamp, saveScreenshot } from '../shared/utilities';
import { humanDelay, humanClick, humanHover } from '../shared/human-actions';
import { BehaviorPattern, BehaviorType, getBehaviorOrDefault } from '../shared/human-behavior';
import { HomeFeedTweetData } from './home-feed-fetcher';

export interface PostActionInput {
  tweetData: HomeFeedTweetData; // The tweet data from GET request
  action: 'like' | 'unlike'; // The decision made externally
  behaviorType?: BehaviorType; // Human behavior pattern
}

export interface PostActionResult {
  success: boolean;
  action: 'like' | 'unlike';
  tweetId: string;
  tweetUrl: string;
  error?: string;
  processingTime?: string;
}

export async function performPostAction(
  browser: puppeteer.Browser, 
  input: PostActionInput
): Promise<PostActionResult> {
  const { tweetData, action, behaviorType } = input;
  const startTime = Date.now();
  
  logWithTimestamp(`Performing ${action} action on tweet ${tweetData.tweetId} by @${tweetData.authorHandle}`, 'POST_ACTION');
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  // Get behavior pattern
  const behavior = getBehaviorOrDefault(behaviorType);
  
  try {
    // Navigate to the specific tweet if not already there
    const currentUrl = await page.url();
    if (!currentUrl.includes(tweetData.tweetId)) {
      logWithTimestamp(`Navigating to tweet: ${tweetData.url}`, 'POST_ACTION');
      
      await page.goto(tweetData.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await humanDelay(behavior, { min: 2000, max: 4000 });
    }
    
    // Wait for tweet to load
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 });
    await saveScreenshot(page, `tweet_${tweetData.tweetId}_loaded.png`, 'POST_ACTION');
    
    // Human-like behavior - appear to read the tweet
    logWithTimestamp('Simulating reading behavior...', 'POST_ACTION');
    await humanDelay(behavior, { min: 2000, max: 5000 });
    
    // Find the like button
    const likeButtonFound = await page.evaluate((targetAction) => {
      // Look for the like button
      const likeButton = document.querySelector('[data-testid="like"]') as HTMLElement;
      
      if (!likeButton) {
        return { found: false, error: 'Like button not found' };
      }
      
      // Check current state
      const isCurrentlyLiked = likeButton.getAttribute('aria-pressed') === 'true' ||
                              likeButton.querySelector('[data-testid="unlike"]') !== null;
      
      // Determine if action is needed
      const needsAction = (targetAction === 'like' && !isCurrentlyLiked) ||
                         (targetAction === 'unlike' && isCurrentlyLiked);
      
      return {
        found: true,
        isCurrentlyLiked,
        needsAction,
        ariaLabel: likeButton.getAttribute('aria-label') || ''
      };
    }, action);
    
    if (!likeButtonFound.found) {
      throw new Error(likeButtonFound.error || 'Like button not found');
    }
    
    if (!likeButtonFound.needsAction) {
      const currentState = likeButtonFound.isCurrentlyLiked ? 'liked' : 'not liked';
      logWithTimestamp(`Tweet is already ${currentState}, no action needed`, 'POST_ACTION');
      
      return {
        success: true,
        action,
        tweetId: tweetData.tweetId,
        tweetUrl: tweetData.url,
        processingTime: `${(Date.now() - startTime) / 1000}s`
      };
    }
    
    // Human-like hover before clicking
    logWithTimestamp('Hovering over like button...', 'POST_ACTION');
    await page.hover('[data-testid="like"]');
    await humanDelay(behavior, { min: 500, max: 1200 });
    
    // Take screenshot before action
    await saveScreenshot(page, `before_${action}_${tweetData.tweetId}.png`, 'POST_ACTION');
    
    // Perform the action with human-like click
    logWithTimestamp(`Clicking ${action} button...`, 'POST_ACTION');
    await humanClick(page, '[data-testid="like"]', behavior);
    
    // Wait for action to complete
    await humanDelay(behavior, { min: 1000, max: 2000 });
    
    // Verify the action was successful
    const actionResult = await page.evaluate((expectedAction) => {
      const likeButton = document.querySelector('[data-testid="like"]') as HTMLElement;
      
      if (!likeButton) {
        return { success: false, error: 'Like button disappeared after click' };
      }
      
      const isNowLiked = likeButton.getAttribute('aria-pressed') === 'true' ||
                        likeButton.querySelector('[data-testid="unlike"]') !== null;
      
      const actionSuccessful = (expectedAction === 'like' && isNowLiked) ||
                              (expectedAction === 'unlike' && !isNowLiked);
      
      return {
        success: actionSuccessful,
        isNowLiked,
        ariaLabel: likeButton.getAttribute('aria-label') || ''
      };
    }, action);
    
    if (!actionResult.success) {
      throw new Error(`${action} action may have failed - button state did not change as expected`);
    }
    
    // Take screenshot after action
    await saveScreenshot(page, `after_${action}_${tweetData.tweetId}.png`, 'POST_ACTION');
    
    logWithTimestamp(`✅ Successfully ${action}d tweet ${tweetData.tweetId}`, 'POST_ACTION');
    
    // Human-like behavior - stay on the page briefly
    await humanDelay(behavior, { min: 1000, max: 3000 });
    
    const processingTime = `${(Date.now() - startTime) / 1000}s`;
    
    return {
      success: true,
      action,
      tweetId: tweetData.tweetId,
      tweetUrl: tweetData.url,
      processingTime
    };
    
  } catch (error: any) {
    logWithTimestamp(`Error performing ${action} action: ${error.message}`, 'POST_ACTION');
    
    // Save error screenshot
    try {
      await saveScreenshot(page, `${action}_error_${tweetData.tweetId}.png`, 'POST_ACTION');
    } catch (screenshotError) {
      logWithTimestamp('Could not save error screenshot', 'POST_ACTION');
    }
    
    return {
      success: false,
      action,
      tweetId: tweetData.tweetId,
      tweetUrl: tweetData.url,
      error: error.message,
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
  }
}

// Helper function to perform action on a tweet by finding it in the current page
export async function performActionOnTweetInCurrentPage(
  browser: puppeteer.Browser,
  tweetId: string,
  action: 'like' | 'unlike',
  behaviorType?: BehaviorType
): Promise<PostActionResult> {
  const startTime = Date.now();
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  const behavior = getBehaviorOrDefault(behaviorType);
  
  try {
    logWithTimestamp(`Looking for tweet ${tweetId} in current page to ${action}`, 'POST_ACTION');
    
    // Find the tweet in the current page
    const tweetFound = await page.evaluate((targetTweetId, targetAction) => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      
      for (const article of articles) {
        // Look for tweet ID in status links
        const statusLinks = article.querySelectorAll('a[href*="/status/"]');
        for (const link of statusLinks) {
          const href = link.getAttribute('href') || '';
          if (href.includes(`/status/${targetTweetId}`)) {
            // Found the tweet, now find the like button
            const likeButton = article.querySelector('[data-testid="like"]') as HTMLElement;
            
            if (!likeButton) {
              return { found: false, error: 'Like button not found in tweet' };
            }
            
            // Check current state
            const isCurrentlyLiked = likeButton.getAttribute('aria-pressed') === 'true';
            const needsAction = (targetAction === 'like' && !isCurrentlyLiked) ||
                               (targetAction === 'unlike' && isCurrentlyLiked);
            
            // Scroll to tweet
            article.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            return {
              found: true,
              needsAction,
              isCurrentlyLiked,
              tweetUrl: href.startsWith('http') ? href : `https://x.com${href}`
            };
          }
        }
      }
      
      return { found: false, error: 'Tweet not found in current page' };
    }, tweetId, action);
    
    if (!tweetFound.found) {
      throw new Error(tweetFound.error || 'Tweet not found');
    }
    
    if (!tweetFound.needsAction) {
      const currentState = tweetFound.isCurrentlyLiked ? 'liked' : 'not liked';
      logWithTimestamp(`Tweet is already ${currentState}, no action needed`, 'POST_ACTION');
      
      return {
        success: true,
        action,
        tweetId,
        tweetUrl: tweetFound.tweetUrl || '',
        processingTime: `${(Date.now() - startTime) / 1000}s`
      };
    }
    
    // Human-like pause after scrolling to tweet
    await humanDelay(behavior, { min: 1000, max: 2000 });
    
    // Find the specific like button for this tweet
    const likeButtonSelector = `article[data-testid="tweet"]:has(a[href*="/status/${tweetId}"]) [data-testid="like"]`;
    
    // Hover and click
    await page.hover(likeButtonSelector);
    await humanDelay(behavior, { min: 500, max: 1000 });
    
    await humanClick(page, likeButtonSelector, behavior);
    await humanDelay(behavior, { min: 1000, max: 2000 });
    
    // Verify action
    const actionVerified = await page.evaluate((targetTweetId, expectedAction) => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      
      for (const article of articles) {
        const statusLinks = article.querySelectorAll('a[href*="/status/"]');
        for (const link of statusLinks) {
          const href = link.getAttribute('href') || '';
          if (href.includes(`/status/${targetTweetId}`)) {
            const likeButton = article.querySelector('[data-testid="like"]') as HTMLElement;
            if (!likeButton) return false;
            
            const isNowLiked = likeButton.getAttribute('aria-pressed') === 'true';
            return (expectedAction === 'like' && isNowLiked) || (expectedAction === 'unlike' && !isNowLiked);
          }
        }
      }
      return false;
    }, tweetId, action);
    
    if (!actionVerified) {
      throw new Error('Action verification failed');
    }
    
    logWithTimestamp(`✅ Successfully ${action}d tweet ${tweetId} in current page`, 'POST_ACTION');
    
    return {
      success: true,
      action,
      tweetId,
      tweetUrl: tweetFound.tweetUrl || '',
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
    
  } catch (error: any) {
    logWithTimestamp(`Error performing ${action} in current page: ${error.message}`, 'POST_ACTION');
    
    return {
      success: false,
      action,
      tweetId,
      tweetUrl: '',
      error: error.message,
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
  }
}
