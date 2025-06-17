// account-tweets-fetcher.ts - Module to fetch N latest tweets from any account with all important information
import * as puppeteer from 'puppeteer-core';
import { logWithTimestamp, saveScreenshot } from '../shared/utilities';
import { humanDelay } from '../shared/human-actions';

export interface TweetData {
  tweetId: string;
  content: string;
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
}

export interface AccountTweetsInput {
  username: string;
  count?: number; // Number of tweets to fetch (default 30, max 50)
  includeReplies?: boolean; // Include replies (default false)
  includeRetweets?: boolean; // Include retweets (default true)
}

export interface AccountTweetsResult {
  username: string;
  success: boolean;
  tweets?: TweetData[];
  totalFetched?: number;
  error?: string;
  processingTime?: string;
}

export async function getAccountTweets(
  browser: puppeteer.Browser, 
  input: AccountTweetsInput
): Promise<AccountTweetsResult> {
  const { username, count = 30, includeReplies = false, includeRetweets = true } = input;
  const maxTweets = Math.min(count, 50); // Limit to 50 tweets max
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  const startTime = Date.now();
  logWithTimestamp(`Fetching ${maxTweets} tweets from @${username}`, 'ACCOUNT_TWEETS');
  
  try {
    // Navigate to user's profile
    const profileUrl = `https://x.com/${username}`;
    logWithTimestamp(`Navigating to: ${profileUrl}`, 'ACCOUNT_TWEETS');
    
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(undefined, { min: 3000, max: 5000 });
    
    // Wait for content to load and check if profile exists
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
    
    const profileCheck = await page.evaluate((targetUsername) => {
      const cleanUsername = targetUsername.toLowerCase().replace(/^@/, '');
      
      // Check for error elements that indicate profile issues
      const errorSelectors = [
        '[data-testid="error-detail"]',
        '[data-testid="emptyState"]'
      ];
      
      for (const selector of errorSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return { exists: false, reason: 'Error element found' };
        }
      }
      
      // Check for specific error messages in text content
      const bodyText = document.body.textContent || '';
      const errorMessages = [
        "This account doesn't exist",
        "Account suspended",
        "These Tweets are protected",
        "User not found",
        "Something went wrong"
      ];
      
      for (const message of errorMessages) {
        if (bodyText.toLowerCase().includes(message.toLowerCase())) {
          return { exists: false, reason: `Error message: ${message}` };
        }
      }
      
      // More flexible URL checking - accept x.com or twitter.com
      const currentUrl = window.location.href.toLowerCase();
      const hasUsernameInUrl = currentUrl.includes(`/${cleanUsername}`) || 
                              currentUrl.includes(`@${cleanUsername}`) ||
                              currentUrl.includes(cleanUsername);
      
      // Check if we can see tweet containers or loading indicators
      const tweetContainers = document.querySelectorAll('[data-testid="cellInnerDiv"], article[data-testid="tweet"], article[role="article"]');
      const loadingElements = document.querySelectorAll('[data-testid="spinner"], [role="progressbar"]');
      
      if (tweetContainers.length > 0 || loadingElements.length > 0) {
        return { exists: true, tweetCount: tweetContainers.length };
      }
      
      // Check for user profile indicators
      const profileElements = document.querySelectorAll('[data-testid="UserName"], [data-testid="UserScreenName"], h1[role="heading"]');
      const userNameElements = document.querySelectorAll('[data-testid="User-Name"]');
      
      // Look for username in profile elements
      let foundUsername = false;
      for (const el of [...profileElements, ...userNameElements]) {
        const text = (el.textContent || '').toLowerCase();
        if (text.includes(cleanUsername) || text.includes(`@${cleanUsername}`)) {
          foundUsername = true;
          break;
        }
      }
      
      if (profileElements.length > 0 || foundUsername || hasUsernameInUrl) {
        return { exists: true, tweetCount: 0, note: 'Profile found but no tweets visible yet' };
      }
      
      return { exists: false, reason: 'No profile indicators found' };
    }, username);
    
    if (!profileCheck.exists) {
      logWithTimestamp(`Profile @${username} not accessible: ${profileCheck.reason}`, 'ACCOUNT_TWEETS');
      return {
        username,
        success: false,
        error: `Profile not accessible: ${profileCheck.reason}`
      };
    }
    
    logWithTimestamp(`Profile @${username} loaded successfully. Tweet containers found: ${profileCheck.tweetCount}`, 'ACCOUNT_TWEETS');
    
    // Tab switching for different content types
    if (!includeReplies) {
      // Click on "Posts" tab to exclude replies
      try {
        logWithTimestamp('Attempting to switch to Posts tab to exclude replies', 'ACCOUNT_TWEETS');
        
        // Wait for navigation tabs to be available
        const tabFound = await page.waitForSelector('[role="tablist"], [data-testid="ScrollSnap-List"], nav[role="navigation"]', { timeout: 5000 })
          .then(() => true)
          .catch(() => false);
        
        if (tabFound) {
          const postsTabClicked = await page.evaluate(() => {
            // Look for tabs navigation - try multiple approaches
            const possibleTabContainers = [
              document.querySelector('[role="tablist"]'),
              document.querySelector('[data-testid="ScrollSnap-List"]'),
              document.querySelector('nav[role="navigation"]'),
              document.querySelector('[data-testid="primaryColumn"] nav')
            ];
            
            for (const container of possibleTabContainers) {
              if (!container) continue;
              
              const tabElements = container.querySelectorAll('[role="tab"], a[role="tab"], a[href*="/posts"], a[href*="/tweets"]');
              for (let i = 0; i < tabElements.length; i++) {
                const tab = tabElements[i];
                const text = (tab.textContent || '').toLowerCase();
                const href = tab.getAttribute('href') || '';
                
                // Look for "Posts" tab or similar
                if (text.includes('posts') || text.includes('tweet') || href.includes('/posts') || (i === 0 && text.trim())) {
                  try {
                    (tab as HTMLElement).click();
                    return true;
                  } catch (e) {
                    continue;
                  }
                }
              }
            }
            return false;
          });
          
          if (postsTabClicked) {
            logWithTimestamp('Successfully switched to Posts tab', 'ACCOUNT_TWEETS');
            await humanDelay(undefined, { min: 2000, max: 3000 });
          } else {
            logWithTimestamp('Posts tab not found, continuing with default view', 'ACCOUNT_TWEETS');
          }
        } else {
          logWithTimestamp('Tab navigation not found, continuing with default view', 'ACCOUNT_TWEETS');
        }
      } catch (error) {
        logWithTimestamp('Could not switch to Posts tab, continuing with default view', 'ACCOUNT_TWEETS');
      }
    }
    
    // Scroll and collect tweets
    const tweets: TweetData[] = [];
    let lastTweetCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20; // Increased for better coverage
    let consecutiveFailures = 0;
    
    logWithTimestamp(`Starting to collect tweets (target: ${maxTweets})`, 'ACCOUNT_TWEETS');
    
    // Initial wait for tweets to load - improved detection
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 })
      .catch(async () => {
        logWithTimestamp('No standard tweet articles found initially, checking for alternative content structures', 'ACCOUNT_TWEETS');
        
        // Try to wait for any content in the timeline
        await page.waitForSelector('[data-testid="primaryColumn"] > div > div', { timeout: 5000 })
          .catch(() => {
            logWithTimestamp('No timeline content found, will try scrolling to load tweets', 'ACCOUNT_TWEETS');
          });
      });
    
    // Check what we have on the page initially
    const initialCheck = await page.evaluate(() => {
      const tweets = document.querySelectorAll('article[data-testid="tweet"]');
      const cellDivs = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
      const timeElements = document.querySelectorAll('time');
      const statusLinks = document.querySelectorAll('a[href*="/status/"]');
      
      return {
        tweetArticles: tweets.length,
        cellDivs: cellDivs.length,
        timeElements: timeElements.length,
        statusLinks: statusLinks.length,
        bodyText: document.body.textContent?.substring(0, 500) || ''
      };
    });
    
    logWithTimestamp(`Initial page scan: ${initialCheck.tweetArticles} tweet articles, ${initialCheck.cellDivs} cell divs, ${initialCheck.timeElements} time elements, ${initialCheck.statusLinks} status links`, 'ACCOUNT_TWEETS');
    
    while (tweets.length < maxTweets && scrollAttempts < maxScrollAttempts && consecutiveFailures < 5) {
      // Extract tweets from current view
      const newTweets = await page.evaluate((targetUsername, includeReplies, includeRetweets) => {
        const cleanUsername = targetUsername.toLowerCase().replace(/^@/, '');
        const extractedTweets: any[] = [];
        const debugInfo: string[] = [];
        
        // Debug logging
        debugInfo.push(`Looking for tweets from username: ${cleanUsername}`);
        
        // Helper function to extract number from text
        const extractNumber = (text: string): number => {
          if (!text) return 0;
          const cleaned = text.replace(/[^\d.,]/g, '').replace(/,/g, '');
          const num = parseFloat(cleaned);
          
          // Handle K, M abbreviations
          if (text.toLowerCase().includes('k')) return Math.floor(num * 1000);
          if (text.toLowerCase().includes('m')) return Math.floor(num * 1000000);
          
          return isNaN(num) ? 0 : Math.floor(num);
        };
        
        // Find all tweet containers - improved selectors for X.com
        const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
        
        debugInfo.push(`Found ${tweetElements.length} potential tweet containers`);
        
        // If no standard tweet elements found, try alternate selectors
        if (tweetElements.length === 0) {
          const altElements = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
          debugInfo.push(`No standard tweets found, trying alternate selectors: ${altElements.length} elements`);
        }
        
        for (let i = 0; i < tweetElements.length; i++) {
          const element = tweetElements[i];
          try {
            // First extract the tweet URL and ID - this is most reliable
            const timeElement = element.querySelector('time');
            let tweetUrl = '';
            let tweetId = '';
            
            if (timeElement) {
              const linkElement = timeElement.closest('a');
              if (linkElement) {
                const href = linkElement.getAttribute('href') || '';
                if (href.includes('/status/')) {
                  tweetUrl = href.startsWith('http') ? href : `https://x.com${href}`;
                  const idMatch = href.match(/\/status\/(\d+)/);
                  if (idMatch) {
                    tweetId = idMatch[1];
                  }
                }
              }
            }
            
            // If no time element found, try alternative approach
            if (!tweetUrl || !tweetId) {
              // Look for any links with status pattern in the article
              const statusLinks = element.querySelectorAll('a[href*="/status/"]');
              for (const link of statusLinks) {
                const href = link.getAttribute('href') || '';
                if (href.includes('/status/')) {
                  tweetUrl = href.startsWith('http') ? href : `https://x.com${href}`;
                  const idMatch = href.match(/\/status\/(\d+)/);
                  if (idMatch) {
                    tweetId = idMatch[1];
                    break;
                  }
                }
              }
            }
            
            // Skip if still no valid tweet URL found
            if (!tweetUrl || !tweetId) {
              debugInfo.push(`Tweet ${i}: No valid URL/ID found, skipping`);
              continue;
            }
            
            // Skip if already extracted
            if (extractedTweets.some(t => t.tweetId === tweetId)) {
              debugInfo.push(`Tweet ${i}: Duplicate tweet ID ${tweetId}, skipping`);
              continue;
            }
            
            // Check if this is from the target user - we're on their profile so most should be
            let isFromTargetUser = true;
            let isRetweet = false;
            let originalAuthor = '';
            
            // Check if retweet - look for retweet indicators
            const retweetIndicators = element.querySelectorAll('[data-testid="socialContext"]');
            for (const indicator of retweetIndicators) {
              const text = (indicator.textContent || '').toLowerCase();
              if (text.includes('retweeted') || text.includes('reposted')) {
                isRetweet = true;
                // Try to extract original author from retweet context
                const authorMatch = text.match(/@\w+/);
                if (authorMatch) {
                  originalAuthor = authorMatch[0];
                }
                break;
              }
            }
            
            debugInfo.push(`Tweet ${i}: ID=${tweetId}, isRetweet=${isRetweet}`);
            
            debugInfo.push(`Tweet ${i}: ID=${tweetId}, isRetweet=${isRetweet}`);
            
            // Skip retweets if not wanted
            if (isRetweet && !includeRetweets) {
              debugInfo.push(`Tweet ${i}: Skipping retweet`);
              continue;
            }
            
            // Check if it's a reply - improved reply detection
            const hasReplyContext = element.querySelector('[data-testid="conversationContext"]') !== null;
            const replyToElement = element.querySelector('[data-testid="conversationRoot"]') ||
                                 element.querySelector('div[dir="ltr"] span[data-testid="tweetText"]')?.parentElement?.querySelector('span');
            const isReplyTweet = hasReplyContext || 
                               (replyToElement && (replyToElement.textContent?.includes('Replying to') || 
                                                 replyToElement.textContent?.includes('Replying')));
            
            if (isReplyTweet && !includeReplies) {
              debugInfo.push(`Tweet ${i}: Skipping reply`);
              continue;
            }
            
            // Extract content - improved content extraction with multiple fallbacks
            let content = '';
            
            // Primary selector for tweet text
            const primaryTextElement = element.querySelector('[data-testid="tweetText"]');
            if (primaryTextElement && primaryTextElement.textContent) {
              content = primaryTextElement.textContent.trim();
            }
            
            // Fallback selectors if primary fails
            if (!content) {
              const fallbackSelectors = [
                'div[data-testid="tweetText"] span',
                'div[lang] span:not([data-testid]):not([aria-hidden="true"])',
                'div[dir="ltr"] > span:not([data-testid]):not([aria-hidden="true"])',
                'div[dir="ltr"] span[dir="ltr"]:not([aria-hidden="true"])'
              ];
              
              for (const selector of fallbackSelectors) {
                const elements = element.querySelectorAll(selector);
                let candidateText = '';
                
                for (const el of elements) {
                  const text = (el.textContent || '').trim();
                  if (text && text.length > candidateText.length && 
                      !text.includes('Show this thread') && 
                      !text.includes('Replying to') &&
                      !text.match(/^[\d.,]+[km]?$/i) && // Skip pure numbers/stats
                      !text.match(/^\d+[hms]$/i) && // Skip time indicators
                      !text.match(/^(like|retweet|reply|repost)$/i)) { // Skip action words
                    candidateText = text;
                  }
                }
                
                if (candidateText && candidateText.length > content.length) {
                  content = candidateText;
                }
              }
            }
            
            // Final fallback - extract meaningful text from the entire tweet
            if (!content) {
              const allText = (element.textContent || '').trim();
              const lines = allText.split('\n').filter(line => {
                const trimmed = line.trim();
                return trimmed && 
                       trimmed.length > 20 && // Only consider longer lines for content
                       !trimmed.match(/^\d+$/) && // Skip pure numbers
                       !trimmed.includes('Replying to') &&
                       !trimmed.includes('Show this thread') &&
                       !trimmed.includes('Show more') &&
                       !trimmed.match(/^[\d.,]+[km]?\s*(likes?|retweets?|replies?|views?)$/i) && // Skip engagement stats
                       !trimmed.match(/^\d+[hms]$/) && // Skip time indicators
                       !trimmed.match(/^(yesterday|today|\d+[hms]|\d+ [a-z]+ ago)$/i); // Skip relative dates
              });
              
              if (lines.length > 0) {
                // Take the longest line as it's most likely to be the main content
                content = lines.reduce((longest, current) => 
                  current.length > longest.length ? current : longest, '');
              }
            }
            
            // Clean up content
            if (content) {
              // Remove excessive whitespace and normalize
              content = content.replace(/\s+/g, ' ').trim();
              
              // Remove trailing ellipsis patterns that Twitter sometimes adds
              content = content.replace(/\.\.\.$/, '').trim();
            }
            
            debugInfo.push(`Tweet ${i}: Extracted content length: ${content.length}, preview: "${content.substring(0, 50)}..."`)
            
            // Extract timestamp
            const timestamp = timeElement?.getAttribute('datetime') || '';
            const relativeTime = timeElement?.textContent || '';
            
            // Extract engagement metrics - improved selectors
            let likes = 0, retweets = 0, replies = 0, views = 0;
            
            // Look for engagement buttons and their associated counts
            const engagementGroup = element.querySelector('[role="group"]');
            if (engagementGroup) {
              const buttons = engagementGroup.querySelectorAll('[role="button"]');
              
              for (const button of buttons) {
                const ariaLabel = button.getAttribute('aria-label') || '';
                const buttonText = (button.textContent || '').trim();
                
                // Extract number from aria-label or text
                let count = 0;
                const numberMatch = (ariaLabel + ' ' + buttonText).match(/(\d+[\d.,]*[km]?)/i);
                if (numberMatch) {
                  count = extractNumber(numberMatch[1]);
                }
                
                // Determine type based on aria-label or data-testid
                const testId = button.getAttribute('data-testid') || '';
                
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
            
            // Extract hashtags and mentions
            const hashtags: string[] = [];
            const mentions: string[] = [];
            
            const hashtagElements = element.querySelectorAll('a[href*="/hashtag/"]');
            for (const hashEl of hashtagElements) {
              const tag = (hashEl.textContent || '').replace('#', '');
              if (tag && !hashtags.includes(tag)) hashtags.push(tag);
            }
            
            const mentionElements = element.querySelectorAll('a[href^="/"][href*="@"], a[href^="https://x.com/"][href*="@"]');
            for (const mentionEl of mentionElements) {
              const mention = (mentionEl.textContent || '').replace('@', '');
              if (mention && !mentions.includes(mention)) mentions.push(mention);
            }
            
            // Extract media info
            const images: string[] = [];
            const videos: string[] = [];
            
            const imageElements = element.querySelectorAll('img[src*="media"], img[src*="pbs.twimg.com"]');
            for (const img of imageElements) {
              const src = img.getAttribute('src') || '';
              if (src && !src.includes('profile') && !images.includes(src)) {
                images.push(src);
              }
            }
            
            const videoElements = element.querySelectorAll('video, [data-testid="videoPlayer"]');
            videos.push(...Array.from(videoElements).map((_, idx) => `video_${idx}`));
            
            const mediaCount = images.length + videos.length;
            
            extractedTweets.push({
              tweetId,
              content: content || '[No text content]',
              timestamp,
              relativeTime,
              url: tweetUrl,
              likes,
              retweets,
              replies,
              views,
              isRetweet,
              originalAuthor: isRetweet ? originalAuthor : undefined,
              images,
              videos,
              hashtags,
              mentions,
              mediaCount
            });
            
          } catch (error) {
            debugInfo.push(`Error processing tweet element ${i}: ${error}`);
            continue;
          }
        }
        
        return { tweets: extractedTweets, debug: debugInfo };
      }, username, includeReplies, includeRetweets);
      // Log debug information
      if (newTweets.debug && newTweets.debug.length > 0) {
        logWithTimestamp(`Debug info: Found ${newTweets.tweets.length} tweets in this batch`, 'ACCOUNT_TWEETS');
        
        // Log first few debug messages for troubleshooting
        for (let i = 0; i < Math.min(5, newTweets.debug.length); i++) {
          logWithTimestamp(`Debug: ${newTweets.debug[i]}`, 'ACCOUNT_TWEETS');
        }
      }
      
      // Add new unique tweets
      const newTweetCount = tweets.length;
      for (const tweet of newTweets.tweets) {
        if (!tweets.some(t => t.tweetId === tweet.tweetId)) {
          tweets.push(tweet);
        }
      }
      
      const actualNewTweets = tweets.length - newTweetCount;
      logWithTimestamp(`Collected ${tweets.length} tweets so far (+${actualNewTweets} new)`, 'ACCOUNT_TWEETS');
      
      // Check if we got new tweets
      if (tweets.length === lastTweetCount) {
        scrollAttempts++;
        consecutiveFailures++;
        logWithTimestamp(`No new tweets found, scroll attempt ${scrollAttempts}/${maxScrollAttempts}, consecutive failures: ${consecutiveFailures}`, 'ACCOUNT_TWEETS');
        
        // Try different scroll strategies if failing
        if (consecutiveFailures === 2) {
          logWithTimestamp('Trying larger scroll distance', 'ACCOUNT_TWEETS');
        } else if (consecutiveFailures === 3) {
          logWithTimestamp('Trying scroll to bottom approach', 'ACCOUNT_TWEETS');
        }
      } else {
        scrollAttempts = 0; // Reset scroll attempts if we found new tweets
        consecutiveFailures = 0; // Reset consecutive failures
      }
      
      lastTweetCount = tweets.length;
      
      // Stop if we have enough tweets
      if (tweets.length >= maxTweets) {
        logWithTimestamp(`Reached target of ${maxTweets} tweets`, 'ACCOUNT_TWEETS');
        break;
      }
      
      // Early exit if we can't find any tweets at all after several attempts
      if (tweets.length === 0 && scrollAttempts > 5) {
        logWithTimestamp('No tweets found after multiple scroll attempts, profile might be empty or protected', 'ACCOUNT_TWEETS');
        break;
      }
      
      // Scroll down to load more - use different strategies based on failure count
      if (consecutiveFailures === 0 || consecutiveFailures === 1) {
        // Normal scroll
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 0.8);
        });
      } else if (consecutiveFailures === 2) {
        // Larger scroll
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 1.5);
        });
      } else {
        // Scroll to bottom
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
      }
      
      // Wait for new content to load
      await humanDelay(undefined, { min: 2000, max: 4000 });
      
      // Additional wait if we're having consecutive failures
      if (consecutiveFailures > 1) {
        await humanDelay(undefined, { min: 2000, max: 3000 });
      }
    }
    
    // Limit to requested count
    const finalTweets = tweets.slice(0, maxTweets);
    const processingTime = `${Date.now() - startTime}ms`;
    
    logWithTimestamp(`✅ Successfully fetched ${finalTweets.length} tweets from @${username} in ${processingTime}`, 'ACCOUNT_TWEETS');
    
    // Log summary of content types
    if (finalTweets.length > 0) {
      const retweets = finalTweets.filter(t => t.isRetweet).length;
      const regularTweets = finalTweets.length - retweets;
      const tweetsWithContent = finalTweets.filter(t => t.content && t.content !== '[No text content]').length;
      
      logWithTimestamp(`Tweet summary: ${regularTweets} original, ${retweets} retweets, ${tweetsWithContent} with text content`, 'ACCOUNT_TWEETS');
    }
    
    return {
      username,
      success: true,
      tweets: finalTweets,
      totalFetched: finalTweets.length,
      processingTime
    };
    
  } catch (error: any) {
    const processingTime = `${Date.now() - startTime}ms`;
    logWithTimestamp(`❌ Error fetching tweets from @${username}: ${error.message}`, 'ACCOUNT_TWEETS');
    
    return {
      username,
      success: false,
      error: error.message,
      processingTime
    };
  }
}
