// comment-action-handler.ts - Handle commenting on tweets

import * as puppeteer from 'puppeteer-core';
import { BehaviorType, HUMAN_BEHAVIORS, BehaviorPattern } from '../shared/human-behavior';
import { logWithTimestamp, saveScreenshot } from '../shared/utilities';
import { humanDelay } from '../shared/human-actions';
import { CommentTweetData } from './home-feed-fetcher';

export interface CommentActionInput {
  tweetData?: CommentTweetData; // The tweet data from GET request
  tweetId?: string; // Alternative: just tweet ID
  comment: string; // The comment text to post
  behaviorType?: BehaviorType; // Human behavior pattern
  content?: string; // Tweet content for better searching
  url?: string; // Tweet URL for direct navigation
  authorHandle?: string; // Author handle for profile search
}

export interface CommentActionResult {
  success: boolean;
  action: 'comment';
  tweetId: string;
  tweetUrl?: string;
  comment: string;
  method?: string; // Which method found the tweet
  error?: string;
  processingTime?: string;
}

// Helper function to get behavior pattern or default
function getBehaviorOrDefault(behaviorType?: BehaviorType): BehaviorPattern {
  return HUMAN_BEHAVIORS[behaviorType || BehaviorType.CASUAL_BROWSER];
}

export async function performCommentAction(
  browser: puppeteer.Browser, 
  input: CommentActionInput
): Promise<CommentActionResult> {
  const { tweetData, tweetId, comment, behaviorType, content, url, authorHandle } = input;
  const startTime = Date.now();
  
  // 🔍 DEBUG: Log complete input data received from user
  logWithTimestamp('📋 COMPLETE COMMENT INPUT DATA RECEIVED:', 'COMMENT_ACTION');
  logWithTimestamp(`   🎯 Raw Input: ${JSON.stringify(input, null, 2)}`, 'COMMENT_ACTION');
  logWithTimestamp(`   💬 Comment: ${comment}`, 'COMMENT_ACTION');
  logWithTimestamp(`   🎭 Behavior Type: ${behaviorType || 'default'}`, 'COMMENT_ACTION');
  logWithTimestamp(`   📄 Tweet Data: ${tweetData ? JSON.stringify(tweetData, null, 2) : 'Not provided'}`, 'COMMENT_ACTION');
  logWithTimestamp(`   🆔 Tweet ID: ${tweetId || 'Not provided'}`, 'COMMENT_ACTION');
  logWithTimestamp(`   📝 Content: ${content || 'Not provided'}`, 'COMMENT_ACTION');
  logWithTimestamp(`   🔗 URL: ${url || 'Not provided'}`, 'COMMENT_ACTION');
  logWithTimestamp(`   👤 Author Handle: ${authorHandle || 'Not provided'}`, 'COMMENT_ACTION');
  
  // Determine tweet details - prioritize flattened structure over nested
  const targetTweetId = tweetId || tweetData?.tweetId;
  const targetContent = content || tweetData?.content || '';
  let targetUrl = url || tweetData?.url || '';
  const targetAuthor = authorHandle || tweetData?.authorHandle || '';
  
  // 🔍 DEBUG: Log what we extracted and assigned
  logWithTimestamp('🎯 EXTRACTED DATA ASSIGNMENTS:', 'COMMENT_ACTION');
  logWithTimestamp(`   📊 Target Tweet ID: "${targetTweetId}"`, 'COMMENT_ACTION');
  logWithTimestamp(`   📝 Target Content: "${targetContent}"`, 'COMMENT_ACTION');
  logWithTimestamp(`   🔗 Target URL: "${targetUrl}"`, 'COMMENT_ACTION');
  logWithTimestamp(`   👤 Target Author: "${targetAuthor}"`, 'COMMENT_ACTION');
  logWithTimestamp(`   🔄 Data Source: ${tweetId ? 'Flattened Structure' : 'Legacy tweetData'}`, 'COMMENT_ACTION');
  
  if (!targetTweetId) {
    const error = 'Tweet ID is required to perform comment action';
    logWithTimestamp(`❌ ${error}`, 'COMMENT_ACTION');
    return {
      success: false,
      action: 'comment',
      tweetId: '',
      comment,
      error,
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
  }
  
  if (!comment || comment.trim() === '') {
    const error = 'Comment text is required';
    logWithTimestamp(`❌ ${error}`, 'COMMENT_ACTION');
    return {
      success: false,
      action: 'comment',
      tweetId: targetTweetId,
      comment: comment || '',
      error,
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
  }
  
  logWithTimestamp(`🎯 Starting comment action on tweet ${targetTweetId}`, 'COMMENT_ACTION');
  logWithTimestamp(`📝 Content: "${targetContent.substring(0, 100)}${targetContent.length > 100 ? '...' : ''}"`, 'COMMENT_ACTION');
  logWithTimestamp(`💬 Comment: "${comment}"`, 'COMMENT_ACTION');
  if (targetUrl) {
    logWithTimestamp(`🔗 Target URL: ${targetUrl}`, 'COMMENT_ACTION');
  }
  if (targetAuthor) {
    logWithTimestamp(`👤 Target Author: @${targetAuthor}`, 'COMMENT_ACTION');
  }
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  const behavior = getBehaviorOrDefault(behaviorType);
  
  try {
    let method = '';
    let success = false;
    
    // Method 1: Try direct URL navigation if we have a complete URL
    if (targetUrl && targetUrl.includes('/status/')) {
      logWithTimestamp(`🔗 Method 1: Attempting direct navigation to tweet URL`, 'COMMENT_ACTION');
      const directResult = await navigateDirectlyToTweetUrl(page, targetTweetId, targetUrl, comment, behavior);
      if (directResult.success) {
        success = true;
        method = 'Direct URL Navigation';
        logWithTimestamp(`✅ Successfully commented via direct URL navigation`, 'COMMENT_ACTION');
      } else {
        logWithTimestamp(`❌ Direct URL navigation failed: ${directResult.error}`, 'COMMENT_ACTION');
      }
    }
    
    // Method 2: Try finding tweet in current timeline if direct navigation failed
    if (!success) {
      logWithTimestamp(`🔍 Method 2: Searching for tweet in current timeline`, 'COMMENT_ACTION');
      const timelineResult = await findTweetInCurrentTimeline(page, targetTweetId, targetContent, targetAuthor, comment, behavior);
      if (timelineResult.success) {
        success = true;
        method = 'Timeline Search';
        logWithTimestamp(`✅ Successfully commented via timeline search`, 'COMMENT_ACTION');
      } else {
        logWithTimestamp(`❌ Timeline search failed: ${timelineResult.error}`, 'COMMENT_ACTION');
      }
    }
    
    // Method 3: Try finding tweet in user profile if we have author handle
    if (!success && targetAuthor) {
      logWithTimestamp(`👤 Method 3: Searching in user profile @${targetAuthor}`, 'COMMENT_ACTION');
      const profileResult = await findTweetInUserProfile(page, targetTweetId, targetContent, targetAuthor, targetUrl, comment, behavior);
      if (profileResult.success) {
        success = true;
        method = 'Profile Search';
        logWithTimestamp(`✅ Successfully commented via profile search`, 'COMMENT_ACTION');
      } else {
        logWithTimestamp(`❌ Profile search failed: ${profileResult.error}`, 'COMMENT_ACTION');
      }
    }
    
    if (!success) {
      throw new Error('Failed to find and comment on tweet using all available methods');
    }
    
    // Navigate back to home timeline top after successful comment
    await navigateToHomeTop(page, behavior);
    
    const processingTime = `${(Date.now() - startTime) / 1000}s`;
    logWithTimestamp(`🎉 Comment action completed successfully in ${processingTime} via ${method}`, 'COMMENT_ACTION');
    
    return {
      success: true,
      action: 'comment',
      tweetId: targetTweetId,
      tweetUrl: targetUrl,
      comment,
      method,
      processingTime
    };
    
  } catch (error: any) {
    const processingTime = `${(Date.now() - startTime) / 1000}s`;
    logWithTimestamp(`❌ Comment action failed: ${error.message}`, 'COMMENT_ACTION');
    
    // Save error screenshot
    try {
      await saveScreenshot(page, `comment_error_${targetTweetId}.png`, 'COMMENT_ACTION');
    } catch (screenshotError) {
      logWithTimestamp(`Failed to save error screenshot: ${screenshotError}`, 'COMMENT_ACTION');
    }
    
    return {
      success: false,
      action: 'comment',
      tweetId: targetTweetId,
      comment,
      error: error.message,
      processingTime
    };
  }
}

// Helper function to navigate directly to tweet URL in browser address bar
async function navigateDirectlyToTweetUrl(
  page: puppeteer.Page,
  tweetId: string,
  tweetUrl: string,
  comment: string,
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    logWithTimestamp(`🔗 Navigating directly to tweet URL: ${tweetUrl}`, 'COMMENT_ACTION');
    
    // Navigate to the tweet URL
    await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(behavior, { min: 2000, max: 4000 });
    
    // Wait for tweet to load
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 });
    
    // Verify we're on the correct tweet
    const isCorrectTweet = await page.evaluate((expectedTweetId) => {
      const url = window.location.href;
      return url.includes(`/status/${expectedTweetId}`);
    }, tweetId);
    
    if (!isCorrectTweet) {
      throw new Error(`Navigation didn't land on correct tweet. Expected: ${tweetId}`);
    }
    
    logWithTimestamp(`✅ Successfully navigated to tweet ${tweetId}`, 'COMMENT_ACTION');
    await saveScreenshot(page, `direct_navigation_${tweetId}.png`, 'COMMENT_ACTION');
    
    // Perform comment action
    const commentResult = await performCommentActionOnTweet(page, tweetId, comment, behavior);
    return commentResult;
    
  } catch (error: any) {
    logWithTimestamp(`❌ Direct navigation failed: ${error.message}`, 'COMMENT_ACTION');
    return { success: false, error: error.message };
  }
}

// Helper function to find tweet in current timeline by scrolling
async function findTweetInCurrentTimeline(
  page: puppeteer.Page,
  tweetId: string,
  content: string,
  author: string,
  comment: string,
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    logWithTimestamp(`🔍 Searching for tweet ${tweetId} in current timeline`, 'COMMENT_ACTION');
    
    // First check if we're on a timeline page
    const currentUrl = await page.url();
    if (!currentUrl.includes('x.com') && !currentUrl.includes('twitter.com')) {
      // Navigate to home timeline first
      await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 30000 });
      await humanDelay(behavior, { min: 2000, max: 4000 });
    }
    
    let scrollAttempts = 0;
    const maxScrollAttempts = 8;
    
    while (scrollAttempts < maxScrollAttempts) {
      scrollAttempts++;
      
      // Look for the specific tweet in current view
      const tweetFound = await page.evaluate((targetTweetId, targetContent, targetAuthor) => {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        
        for (const tweet of tweets) {
          // Check for tweet ID in URLs
          const links = tweet.querySelectorAll('a[href*="/status/"]');
          for (const link of links) {
            const href = link.getAttribute('href') || '';
            if (href.includes(`/status/${targetTweetId}`)) {
              return { found: true, element: tweet };
            }
          }
          
          // Also check by content and author if provided
          if (targetContent && targetAuthor) {
            const contentEl = tweet.querySelector('[data-testid="tweetText"]');
            const authorEl = tweet.querySelector('[data-testid="User-Name"] a');
            
            if (contentEl && authorEl) {
              const tweetContent = contentEl.textContent || '';
              const tweetAuthor = authorEl.textContent || '';
              
              if (tweetContent.includes(targetContent.substring(0, 50)) && 
                  tweetAuthor.includes(targetAuthor)) {
                return { found: true, element: tweet };
              }
            }
          }
        }
        
        return { found: false };
      }, tweetId, content, author);
      
      if (tweetFound.found) {
        logWithTimestamp(`✅ Found tweet ${tweetId} in timeline at attempt ${scrollAttempts}`, 'COMMENT_ACTION');
        await saveScreenshot(page, `timeline_found_${tweetId}.png`, 'COMMENT_ACTION');
        
        // Perform comment action
        const commentResult = await performCommentActionOnTweet(page, tweetId, comment, behavior);
        return commentResult;
      }
      
      // Scroll down to load more tweets
      logWithTimestamp(`🔄 Tweet not found, scrolling... (attempt ${scrollAttempts}/${maxScrollAttempts})`, 'COMMENT_ACTION');
      await page.evaluate(() => {
        window.scrollBy(0, Math.floor(Math.random() * 400) + 300);
      });
      
      await humanDelay(behavior, behavior.scrollPauseTime);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for content to load
    }
    
    throw new Error(`Tweet ${tweetId} not found in current timeline after ${maxScrollAttempts} scroll attempts`);
    
  } catch (error: any) {
    logWithTimestamp(`❌ Timeline search failed: ${error.message}`, 'COMMENT_ACTION');
    return { success: false, error: error.message };
  }
}

// Helper function to find tweet in user profile
async function findTweetInUserProfile(
  page: puppeteer.Page,
  tweetId: string,
  content: string,
  username: string,
  tweetUrl: string,
  comment: string,
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    logWithTimestamp(`👤 Searching for tweet ${tweetId} in @${username}'s profile`, 'COMMENT_ACTION');
    
    // Navigate to user profile
    const profileUrl = `https://x.com/${username}`;
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(behavior, { min: 2000, max: 4000 });
    
    // Wait for profile to load
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
    
    let scrollAttempts = 0;
    const maxScrollAttempts = 6;
    
    while (scrollAttempts < maxScrollAttempts) {
      scrollAttempts++;
      
      // Look for the specific tweet
      const tweetFound = await page.evaluate((targetTweetId) => {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        
        for (const tweet of tweets) {
          const links = tweet.querySelectorAll('a[href*="/status/"]');
          for (const link of links) {
            const href = link.getAttribute('href') || '';
            if (href.includes(`/status/${targetTweetId}`)) {
              return true;
            }
          }
        }
        
        return false;
      }, tweetId);
      
      if (tweetFound) {
        logWithTimestamp(`✅ Found tweet ${tweetId} in profile at attempt ${scrollAttempts}`, 'COMMENT_ACTION');
        await saveScreenshot(page, `profile_found_${tweetId}.png`, 'COMMENT_ACTION');
        
        // Perform comment action
        const commentResult = await performCommentActionOnTweet(page, tweetId, comment, behavior);
        return commentResult;
      }
      
      // Scroll down to load more tweets
      logWithTimestamp(`🔄 Tweet not found in profile, scrolling... (attempt ${scrollAttempts}/${maxScrollAttempts})`, 'COMMENT_ACTION');
      await page.evaluate(() => {
        window.scrollBy(0, Math.floor(Math.random() * 400) + 300);
      });
      
      await humanDelay(behavior, behavior.scrollPauseTime);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Tweet ${tweetId} not found in @${username}'s profile after ${maxScrollAttempts} attempts`);
    
  } catch (error: any) {
    logWithTimestamp(`❌ Profile search failed: ${error.message}`, 'COMMENT_ACTION');
    return { success: false, error: error.message };
  }
}

// Core function to perform comment action on a tweet
async function performCommentActionOnTweet(
  page: puppeteer.Page,
  tweetId: string,
  comment: string,
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    logWithTimestamp(`💬 Performing comment action on tweet ${tweetId}`, 'COMMENT_ACTION');
    
    // Find the reply button for this specific tweet
    const replyButton = await page.$(`article[data-testid="tweet"]:has(a[href*="/status/${tweetId}"]) [data-testid="reply"]`);
    
    if (!replyButton) {
      throw new Error(`Reply button not found for tweet ${tweetId}`);
    }
    
    // Human-like hover before clicking
    await replyButton.hover();
    await humanDelay(behavior, behavior.hoverTime);
    
    // Click the reply button
    logWithTimestamp(`🖱️ Clicking reply button for tweet ${tweetId}`, 'COMMENT_ACTION');
    await replyButton.click();
    await humanDelay(behavior, { min: 1000, max: 2000 });
    
    // Wait for the compose dialog to appear
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
    
    logWithTimestamp(`📝 Reply dialog opened, typing comment`, 'COMMENT_ACTION');
    await saveScreenshot(page, `reply_dialog_${tweetId}.png`, 'COMMENT_ACTION');
    
    // Type the comment with human-like typing
    const textArea = await page.$('[data-testid="tweetTextarea_0"]');
    if (!textArea) {
      throw new Error('Comment text area not found');
    }
    
    await textArea.click();
    await humanDelay(behavior, { min: 500, max: 1000 });
    
    // Type the comment character by character for more human-like behavior
    for (const char of comment) {
      await textArea.type(char);
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 100) + 50)); // 50-150ms between characters
    }
    
    // Wait a moment to review the comment (human-like behavior)
    await humanDelay(behavior, { min: 1000, max: 3000 });
    
    logWithTimestamp(`📤 Submitting comment: "${comment}"`, 'COMMENT_ACTION');
    await saveScreenshot(page, `comment_typed_${tweetId}.png`, 'COMMENT_ACTION');
    
    // Find and click the reply button to submit
    const submitButton = await page.$('[data-testid="tweetButton"]');
    if (!submitButton) {
      throw new Error('Submit button not found');
    }
    
    // Check if button is enabled
    const isEnabled = await page.evaluate((btn) => {
      return !btn.hasAttribute('disabled') && !btn.getAttribute('aria-disabled');
    }, submitButton);
    
    if (!isEnabled) {
      throw new Error('Submit button is disabled');
    }
    
    await submitButton.click();
    await humanDelay(behavior, { min: 2000, max: 4000 });
    
    logWithTimestamp(`✅ Comment submitted successfully on tweet ${tweetId}`, 'COMMENT_ACTION');
    await saveScreenshot(page, `comment_submitted_${tweetId}.png`, 'COMMENT_ACTION');
    
    // Wait for the dialog to close
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { hidden: true, timeout: 5000 }).catch(() => {
      logWithTimestamp('Reply dialog may not have closed completely, continuing...', 'COMMENT_ACTION');
    });
    
    return { success: true };
    
  } catch (error: any) {
    logWithTimestamp(`❌ Failed to comment on tweet ${tweetId}: ${error.message}`, 'COMMENT_ACTION');
    return { success: false, error: error.message };
  }
}

// Helper function to navigate back to home timeline top after successful action
async function navigateToHomeTop(
  page: puppeteer.Page,
  behavior: BehaviorPattern
): Promise<void> {
  try {
    logWithTimestamp(`🏠 Navigating back to home timeline top`, 'COMMENT_ACTION');
    
    // Navigate to home timeline
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(behavior, { min: 2000, max: 4000 });
    
    // Scroll to top
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    
    await humanDelay(behavior, { min: 1000, max: 2000 });
    logWithTimestamp(`✅ Back at home timeline top`, 'COMMENT_ACTION');
    
  } catch (error: any) {
    logWithTimestamp(`⚠️ Failed to navigate back to home: ${error.message}`, 'COMMENT_ACTION');
    // Don't throw error as this is not critical
  }
}

// Legacy function for backward compatibility
export async function performCommentActionOnTweetInCurrentPage(
  browser: puppeteer.Browser,
  tweetId: string,
  comment: string,
  behaviorType?: BehaviorType
): Promise<CommentActionResult> {
  return performCommentAction(browser, {
    tweetId,
    comment,
    behaviorType
  });
}
