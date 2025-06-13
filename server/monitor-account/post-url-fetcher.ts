// post-url-fetcher.ts - Simple module to get the latest post URL from a user
import * as puppeteer from 'puppeteer-core';
import { logWithTimestamp, saveScreenshot } from '../shared/utilities';
import { humanDelay } from '../shared/human-actions';

export interface PostUrlResult {
  username: string;
  success: boolean;
  postUrl?: string;
  error?: string;
}

export async function getLatestPostUrl(
  browser: puppeteer.Browser, 
  username: string
): Promise<PostUrlResult> {
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  logWithTimestamp(`Fetching latest post URL for @${username}`, 'POST_FETCHER');
  
  try {
    // Navigate to user's profile
    const profileUrl = `https://x.com/${username}`;
    logWithTimestamp(`Navigating to: ${profileUrl}`, 'POST_FETCHER');
    
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(undefined, { min: 2000, max: 4000 });
    
    // Check if profile exists
    const profileExists = await page.evaluate(() => {
      const errorSelectors = [
        '[data-testid="error-detail"]',
        '[data-testid="emptyState"]'
      ];
      
      for (const selector of errorSelectors) {
        if (document.querySelector(selector)) {
          return false;
        }
      }
      
      return document.querySelectorAll('[data-testid="cellInnerDiv"], article[data-testid="tweet"]').length > 0;
    });
    
    if (!profileExists) {
      logWithTimestamp(`Profile @${username} not found or inaccessible`, 'POST_FETCHER');
      return {
        username,
        success: false,
        error: 'Profile not found or inaccessible'
      };
    }
    
    // Find the latest post URL
    const latestPostUrl = await page.evaluate((targetUsername) => {
      const cleanUsername = targetUsername.toLowerCase().replace(/^@/, '');
      
      // Look for tweet containers
      const tweetSelectors = [
        'div[data-testid="cellInnerDiv"]',
        'article[data-testid="tweet"]',
        'article[role="article"]'
      ];
      
      for (const selector of tweetSelectors) {
        const elements = document.querySelectorAll(selector);
        
        for (let i = 0; i < Math.min(elements.length, 10); i++) {
          const element = elements[i];
          
          try {
            // Check if this tweet is from the target user
            let isTargetUser = false;
            
            // Check for profile links
            const profileLinks = element.querySelectorAll(`a[href*="/${cleanUsername}"]`);
            if (profileLinks.length > 0) {
              isTargetUser = true;
            }
            
            // Check user name elements
            if (!isTargetUser) {
              const userNameElements = element.querySelectorAll('[data-testid="User-Name"], [data-testid="User-Names"]');
              for (const userEl of userNameElements) {
                const text = (userEl.textContent || '').toLowerCase();
                if (text.includes(cleanUsername)) {
                  isTargetUser = true;
                  break;
                }
              }
            }
            
            if (!isTargetUser) continue;
            
            // Find the post URL
            const statusLinks = element.querySelectorAll('a[href*="/status/"]');
            for (const link of statusLinks) {
              const href = link.getAttribute('href') || '';
              if (href.includes('/status/')) {
                const fullUrl = href.startsWith('http') ? href : `https://x.com${href}`;
                console.log(`Found post URL: ${fullUrl}`);
                return fullUrl;
              }
            }
            
            // Alternative: check time element links
            const timeElements = element.querySelectorAll('time');
            for (const timeEl of timeElements) {
              const timeLink = timeEl.closest('a');
              if (timeLink) {
                const href = timeLink.getAttribute('href') || '';
                if (href.includes('/status/')) {
                  const fullUrl = href.startsWith('http') ? href : `https://x.com${href}`;
                  console.log(`Found post URL via time link: ${fullUrl}`);
                  return fullUrl;
                }
              }
            }
          } catch (error) {
            console.log(`Error processing element:`, error);
            continue;
          }
        }
      }
      
      return null;
    }, username);
    
    if (latestPostUrl) {
      logWithTimestamp(`✅ Found latest post URL: ${latestPostUrl}`, 'POST_FETCHER');
      return {
        username,
        success: true,
        postUrl: latestPostUrl
      };
    } else {
      logWithTimestamp(`❌ No posts found for @${username}`, 'POST_FETCHER');
      return {
        username,
        success: false,
        error: 'No posts found'
      };
    }
    
  } catch (error: any) {
    logWithTimestamp(`Error fetching post URL for @${username}: ${error.message}`, 'POST_FETCHER');
    return {
      username,
      success: false,
      error: error.message
    };
  }
}
