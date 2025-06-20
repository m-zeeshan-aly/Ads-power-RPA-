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
  hasRetweeted: boolean; // Track if we already retweeted this
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

// Helper function to check if we already retweeted a tweet
async function checkIfRetweeted(page: puppeteer.Page, tweetElement: any): Promise<boolean> {
  try {
    // Check if the retweet button shows active state (already retweeted)
    const hasRetweeted = await page.evaluate((tweet) => {
      const retweetButton = tweet.querySelector('[data-testid="retweet"]');
      if (!retweetButton) return false;
      
      // Check if the retweet button has active styling (green color or pressed state)
      const isActive = retweetButton.querySelector('svg path[fill*="rgb(0, 186, 124)"]') || 
                       retweetButton.querySelector('svg path[fill*="rgb(23, 191, 99)"]') ||
                       retweetButton.closest('[role="button"]')?.getAttribute('aria-pressed') === 'true' ||
                       retweetButton.getAttribute('aria-pressed') === 'true';
      
      return !!isActive;
    }, tweetElement);
    
    return hasRetweeted;
  } catch (error) {
    logWithTimestamp(`Error checking retweet status: ${error}`, 'RETWEET_FEED');
    return false; // Default to false if we can't determine
  }
}

export async function getHomeFeedTweets(
  browser: puppeteer.Browser, 
  input: HomeFeedInput = {}
): Promise<HomeFeedResult> {
  const { scrollTime = 20000, behaviorType } = input;
  
  // ALWAYS select exactly ONE tweet at a time for retweeting
  const targetCount = 1;
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  const startTime = Date.now();
  logWithTimestamp(`Starting home timeline browsing for retweet - will select ${targetCount} tweet`, 'RETWEET_FEED');
  
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
      const url = window.location.href;
      return url.includes('/home') || url === 'https://x.com/' || url === 'https://twitter.com/';
    });
    
    if (!isOnHomePage) {
      throw new Error('Not on home timeline - please navigate to Twitter home first');
    }
    
    logWithTimestamp('Successfully loaded home timeline', 'RETWEET_FEED');
    await saveScreenshot(page, 'retweet_timeline_loaded.png', 'RETWEET_FEED');
    
    // Start human-like browsing behavior
    logWithTimestamp(`Starting ${scrollTime / 1000}s human-like browsing with ${behavior.name} behavior...`, 'RETWEET_FEED');
    
    const selectedTweets: HomeFeedTweetData[] = [];
    const seenTweetIds = new Set<string>();
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;
    const includeRetweets = true; // Include retweets for variety
    
    const browsingStartTime = Date.now();
    
    while (
      Date.now() - browsingStartTime < scrollTime && 
      selectedTweets.length < targetCount && 
      scrollAttempts < maxScrollAttempts
    ) {
      scrollAttempts++;
      
      // Extract available tweets from current view using the same robust method as comment implementation
      const currentTweets = await page.evaluate((includeRTs: boolean) => {
        const tweets: any[] = [];
        
        // Find all tweet articles (same selector as comment implementation)
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
            
            // Extract author information (improved from like implementation)
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
            
            // Extract engagement metrics (improved from like implementation)
            const replyElement = tweet.querySelector('[data-testid="reply"]');
            const retweetElement = tweet.querySelector('[data-testid="retweet"]');
            const likeElement = tweet.querySelector('[data-testid="like"]');
            const viewElement = tweet.querySelector('[data-testid="analytics"]');
            
            // Extract numeric values from engagement buttons
            let likes = 0;
            let retweets = 0;
            let replies = 0;
            let views = 0;
            
            // Enhanced metric extraction
            const engagementGroup = tweet.querySelector('[role="group"]');
            if (engagementGroup) {
              const buttons = engagementGroup.querySelectorAll('[role="button"]');
              
              for (const button of buttons) {
                const ariaLabel = button.getAttribute('aria-label') || '';
                const buttonText = (button.textContent || '').trim();
                const testId = button.getAttribute('data-testid') || '';
                
                let count = 0;
                const numberMatch = (ariaLabel + ' ' + buttonText).match(/(\d+[\d.,]*[km]?)/i);
                if (numberMatch) {
                  const cleanText = numberMatch[1].replace(/[,\s]/g, '').toLowerCase();
                  const match = cleanText.match(/(\d+(?:\.\d+)?)(k|m)?/);
                  
                  if (match) {
                    const number = parseFloat(match[1]);
                    const suffix = match[2];
                    
                    if (suffix === 'k') count = Math.round(number * 1000);
                    else if (suffix === 'm') count = Math.round(number * 1000000);
                    else count = Math.round(number);
                  }
                }
                
                if (ariaLabel.toLowerCase().includes('like') || testId.includes('like')) {
                  likes = count;
                } else if (ariaLabel.toLowerCase().includes('repost') || ariaLabel.toLowerCase().includes('retweet') || testId.includes('retweet')) {
                  retweets = count;
                } else if (ariaLabel.toLowerCase().includes('repl') || testId.includes('reply')) {
                  replies = count;
                } else if (ariaLabel.toLowerCase().includes('view') || testId.includes('view')) {
                  views = count;
                }
              }
            }
            
            // Check if it's a retweet
            const isRetweet = !!tweet.querySelector('[data-testid="socialContext"]');
            
            // Extract media information (same as comment implementation)
            const images = Array.from(tweet.querySelectorAll('img[src*="media"], img[src*="pbs.twimg.com"]'))
              .map(img => img.getAttribute('src'))
              .filter(Boolean)
              .filter(src => !src!.includes('profile'));
            
            const videos = Array.from(tweet.querySelectorAll('video, [data-testid="videoPlayer"]'))
              .map((_, index) => `video_${index}`);
            
            // Extract hashtags and mentions (improved from like implementation)
            const hashtags = Array.from(tweet.querySelectorAll('a[href*="/hashtag/"]'))
              .map(link => link.textContent?.replace('#', '') || '')
              .filter(Boolean);
            
            const mentions = Array.from(tweet.querySelectorAll('a[href^="/"]'))
              .map(link => {
                const href = link.getAttribute('href') || '';
                const match = href.match(/^\/([^\/]+)$/);
                return match ? match[1] : '';
              })
              .filter(Boolean)
              .filter(mention => !mention.startsWith('@'));
            
            // Build complete URL
            const url = `https://x.com/${authorHandle}/status/${tweetId}`;
            
            // Extract timestamp information
            const timeElement = tweet.querySelector('time');
            const timestamp = timeElement?.getAttribute('datetime') || new Date().toISOString();
            const relativeTime = timeElement?.textContent || '';
            
            // Create tweet data object with all required information
            const tweetData = {
              tweetId,
              content,
              author,
              authorHandle,
              timestamp,
              relativeTime,
              url,
              likes,
              retweets,
              replies,
              views: views || undefined,
              isRetweet,
              originalAuthor: isRetweet ? author : undefined,
              images,
              videos,
              hashtags,
              mentions,
              mediaCount: images.length + videos.length,
              position: i,
              hasRetweeted: false // Will be checked separately
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
      
      // Check if we've already retweeted these tweets (CRITICAL FEATURE)
      for (const tweet of newTweets) {
        try {
          // Find the tweet element again to check retweet status
          const tweetElement = await page.$(`article[data-testid="tweet"]:has(a[href*="/status/${tweet.tweetId}"])`);
          if (tweetElement) {
            tweet.hasRetweeted = await checkIfRetweeted(page, tweetElement);
          }
        } catch (error) {
          logWithTimestamp(`Error checking retweet status for tweet ${tweet.tweetId}: ${error}`, 'RETWEET_FEED');
          tweet.hasRetweeted = false; // Default to false
        }
      }
      
      // Filter out tweets we've already retweeted and apply quality filters
      const retweetCandidates = newTweets.filter(tweet => {
        // Skip if already retweeted by us
        if (tweet.hasRetweeted) return false;
        
        // Skip if content is too short (likely not substantial)
        if (tweet.content.length < 15) return false;
        
        // Skip if it's a reply (starts with @)
        if (tweet.content.startsWith('@')) return false;
        
        // Skip if already heavily retweeted (avoid spam)
        if (tweet.retweets > 50000) return false;
        
        // Skip if it's our own tweet
        // You might want to add logic to check if it's from the current user
        
        return true;
      });
      
      // Mark all tweets as seen
      newTweets.forEach(tweet => seenTweetIds.add(tweet.tweetId));
      
      // Select exactly ONE tweet if we have candidates and haven't selected one yet
      if (retweetCandidates.length > 0 && selectedTweets.length < targetCount) {
        // Randomly select ONE tweet (human-like selection)
        const shuffled = retweetCandidates.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 1); // Always take just ONE
        
        selectedTweets.push(...selected);
        
        logWithTimestamp(
          `🎯 Selected 1 tweet for retweeting: "${selected[0].content.substring(0, 50)}..." by @${selected[0].authorHandle}`, 
          'RETWEET_FEED'
        );
        logWithTimestamp(
          `📊 Tweet metrics - Likes: ${selected[0].likes}, Retweets: ${selected[0].retweets}, Replies: ${selected[0].replies}`, 
          'RETWEET_FEED'
        );
        
        // Human-like pause after selecting tweet (reading/deciding)
        await humanDelay(behavior, { min: 2000, max: 4000 });
        
        // Break out of loop since we found our target
        break;
      } else {
        logWithTimestamp(
          `No suitable unretweeted tweets found in current view (${newTweets.length} total, ${newTweets.filter(t => t.hasRetweeted).length} already retweeted)`, 
          'RETWEET_FEED'
        );
      }
      
      // Human-like scrolling if we need to find a tweet
      if (selectedTweets.length < targetCount && scrollAttempts < maxScrollAttempts) {
        await humanDelay(behavior, { min: 1500, max: 3000 });
        
        // Human-like scrolling using the same method as other implementations
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
    
    if (selectedTweets.length > 0) {
      logWithTimestamp(
        `✅ Successfully selected ${selectedTweets.length} tweet for retweeting in ${processingTime}`, 
        'RETWEET_FEED'
      );
    } else {
      logWithTimestamp(
        `⚠️ No suitable tweets found for retweeting in ${processingTime}`, 
        'RETWEET_FEED'
      );
    }
    
    await saveScreenshot(page, 'retweet_timeline_browsing_complete.png', 'RETWEET_FEED');
    
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
      await saveScreenshot(page, 'retweet_timeline_error.png', 'RETWEET_FEED');
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