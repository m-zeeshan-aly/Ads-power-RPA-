// import * as puppeteer from 'puppeteer-core';
// import { logWithTimestamp, saveScreenshot } from '../shared/utilities';
// import { humanDelay, humanClick, humanHover, humanScroll } from '../shared/human-actions';
// import { BehaviorPattern, BehaviorType, getBehaviorOrDefault } from '../shared/human-behavior';
// import { HomeFeedTweetData } from './home-feed-fetcher';

// export interface LikeActionInput {
//   tweetData?: HomeFeedTweetData; // The tweet data from GET request
//   tweetId?: string; // Alternative: just tweet ID
//   action: 'like' | 'unlike'; // The decision made externally
//   behaviorType?: BehaviorType; // Human behavior pattern
//   content?: string; // Tweet content for better searching
// }

// export interface LikeActionResult {
//   success: boolean;
//   action: 'like' | 'unlike';
//   tweetId: string;
//   tweetUrl?: string;
//   method?: string; // Which method found the tweet
//   error?: string;
//   processingTime?: string;
// }

// export async function performLikeAction(
//   browser: puppeteer.Browser, 
//   input: LikeActionInput
// ): Promise<LikeActionResult> {
//   const { tweetData, tweetId, action, behaviorType, content } = input;
//   const startTime = Date.now();
  
//   // Determine tweet details
//   const targetTweetId = tweetData?.tweetId || tweetId;
//   const targetContent = content || tweetData?.content || '';
//   const targetUrl = tweetData?.url || '';
//   const targetAuthor = tweetData?.authorHandle || '';
  
//   if (!targetTweetId) {
//     return {
//       success: false,
//       action,
//       tweetId: '',
//       error: 'No tweet ID provided',
//       processingTime: `${(Date.now() - startTime) / 1000}s`
//     };
//   }
  
//   logWithTimestamp(`🎯 Starting ${action} action on tweet ${targetTweetId}`, 'LIKE_ACTION');
//   logWithTimestamp(`📝 Content: "${targetContent.substring(0, 100)}${targetContent.length > 100 ? '...' : ''}"`, 'LIKE_ACTION');
//   if (targetUrl) {
//     logWithTimestamp(`🔗 URL: ${targetUrl}`, 'LIKE_ACTION');
//   }
//   if (targetAuthor) {
//     logWithTimestamp(`👤 Author: @${targetAuthor}`, 'LIKE_ACTION');
//   }
  
//   const pages = await browser.pages();
//   const page = pages[0] || await browser.newPage();
//   const behavior = getBehaviorOrDefault(behaviorType);
  
//   try {
//     // STEP 1: First try to scroll down for a few seconds and find the post in current timeline
//     logWithTimestamp('🏠 Step 1: Scrolling down in current timeline to find the post...', 'LIKE_ACTION');
//     const timelineResult = await findTweetInCurrentTimeline(page, targetTweetId, targetContent, targetAuthor, action, behavior);
    
//     if (timelineResult.success) {
//       logWithTimestamp(`✅ Successfully ${action}d tweet in current timeline`, 'LIKE_ACTION');
//       await navigateToHomeTop(page, behavior);
//       return {
//         success: true,
//         action,
//         tweetId: targetTweetId,
//         tweetUrl: targetUrl,
//         method: 'current_timeline',
//         processingTime: `${(Date.now() - startTime) / 1000}s`
//       };
//     }
    
//     // STEP 2: If not found, search for the username and find the tweet on their profile
//     if (targetAuthor || targetUrl) {
//       logWithTimestamp('👤 Step 2: Searching user profile to find the tweet...', 'LIKE_ACTION');
//       const userProfileResult = await findTweetInUserProfile(page, targetTweetId, targetContent, targetAuthor, targetUrl, action, behavior);
      
//       if (userProfileResult.success) {
//         logWithTimestamp(`✅ Successfully ${action}d tweet in user profile`, 'LIKE_ACTION');
//         await navigateToHomeTop(page, behavior);
//         return {
//           success: true,
//           action,
//           tweetId: targetTweetId,
//           tweetUrl: targetUrl,
//           method: 'user_profile',
//           processingTime: `${(Date.now() - startTime) / 1000}s`
//         };
//       }
//     }
    
//     // STEP 3: If not found, search by the complete URL (with proper username inclusion)
//     if (targetUrl && targetUrl.includes('x.com/') && !targetUrl.startsWith('https://x.com/status/')) {
//       logWithTimestamp('🔗 Step 3: Searching by complete URL...', 'LIKE_ACTION');
//       const urlSearchResult = await findTweetByCompleteUrl(page, targetTweetId, targetUrl, action, behavior);
      
//       if (urlSearchResult.success) {
//         logWithTimestamp(`✅ Successfully ${action}d tweet via URL search`, 'LIKE_ACTION');
//         await navigateToHomeTop(page, behavior);
//         return {
//           success: true,
//           action,
//           tweetId: targetTweetId,
//           tweetUrl: targetUrl,
//           method: 'url_search',
//           processingTime: `${(Date.now() - startTime) / 1000}s`
//         };
//       }
//     }
    
//     // If we get here, all methods failed
//     logWithTimestamp('❌ All search methods exhausted', 'LIKE_ACTION');
//     return {
//       success: false,
//       action,
//       tweetId: targetTweetId,
//       tweetUrl: targetUrl,
//       error: 'Tweet not found using any method',
//       processingTime: `${(Date.now() - startTime) / 1000}s`
//     };
    
//   } catch (error: any) {
//     logWithTimestamp(`❌ Error performing ${action}: ${error.message}`, 'LIKE_ACTION');
    
//     try {
//       await saveScreenshot(page, `${action}_error_${targetTweetId}.png`, 'LIKE_ACTION');
//     } catch (screenshotError) {
//       logWithTimestamp('Could not save error screenshot', 'LIKE_ACTION');
//     }
    
//     return {
//       success: false,
//       action,
//       tweetId: targetTweetId,
//       tweetUrl: targetUrl,
//       error: error.message,
//       processingTime: `${(Date.now() - startTime) / 1000}s`
//     };
//   }
// }

// // Helper function to find tweet in current timeline by scrolling
// async function findTweetInCurrentTimeline(
//   page: puppeteer.Page,
//   tweetId: string,
//   content: string,
//   author: string,
//   action: 'like' | 'unlike',
//   behavior: BehaviorPattern
// ): Promise<{ success: boolean; error?: string }> {
//   try {
//     // Make sure we're on the home timeline
//     const currentUrl = await page.url();
//     if (!currentUrl.includes('/home')) {
//       logWithTimestamp('🏠 Navigating to home timeline first...', 'LIKE_ACTION');
//       await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 30000 });
//       await humanDelay(behavior, { min: 2000, max: 4000 });
//     }
    
//     await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
//     await saveScreenshot(page, `timeline_search_${tweetId}.png`, 'LIKE_ACTION');
    
//     // Scroll down for a few seconds looking for the tweet (human-like behavior)
//     let scrollAttempts = 0;
//     const maxScrollAttempts = 8; // More attempts for better coverage
    
//     while (scrollAttempts < maxScrollAttempts) {
//       scrollAttempts++;
//       logWithTimestamp(`🔍 Scroll attempt ${scrollAttempts}/${maxScrollAttempts} in timeline...`, 'LIKE_ACTION');
      
//       // Enhanced tweet finding with multiple strategies
//       const tweetFound = await page.evaluate((targetId, targetContent, targetAuthor) => {
//         const articles = document.querySelectorAll('article[data-testid="tweet"]');
        
//         for (const article of articles) {
//           // Strategy 1: Direct ID match in status links
//           const statusLinks = article.querySelectorAll('a[href*="/status/"]');
//           for (const link of statusLinks) {
//             const href = link.getAttribute('href') || '';
//             if (href.includes(`/status/${targetId}`)) {
//               article.scrollIntoView({ behavior: 'smooth', block: 'center' });
//               return { found: true, method: 'direct_id' };
//             }
//           }
          
//           // Strategy 2: Content + Author matching
//           if (targetContent && targetAuthor) {
//             const authorElements = article.querySelectorAll('[data-testid="User-Name"]');
//             let authorMatch = false;
            
//             for (const authorEl of authorElements) {
//               const usernameEl = authorEl.querySelector('span[dir="ltr"]');
//               if (usernameEl && usernameEl.textContent) {
//                 const handle = usernameEl.textContent.trim().replace('@', '');
//                 if (handle.toLowerCase() === targetAuthor.toLowerCase()) {
//                   authorMatch = true;
//                   break;
//                 }
//               }
//             }
            
//             if (authorMatch) {
//               const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
//               if (tweetTextEl && tweetTextEl.textContent) {
//                 const tweetText = tweetTextEl.textContent.trim();
//                 const contentWords = targetContent.toLowerCase().split(' ').filter(word => word.length > 3).slice(0, 3);
//                 const textMatch = contentWords.some(word => tweetText.toLowerCase().includes(word));
                
//                 if (textMatch) {
//                   article.scrollIntoView({ behavior: 'smooth', block: 'center' });
//                   return { found: true, method: 'content_author' };
//                 }
//               }
//             }
//           }
          
//           // Strategy 3: Content only matching (if author not available)
//           if (targetContent && !targetAuthor && targetContent.length > 20) {
//             const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
//             if (tweetTextEl && tweetTextEl.textContent) {
//               const tweetText = tweetTextEl.textContent.trim();
//               const contentWords = targetContent.toLowerCase().split(' ').filter(word => word.length > 4).slice(0, 3);
//               const matchCount = contentWords.filter(word => tweetText.toLowerCase().includes(word)).length;
              
//               if (matchCount >= 2) { // At least 2 words must match
//                 article.scrollIntoView({ behavior: 'smooth', block: 'center' });
//                 return { found: true, method: 'content_only' };
//               }
//             }
//           }
//         }
        
//         return { found: false };
//       }, tweetId, content, author);
      
//       if (tweetFound.found) {
//         logWithTimestamp(`✅ Found tweet in timeline using ${tweetFound.method}`, 'LIKE_ACTION');
//         await humanDelay(behavior, { min: 1500, max: 3000 });
        
//         // Perform like action
//         const likeResult = await performLikeActionOnTweet(page, tweetId, action, behavior);
//         return { success: likeResult.success, error: likeResult.error };
//       }
      
//       // Human-like scrolling with natural pauses
//       if (scrollAttempts < maxScrollAttempts) {
//         await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
//         await humanDelay(behavior, { min: 2000, max: 4000 });
        
//         // Occasionally scroll back up a bit (human-like behavior)
//         if (scrollAttempts % 3 === 0) {
//           await page.evaluate(() => window.scrollBy({ top: -200, behavior: 'smooth' }));
//           await humanDelay(behavior, { min: 1000, max: 2000 });
//         }
//       }
//     }
    
//     return { success: false, error: 'Tweet not found in current timeline after scrolling' };
    
//   } catch (error: any) {
//     return { success: false, error: error.message };
//   }
// }

// // Helper function to find tweet in user profile
// async function findTweetInUserProfile(
//   page: puppeteer.Page,
//   tweetId: string,
//   content: string,
//   authorHandle: string,
//   tweetUrl: string,
//   action: 'like' | 'unlike',
//   behavior: BehaviorPattern
// ): Promise<{ success: boolean; error?: string }> {
//   try {
//     let username = authorHandle;
    
//     // Extract username from URL if not provided directly
//     if (!username && tweetUrl) {
//       const urlMatch = tweetUrl.match(/x\.com\/([^\/]+)\/status/);
//       if (urlMatch) {
//         username = urlMatch[1];
//       }
//     }
    
//     if (!username) {
//       return { success: false, error: 'No username available for profile search' };
//     }
    
//     logWithTimestamp(`👤 Searching user profile: @${username}`, 'LIKE_ACTION');
    
//     // Navigate to user profile
//     const profileUrl = `https://x.com/${username}`;
//     await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//     await humanDelay(behavior, { min: 3000, max: 5000 });
    
//     // Wait for tweets to load
//     await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
//     await saveScreenshot(page, `user_profile_${username}_${tweetId}.png`, 'LIKE_ACTION');
    
//     let profileScrollAttempts = 0;
//     const maxProfileScrollAttempts = 10; // More attempts since user may have many tweets
    
//     while (profileScrollAttempts < maxProfileScrollAttempts) {
//       profileScrollAttempts++;
//       logWithTimestamp(`🔍 Scrolling user timeline ${profileScrollAttempts}/${maxProfileScrollAttempts}...`, 'LIKE_ACTION');
      
//       const tweetFound = await page.evaluate((targetId, targetContent) => {
//         const articles = document.querySelectorAll('article[data-testid="tweet"]');
        
//         for (const article of articles) {
//           // Strategy 1: Direct ID match
//           const statusLinks = article.querySelectorAll('a[href*="/status/"]');
//           for (const link of statusLinks) {
//             const href = link.getAttribute('href') || '';
//             if (href.includes(`/status/${targetId}`)) {
//               article.scrollIntoView({ behavior: 'smooth', block: 'center' });
//               return { found: true, method: 'direct_id' };
//             }
//           }
          
//           // Strategy 2: Content matching if available
//           if (targetContent && targetContent.length > 15) {
//             const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
//             if (tweetTextEl && tweetTextEl.textContent) {
//               const tweetText = tweetTextEl.textContent.trim();
//               const contentWords = targetContent.toLowerCase().split(' ').filter(word => word.length > 4).slice(0, 4);
//               const matchCount = contentWords.filter(word => tweetText.toLowerCase().includes(word)).length;
              
//               if (matchCount >= 3) { // Require more matches on profile
//                 article.scrollIntoView({ behavior: 'smooth', block: 'center' });
//                 return { found: true, method: 'content_match' };
//               }
//             }
//           }
//         }
        
//         return { found: false };
//       }, tweetId, content);
      
//       if (tweetFound.found) {
//         logWithTimestamp(`✅ Found tweet in user profile using ${tweetFound.method}`, 'LIKE_ACTION');
//         await humanDelay(behavior, { min: 1500, max: 3000 });
        
//         const likeResult = await performLikeActionOnTweet(page, tweetId, action, behavior);
//         return { success: likeResult.success, error: likeResult.error };
//       }
      
//       // Human-like scrolling with pauses
//       if (profileScrollAttempts < maxProfileScrollAttempts) {
//         await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
//         await humanDelay(behavior, { min: 1500, max: 3000 });
//       }
//     }
    
//     return { success: false, error: 'Tweet not found in user profile timeline' };
    
//   } catch (error: any) {
//     return { success: false, error: error.message };
//   }
// }

// // Helper function to find tweet by complete URL search
// async function findTweetByCompleteUrl(
//   page: puppeteer.Page,
//   tweetId: string,
//   tweetUrl: string,
//   action: 'like' | 'unlike',
//   behavior: BehaviorPattern
// ): Promise<{ success: boolean; error?: string }> {
//   try {
//     logWithTimestamp(`🔗 Searching for complete URL: ${tweetUrl}`, 'LIKE_ACTION');
    
//     // Use the complete URL as search query in Twitter search
//     const searchQuery = encodeURIComponent(tweetUrl);
//     const searchUrl = `https://x.com/search?q=${searchQuery}&src=typed_query&f=live`;
    
//     await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//     await humanDelay(behavior, { min: 3000, max: 5000 });
    
//     await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
//     await saveScreenshot(page, `url_search_${tweetId}.png`, 'LIKE_ACTION');
    
//     let urlSearchAttempts = 0;
//     const maxUrlSearchAttempts = 6;
    
//     while (urlSearchAttempts < maxUrlSearchAttempts) {
//       urlSearchAttempts++;
//       logWithTimestamp(`🔍 URL search attempt ${urlSearchAttempts}/${maxUrlSearchAttempts}...`, 'LIKE_ACTION');
      
//       const tweetFound = await page.evaluate((targetId, targetUrl) => {
//         const articles = document.querySelectorAll('article[data-testid="tweet"]');
        
//         for (const article of articles) {
//           // Strategy 1: Direct ID match in status links
//           const statusLinks = article.querySelectorAll('a[href*="/status/"]');
//           for (const link of statusLinks) {
//             const href = link.getAttribute('href') || '';
//             if (href.includes(`/status/${targetId}`)) {
//               article.scrollIntoView({ behavior: 'smooth', block: 'center' });
//               return { found: true, method: 'direct_id' };
//             }
//           }
          
//           // Strategy 2: Look for any links matching the target URL
//           const allLinks = article.querySelectorAll('a');
//           for (const link of allLinks) {
//             const href = link.getAttribute('href') || '';
//             if (href === targetUrl || href.includes(targetUrl.split('/').pop() || '')) {
//               article.scrollIntoView({ behavior: 'smooth', block: 'center' });
//               return { found: true, method: 'url_match' };
//             }
//           }
//         }
        
//         return { found: false };
//       }, tweetId, tweetUrl);
      
//       if (tweetFound.found) {
//         logWithTimestamp(`✅ Found tweet via URL search using ${tweetFound.method}`, 'LIKE_ACTION');
//         await humanDelay(behavior, { min: 1500, max: 3000 });
        
//         const likeResult = await performLikeActionOnTweet(page, tweetId, action, behavior);
//         return { success: likeResult.success, error: likeResult.error };
//       }
      
//       // Scroll down in search results
//       if (urlSearchAttempts < maxUrlSearchAttempts) {
//         await page.evaluate(() => window.scrollBy({ top: 700, behavior: 'smooth' }));
//         await humanDelay(behavior, { min: 2000, max: 3500 });
//       }
//     }
    
//     return { success: false, error: 'Tweet not found in URL search results' };
    
//   } catch (error: any) {
//     return { success: false, error: `URL search failed: ${error.message}` };
//   }
// }

// // Core function to perform like/unlike action on a tweet
// async function performLikeActionOnTweet(
//   page: puppeteer.Page,
//   tweetId: string,
//   action: 'like' | 'unlike',
//   behavior: BehaviorPattern
// ): Promise<{ success: boolean; error?: string }> {
//   try {
//     // Multiple strategies to find like button
//     let likeButtonSelector = '';
//     let buttonFound = false;
    
//     // Strategy 1: Direct tweet ID selector
//     const directSelector = `article[data-testid="tweet"]:has(a[href*="/status/${tweetId}"]) [data-testid="like"]`;
//     const directButton = await page.$(directSelector);
    
//     if (directButton) {
//       likeButtonSelector = directSelector;
//       buttonFound = true;
//       logWithTimestamp('🎯 Found like button using direct ID selector', 'LIKE_ACTION');
//     } else {
//       // Strategy 2: Find any visible like button (assuming we scrolled to the right tweet)
//       const anyLikeButton = await page.$('[data-testid="like"]');
//       if (anyLikeButton) {
//         likeButtonSelector = '[data-testid="like"]';
//         buttonFound = true;
//         logWithTimestamp('🎯 Found like button using general selector', 'LIKE_ACTION');
//       }
//     }
    
//     if (!buttonFound) {
//       return { success: false, error: 'Like button not found' };
//     }
    
//     // Check current state of the like button
//     const buttonState = await page.evaluate((selector, targetAction) => {
//       const button = document.querySelector(selector) as HTMLElement;
//       if (!button) return { found: false };
      
//       const isCurrentlyLiked = 
//         button.getAttribute('aria-pressed') === 'true' ||
//         button.querySelector('[data-testid="unlike"]') !== null ||
//         button.querySelector('path[d*="M20.884"]') !== null ||
//         button.classList.contains('liked') ||
//         button.closest('article')?.querySelector('[data-testid="unlike"]') !== null;
      
//       const needsAction = (targetAction === 'like' && !isCurrentlyLiked) ||
//                          (targetAction === 'unlike' && isCurrentlyLiked);
      
//       return { found: true, isCurrentlyLiked, needsAction };
//     }, likeButtonSelector, action);
    
//     if (!buttonState.found) {
//       return { success: false, error: 'Button state could not be determined' };
//     }
    
//     if (!buttonState.needsAction) {
//       const currentState = buttonState.isCurrentlyLiked ? 'liked' : 'not liked';
//       logWithTimestamp(`✅ Tweet is already ${currentState}, no action needed`, 'LIKE_ACTION');
//       return { success: true };
//     }
    
//     // Perform human-like interaction
//     logWithTimestamp(`👤 Performing ${action} interaction...`, 'LIKE_ACTION');
    
//     // Scroll to button to ensure it's visible
//     await page.evaluate((selector) => {
//       const button = document.querySelector(selector) as HTMLElement;
//       if (button) {
//         button.scrollIntoView({ behavior: 'smooth', block: 'center' });
//       }
//     }, likeButtonSelector);
    
//     await humanDelay(behavior, { min: 500, max: 1000 });
    
//     // Human-like hover before clicking
//     await page.hover(likeButtonSelector);
//     await humanDelay(behavior, { min: 500, max: 1200 });
    
//     // Perform the click
//     await humanClick(page, likeButtonSelector, behavior);
//     await humanDelay(behavior, { min: 1000, max: 2000 });
    
//     // Verify the action was successful
//     const actionVerified = await page.evaluate((selector, expectedAction) => {
//       const button = document.querySelector(selector) as HTMLElement;
//       if (!button) return { success: false, reason: 'Button disappeared' };
      
//       const isNowLiked = 
//         button.getAttribute('aria-pressed') === 'true' ||
//         button.querySelector('[data-testid="unlike"]') !== null ||
//         button.querySelector('path[d*="M20.884"]') !== null ||
//         button.classList.contains('liked') ||
//         button.closest('article')?.querySelector('[data-testid="unlike"]') !== null;
      
//       const actionSuccessful = (expectedAction === 'like' && isNowLiked) || 
//                               (expectedAction === 'unlike' && !isNowLiked);
      
//       return { 
//         success: actionSuccessful, 
//         currentState: isNowLiked ? 'liked' : 'not liked'
//       };
//     }, likeButtonSelector, action);
    
//     if (!actionVerified.success) {
//       return { success: false, error: `Action verification failed: ${actionVerified.reason || 'Unknown reason'}` };
//     }
    
//     logWithTimestamp(`✅ ${action} action verified! State: ${actionVerified.currentState}`, 'LIKE_ACTION');
//     return { success: true };
    
//   } catch (error: any) {
//     return { success: false, error: error.message };
//   }
// }

// // Helper function to navigate back to home timeline top after successful action
// async function navigateToHomeTop(
//   page: puppeteer.Page,
//   behavior: BehaviorPattern
// ): Promise<void> {
//   logWithTimestamp('⏱️ Waiting for a moment before navigating back...', 'LIKE_ACTION');
//   await humanDelay(behavior, { min: 1000, max: 2000 });
  
//   logWithTimestamp('🏠 Taking user to top of home timeline', 'LIKE_ACTION');
  
//   try {
//     // Navigate to home timeline
//     await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 15000 });
//     await humanDelay(behavior, { min: 1000, max: 2000 });
    
//     // Scroll to top with smooth animation
//     await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
//     await humanDelay(behavior, { min: 500, max: 1000 });
    
//     logWithTimestamp('✅ Successfully navigated to home timeline top', 'LIKE_ACTION');
//   } catch (error) {
//     logWithTimestamp('⚠️ Could not navigate to home timeline, but like action was successful', 'LIKE_ACTION');
//   }
  
//   logWithTimestamp('🛑 Like action completed - execution finished', 'LIKE_ACTION');
// }

// // Legacy function for backward compatibility
// export async function performActionOnTweetInCurrentPage(
//   browser: puppeteer.Browser,
//   tweetId: string,
//   action: 'like' | 'unlike',
//   behaviorType?: BehaviorType
// ): Promise<LikeActionResult> {
//   return performLikeAction(browser, {
//     tweetId,
//     action,
//     behaviorType
//   });
// }













import * as puppeteer from 'puppeteer-core';
import { logWithTimestamp, saveScreenshot } from '../shared/utilities';
import { humanDelay, humanClick, humanHover, humanScroll } from '../shared/human-actions';
import { BehaviorPattern, BehaviorType, getBehaviorOrDefault } from '../shared/human-behavior';
import { HomeFeedTweetData } from './home-feed-fetcher';

export interface LikeActionInput {
  // Legacy support for nested tweetData structure
  tweetData?: HomeFeedTweetData; // The tweet data from GET request
  
  // Flattened structure (preferred)
  tweetId?: string; // Tweet ID
  action: 'like' | 'unlike'; // The decision made externally
  behaviorType?: BehaviorType; // Human behavior pattern
  content?: string; // Tweet content for better searching
  url?: string; // Tweet URL
  authorHandle?: string; // Author's handle (username)
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
  const targetUrl = url || tweetData?.url || '';
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
      logWithTimestamp(`✅ Successfully ${action}d tweet in current timeline`, 'LIKE_ACTION');
      await navigateToHomeTop(page, behavior);
      return {
        success: true,
        action,
        tweetId: targetTweetId,
        tweetUrl: targetUrl,
        method: 'current_timeline',
        processingTime: `${(Date.now() - startTime) / 1000}s`
      };
    }
    
    // STEP 2: If not found, search for the username and find the tweet on their profile
    // Extract username from URL or use provided author
    let usernameToSearch = targetAuthor;
    if (!usernameToSearch && targetUrl) {
      // Extract username from URL like: https://x.com/locofy_ai/status/1886257050193191167/analytics
      const urlMatch = targetUrl.match(/x\.com\/([^\/]+)\/status/);
      if (urlMatch) {
        usernameToSearch = urlMatch[1];
      }
    }
    
    // 🔍 DEBUG: Log username extraction process
    logWithTimestamp('🔍 USERNAME EXTRACTION DEBUG:', 'LIKE_ACTION');
    logWithTimestamp(`   👤 Original Author: "${targetAuthor}"`, 'LIKE_ACTION');
    logWithTimestamp(`   🔗 Original URL: "${targetUrl}"`, 'LIKE_ACTION');
    logWithTimestamp(`   🎯 Username To Search: "${usernameToSearch}"`, 'LIKE_ACTION');
    
    if (usernameToSearch) {
      logWithTimestamp(`👤 Step 2: Searching user profile @${usernameToSearch} to find the tweet...`, 'LIKE_ACTION');
      
      // 🔍 DEBUG: Log profile URL construction
      const profileUrl = `https://x.com/${usernameToSearch}`;
      logWithTimestamp(`🏗️ PROFILE URL CONSTRUCTION:`, 'LIKE_ACTION');
      logWithTimestamp(`   🎯 Profile URL: ${profileUrl}`, 'LIKE_ACTION');
      
      const userProfileResult = await findTweetInUserProfile(page, targetTweetId, targetContent, usernameToSearch, targetUrl, action, behavior);
      
      if (userProfileResult.success) {
        logWithTimestamp(`✅ Successfully ${action}d tweet in user profile`, 'LIKE_ACTION');
        await navigateToHomeTop(page, behavior);
        return {
          success: true,
          action,
          tweetId: targetTweetId,
          tweetUrl: targetUrl,
          method: 'user_profile',
          processingTime: `${(Date.now() - startTime) / 1000}s`
        };
      }
    } else {
      logWithTimestamp('⚠️ Step 2 skipped: No username available for profile search', 'LIKE_ACTION');
    }
    
    // STEP 3: If not found, search by the complete URL (with proper username inclusion)
    if (targetUrl && targetUrl.includes('x.com/') && targetUrl.includes('/status/')) {
      logWithTimestamp('🔗 Step 3: Searching by complete URL...', 'LIKE_ACTION');
      
      // 🔍 DEBUG: Log complete URL search process
      logWithTimestamp('🔍 COMPLETE URL SEARCH DEBUG:', 'LIKE_ACTION');
      logWithTimestamp(`   🔗 Complete Target URL: "${targetUrl}"`, 'LIKE_ACTION');
      logWithTimestamp(`   🔍 Will search for this EXACT URL in Twitter search`, 'LIKE_ACTION');
      
      const urlSearchResult = await findTweetByCompleteUrl(page, targetTweetId, targetUrl, action, behavior);
      
      if (urlSearchResult.success) {
        logWithTimestamp(`✅ Successfully ${action}d tweet via URL search`, 'LIKE_ACTION');
        await navigateToHomeTop(page, behavior);
        return {
          success: true,
          action,
          tweetId: targetTweetId,
          tweetUrl: targetUrl,
          method: 'url_search',
          processingTime: `${(Date.now() - startTime) / 1000}s`
        };
      }
    } else {
      logWithTimestamp('⚠️ Step 3 skipped: No valid complete URL provided for search', 'LIKE_ACTION');
      logWithTimestamp(`   🔍 URL Analysis: targetUrl="${targetUrl}"`, 'LIKE_ACTION');
      logWithTimestamp(`   🔍 Contains x.com: ${targetUrl?.includes('x.com/') || false}`, 'LIKE_ACTION');
      logWithTimestamp(`   🔍 Contains /status/: ${targetUrl?.includes('/status/') || false}`, 'LIKE_ACTION');
    }
    
    // If we get here, all methods failed
    logWithTimestamp('❌ All search methods exhausted', 'LIKE_ACTION');
    return {
      success: false,
      action,
      tweetId: targetTweetId,
      tweetUrl: targetUrl,
      error: 'Tweet not found using any method',
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
    
  } catch (error: any) {
    logWithTimestamp(`❌ Error performing ${action}: ${error.message}`, 'LIKE_ACTION');
    
    try {
      await saveScreenshot(page, `${action}_error_${targetTweetId}.png`, 'LIKE_ACTION');
    } catch (screenshotError) {
      logWithTimestamp('Could not save error screenshot', 'LIKE_ACTION');
    }
    
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
        logWithTimestamp(`✅ Found tweet in timeline using ${tweetFound.method}`, 'LIKE_ACTION');
        await humanDelay(behavior, { min: 1500, max: 3000 });
        
        // Perform like action
        const likeResult = await performLikeActionOnTweet(page, tweetId, action, behavior);
        return { success: likeResult.success, error: likeResult.error };
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
    
    return { success: false, error: 'Tweet not found in current timeline after scrolling' };
    
  } catch (error: any) {
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
        logWithTimestamp(`✅ Found tweet in user profile using ${tweetFound.method}`, 'LIKE_ACTION');
        await humanDelay(behavior, { min: 1500, max: 3000 });
        
        const likeResult = await performLikeActionOnTweet(page, tweetId, action, behavior);
        return { success: likeResult.success, error: likeResult.error };
      }
      
      // Human-like scrolling with pauses
      if (profileScrollAttempts < maxProfileScrollAttempts) {
        await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
        await humanDelay(behavior, { min: 1500, max: 3000 });
      }
    }
    
    return { success: false, error: 'Tweet not found in user profile timeline' };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Helper function to find tweet by complete URL search
async function findTweetByCompleteUrl(
  page: puppeteer.Page,
  tweetId: string,
  tweetUrl: string,
  action: 'like' | 'unlike',
  behavior: BehaviorPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    logWithTimestamp(`🔗 Searching for complete URL: ${tweetUrl}`, 'LIKE_ACTION');
    
    // Use the complete URL as search query in Twitter search
    // This will search for the EXACT complete URL, not the modified one
    const searchQuery = encodeURIComponent(tweetUrl);
    const searchUrl = `https://x.com/search?q=${searchQuery}&src=typed_query&f=live`;
    
    logWithTimestamp(`🔍 Search URL: ${searchUrl}`, 'LIKE_ACTION');
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(behavior, { min: 3000, max: 5000 });
    
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
    await saveScreenshot(page, `url_search_${tweetId}.png`, 'LIKE_ACTION');
    
    let urlSearchAttempts = 0;
    const maxUrlSearchAttempts = 6;
    
    while (urlSearchAttempts < maxUrlSearchAttempts) {
      urlSearchAttempts++;
      logWithTimestamp(`🔍 URL search attempt ${urlSearchAttempts}/${maxUrlSearchAttempts}...`, 'LIKE_ACTION');
      
      const tweetFound = await page.evaluate((targetId, targetUrl) => {
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
          
          // Strategy 2: Look for any links matching parts of the target URL
          const allLinks = article.querySelectorAll('a');
          for (const link of allLinks) {
            const href = link.getAttribute('href') || '';
            // Check if the link contains the tweet ID
            if (href.includes(targetId)) {
              article.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return { found: true, method: 'url_match' };
            }
          }
        }
        
        return { found: false };
      }, tweetId, tweetUrl);
      
      if (tweetFound.found) {
        logWithTimestamp(`✅ Found tweet via URL search using ${tweetFound.method}`, 'LIKE_ACTION');
        await humanDelay(behavior, { min: 1500, max: 3000 });
        
        const likeResult = await performLikeActionOnTweet(page, tweetId, action, behavior);
        return { success: likeResult.success, error: likeResult.error };
      }
      
      // Scroll down in search results
      if (urlSearchAttempts < maxUrlSearchAttempts) {
        await page.evaluate(() => window.scrollBy({ top: 700, behavior: 'smooth' }));
        await humanDelay(behavior, { min: 2000, max: 3500 });
      }
    }
    
    return { success: false, error: 'Tweet not found in URL search results' };
    
  } catch (error: any) {
    return { success: false, error: `URL search failed: ${error.message}` };
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
      return { success: false, error: 'Button state could not be determined' };
    }
    
    if (!buttonState.needsAction) {
      const currentState = buttonState.isCurrentlyLiked ? 'liked' : 'not liked';
      logWithTimestamp(`✅ Tweet is already ${currentState}, no action needed`, 'LIKE_ACTION');
      return { success: true };
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
    await humanDelay(behavior, { min: 1000, max: 2000 });
    
    // Verify the action was successful
    const actionVerified = await page.evaluate((selector, expectedAction) => {
      const button = document.querySelector(selector) as HTMLElement;
      if (!button) return { success: false, reason: 'Button disappeared' };
      
      const isNowLiked = 
        button.getAttribute('aria-pressed') === 'true' ||
        button.querySelector('[data-testid="unlike"]') !== null ||
        button.querySelector('path[d*="M20.884"]') !== null ||
        button.classList.contains('liked') ||
        button.closest('article')?.querySelector('[data-testid="unlike"]') !== null;
      
      const actionSuccessful = (expectedAction === 'like' && isNowLiked) || 
                              (expectedAction === 'unlike' && !isNowLiked);
      
      return { 
        success: actionSuccessful, 
        currentState: isNowLiked ? 'liked' : 'not liked'
      };
    }, likeButtonSelector, action);
    
    if (!actionVerified.success) {
      return { success: false, error: `Action verification failed: ${actionVerified.reason || 'Unknown reason'}` };
    }
    
    logWithTimestamp(`✅ ${action} action verified! State: ${actionVerified.currentState}`, 'LIKE_ACTION');
    return { success: true };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Helper function to navigate back to home timeline top after successful action
async function navigateToHomeTop(
  page: puppeteer.Page,
  behavior: BehaviorPattern
): Promise<void> {
  logWithTimestamp('⏱️ Waiting for a moment before navigating back...', 'LIKE_ACTION');
  await humanDelay(behavior, { min: 1000, max: 2000 });
  
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