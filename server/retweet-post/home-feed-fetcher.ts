// home-feed-fetcher.ts - Module to fetch posts from home timeline for retweeting

import * as puppeteer from 'puppeteer-core';
import { logWithTimestamp, saveScreenshot } from '../shared/utilities';
import { humanDelay, humanScroll } from '../shared/human-actions';
import { BehaviorPattern, BehaviorType, getBehaviorOrDefault } from '../shared/human-behavior';

export interface HomeFeedTweetData {
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
}

export interface HomeFeedInput {
  behaviorType?: BehaviorType;
  scrollTime?: number; // Time to scroll in milliseconds (default: 20000)
}

export interface HomeFeedResult {
  success: boolean;
  tweets?: HomeFeedTweetData[];
  selectedCount?: number;
  totalAvailable?: number;
  error?: string;
  processingTime?: string;
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

export async function getHomeFeedTweets(
  browser: puppeteer.Browser, 
  input: HomeFeedInput = {}
): Promise<HomeFeedResult> {
  const { scrollTime = 20000, behaviorType } = input;
  
  // Randomly choose 1-3 tweets to select for retweeting
  const targetCount = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  const startTime = Date.now();
  logWithTimestamp(`Starting home timeline browsing for retweet - will select ${targetCount} tweets`, 'RETWEET_FEED');
  
  // Get behavior pattern
  const behavior = getBehaviorOrDefault(behaviorType);
  
  try {
    // Navigate to Twitter home timeline
    const homeUrl = 'https://x.com/home';
    logWithTimestamp(`Navigating to: ${homeUrl}`, 'RETWEET_FEED');
    
    await page.goto(homeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(behavior, { min: 3000, max: 5000 });
    
    // Wait for timeline to load
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
    
    // Check if we're on home timeline
    const isOnHomePage = await page.evaluate(() => {
      const currentUrl = window.location.href.toLowerCase();
      return currentUrl.includes('/home') || currentUrl.includes('timeline');
    });
    
    if (!isOnHomePage) {
      logWithTimestamp('Not on home timeline, navigation may have failed', 'RETWEET_FEED');
      return {
        success: false,
        error: 'Failed to navigate to home timeline'
      };
    }
    
    logWithTimestamp('Successfully loaded home timeline', 'RETWEET_FEED');
    await saveScreenshot(page, 'home_timeline_loaded_retweet.png', 'RETWEET_FEED');
    
    // Start human-like browsing behavior
    logWithTimestamp(`Starting ${scrollTime / 1000}s human-like browsing with ${behavior.name} behavior...`, 'RETWEET_FEED');
    
    const selectedTweets: HomeFeedTweetData[] = [];
    const seenTweetIds = new Set<string>();
    let scrollAttempts = 0;
    const maxScrollAttempts = 8;
    const includeRetweets = true; // Always include retweets for variety
    
    const browsingStartTime = Date.now();
    
    while (
      Date.now() - browsingStartTime < scrollTime && 
      selectedTweets.length < targetCount && 
      scrollAttempts < maxScrollAttempts
    ) {
      scrollAttempts++;
      
      // Extract available tweets from current view
      const currentTweets = await page.evaluate((includeRTs: boolean) => {
        const extractedTweets: any[] = [];
        
        // Find all tweet containers
        const tweetElements = document.querySelectorAll('article[data-testid="tweet"], div[data-testid="cellInnerDiv"] article');
        
        for (let i = 0; i < tweetElements.length; i++) {
          try {
            const element = tweetElements[i] as HTMLElement;
            
            // Extract tweet ID and URL
            let tweetId = '';
            let tweetUrl = '';
            
            // Look for status links
            const statusLinks = element.querySelectorAll('a[href*="/status/"]');
            for (const link of statusLinks) {
              const href = (link as HTMLElement).getAttribute('href') || '';
              const idMatch = href.match(/\/status\/(\d+)/);
              if (idMatch) {
                tweetId = idMatch[1];
                tweetUrl = href.startsWith('http') ? href : `https://x.com${href}`;
                break;
              }
            }
            
            if (!tweetUrl || !tweetId) continue;
            
            // Extract author information
            let author = '';
            let authorHandle = '';
            
            const authorElements = element.querySelectorAll('[data-testid="User-Name"]');
            for (const authorEl of authorElements) {
              const nameSpan = authorEl.querySelector('span[dir="ltr"]');
              const displayNameSpan = authorEl.querySelector('span:not([dir])');
              
              if (nameSpan && nameSpan.textContent) {
                const handle = nameSpan.textContent.trim().replace('@', '');
                authorHandle = handle;
              }
              
              if (displayNameSpan && displayNameSpan.textContent) {
                author = displayNameSpan.textContent.trim();
              }
              
              if (authorHandle && author) break;
            }
            
            // Check if this is a retweet
            let isRetweet = false;
            let originalAuthor = '';
            
            const retweetIndicators = element.querySelectorAll('[data-testid="socialContext"]');
            for (const indicator of retweetIndicators) {
              if (indicator.textContent && indicator.textContent.includes('retweeted')) {
                isRetweet = true;
                break;
              }
            }
            
            // Skip retweets if not wanted
            if (isRetweet && !includeRTs) continue;
            
            // Extract content
            let content = '';
            const primaryTextElement = element.querySelector('[data-testid="tweetText"]');
            if (primaryTextElement && primaryTextElement.textContent) {
              content = primaryTextElement.textContent.trim();
            }
            
            // Extract timestamps
            let timestamp = '';
            let relativeTime = '';
            
            const timeElement = element.querySelector('time');
            if (timeElement) {
              timestamp = timeElement.getAttribute('datetime') || '';
              relativeTime = timeElement.textContent || '';
            }
            
            // Extract engagement metrics
            let likes = 0;
            let retweets = 0;
            let replies = 0;
            let views = 0;
            
            const engagementGroup = element.querySelector('[role="group"]');
            if (engagementGroup) {
              const buttons = engagementGroup.querySelectorAll('[role="button"]');
              for (const button of buttons) {
                const buttonText = button.textContent || '';
                const ariaLabel = button.getAttribute('aria-label') || '';
                
                if (ariaLabel.includes('like') || ariaLabel.includes('Like')) {
                  const match = buttonText.match(/(\d+(?:\.\d+)?[km]?)/i);
                  if (match) likes = extractNumber(match[1]);
                }
                
                if (ariaLabel.includes('retweet') || ariaLabel.includes('Repost')) {
                  const match = buttonText.match(/(\d+(?:\.\d+)?[km]?)/i);
                  if (match) retweets = extractNumber(match[1]);
                }
                
                if (ariaLabel.includes('repl') || ariaLabel.includes('Comment')) {
                  const match = buttonText.match(/(\d+(?:\.\d+)?[km]?)/i);
                  if (match) replies = extractNumber(match[1]);
                }
                
                if (ariaLabel.includes('view') || ariaLabel.includes('View')) {
                  const match = buttonText.match(/(\d+(?:\.\d+)?[km]?)/i);
                  if (match) views = extractNumber(match[1]);
                }
              }
            }
            
            // Extract hashtags and mentions
            const hashtags: string[] = [];
            const mentions: string[] = [];
            
            const hashtagElements = element.querySelectorAll('a[href*="/hashtag/"]');
            for (const hashEl of hashtagElements) {
              const hashtagMatch = hashEl.getAttribute('href')?.match(/\/hashtag\/([^?]+)/);
              if (hashtagMatch) {
                hashtags.push(hashtagMatch[1]);
              }
            }
            
            const mentionElements = element.querySelectorAll('a[href^="/"][href*="@"], a[href^="https://x.com/"][href*="@"]');
            for (const mentionEl of mentionElements) {
              const href = mentionEl.getAttribute('href') || '';
              const mentionMatch = href.match(/\/([^?/]+)$/);
              if (mentionMatch && mentionMatch[1].startsWith('@')) {
                mentions.push(mentionMatch[1].substring(1));
              }
            }
            
            // Extract media info
            const images: string[] = [];
            const videos: string[] = [];
            
            const mediaImages = element.querySelectorAll('img[src*="pbs.twimg.com"]');
            for (const img of mediaImages) {
              const src = (img as HTMLElement).getAttribute('src');
              if (src) images.push(src);
            }
            
            const mediaVideos = element.querySelectorAll('video, [data-testid="videoPlayer"]');
            videos.push(...Array.from(mediaVideos).map((_, index) => `video_${index}`));
            
            extractedTweets.push({
              tweetId,
              content,
              author,
              authorHandle,
              timestamp,
              relativeTime,
              url: tweetUrl,
              likes,
              retweets,
              replies,
              views,
              isRetweet,
              originalAuthor,
              images,
              videos,
              hashtags,
              mentions,
              mediaCount: images.length + videos.length,
              position: i
            });
            
          } catch (error) {
            console.log('Error extracting tweet:', error);
            continue;
          }
        }
        
        return extractedTweets;
      }, includeRetweets);
      
      // Randomly select tweets from current view that we haven't seen before
      const newTweets = currentTweets.filter(tweet => !seenTweetIds.has(tweet.tweetId));
      
      // Mark all tweets as seen
      newTweets.forEach(tweet => seenTweetIds.add(tweet.tweetId));
      
      // Randomly select some tweets to add to our selection
      if (newTweets.length > 0 && selectedTweets.length < targetCount) {
        // Filter out tweets that are not good candidates for retweeting
        const retweetCandidates = newTweets.filter(tweet => {
          // Skip if already heavily retweeted (avoid spam)
          if (tweet.retweets > 10000) return false;
          
          // Skip if content is too short (likely not substantial)
          if (tweet.content.length < 10) return false;
          
          // Skip if it's a reply (starts with @)
          if (tweet.content.startsWith('@')) return false;
          
          return true;
        });
        
        // Randomly select 1-2 tweets from current view (human-like selection)
        const selectCount = Math.min(
          Math.floor(Math.random() * 2) + 1, // 1 or 2 tweets
          retweetCandidates.length,
          targetCount - selectedTweets.length
        );
        
        // Shuffle and select
        const shuffled = retweetCandidates.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, selectCount);
        
        selectedTweets.push(...selected);
        
        logWithTimestamp(
          `Scroll ${scrollAttempts}: Selected ${selected.length} tweets (${selectedTweets.length}/${targetCount} total). Found ${newTweets.length} new tweets.`, 
          'RETWEET_FEED'
        );
        
        // Human-like pause after selecting tweets (reading/deciding)
        await humanDelay(behavior, { min: 1500, max: 3000 });
      } else {
        logWithTimestamp(`Scroll ${scrollAttempts}: No new suitable tweets to select from. Found ${newTweets.length} new tweets.`, 'RETWEET_FEED');
      }
      
      // Human-like scrolling if we need more tweets
      if (selectedTweets.length < targetCount && scrollAttempts < maxScrollAttempts) {
        await humanScroll(page, 3000, behavior, async (filename: string) => {
          await saveScreenshot(page, filename, 'RETWEET_FEED');
        });
        
        // Human-like pause between scrolls (reading, thinking)
        await humanDelay(behavior, { min: 2000, max: 4000 });
        
        // Occasional longer pause (human-like behavior)
        if (Math.random() < 0.3) {
          logWithTimestamp('Taking a longer pause to read interesting content...', 'RETWEET_FEED');
          await humanDelay(behavior, { min: 3000, max: 6000 });
        }
      }
    }
    
    const processingTime = `${(Date.now() - startTime) / 1000}s`;
    logWithTimestamp(
      `Human browsing complete! Selected ${selectedTweets.length} tweets for retweeting in ${processingTime}`, 
      'RETWEET_FEED'
    );
    
    await saveScreenshot(page, 'home_timeline_browsing_complete_retweet.png', 'RETWEET_FEED');
    
    return {
      success: true,
      tweets: selectedTweets,
      selectedCount: selectedTweets.length,
      totalAvailable: seenTweetIds.size,
      processingTime
    };
    
  } catch (error: any) {
    logWithTimestamp(`Error fetching home timeline tweets for retweet: ${error.message}`, 'RETWEET_FEED');
    
    // Save error screenshot
    try {
      await saveScreenshot(page, 'home_timeline_error_retweet.png', 'RETWEET_FEED');
    } catch (screenshotError) {
      logWithTimestamp('Could not save error screenshot', 'RETWEET_FEED');
    }
    
    return {
      success: false,
      error: error.message,
      processingTime: `${(Date.now() - startTime) / 1000}s`
    };
  }
}
