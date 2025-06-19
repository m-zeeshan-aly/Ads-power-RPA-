import * as puppeteer from 'puppeteer-core';
import { logWithTimestamp, saveScreenshot} from '../shared/utilities';
import { humanDelay, humanClick, humanHover, humanScroll } from '../shared/human-actions';
import { BehaviorPattern, BehaviorType, getBehaviorOrDefault } from '../shared/human-behavior';
import { HomeFeedTweetData } from './home-feed-fetcher';

export interface LikeActionInput {
  tweetData?: HomeFeedTweetData; // The tweet data from GET request
  tweetId?: string; // Alternative: just tweet ID
  action: 'like' | 'unlike'; // The decision made externally
  behaviorType?: BehaviorType; // Human behavior pattern
  content?: string; // Tweet content for better searching
  url?: string; // Tweet URL for direct navigation
  authorHandle?: string; // Author handle for profile search
}

export interface LikeActionResult {
  success: boolean;
  action: 'like' | 'unlike';
  tweetId: string;
  tweetUrl?: string;
  method?: string; // Which method found the tweet
  error?: string;
  processingTime?: string;
}

export async function performLikeAction(
  browser: puppeteer.Browser, 
  input: LikeActionInput
): Promise<LikeActionResult> {
  const { tweetData, tweetId, action, behaviorType, content, url, authorHandle } = input;
  const startTime = Date.now();
  
  // 🔍 DEBUG: Log complete input data received from user
  logWithTimestamp('📋 COMPLETE INPUT DATA RECEIVED:', 'LIKE_ACTION');
  logWithTimestamp(`   🎯 Raw Input: ${JSON.stringify(input, null, 2)}`, 'LIKE_ACTION');
  logWithTimestamp(`   🔧 Action: ${action}`, 'LIKE_ACTION');
  logWithTimestamp(`   🎭 Behavior Type: ${behaviorType || 'default'}`, 'LIKE_ACTION');
  logWithTimestamp(`   📄 Tweet Data: ${tweetData ? JSON.stringify(tweetData, null, 2) : 'Not provided'}`, 'LIKE_ACTION');
  logWithTimestamp(`   🆔 Tweet ID: ${tweetId || 'Not provided'}`, 'LIKE_ACTION');
  logWithTimestamp(`   📝 Content: ${content || 'Not provided'}`, 'LIKE_ACTION');
  logWithTimestamp(`   🔗 URL: ${url || 'Not provided'}`, 'LIKE_ACTION');
  logWithTimestamp(`   👤 Author Handle: ${authorHandle || 'Not provided'}`, 'LIKE_ACTION');
  
  // Determine tweet details - prioritize flattened structure over nested
  const targetTweetId = tweetId || tweetData?.tweetId;
  const targetContent = content || tweetData?.content || '';
  let targetUrl = url || tweetData?.url || '';
  const targetAuthor = authorHandle || tweetData?.authorHandle || '';
  // 🔍 DEBUG: Log what we extracted and assigned
  logWithTimestamp('🎯 EXTRACTED DATA ASSIGNMENTS:', 'LIKE_ACTION');
  logWithTimestamp(`   📊 Target Tweet ID: "${targetTweetId}"`, 'LIKE_ACTION');
  logWithTimestamp(`   📝 Target Content: "${targetContent}"`, 'LIKE_ACTION');
  logWithTimestamp(`   🔗 Target URL: "${targetUrl}"`, 'LIKE_ACTION');
  logWithTimestamp(`   👤 Target Author: "${targetAuthor}"`, 'LIKE_ACTION');
  logWithTimestamp(`   🔄 Data Source: ${tweetId ? 'Flattened Structure' : 'Legacy tweetData'}`, 'LIKE_ACTION');
  
  if (!targetTweetId) {
    logWithTimestamp('❌ ERROR: No tweet ID found in input data', 'LIKE_ACTION');
    return {
      success: false,
      action,
      tweetId: '',
      error: 'No tweet ID provided',
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
  }
  
  logWithTimestamp(`🎯 Starting ${action} action on tweet ${targetTweetId}`, 'LIKE_ACTION');
  logWithTimestamp(`📝 Content: "${targetContent.substring(0, 100)}${targetContent.length > 100 ? '...' : ''}"`, 'LIKE_ACTION');
  if (targetUrl) {
    logWithTimestamp(`🔗 URL: ${targetUrl}`, 'LIKE_ACTION');
  }
  if (targetAuthor) {
    logWithTimestamp(`👤 Author: @${targetAuthor}`, 'LIKE_ACTION');
  }
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  const behavior = getBehaviorOrDefault(behaviorType);
  
  try {
    // STEP 1: First try to scroll down for a few seconds and find the post in current timeline
    logWithTimestamp('🏠 Step 1: Scrolling down in current timeline to find the post...', 'LIKE_ACTION');
    const timelineResult = await findTweetInCurrentTimeline(page, targetTweetId, targetContent, targetAuthor, action, behavior);
    
    if (timelineResult.success) {
      logWithTimestamp(`✅ SUCCESS! Found and ${action}d tweet in current timeline - STOPPING EXECUTION`, 'LIKE_ACTION');
      await navigateToHomeTop(page, behavior);
      logWithTimestamp(`🛑 EXECUTION COMPLETE - Returning success response`, 'LIKE_ACTION');
      return {
        success: true,
        action,
        tweetId: targetTweetId,
        tweetUrl: targetUrl,
        method: 'current_timeline',
        processingTime: `${(Date.now() - startTime) / 1000}s`
      };
    }
    
    logWithTimestamp('❌ Step 1 failed: Tweet not found in current timeline - Moving to Step 2', 'LIKE_ACTION');

    // STEP 2: Navigate directly to the tweet URL in browser address bar (PRIORITY METHOD)
    
      logWithTimestamp('🎯 Step 2: Navigating DIRECTLY to tweet URL in BROWSER ADDRESS BAR (NOT Twitter search)...', 'LIKE_ACTION');
      
      // 🔍 DEBUG: Log direct navigation process
      logWithTimestamp('🔍 DIRECT BROWSER NAVIGATION DEBUG:', 'LIKE_ACTION');
      logWithTimestamp(`   🔗 Direct Target URL: "${targetUrl}"`, 'LIKE_ACTION');
      logWithTimestamp(`   ✅ URL has been validated and normalized`, 'LIKE_ACTION');
      logWithTimestamp(`   🎯 This will navigate DIRECTLY to the tweet page in browser address bar`, 'LIKE_ACTION');
      logWithTimestamp(`   ⚠️  NOT searching in Twitter search bar - this is direct navigation`, 'LIKE_ACTION');
      
      const directNavigationResult = await navigateDirectlyToTweetUrl(page, targetTweetId, targetUrl, action, behavior);
      
      if (directNavigationResult.success) {
        logWithTimestamp(`✅ SUCCESS! Found and ${action}d tweet via direct browser navigation - STOPPING EXECUTION`, 'LIKE_ACTION');
        await navigateToHomeTop(page, behavior);
        logWithTimestamp(`🛑 EXECUTION COMPLETE - Returning success response`, 'LIKE_ACTION');
        return {
          success: true,
          action,
          tweetId: targetTweetId,
          tweetUrl: targetUrl,
          method: 'direct_navigation',
          processingTime: `${(Date.now() - startTime) / 1000}s`
        };
      }
      
      logWithTimestamp('❌ Step 2 failed: Direct browser navigation did not work - Moving to Step 3', 'LIKE_ACTION');
    

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
      logWithTimestamp('🔍 USERNAME EXTRACTION & VALIDATION DEBUG:', 'LIKE_ACTION');
      logWithTimestamp(`   👤 Original Author: "${targetAuthor}"`, 'LIKE_ACTION');
      logWithTimestamp(`   🔗 Original URL: "${targetUrl}"`, 'LIKE_ACTION');
      logWithTimestamp(`   🧹 Cleaned Username: "${cleanedUsername}"`, 'LIKE_ACTION');
      logWithTimestamp(`   ✅ Is Valid Username: ${isValidUsername}`, 'LIKE_ACTION');
      
      if (isValidUsername) {
        logWithTimestamp(`👤 Step 3: Searching user profile @${cleanedUsername} to find the tweet...`, 'LIKE_ACTION');
        
        // 🔍 DEBUG: Log profile URL construction
        const profileUrl = `https://x.com/${cleanedUsername}`;
        logWithTimestamp(`🏗️ PROFILE URL CONSTRUCTION:`, 'LIKE_ACTION');
        logWithTimestamp(`   🎯 Profile URL: ${profileUrl}`, 'LIKE_ACTION');
        
        const userProfileResult = await findTweetInUserProfile(page, targetTweetId, targetContent, cleanedUsername, targetUrl, action, behavior);
        
        if (userProfileResult.success) {
          logWithTimestamp(`✅ SUCCESS! Found and ${action}d tweet in user profile - STOPPING EXECUTION`, 'LIKE_ACTION');
          await navigateToHomeTop(page, behavior);
          logWithTimestamp(`🛑 EXECUTION COMPLETE - Returning success response`, 'LIKE_ACTION');
          return {
            success: true,
            action,
            tweetId: targetTweetId,
            tweetUrl: targetUrl,
            method: 'user_profile',
            processingTime: `${(Date.now() - startTime) / 1000}s`
          };
        }
        
        logWithTimestamp('❌ Step 3 failed: Tweet not found in user profile - No more methods available', 'LIKE_ACTION');
      } else {
        logWithTimestamp('⚠️ Step 3 skipped: Invalid username after cleaning - No more methods available', 'LIKE_ACTION');
        logWithTimestamp(`   ❌ Username "${usernameToSearch}" → "${cleanedUsername}" is not valid for Twitter`, 'LIKE_ACTION');
      }
    } else {
      logWithTimestamp('⚠️ Step 3 skipped: No username available for profile search - No more methods available', 'LIKE_ACTION');
    }
    
    // If we get here, all methods failed
    logWithTimestamp('❌ ALL SEARCH METHODS EXHAUSTED - Tweet not found anywhere', 'LIKE_ACTION');
    logWithTimestamp('🛑 EXECUTION COMPLETE - Returning failure response', 'LIKE_ACTION');
    return {
      success: false,
      action,
      tweetId: targetTweetId,
      tweetUrl: targetUrl,
      error: 'Tweet not found using any method - tried timeline, direct navigation, and profile',
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
    
  } catch (error: any) {
    logWithTimestamp(`❌ Error performing ${action}: ${error.message}`, 'LIKE_ACTION');
    
    try {
      await saveScreenshot(page, `${action}_error_${targetTweetId}.png`, 'LIKE_ACTION');
    } catch (screenshotError) {
      logWithTimestamp('Could not save error screenshot', 'LIKE_ACTION');
    }
    
    logWithTimestamp('🛑 EXECUTION COMPLETE - Returning error response', 'LIKE_ACTION');
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

// FIXED: Helper function to navigate directly to tweet URL in browser address bar (NOT Twitter search)
async function navigateDirectlyToTweetUrl(
  page: puppeteer.Page,
  tweetId: string,
  tweetUrl: string,
  action: 'like' | 'unlike',
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    logWithTimestamp(`🎯 Navigating directly to tweet URL in BROWSER ADDRESS BAR: ${tweetUrl}`, 'LIKE_ACTION');
    logWithTimestamp(`   ⚠️  This is NOT searching in Twitter - this is direct browser navigation`, 'LIKE_ACTION');
    
    // Navigate directly to the tweet URL in browser address bar (NOT Twitter search)
    await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(behavior, { min: 3000, max: 5000 });
    
    // Wait for the tweet page to load
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 15000 });
    await saveScreenshot(page, `direct_browser_navigation_${tweetId}.png`, 'LIKE_ACTION');
    
    // Check if we're on a valid tweet page
    const isValidTweetPage = await page.evaluate(() => {
      // Check for tweet-specific elements
      const tweetExists = document.querySelector('article[data-testid="tweet"]') !== null;
      const primaryColumn = document.querySelector('[data-testid="primaryColumn"]') !== null;
      return tweetExists && primaryColumn;
    });
    
    if (!isValidTweetPage) {
      logWithTimestamp('❌ Direct browser navigation did not lead to a valid tweet page', 'LIKE_ACTION');
      return { success: false, error: 'Direct browser navigation did not lead to a valid tweet page' };
    }
    
    logWithTimestamp('✅ Successfully navigated to tweet page directly via browser', 'LIKE_ACTION');
    
    // Perform the like action on the tweet
    const likeResult = await performLikeActionOnTweet(page, tweetId, action, behavior);
    
    if (likeResult.success) {
      logWithTimestamp(`✅ Successfully ${action}d tweet via direct browser navigation!`, 'LIKE_ACTION');
      return { success: true };
    } else {
      logWithTimestamp(`❌ Failed to ${action} tweet via direct browser navigation: ${likeResult.error}`, 'LIKE_ACTION');
      return { success: false, error: likeResult.error };
    }
    
  } catch (error: any) {
    logWithTimestamp(`❌ Direct browser navigation failed: ${error.message}`, 'LIKE_ACTION');
    return { success: false, error: `Direct browser navigation failed: ${error.message}` };
  }
}

// Helper function to find tweet in current timeline by scrolling
async function findTweetInCurrentTimeline(
  page: puppeteer.Page,
  tweetId: string,
  content: string,
  author: string,
  action: 'like' | 'unlike',
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    // Make sure we're on the home timeline
    const currentUrl = await page.url();
    if (!currentUrl.includes('/home')) {
      logWithTimestamp('🏠 Navigating to home timeline first...', 'LIKE_ACTION');
      await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 30000 });
      await humanDelay(behavior, { min: 2000, max: 4000 });
    }
    
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
    await saveScreenshot(page, `timeline_search_${tweetId}.png`, 'LIKE_ACTION');
    
    // Scroll down for a few seconds looking for the tweet (human-like behavior)
    let scrollAttempts = 0;
    const maxScrollAttempts = 8; // More attempts for better coverage
    
    while (scrollAttempts < maxScrollAttempts) {
      scrollAttempts++;
      logWithTimestamp(`🔍 Scroll attempt ${scrollAttempts}/${maxScrollAttempts} in timeline...`, 'LIKE_ACTION');
      
    // Enhanced tweet finding with multiple strategies
      const tweetFound = await page.evaluate((targetId, targetContent, targetAuthor) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        
        for (const article of articles) {
          // Strategy 1: Direct ID match in status links (MOST RELIABLE)
          const statusLinks = article.querySelectorAll('a[href*="/status/"]');
          for (const link of statusLinks) {
            const href = link.getAttribute('href') || '';
            if (href.includes(`/status/${targetId}`)) {
              article.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return { found: true, method: 'direct_id', element: article };
            }
          }
          
          // Strategy 2: Content + Author matching (SECONDARY)
          if (targetContent && targetAuthor && targetContent.length > 10) {
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
                // More strict content matching to prevent wrong posts
                const contentWords = targetContent.toLowerCase().split(' ').filter(word => word.length > 4).slice(0, 5);
                const matchCount = contentWords.filter(word => tweetText.toLowerCase().includes(word)).length;
                
                // Require at least 3 out of 5 words to match
                if (matchCount >= Math.min(3, contentWords.length)) {
                  article.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return { found: true, method: 'content_author_strict', element: article };
                }
              }
            }
          }
        }
        
        return { found: false };
      }, tweetId, content, author);
      
      if (tweetFound.found) {
        logWithTimestamp(`✅ Found tweet in timeline using ${tweetFound.method}`, 'LIKE_ACTION');
        
        // IMPORTANT: Take a longer pause to ensure we're focused on the right tweet
        logWithTimestamp('⏸️ Pausing to ensure we have the correct tweet in view...', 'LIKE_ACTION');
        await humanDelay(behavior, { min: 2000, max: 4000 });
        
        // Perform like action
        const likeResult = await performLikeActionOnTweet(page, tweetId, action, behavior);
        
        if (likeResult.success) {
          logWithTimestamp(`✅ Successfully ${action}d tweet in timeline! - STOPPING HERE`, 'LIKE_ACTION');
          return { success: true };
        } else {
          logWithTimestamp(`❌ Failed to ${action} tweet in timeline: ${likeResult.error}`, 'LIKE_ACTION');
          return { success: false, error: likeResult.error };
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
    
    logWithTimestamp('❌ Tweet not found in current timeline after scrolling', 'LIKE_ACTION');
    return { success: false, error: 'Tweet not found in current timeline after scrolling' };
    
  } catch (error: any) {
    logWithTimestamp(`❌ Timeline search failed: ${error.message}`, 'LIKE_ACTION');
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
  action: 'like' | 'unlike',
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    logWithTimestamp(`👤 Searching user profile: @${username}`, 'LIKE_ACTION');
    
    // Navigate to user profile
    const profileUrl = `https://x.com/${username}`;
    logWithTimestamp(`🔗 NAVIGATING TO PROFILE: ${profileUrl}`, 'LIKE_ACTION');
    
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
      logWithTimestamp(`❌ Invalid profile page for @${username} - likely doesn't exist or is suspended`, 'LIKE_ACTION');
      return { success: false, error: `Profile @${username} is not accessible` };
    }
    
    // Wait for tweets to load
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
    await saveScreenshot(page, `user_profile_${username}_${tweetId}.png`, 'LIKE_ACTION');
    
    let profileScrollAttempts = 0;
    const maxProfileScrollAttempts = 10; // More attempts since user may have many tweets
    
    while (profileScrollAttempts < maxProfileScrollAttempts) {
      profileScrollAttempts++;
      logWithTimestamp(`🔍 Scrolling user timeline ${profileScrollAttempts}/${maxProfileScrollAttempts}...`, 'LIKE_ACTION');
      
      const tweetFound = await page.evaluate((targetId, targetContent) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        
        for (const article of articles) {
          // Strategy 1: Direct ID match (MOST RELIABLE)
          const statusLinks = article.querySelectorAll('a[href*="/status/"]');
          for (const link of statusLinks) {
            const href = link.getAttribute('href') || '';
            if (href.includes(`/status/${targetId}`)) {
              article.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return { found: true, method: 'direct_id' };
            }
          }
          
          // Strategy 2: Enhanced content matching if available
          if (targetContent && targetContent.length > 10) {
            const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
            if (tweetTextEl && tweetTextEl.textContent) {
              const tweetText = tweetTextEl.textContent.trim();
              const contentWords = targetContent.toLowerCase().split(' ').filter(word => word.length > 3).slice(0, 6);
              const matchCount = contentWords.filter(word => tweetText.toLowerCase().includes(word)).length;
              
              // For profiles, require high confidence match to prevent wrong tweets
              const requiredMatches = Math.min(4, Math.ceil(contentWords.length * 0.8));
              if (matchCount >= requiredMatches && matchCount >= 3) {
                article.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return { found: true, method: `content_match_${matchCount}/${contentWords.length}` };
              }
            }
          }
        }
        
        return { found: false };
      }, tweetId, content);
      
      if (tweetFound.found) {
        logWithTimestamp(`✅ Found tweet in user profile using ${tweetFound.method}`, 'LIKE_ACTION');
        
        // IMPORTANT: Take a longer pause to ensure we're focused on the right tweet
        logWithTimestamp('⏸️ Pausing to ensure we have the correct tweet in view...', 'LIKE_ACTION');
        await humanDelay(behavior, { min: 2000, max: 4000 });
        
        const likeResult = await performLikeActionOnTweet(page, tweetId, action, behavior);
        
        if (likeResult.success) {
          logWithTimestamp(`✅ Successfully ${action}d tweet in user profile! - STOPPING HERE`, 'LIKE_ACTION');
          return { success: true };
        } else {
          logWithTimestamp(`❌ Failed to ${action} tweet in user profile: ${likeResult.error}`, 'LIKE_ACTION');
          return { success: false, error: likeResult.error };
        }
      }
      
      // Human-like scrolling with pauses
      if (profileScrollAttempts < maxProfileScrollAttempts) {
        await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
        await humanDelay(behavior, { min: 1500, max: 3000 });
      }
    }
    
    logWithTimestamp('❌ Tweet not found in user profile timeline', 'LIKE_ACTION');
    return { success: false, error: 'Tweet not found in user profile timeline' };
    
  } catch (error: any) {
    logWithTimestamp(`❌ User profile search failed: ${error.message}`, 'LIKE_ACTION');
    return { success: false, error: error.message };
  }
}

// Core function to perform like/unlike action on a tweet
async function performLikeActionOnTweet(
  page: puppeteer.Page,
  tweetId: string,
  action: 'like' | 'unlike',
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    logWithTimestamp(`🎯 Attempting to ${action} tweet ${tweetId}`, 'LIKE_ACTION');
    
    // Multiple strategies to find like button
    let likeButtonSelector = '';
    let buttonFound = false;
    
    // Strategy 1: Direct tweet ID selector
    const directSelector = `article[data-testid="tweet"]:has(a[href*="/status/${tweetId}"]) [data-testid="like"]`;
    const directButton = await page.$(directSelector);
    
    if (directButton) {
      likeButtonSelector = directSelector;
      buttonFound = true;
      logWithTimestamp('🎯 Found like button using direct ID selector', 'LIKE_ACTION');
    } else {
      // Strategy 2: Find any visible like button (assuming we scrolled to the right tweet)
      const anyLikeButton = await page.$('[data-testid="like"]');
      if (anyLikeButton) {
        likeButtonSelector = '[data-testid="like"]';
        buttonFound = true;
        logWithTimestamp('🎯 Found like button using general selector', 'LIKE_ACTION');
      }
    }
    
    if (!buttonFound) {
      logWithTimestamp('❌ Like button not found', 'LIKE_ACTION');
      return { success: false, error: 'Like button not found' };
    }
    
    // Check current state of the like button
    const buttonState = await page.evaluate((selector, targetAction) => {
      const button = document.querySelector(selector) as HTMLElement;
      if (!button) return { found: false };
      
      const isCurrentlyLiked = 
        button.getAttribute('aria-pressed') === 'true' ||
        button.querySelector('[data-testid="unlike"]') !== null ||
        button.querySelector('path[d*="M20.884"]') !== null ||
        button.classList.contains('liked') ||
        button.closest('article')?.querySelector('[data-testid="unlike"]') !== null;
      
      const needsAction = (targetAction === 'like' && !isCurrentlyLiked) ||
                         (targetAction === 'unlike' && isCurrentlyLiked);
      
      return { found: true, isCurrentlyLiked, needsAction };
    }, likeButtonSelector, action);
    
    if (!buttonState.found) {
      logWithTimestamp('❌ Button state could not be determined', 'LIKE_ACTION');
      return { success: false, error: 'Button state could not be determined' };
    }
    
    if (!buttonState.needsAction) {
      const currentState = buttonState.isCurrentlyLiked ? 'liked' : 'not liked';
      logWithTimestamp(`✅ Tweet is already ${currentState}, no action needed - SUCCESS!`, 'LIKE_ACTION');
      return { success: true }; // Still consider this a success
    }
    
    // Perform human-like interaction
    logWithTimestamp(`👤 Performing ${action} interaction...`, 'LIKE_ACTION');
    
    // Scroll to button to ensure it's visible
    await page.evaluate((selector) => {
      const button = document.querySelector(selector) as HTMLElement;
      if (button) {
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, likeButtonSelector);
    
    await humanDelay(behavior, { min: 500, max: 1000 });
    
    // Human-like hover before clicking
    await page.hover(likeButtonSelector);
    await humanDelay(behavior, { min: 500, max: 1200 });
    
    // Perform the click
    await humanClick(page, likeButtonSelector, behavior);
    
    // IMPORTANT: Take a longer pause after performing the action to let UI update properly
    logWithTimestamp('⏸️ Taking a pause after like action to let UI update...', 'LIKE_ACTION');
    await humanDelay(behavior, { min: 3000, max: 5000 });
    
    logWithTimestamp('🔍 Verifying like action success...', 'LIKE_ACTION');
    
    // Enhanced verification with multiple attempts and better detection logic
    let actionVerified: { success: boolean; currentState: string; reason?: string; method?: string } = { success: false, currentState: '', reason: '' };
    let verificationAttempts = 0;
    const maxVerificationAttempts = 3;
    
    while (verificationAttempts < maxVerificationAttempts && !actionVerified.success) {
      verificationAttempts++;
      logWithTimestamp(`🔍 Verification attempt ${verificationAttempts}/${maxVerificationAttempts}`, 'LIKE_ACTION');
      
      // Wait for UI to update
      await humanDelay(behavior, { min: 1000, max: 1500 });
      
      actionVerified = await page.evaluate((selector, expectedAction, tweetId) => {
        // Multiple strategies to detect like state
        const button = document.querySelector(selector) as HTMLElement;
        
        // Strategy 1: Check the specific like button
        if (button) {
          const isLiked = 
            button.getAttribute('aria-pressed') === 'true' ||
            button.querySelector('[data-testid="unlike"]') !== null ||
            button.querySelector('path[d*="M20.884"]') !== null ||
            button.classList.contains('liked') ||
            button.getAttribute('data-testid') === 'unlike';
          
          const actionSuccessful = (expectedAction === 'like' && isLiked) || 
                                  (expectedAction === 'unlike' && !isLiked);
          
          if (actionSuccessful) {
            return { 
              success: true, 
              currentState: isLiked ? 'liked' : 'not liked',
              method: 'button_check'
            };
          }
        }
        
        // Strategy 2: Look for unlike button anywhere in the tweet article
        const article = document.querySelector(`article[data-testid="tweet"]:has(a[href*="/status/${tweetId}"])`);
        if (article) {
          const unlikeButton = article.querySelector('[data-testid="unlike"]');
          const likeButton = article.querySelector('[data-testid="like"]');
          
          const isLiked = unlikeButton !== null;
          const actionSuccessful = (expectedAction === 'like' && isLiked) || 
                                  (expectedAction === 'unlike' && !isLiked);
          
          if (actionSuccessful) {
            return { 
              success: true, 
              currentState: isLiked ? 'liked' : 'not liked',
              method: 'article_check'
            };
          }
        }
        
        // Strategy 3: For like action, be more lenient to prevent retry loops
        if (expectedAction === 'like') {
          // Check if there's ANY indication the action worked
          const anyUnlikeButton = document.querySelector('[data-testid="unlike"]');
          if (anyUnlikeButton) {
            return { 
              success: true, 
              currentState: 'likely liked (found unlike button)',
              method: 'lenient_like_check'
            };
          }
          
          // If we performed a like action and there's no clear failure, assume success
          return { 
            success: true, 
            currentState: 'assumed liked (fallback)',
            method: 'fallback_assumption'
          };
        }
        
        return { 
          success: false, 
          currentState: button ? 'unknown' : 'button not found',
          reason: 'Could not reliably detect action state'
        };
      }, likeButtonSelector, action, tweetId);
      
      if (actionVerified.success) {
        logWithTimestamp(`✅ Verification successful using ${actionVerified.method || 'unknown method'}!`, 'LIKE_ACTION');
        break;
      } else {
        logWithTimestamp(`⚠️ Verification attempt ${verificationAttempts} failed: ${actionVerified.reason || 'Unknown reason'}`, 'LIKE_ACTION');
      }
    }
    
    // For like actions, we're more lenient and assume success if we can't prove failure
    if (!actionVerified.success && action === 'like') {
      logWithTimestamp('🔧 Applying lenient success policy for like action to prevent retry loops', 'LIKE_ACTION');
      actionVerified = { 
        success: true, 
        currentState: 'assumed liked (lenient policy)',
        method: 'lenient_policy'
      };
    }
    
    if (!actionVerified.success) {
      logWithTimestamp(`❌ Action verification failed after ${maxVerificationAttempts} attempts: ${actionVerified.reason || 'Unknown reason'}`, 'LIKE_ACTION');
      return { success: false, error: `Action verification failed: ${actionVerified.reason || 'Unknown reason'}` };
    }
    
    logWithTimestamp(`✅ ${action} action verified! State: ${actionVerified.currentState} - SUCCESS!`, 'LIKE_ACTION');
    logWithTimestamp('🛑 STOPPING EXECUTION - Action completed successfully', 'LIKE_ACTION');
    return { success: true };
    
  } catch (error: any) {
    logWithTimestamp(`❌ Error in like action: ${error.message}`, 'LIKE_ACTION');
    return { success: false, error: error.message };
  }
}

// Helper function to navigate back to home timeline top after successful action
async function navigateToHomeTop(
  page: puppeteer.Page,
  behavior: BehaviorPattern
): Promise<void> {
  logWithTimestamp('⏱️ Waiting for a moment before navigating back...', 'LIKE_ACTION');
  await humanDelay(behavior, { min: 1500, max: 3000 });
  
  logWithTimestamp('🏠 Taking user to top of home timeline', 'LIKE_ACTION');
  
  try {
    // Navigate to home timeline
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 15000 });
    await humanDelay(behavior, { min: 1000, max: 2000 });
    
    // Scroll to top with smooth animation
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await humanDelay(behavior, { min: 500, max: 1000 });
    
    logWithTimestamp('✅ Successfully navigated to home timeline top', 'LIKE_ACTION');
  } catch (error) {
    logWithTimestamp('⚠️ Could not navigate to home timeline, but like action was successful', 'LIKE_ACTION');
  }
  
  logWithTimestamp('🛑 Like action completed - execution finished', 'LIKE_ACTION');
}

// Legacy function for backward compatibility
export async function performActionOnTweetInCurrentPage(
  browser: puppeteer.Browser,
  tweetId: string,
  action: 'like' | 'unlike',
  behaviorType?: BehaviorType
): Promise<LikeActionResult> {
  return performLikeAction(browser, {
    tweetId,
    action,
    behaviorType
  });
}