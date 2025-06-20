// home-feed-fetcher.ts - Module to fetch posts from home timeline for commenting

import * as puppeteer from 'puppeteer-core';
import { BehaviorType, HUMAN_BEHAVIORS, BehaviorPattern } from '../shared/human-behavior';
import { logWithTimestamp, saveScreenshot } from '../shared/utilities';
import { humanDelay } from '../shared/human-actions';

export interface CommentTweetData {
  tweetId: string;
  content: string;
  author: string;
  authorHandle: string;
  timestamp: string;
  relativeTime: string;
  url: string;
  likes: number;
  retweets: number;
  replies: number;
  views?: number;
  isRetweet: boolean;
  originalAuthor?: string;
  images?: string[];
  videos?: string[];
  hashtags: string[];
  mentions: string[];
  mediaCount: number;
  position: number; // Position in the feed for identification
  hasCommented: boolean; // Track if we already commented
}

export interface CommentFeedInput {
  behaviorType?: BehaviorType;
  scrollTime?: number; // Time to scroll in milliseconds (default: 20000)
}

export interface CommentFeedResult {
  success: boolean;
  tweets?: CommentTweetData[];
  selectedCount?: number;
  totalAvailable?: number;
  error?: string;
  processingTime?: string;
}

// Helper function to get behavior pattern or default
function getBehaviorOrDefault(behaviorType?: BehaviorType): BehaviorPattern {
  return HUMAN_BEHAVIORS[behaviorType || BehaviorType.CASUAL_BROWSER];
}

// Helper function to extract numbers with k/m suffixes
function extractNumber(text: string): number {
  if (!text) return 0;
  
  const cleanText = text.replace(/[,\s]/g, '').toLowerCase();
  const match = cleanText.match(/(\d+(?:\.\d+)?)(k|m)?/);
  
  if (!match) return 0;
  
  const number = parseFloat(match[1]);
  const suffix = match[2];
  
  if (suffix === 'k') return Math.round(number * 1000);
  if (suffix === 'm') return Math.round(number * 1000000);
  
  return Math.round(number);
}

// Helper function to check if we already commented on a tweet
async function checkIfCommented(page: puppeteer.Page, tweetElement: any): Promise<boolean> {
  try {
    // Check if there's a comment button with active state or our own comment visible
    const hasCommented = await page.evaluate((tweet) => {
      // Look for reply indicators that show we've commented
      const replyButton = tweet.querySelector('[data-testid="reply"]');
      if (!replyButton) return false;
      
      // Check if the reply button has active styling (indicating we've replied)
      const isActive = replyButton.querySelector('svg path[fill*="rgb(29, 155, 240)"]') || 
                       replyButton.closest('[role="button"]')?.getAttribute('aria-pressed') === 'true';
      
      return !!isActive;
    }, tweetElement);
    
    return hasCommented;
  } catch (error) {
    logWithTimestamp(`Error checking comment status: ${error}`, 'COMMENT_FEED');
    return false; // Default to false if we can't determine
  }
}

export async function getCommentFeedTweets(
  browser: puppeteer.Browser, 
  input: CommentFeedInput = {}
): Promise<CommentFeedResult> {
  const { scrollTime = 20000, behaviorType } = input;
  
  // Randomly choose 5-10 tweets to select (minimum 5)
  const targetCount = Math.floor(Math.random() * 6) + 5; // 5-10
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  const startTime = Date.now();
  logWithTimestamp(`Starting home timeline browsing for comments - will select ${targetCount} tweets`, 'COMMENT_FEED');
  
  // Get behavior pattern
  const behavior = getBehaviorOrDefault(behaviorType);
  
  try {
    // Navigate to Twitter home timeline
    const homeUrl = 'https://x.com/home';
    logWithTimestamp(`Navigating to: ${homeUrl}`, 'COMMENT_FEED');
    
    await page.goto(homeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(behavior, { min: 3000, max: 5000 });
    
    // Wait for timeline to load
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
    
    // Check if we're on home timeline
    const isOnHomePage = await page.evaluate(() => {
      const url = window.location.href;
      return url.includes('/home') || url === 'https://x.com/' || url === 'https://twitter.com/';
    });
    
    if (!isOnHomePage) {
      throw new Error('Not on home timeline - please navigate to Twitter home first');
    }
    
    logWithTimestamp('Successfully loaded home timeline', 'COMMENT_FEED');
    await saveScreenshot(page, 'comment_timeline_loaded.png', 'COMMENT_FEED');
    
    // Start human-like browsing behavior
    logWithTimestamp(`Starting ${scrollTime / 1000}s human-like browsing with ${behavior.name} behavior...`, 'COMMENT_FEED');
    
    const selectedTweets: CommentTweetData[] = [];
    const seenTweetIds = new Set<string>();
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;
    const includeRetweets = true; // Always include retweets for variety
    
    const browsingStartTime = Date.now();
    
    while (
      Date.now() - browsingStartTime < scrollTime && 
      selectedTweets.length < targetCount && 
      scrollAttempts < maxScrollAttempts
    ) {
      scrollAttempts++;
      
      // Extract available tweets from current view
      const currentTweets = await page.evaluate(async (includeRTs: boolean) => {
        const tweets: any[] = [];
        
        // Find all tweet articles
        const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
        
        for (let i = 0; i < tweetElements.length; i++) {
          const tweet = tweetElements[i];
          
          try {
            // Extract tweet ID from the tweet structure
            let tweetId = '';
            const tweetLinks = tweet.querySelectorAll('a[href*="/status/"]');
            if (tweetLinks.length > 0) {
              const href = tweetLinks[0].getAttribute('href') || '';
              const match = href.match(/\/status\/(\d+)/);
              if (match) tweetId = match[1];
            }
            
            if (!tweetId) continue;
            
            // Extract author information
            const authorElement = tweet.querySelector('[data-testid="User-Name"]');
            if (!authorElement) continue;
            
            const authorLinks = authorElement.querySelectorAll('a');
            if (authorLinks.length < 2) continue;
            
            const author = authorLinks[0].textContent?.trim() || '';
            const authorHandle = authorLinks[1].textContent?.replace('@', '') || '';
            
            if (!author || !authorHandle) continue;
            
            // Extract tweet content
            const contentElement = tweet.querySelector('[data-testid="tweetText"]');
            const content = contentElement?.textContent?.trim() || '';
            
            // Extract engagement metrics
            const replyElement = tweet.querySelector('[data-testid="reply"]');
            const retweetElement = tweet.querySelector('[data-testid="retweet"]');
            const likeElement = tweet.querySelector('[data-testid="like"]');
            const viewElement = tweet.querySelector('[data-testid="analytics"]');
            
            const replies = replyElement?.textContent?.trim() || '0';
            const retweets = retweetElement?.textContent?.trim() || '0';
            const likes = likeElement?.textContent?.trim() || '0';
            const views = viewElement?.textContent?.trim() || '';
            
            // Check if it's a retweet
            const isRetweet = !!tweet.querySelector('[data-testid="socialContext"]');
            
            // Extract media information
            const images = Array.from(tweet.querySelectorAll('img[src*="media"]')).map(img => img.getAttribute('src')).filter(Boolean);
            const videos = Array.from(tweet.querySelectorAll('video')).map(video => video.getAttribute('src')).filter(Boolean);
            
            // Extract hashtags and mentions
            const hashtags = Array.from(tweet.querySelectorAll('a[href*="/hashtag/"]')).map(link => link.textContent?.replace('#', '') || '').filter(Boolean);
            const mentions = Array.from(tweet.querySelectorAll('a[href^="/"]')).map(link => {
              const href = link.getAttribute('href') || '';
              const match = href.match(/^\/([^\/]+)$/);
              return match ? match[1] : '';
            }).filter(Boolean);
            
            // Build complete URL
            const url = `https://x.com/${authorHandle}/status/${tweetId}`;
            
            // Create tweet data object
            const tweetData = {
              tweetId,
              content,
              author,
              authorHandle,
              timestamp: new Date().toISOString(),
              relativeTime: tweet.querySelector('time')?.getAttribute('datetime') || '',
              url,
              likes: parseInt(likes.replace(/[^\d]/g, '')) || 0,
              retweets: parseInt(retweets.replace(/[^\d]/g, '')) || 0,
              replies: parseInt(replies.replace(/[^\d]/g, '')) || 0,
              views: views ? parseInt(views.replace(/[^\d]/g, '')) || 0 : undefined,
              isRetweet,
              originalAuthor: isRetweet ? author : undefined,
              images,
              videos,
              hashtags,
              mentions,
              mediaCount: images.length + videos.length,
              position: i,
              hasCommented: false // Will be checked separately
            };
            
            // Only include tweets with complete information
            if (tweetData.tweetId && tweetData.author && tweetData.authorHandle && tweetData.url) {
              tweets.push(tweetData);
            }
            
          } catch (error) {
            console.log('Error extracting tweet data:', error);
            continue;
          }
        }
        
        return tweets;
      }, includeRetweets);
      
      // Filter out tweets we've already seen
      const newTweets = currentTweets.filter(tweet => !seenTweetIds.has(tweet.tweetId));
      
      // Check if we've already commented on these tweets
      for (const tweet of newTweets) {
        try {
          // Find the tweet element again to check comment status
          const tweetElement = await page.$(`article[data-testid="tweet"]:has(a[href*="/status/${tweet.tweetId}"])`);
          if (tweetElement) {
            tweet.hasCommented = await checkIfCommented(page, tweetElement);
          }
        } catch (error) {
          logWithTimestamp(`Error checking comment status for tweet ${tweet.tweetId}: ${error}`, 'COMMENT_FEED');
          tweet.hasCommented = false; // Default to false
        }
      }
      
      // Filter out tweets we've already commented on
      const uncommentedTweets = newTweets.filter(tweet => !tweet.hasCommented);
      
      // Mark all tweets as seen
      newTweets.forEach(tweet => seenTweetIds.add(tweet.tweetId));
      
      // Randomly select some uncommented tweets to add to our selection
      if (uncommentedTweets.length > 0 && selectedTweets.length < targetCount) {
        const shuffled = uncommentedTweets.sort(() => 0.5 - Math.random());
        const toSelect = Math.min(shuffled.length, targetCount - selectedTweets.length, Math.floor(Math.random() * 3) + 1);
        
        selectedTweets.push(...shuffled.slice(0, toSelect));
        
        logWithTimestamp(
          `Selected ${toSelect} new tweets (${selectedTweets.length}/${targetCount}). Found ${uncommentedTweets.length} uncommented tweets.`, 
          'COMMENT_FEED'
        );
      } else {
        logWithTimestamp(
          `No new uncommented tweets found in current view (${newTweets.length} total, ${newTweets.filter(t => t.hasCommented).length} already commented)`, 
          'COMMENT_FEED'
        );
      }
      
      // Human-like scrolling if we need more tweets
      if (selectedTweets.length < targetCount && scrollAttempts < maxScrollAttempts) {
        await humanDelay(behavior, behavior.scrollPauseTime);
        
        // Random scroll behavior
        const scrollCount = Math.floor(Math.random() * 3) + 2; // 2-4 scrolls
        for (let i = 0; i < scrollCount; i++) {
          const scrollDistance = Math.floor(Math.random() * 300) + 300; // 300-600px
          await page.evaluate((distance) => {
            window.scrollBy(0, distance);
          }, scrollDistance);
          
          await humanDelay(behavior, { min: 400, max: 800 });
        }
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const processingTime = `${(Date.now() - startTime) / 1000}s`;
    logWithTimestamp(
      `Comment feed browsing complete! Selected ${selectedTweets.length} uncommented tweets in ${processingTime}`, 
      'COMMENT_FEED'
    );
    
    await saveScreenshot(page, 'comment_timeline_browsing_complete.png', 'COMMENT_FEED');
    
    return {
      success: true,
      tweets: selectedTweets,
      selectedCount: selectedTweets.length,
      totalAvailable: seenTweetIds.size,
      processingTime
    };
    
  } catch (error: any) {
    logWithTimestamp(`Error fetching comment timeline tweets: ${error.message}`, 'COMMENT_FEED');
    
    // Save error screenshot
    try {
      await saveScreenshot(page, 'comment_timeline_error.png', 'COMMENT_FEED');
    } catch (screenshotError) {
      logWithTimestamp(`Failed to save error screenshot: ${screenshotError}`, 'COMMENT_FEED');
    }
    
    return {
      success: false,
      error: error.message,
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
  }
}
