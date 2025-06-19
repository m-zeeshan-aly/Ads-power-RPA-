// retweet-action-handler.ts - Handle retweet actions on tweets from home feed

import * as puppeteer from 'puppeteer-core';
import { logWithTimestamp, saveScreenshot } from '../shared/utilities';
import { humanDelay, humanClick, humanHover, humanScroll } from '../shared/human-actions';
import { BehaviorPattern, BehaviorType, getBehaviorOrDefault } from '../shared/human-behavior';
import { HomeFeedTweetData } from './home-feed-fetcher';

export interface RetweetActionInput {
  tweetData?: HomeFeedTweetData; // The tweet data from GET request
  tweetId?: string; // Alternative: just tweet ID
  action: 'retweet' | 'unretweet'; // The decision made externally
  behaviorType?: BehaviorType; // Human behavior pattern
  content?: string; // Tweet content for better searching
  url?: string; // Tweet URL for direct navigation
  authorHandle?: string; // Author handle for profile search
}

export interface RetweetActionResult {
  success: boolean;
  action: 'retweet' | 'unretweet';
  tweetId: string;
  tweetUrl?: string;
  method?: string; // Which method found the tweet
  error?: string;
  processingTime?: string;
}

export async function performRetweetAction(
  browser: puppeteer.Browser, 
  input: RetweetActionInput
): Promise<RetweetActionResult> {
  const { tweetData, tweetId, action, behaviorType, content, url, authorHandle } = input;
  const startTime = Date.now();
  
  // 🔍 DEBUG: Log complete input data received from user
  logWithTimestamp('📋 COMPLETE INPUT DATA RECEIVED:', 'RETWEET_ACTION');
  logWithTimestamp(`   🎯 Raw Input: ${JSON.stringify(input, null, 2)}`, 'RETWEET_ACTION');
  logWithTimestamp(`   🔧 Action: ${action}`, 'RETWEET_ACTION');
  logWithTimestamp(`   🎭 Behavior Type: ${behaviorType || 'default'}`, 'RETWEET_ACTION');
  logWithTimestamp(`   📄 Tweet Data: ${tweetData ? JSON.stringify(tweetData, null, 2) : 'Not provided'}`, 'RETWEET_ACTION');
  logWithTimestamp(`   🆔 Tweet ID: ${tweetId || 'Not provided'}`, 'RETWEET_ACTION');
  logWithTimestamp(`   📝 Content: ${content || 'Not provided'}`, 'RETWEET_ACTION');
  logWithTimestamp(`   🔗 URL: ${url || 'Not provided'}`, 'RETWEET_ACTION');
  logWithTimestamp(`   👤 Author Handle: ${authorHandle || 'Not provided'}`, 'RETWEET_ACTION');
  
  // Determine tweet details - prioritize flattened structure over nested
  const targetTweetId = tweetId || tweetData?.tweetId;
  const targetContent = content || tweetData?.content || '';
  const targetUrl = url || tweetData?.url || '';
  const targetAuthor = authorHandle || tweetData?.authorHandle || '';
  
  // 🔍 DEBUG: Log what we extracted and assigned
  logWithTimestamp('🎯 EXTRACTED DATA ASSIGNMENTS:', 'RETWEET_ACTION');
  logWithTimestamp(`   📊 Target Tweet ID: "${targetTweetId}"`, 'RETWEET_ACTION');
  logWithTimestamp(`   📝 Target Content: "${targetContent}"`, 'RETWEET_ACTION');
  logWithTimestamp(`   🔗 Target URL: "${targetUrl}"`, 'RETWEET_ACTION');
  logWithTimestamp(`   👤 Target Author: "${targetAuthor}"`, 'RETWEET_ACTION');
  logWithTimestamp(`   🔄 Data Source: ${tweetId ? 'Flattened Structure' : 'Legacy tweetData'}`, 'RETWEET_ACTION');
  
  if (!targetTweetId) {
    logWithTimestamp('❌ ERROR: No tweet ID found in input data', 'RETWEET_ACTION');
    return {
      success: false,
      action,
      tweetId: '',
      error: 'No tweet ID provided',
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
  }
  
  logWithTimestamp(`🎯 Starting ${action} action on tweet ${targetTweetId}`, 'RETWEET_ACTION');
  logWithTimestamp(`📝 Content: "${targetContent.substring(0, 100)}${targetContent.length > 100 ? '...' : ''}"`, 'RETWEET_ACTION');
  if (targetUrl) {
    logWithTimestamp(`🔗 URL: ${targetUrl}`, 'RETWEET_ACTION');
  }
  if (targetAuthor) {
    logWithTimestamp(`👤 Author: @${targetAuthor}`, 'RETWEET_ACTION');
  }
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  const behavior = getBehaviorOrDefault(behaviorType);
  
  try {
    // STEP 1: First try to scroll down for a few seconds and find the post in current timeline
    logWithTimestamp('🏠 Step 1: Scrolling down in current timeline to find the post...', 'RETWEET_ACTION');
    const timelineResult = await findTweetInCurrentTimeline(page, targetTweetId, targetContent, targetAuthor, action, behavior);
    
    if (timelineResult.success) {
      logWithTimestamp(`✅ SUCCESS! Found and ${action}d tweet in current timeline - STOPPING EXECUTION`, 'RETWEET_ACTION');
      await navigateToHomeTop(page, behavior);
      logWithTimestamp(`🛑 EXECUTION COMPLETE - Returning success response`, 'RETWEET_ACTION');
      return {
        success: true,
        action,
        tweetId: targetTweetId,
        tweetUrl: targetUrl,
        method: 'current_timeline',
        processingTime: `${(Date.now() - startTime) / 1000}s`
      };
    }
    
    logWithTimestamp('❌ Step 1 failed: Tweet not found in current timeline - Moving to Step 2', 'RETWEET_ACTION');

    // STEP 2: Navigate directly to the tweet URL in browser address bar (PRIORITY METHOD)
    if (targetUrl && targetUrl.includes('x.com/') && targetUrl.includes('/status/')) {
      logWithTimestamp('🎯 Step 2: Navigating DIRECTLY to tweet URL in BROWSER ADDRESS BAR (NOT Twitter search)...', 'RETWEET_ACTION');
      
      // 🔍 DEBUG: Log direct navigation process
      logWithTimestamp('🔍 DIRECT BROWSER NAVIGATION DEBUG:', 'RETWEET_ACTION');
      logWithTimestamp(`   🔗 Direct Target URL: "${targetUrl}"`, 'RETWEET_ACTION');
      logWithTimestamp(`   🎯 This will navigate DIRECTLY to the tweet page in browser address bar`, 'RETWEET_ACTION');
      logWithTimestamp(`   ⚠️  NOT searching in Twitter search bar - this is direct navigation`, 'RETWEET_ACTION');
      
      const directNavigationResult = await navigateDirectlyToTweetUrl(page, targetTweetId, targetUrl, action, behavior);
      
      if (directNavigationResult.success) {
        logWithTimestamp(`✅ SUCCESS! Found and ${action}d tweet via direct browser navigation - STOPPING EXECUTION`, 'RETWEET_ACTION');
        await navigateToHomeTop(page, behavior);
        logWithTimestamp(`🛑 EXECUTION COMPLETE - Returning success response`, 'RETWEET_ACTION');
        return {
          success: true,
          action,
          tweetId: targetTweetId,
          tweetUrl: targetUrl,
          method: 'direct_navigation',
          processingTime: `${(Date.now() - startTime) / 1000}s`
        };
      }
      
      logWithTimestamp('❌ Step 2 failed: Direct browser navigation did not work - Moving to Step 3', 'RETWEET_ACTION');
    } else {
      logWithTimestamp('⚠️ Step 2 skipped: No valid tweet URL provided for direct navigation - Moving to Step 3', 'RETWEET_ACTION');
    }

    // STEP 3: Search for the username and find the tweet on their profile
    // Extract username from URL or use provided author
    let usernameToSearch = targetAuthor;
    
    if (!usernameToSearch && targetUrl) {
      // Extract username from URL like: https://x.com/locofy_ai/status/1886257050193191167/analytics
      const urlMatch = targetUrl.match(/x\.com\/([^\/]+)\/status/);
      if (urlMatch) {
        usernameToSearch = urlMatch[1];
      }
    }
    
    // Clean and validate username before using it
    if (usernameToSearch) {
      // Clean the username: remove spaces, special characters, URL encoding
      const cleanedUsername = usernameToSearch
        .replace(/[^a-zA-Z0-9_]/g, '') // Remove all non-alphanumeric characters except underscore
        .trim();
      
      // Validate username - Twitter usernames must be 1-15 characters, alphanumeric + underscore only
      const isValidUsername = cleanedUsername.length >= 1 && 
                             cleanedUsername.length <= 15 && 
                             /^[a-zA-Z0-9_]+$/.test(cleanedUsername);
      
      // 🔍 DEBUG: Log username extraction and validation process
      logWithTimestamp('🔍 USERNAME EXTRACTION & VALIDATION DEBUG:', 'RETWEET_ACTION');
      logWithTimestamp(`   👤 Original Author: "${targetAuthor}"`, 'RETWEET_ACTION');
      logWithTimestamp(`   🔗 Original URL: "${targetUrl}"`, 'RETWEET_ACTION');
      logWithTimestamp(`   🧹 Cleaned Username: "${cleanedUsername}"`, 'RETWEET_ACTION');
      logWithTimestamp(`   ✅ Is Valid Username: ${isValidUsername}`, 'RETWEET_ACTION');
      
      if (isValidUsername) {
        logWithTimestamp(`👤 Step 3: Searching user profile @${cleanedUsername} to find the tweet...`, 'RETWEET_ACTION');
        
        // 🔍 DEBUG: Log profile URL construction
        const profileUrl = `https://x.com/${cleanedUsername}`;
        logWithTimestamp(`🏗️ PROFILE URL CONSTRUCTION:`, 'RETWEET_ACTION');
        logWithTimestamp(`   🎯 Profile URL: ${profileUrl}`, 'RETWEET_ACTION');
        
        const userProfileResult = await findTweetInUserProfile(page, targetTweetId, targetContent, cleanedUsername, targetUrl, action, behavior);
        
        if (userProfileResult.success) {
          logWithTimestamp(`✅ SUCCESS! Found and ${action}d tweet in user profile - STOPPING EXECUTION`, 'RETWEET_ACTION');
          await navigateToHomeTop(page, behavior);
          logWithTimestamp(`🛑 EXECUTION COMPLETE - Returning success response`, 'RETWEET_ACTION');
          return {
            success: true,
            action,
            tweetId: targetTweetId,
            tweetUrl: targetUrl,
            method: 'user_profile',
            processingTime: `${(Date.now() - startTime) / 1000}s`
          };
        }
        
        logWithTimestamp('❌ Step 3 failed: Tweet not found in user profile - No more methods available', 'RETWEET_ACTION');
      } else {
        logWithTimestamp('⚠️ Step 3 skipped: Invalid username after cleaning - No more methods available', 'RETWEET_ACTION');
        logWithTimestamp(`   ❌ Username "${usernameToSearch}" → "${cleanedUsername}" is not valid for Twitter`, 'RETWEET_ACTION');
      }
    } else {
      logWithTimestamp('⚠️ Step 3 skipped: No username available for profile search - No more methods available', 'RETWEET_ACTION');
    }
    
    // If we get here, all methods failed
    logWithTimestamp('❌ ALL SEARCH METHODS EXHAUSTED - Tweet not found anywhere', 'RETWEET_ACTION');
    logWithTimestamp('🛑 EXECUTION COMPLETE - Returning failure response', 'RETWEET_ACTION');
    return {
      success: false,
      action,
      tweetId: targetTweetId,
      tweetUrl: targetUrl,
      error: 'Tweet not found using any method - tried timeline, direct navigation, and profile',
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
    
  } catch (error: any) {
    logWithTimestamp(`❌ Error performing ${action}: ${error.message}`, 'RETWEET_ACTION');
    
    try {
      await saveScreenshot(page, `${action}_error_${targetTweetId}.png`, 'RETWEET_ACTION');
    } catch (screenshotError) {
      logWithTimestamp('Could not save error screenshot', 'RETWEET_ACTION');
    }
    
    logWithTimestamp('🛑 EXECUTION COMPLETE - Returning error response', 'RETWEET_ACTION');
    return {
      success: false,
      action,
      tweetId: targetTweetId,
      tweetUrl: targetUrl,
      error: error.message,
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
  }
}

// Helper function to navigate directly to tweet URL in browser address bar (NOT Twitter search)
async function navigateDirectlyToTweetUrl(
  page: puppeteer.Page,
  tweetId: string,
  tweetUrl: string,
  action: 'retweet' | 'unretweet',
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    logWithTimestamp(`🎯 Navigating directly to tweet URL in BROWSER ADDRESS BAR: ${tweetUrl}`, 'RETWEET_ACTION');
    logWithTimestamp(`   ⚠️  This is NOT searching in Twitter - this is direct browser navigation`, 'RETWEET_ACTION');
    
    // Navigate directly to the tweet URL in browser address bar (NOT Twitter search)
    await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(behavior, { min: 3000, max: 5000 });
    
    // Wait for the tweet page to load
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 15000 });
    await saveScreenshot(page, `direct_browser_navigation_retweet_${tweetId}.png`, 'RETWEET_ACTION');
    
    // Check if we're on a valid tweet page
    const isValidTweetPage = await page.evaluate(() => {
      // Check for tweet-specific elements
      const tweetExists = document.querySelector('article[data-testid="tweet"]') !== null;
      const primaryColumn = document.querySelector('[data-testid="primaryColumn"]') !== null;
      return tweetExists && primaryColumn;
    });
    
    if (!isValidTweetPage) {
      logWithTimestamp('❌ Direct browser navigation did not lead to a valid tweet page', 'RETWEET_ACTION');
      return { success: false, error: 'Direct browser navigation did not lead to a valid tweet page' };
    }
    
    logWithTimestamp('✅ Successfully navigated to tweet page directly via browser', 'RETWEET_ACTION');
    
    // Perform the retweet action on the tweet
    const retweetResult = await performRetweetActionOnTweet(page, tweetId, action, behavior);
    
    if (retweetResult.success) {
      logWithTimestamp(`✅ Successfully ${action}d tweet via direct browser navigation!`, 'RETWEET_ACTION');
      return { success: true };
    } else {
      logWithTimestamp(`❌ Failed to ${action} tweet via direct browser navigation: ${retweetResult.error}`, 'RETWEET_ACTION');
      return { success: false, error: retweetResult.error };
    }
    
  } catch (error: any) {
    logWithTimestamp(`❌ Direct browser navigation failed: ${error.message}`, 'RETWEET_ACTION');
    return { success: false, error: `Direct browser navigation failed: ${error.message}` };
  }
}

// Helper function to find tweet in current timeline by scrolling
async function findTweetInCurrentTimeline(
  page: puppeteer.Page,
  tweetId: string,
  content: string,
  author: string,
  action: 'retweet' | 'unretweet',
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    // Make sure we're on the home timeline
    const currentUrl = await page.url();
    if (!currentUrl.includes('/home')) {
      logWithTimestamp('🏠 Navigating to home timeline first...', 'RETWEET_ACTION');
      await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 30000 });
      await humanDelay(behavior, { min: 2000, max: 4000 });
    }
    
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
    await saveScreenshot(page, `timeline_search_retweet_${tweetId}.png`, 'RETWEET_ACTION');
    
    // Scroll down for a few seconds looking for the tweet (human-like behavior)
    let scrollAttempts = 0;
    const maxScrollAttempts = 8; // More attempts for better coverage
    
    while (scrollAttempts < maxScrollAttempts) {
      scrollAttempts++;
      logWithTimestamp(`🔍 Scroll attempt ${scrollAttempts}/${maxScrollAttempts} in timeline...`, 'RETWEET_ACTION');
      
      // Enhanced tweet finding with multiple strategies
      const tweetFound = await page.evaluate((targetId, targetContent, targetAuthor) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        
        for (const article of articles) {
          // Strategy 1: Direct ID match in status links
          const statusLinks = article.querySelectorAll('a[href*="/status/"]');
          for (const link of statusLinks) {
            const href = link.getAttribute('href') || '';
            if (href.includes(`/status/${targetId}`)) {
              article.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return { found: true, method: 'direct_id' };
            }
          }
          
          // Strategy 2: Content + Author matching
          if (targetContent && targetAuthor) {
            const authorElements = article.querySelectorAll('[data-testid="User-Name"]');
            let authorMatch = false;
            
            for (const authorEl of authorElements) {
              const usernameEl = authorEl.querySelector('span[dir="ltr"]');
              if (usernameEl && usernameEl.textContent) {
                const handle = usernameEl.textContent.trim().replace('@', '');
                if (handle.toLowerCase() === targetAuthor.toLowerCase()) {
                  authorMatch = true;
                  break;
                }
              }
            }
            
            if (authorMatch) {
              const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
              if (tweetTextEl && tweetTextEl.textContent) {
                const tweetText = tweetTextEl.textContent.trim();
                const contentWords = targetContent.toLowerCase().split(' ').filter(word => word.length > 3).slice(0, 3);
                const textMatch = contentWords.some(word => tweetText.toLowerCase().includes(word));
                
                if (textMatch) {
                  article.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return { found: true, method: 'content_author' };
                }
              }
            }
          }
          
          // Strategy 3: Content only matching (if author not available)
          if (targetContent && !targetAuthor && targetContent.length > 20) {
            const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
            if (tweetTextEl && tweetTextEl.textContent) {
              const tweetText = tweetTextEl.textContent.trim();
              const contentWords = targetContent.toLowerCase().split(' ').filter(word => word.length > 4).slice(0, 3);
              const matchCount = contentWords.filter(word => tweetText.toLowerCase().includes(word)).length;
              
              if (matchCount >= 2) { // At least 2 words must match
                article.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return { found: true, method: 'content_only' };
              }
            }
          }
        }
        
        return { found: false };
      }, tweetId, content, author);
      
      if (tweetFound.found) {
        logWithTimestamp(`✅ Found tweet in timeline using ${tweetFound.method}`, 'RETWEET_ACTION');
        await humanDelay(behavior, { min: 1500, max: 3000 });
        
        // Perform retweet action
        const retweetResult = await performRetweetActionOnTweet(page, tweetId, action, behavior);
        
        if (retweetResult.success) {
          logWithTimestamp(`✅ Successfully ${action}d tweet in timeline! - STOPPING HERE`, 'RETWEET_ACTION');
          return { success: true };
        } else {
          logWithTimestamp(`❌ Failed to ${action} tweet in timeline: ${retweetResult.error}`, 'RETWEET_ACTION');
          return { success: false, error: retweetResult.error };
        }
      }
      
      // Human-like scrolling with natural pauses
      if (scrollAttempts < maxScrollAttempts) {
        await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
        await humanDelay(behavior, { min: 2000, max: 4000 });
        
        // Occasionally scroll back up a bit (human-like behavior)
        if (scrollAttempts % 3 === 0) {
          await page.evaluate(() => window.scrollBy({ top: -200, behavior: 'smooth' }));
          await humanDelay(behavior, { min: 1000, max: 2000 });
        }
      }
    }
    
    logWithTimestamp('❌ Tweet not found in current timeline after scrolling', 'RETWEET_ACTION');
    return { success: false, error: 'Tweet not found in current timeline after scrolling' };
    
  } catch (error: any) {
    logWithTimestamp(`❌ Timeline search failed: ${error.message}`, 'RETWEET_ACTION');
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
  action: 'retweet' | 'unretweet',
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    logWithTimestamp(`👤 Searching user profile: @${username}`, 'RETWEET_ACTION');
    
    // Navigate to user profile
    const profileUrl = `https://x.com/${username}`;
    logWithTimestamp(`🔗 NAVIGATING TO PROFILE: ${profileUrl}`, 'RETWEET_ACTION');
    
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(behavior, { min: 3000, max: 5000 });
    
    // Check if we landed on a valid profile page
    const isValidProfile = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      const isErrorPage = bodyText.includes("this page doesn't exist") || 
                         bodyText.includes("Hmm...this page doesn't exist") ||
                         bodyText.includes("Something went wrong") ||
                         bodyText.includes("User not found");
      
      const hasProfileElements = document.querySelector('[data-testid="primaryColumn"]') !== null;
      
      return !isErrorPage && hasProfileElements;
    });
    
    if (!isValidProfile) {
      logWithTimestamp(`❌ Invalid profile page for @${username} - likely doesn't exist or is suspended`, 'RETWEET_ACTION');
      return { success: false, error: `Profile @${username} is not accessible` };
    }
    
    // Wait for tweets to load
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
    await saveScreenshot(page, `user_profile_retweet_${username}_${tweetId}.png`, 'RETWEET_ACTION');
    
    let profileScrollAttempts = 0;
    const maxProfileScrollAttempts = 10; // More attempts since user may have many tweets
    
    while (profileScrollAttempts < maxProfileScrollAttempts) {
      profileScrollAttempts++;
      logWithTimestamp(`🔍 Scrolling user timeline ${profileScrollAttempts}/${maxProfileScrollAttempts}...`, 'RETWEET_ACTION');
      
      const tweetFound = await page.evaluate((targetId, targetContent) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        
        for (const article of articles) {
          // Strategy 1: Direct ID match
          const statusLinks = article.querySelectorAll('a[href*="/status/"]');
          for (const link of statusLinks) {
            const href = link.getAttribute('href') || '';
            if (href.includes(`/status/${targetId}`)) {
              article.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return { found: true, method: 'direct_id' };
            }
          }
          
          // Strategy 2: Content matching if available
          if (targetContent && targetContent.length > 15) {
            const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
            if (tweetTextEl && tweetTextEl.textContent) {
              const tweetText = tweetTextEl.textContent.trim();
              const contentWords = targetContent.toLowerCase().split(' ').filter(word => word.length > 4).slice(0, 4);
              const matchCount = contentWords.filter(word => tweetText.toLowerCase().includes(word)).length;
              
              if (matchCount >= 3) { // Require more matches on profile
                article.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return { found: true, method: 'content_match' };
              }
            }
          }
        }
        
        return { found: false };
      }, tweetId, content);
      
      if (tweetFound.found) {
        logWithTimestamp(`✅ Found tweet in user profile using ${tweetFound.method}`, 'RETWEET_ACTION');
        await humanDelay(behavior, { min: 1500, max: 3000 });
        
        const retweetResult = await performRetweetActionOnTweet(page, tweetId, action, behavior);
        
        if (retweetResult.success) {
          logWithTimestamp(`✅ Successfully ${action}d tweet in user profile! - STOPPING HERE`, 'RETWEET_ACTION');
          return { success: true };
        } else {
          logWithTimestamp(`❌ Failed to ${action} tweet in user profile: ${retweetResult.error}`, 'RETWEET_ACTION');
          return { success: false, error: retweetResult.error };
        }
      }
      
      // Human-like scrolling with pauses
      if (profileScrollAttempts < maxProfileScrollAttempts) {
        await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
        await humanDelay(behavior, { min: 1500, max: 3000 });
      }
    }
    
    logWithTimestamp('❌ Tweet not found in user profile timeline', 'RETWEET_ACTION');
    return { success: false, error: 'Tweet not found in user profile timeline' };
    
  } catch (error: any) {
    logWithTimestamp(`❌ User profile search failed: ${error.message}`, 'RETWEET_ACTION');
    return { success: false, error: error.message };
  }
}

// Core function to perform retweet/unretweet action on a tweet
async function performRetweetActionOnTweet(
  page: puppeteer.Page,
  tweetId: string,
  action: 'retweet' | 'unretweet',
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    logWithTimestamp(`🎯 Attempting to ${action} tweet ${tweetId}`, 'RETWEET_ACTION');
    
    // Multiple strategies to find retweet button
    let retweetButtonSelector = '';
    let buttonFound = false;
    
    // Strategy 1: Direct tweet ID selector
    const directSelector = `article[data-testid="tweet"]:has(a[href*="/status/${tweetId}"]) [data-testid="retweet"]`;
    const directButton = await page.$(directSelector);
    
    if (directButton) {
      retweetButtonSelector = directSelector;
      buttonFound = true;
      logWithTimestamp('🎯 Found retweet button using direct ID selector', 'RETWEET_ACTION');
    } else {
      // Strategy 2: Find any visible retweet button (assuming we scrolled to the right tweet)
      const anyRetweetButton = await page.$('[data-testid="retweet"]');
      if (anyRetweetButton) {
        retweetButtonSelector = '[data-testid="retweet"]';
        buttonFound = true;
        logWithTimestamp('🎯 Found retweet button using general selector', 'RETWEET_ACTION');
      }
    }
    
    if (!buttonFound) {
      logWithTimestamp('❌ Retweet button not found', 'RETWEET_ACTION');
      return { success: false, error: 'Retweet button not found' };
    }
    
    // Check current state of the retweet button
    const buttonState = await page.evaluate((selector, targetAction) => {
      const button = document.querySelector(selector) as HTMLElement;
      if (!button) return { found: false };
      
      const isCurrentlyRetweeted = 
        button.getAttribute('aria-pressed') === 'true' ||
        button.querySelector('[data-testid="unretweet"]') !== null ||
        button.classList.contains('retweeted') ||
        button.closest('article')?.querySelector('[data-testid="unretweet"]') !== null;
      
      const needsAction = (targetAction === 'retweet' && !isCurrentlyRetweeted) ||
                         (targetAction === 'unretweet' && isCurrentlyRetweeted);
      
      return { found: true, isCurrentlyRetweeted, needsAction };
    }, retweetButtonSelector, action);
    
    if (!buttonState.found) {
      logWithTimestamp('❌ Button state could not be determined', 'RETWEET_ACTION');
      return { success: false, error: 'Button state could not be determined' };
    }
    
    if (!buttonState.needsAction) {
      const currentState = buttonState.isCurrentlyRetweeted ? 'retweeted' : 'not retweeted';
      logWithTimestamp(`✅ Tweet is already ${currentState}, no action needed - SUCCESS!`, 'RETWEET_ACTION');
      return { success: true }; // Still consider this a success
    }
    
    // Perform human-like interaction
    logWithTimestamp(`👤 Performing ${action} interaction...`, 'RETWEET_ACTION');
    
    // Scroll to button to ensure it's visible
    await page.evaluate((selector) => {
      const button = document.querySelector(selector) as HTMLElement;
      if (button) {
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, retweetButtonSelector);
    
    await humanDelay(behavior, { min: 500, max: 1000 });
    
    // Human-like hover before clicking
    await page.hover(retweetButtonSelector);
    await humanDelay(behavior, { min: 500, max: 1200 });
    
    // Perform the click
    await humanClick(page, retweetButtonSelector, behavior);
    await humanDelay(behavior, { min: 1000, max: 2000 });
    
    // Handle retweet menu if it appears (for retweet action)
    if (action === 'retweet') {
      try {
        // Wait for retweet menu to appear
        await page.waitForSelector('[data-testid="retweetConfirm"], [role="menuitem"]:has-text("Retweet")', { timeout: 5000 });
        
        // Find and click the "Retweet" confirmation button
        const confirmButton = await page.$('[data-testid="retweetConfirm"]') || 
                             await page.$('[role="menuitem"]:has-text("Retweet")');
        
        if (confirmButton) {
          await humanDelay(behavior, { min: 300, max: 800 });
          await humanHover(page, '[data-testid="retweetConfirm"], [role="menuitem"]:has-text("Retweet")', behavior);
          await humanClick(page, '[data-testid="retweetConfirm"], [role="menuitem"]:has-text("Retweet")', behavior);
          logWithTimestamp('✅ Clicked retweet confirmation button', 'RETWEET_ACTION');
        } else {
          logWithTimestamp('⚠️ Retweet confirmation button not found, continuing...', 'RETWEET_ACTION');
        }
      } catch (error) {
        logWithTimestamp('⚠️ No retweet menu appeared or timed out, continuing...', 'RETWEET_ACTION');
      }
    }
    
    // Wait for action to complete
    await humanDelay(behavior, { min: 1500, max: 2500 });
    
    // Verify the action was successful
    const actionVerified = await page.evaluate((selector, expectedAction) => {
      const button = document.querySelector(selector) as HTMLElement;
      if (!button) return { success: false, reason: 'Button disappeared' };
      
      const isNowRetweeted = 
        button.getAttribute('aria-pressed') === 'true' ||
        button.querySelector('[data-testid="unretweet"]') !== null ||
        button.classList.contains('retweeted') ||
        button.closest('article')?.querySelector('[data-testid="unretweet"]') !== null;
      
      const actionSuccessful = (expectedAction === 'retweet' && isNowRetweeted) || 
                              (expectedAction === 'unretweet' && !isNowRetweeted);
      
      return { 
        success: actionSuccessful, 
        currentState: isNowRetweeted ? 'retweeted' : 'not retweeted'
      };
    }, retweetButtonSelector, action);
    
    if (!actionVerified.success) {
      logWithTimestamp(`❌ Action verification failed: ${actionVerified.reason || 'Unknown reason'}`, 'RETWEET_ACTION');
      return { success: false, error: `Action verification failed: ${actionVerified.reason || 'Unknown reason'}` };
    }
    
    logWithTimestamp(`✅ ${action} action verified! State: ${actionVerified.currentState} - SUCCESS!`, 'RETWEET_ACTION');
    return { success: true };
    
  } catch (error: any) {
    logWithTimestamp(`❌ Error in retweet action: ${error.message}`, 'RETWEET_ACTION');
    return { success: false, error: error.message };
  }
}

// Helper function to navigate back to home timeline top after successful action
async function navigateToHomeTop(
  page: puppeteer.Page,
  behavior: BehaviorPattern
): Promise<void> {
  logWithTimestamp('⏱️ Waiting for a moment before navigating back...', 'RETWEET_ACTION');
  await humanDelay(behavior, { min: 1000, max: 2000 });
  
  logWithTimestamp('🏠 Taking user to top of home timeline', 'RETWEET_ACTION');
  
  try {
    // Navigate to home timeline
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 15000 });
    await humanDelay(behavior, { min: 1000, max: 2000 });
    
    // Scroll to top with smooth animation
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await humanDelay(behavior, { min: 500, max: 1000 });
    
    logWithTimestamp('✅ Successfully navigated to home timeline top', 'RETWEET_ACTION');
  } catch (error) {
    logWithTimestamp('⚠️ Could not navigate to home timeline, but retweet action was successful', 'RETWEET_ACTION');
  }
  
  logWithTimestamp('🛑 Retweet action completed - execution finished', 'RETWEET_ACTION');
}

// Legacy function for backward compatibility
export async function performActionOnTweetInCurrentPage(
  browser: puppeteer.Browser,
  tweetId: string,
  action: 'retweet' | 'unretweet',
  behaviorType?: BehaviorType
): Promise<RetweetActionResult> {
  return performRetweetAction(browser, {
    tweetId,
    action,
    behaviorType
  });
}
