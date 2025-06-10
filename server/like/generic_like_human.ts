// generic_like_human.ts
import * as puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

// Create a logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'debug_logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define like input interface
export interface LikeInput {
  // At least one of these must be provided
  username?: string;        // Target username (e.g., "ImranKhanPTI", "PTIofficial")
  searchQuery?: string;     // Search terms to find tweets (e.g., "Imran Khan", "PTI politics")
  tweetContent?: string;    // Specific content to look for in tweets
  profileUrl?: string;      // Direct profile URL to visit
  
  // Optional parameters
  likeCount?: number;       // Number of tweets to like (default: 1)
  scrollTime?: number;      // Time to scroll in milliseconds (default: 10000)
  searchInFeed?: boolean;   // Whether to search in home feed first (default: true)
  visitProfile?: boolean;   // Whether to visit profile if feed search fails (default: true)
}

// Helper function to log with timestamps
function logWithTimestamp(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(path.join(logsDir, 'generic_like_human.log'), logMessage + '\n');
}

// Helper function to set a timeout for a promise
function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  }).catch((error) => {
    clearTimeout(timeoutHandle);
    throw error;
  });
}

// Function to save a screenshot
async function saveScreenshot(page: puppeteer.Page, filename: string): Promise<void> {
  try {
    const filePath = path.join(logsDir, filename);
    const buffer = await page.screenshot();
    fs.writeFileSync(filePath, buffer);
    logWithTimestamp(`Screenshot saved to ${filename}`);
  } catch (error: any) {
    logWithTimestamp(`Failed to save screenshot (${filename}): ${error.message}`);
  }
}

// Function to get WebSocket URL from .env file
export async function getWebSocketUrl(): Promise<string> {
  try {
    logWithTimestamp('Getting WebSocket URL from .env file...');
    
    let wsEndpoint: string;
    try {
      const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      const wsMatch = envContent.match(/WS_ENDPOINT=(.+)/);
      wsEndpoint = wsMatch ? wsMatch[1].trim() : '';
      
      if (wsEndpoint) {
        logWithTimestamp(`Found WebSocket endpoint in .env: ${wsEndpoint.substring(0, 30)}...`);
      }
    } catch (err: any) {
      logWithTimestamp(`Could not read .env file directly: ${err.message}`);
      wsEndpoint = process.env.WS_ENDPOINT || '';
    }
    
    if (!wsEndpoint || wsEndpoint.trim() === '') {
      logWithTimestamp('No WebSocket URL found in .env file. Please add WS_ENDPOINT to the .env file.');
      throw new Error('WebSocket endpoint not configured');
    }
    
    return wsEndpoint;
  } catch (error: any) {
    logWithTimestamp(`Error getting WebSocket URL: ${error.message}`);
    throw error;
  }
}

// Function to connect to browser with Puppeteer
export async function connectToBrowser(wsEndpoint: string): Promise<puppeteer.Browser> {
  logWithTimestamp(`Attempting to connect with Puppeteer using WebSocket URL: ${wsEndpoint.substring(0, 30)}...`);
  
  try {
    const browser = await promiseWithTimeout(
      puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        defaultViewport: null
      }),
      30000, // 30 second timeout
      'Connection to browser timed out'
    );
    
    // Test if the connection is actually working
    logWithTimestamp('Testing browser connection...');
    const version = await browser.version();
    logWithTimestamp(`Successfully connected to browser. Version: ${version}`);
    
    return browser;
  } catch (error: any) {
    logWithTimestamp(`Failed to connect to browser: ${error.message}`);
    throw error;
  }
}

// Function to simulate human reading behavior
async function simulateReading(): Promise<void> {
  const readingTime = Math.floor(Math.random() * 3000) + 1500; // 1.5-4.5 seconds
  await new Promise(resolve => setTimeout(resolve, readingTime));
}

// Function to validate like input
function validateLikeInput(input: LikeInput): { isValid: boolean; error?: string } {
  if (!input) {
    return { isValid: false, error: 'No input provided' };
  }

  // At least one search criteria must be provided
  if (!input.username && !input.searchQuery && !input.tweetContent && !input.profileUrl) {
    return { 
      isValid: false, 
      error: 'At least one of username, searchQuery, tweetContent, or profileUrl must be provided' 
    };
  }

  // Validate likeCount if provided
  if (input.likeCount !== undefined && (input.likeCount < 1 || input.likeCount > 10)) {
    return { 
      isValid: false, 
      error: 'likeCount must be between 1 and 10' 
    };
  }

  // Validate scrollTime if provided
  if (input.scrollTime !== undefined && (input.scrollTime < 1000 || input.scrollTime > 60000)) {
    return { 
      isValid: false, 
      error: 'scrollTime must be between 1000 and 60000 milliseconds' 
    };
  }

  return { isValid: true };
}

// Function to build search query from input
function buildSearchQuery(input: LikeInput): string {
  const parts: string[] = [];
  
  if (input.username) {
    parts.push(input.username);
  }
  
  if (input.searchQuery) {
    parts.push(input.searchQuery);
  }
  
  return parts.join(' ').trim() || 'latest tweets';
}

// Function to check if a post matches the criteria
function doesPostMatch(postText: string, input: LikeInput): boolean {
  const lowerPostText = postText.toLowerCase();
  
  // Check username match
  if (input.username) {
    const usernamePattern = input.username.toLowerCase().replace(/^@/, '');
    if (lowerPostText.includes(usernamePattern)) {
      return true;
    }
  }
  
  // Check search query match
  if (input.searchQuery) {
    const queryTerms = input.searchQuery.toLowerCase().split(' ');
    if (queryTerms.some(term => lowerPostText.includes(term))) {
      return true;
    }
  }
  
  // Check tweet content match
  if (input.tweetContent) {
    const contentTerms = input.tweetContent.toLowerCase().split(' ');
    if (contentTerms.some(term => lowerPostText.includes(term))) {
      return true;
    }
  }
  
  return false;
}

// Main function to like tweets with human-like behavior
export async function likeGenericTweetHuman(browser: puppeteer.Browser, input: LikeInput): Promise<void> {
  logWithTimestamp('Starting generic tweet like operation with human-like behavior');
  
  // Validate input
  const validation = validateLikeInput(input);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  const likeCount = input.likeCount || 1;
  const scrollTime = input.scrollTime || 10000;
  const searchInFeed = input.searchInFeed !== false; // Default true
  const visitProfile = input.visitProfile !== false; // Default true
  
  logWithTimestamp(`Like configuration: likeCount=${likeCount}, scrollTime=${scrollTime}ms, searchInFeed=${searchInFeed}, visitProfile=${visitProfile}`);
  
  try {
    // Get all pages and use the first one
    const pages = await browser.pages();
    if (pages.length === 0) {
      logWithTimestamp('No browser pages found. Creating a new page...');
      await browser.newPage();
      const newPages = await browser.pages();
      if (newPages.length === 0) {
        throw new Error('Failed to create a new page');
      }
    }
    
    const page = (await browser.pages())[0];
    logWithTimestamp(`Current page URL: ${await page.url()}`);
    
    // Take a screenshot of initial state
    await saveScreenshot(page, 'generic_like_initial.png');
    
    let likeSuccess = false;
    let likesCompleted = 0;
    
    // Step 1: Search in home feed if enabled
    if (searchInFeed) {
      logWithTimestamp('Step 1: Searching for matching tweets in home feed...');
      
      // Navigate to Twitter home
      const twitterHomeUrl = 'https://twitter.com/home';
      logWithTimestamp(`Navigating to Twitter home page: ${twitterHomeUrl}`);
      
      try {
        await promiseWithTimeout(
          page.goto(twitterHomeUrl, { waitUntil: 'networkidle2' }),
          60000,
          'Navigation to Twitter home page timed out'
        );
      } catch (navError: any) {
        logWithTimestamp(`Initial navigation attempt failed: ${navError.message}`);
        logWithTimestamp('Trying again with different waitUntil strategy...');
        
        await promiseWithTimeout(
          page.goto(twitterHomeUrl, { waitUntil: 'load' }),
          60000,
          'Second navigation attempt to Twitter home page timed out'
        );
      }
      
      logWithTimestamp('Successfully navigated to Twitter home page');
      await saveScreenshot(page, 'twitter_home_page.png');
      
      // Human-like scrolling and searching
      logWithTimestamp(`Scrolling feed for ${scrollTime}ms looking for matching posts...`);
      
      const scrollStartTime = Date.now();
      let foundMatchingPost = false;
      let scrollCount = 0;
      
      while (Date.now() - scrollStartTime < scrollTime && likesCompleted < likeCount) {
        scrollCount++;
        
        // Human-like: Random scroll distance
        const scrollAmount = Math.floor(Math.random() * 400) + 300; // 300-700px
        
        await page.evaluate((scrollDistance) => {
          window.scrollBy(0, scrollDistance);
        }, scrollAmount);
        
        // Take occasional screenshots
        if (scrollCount % 3 === 0) {
          await saveScreenshot(page, `feed_scroll_${scrollCount}.png`);
        }
        
        // Look for matching posts
        try {
          const matchingPosts = await page.evaluate((inputData) => {
            const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
            const matching = [];
            
            for (let i = 0; i < posts.length; i++) {
              const post = posts[i];
              if (post.textContent) {
                const lowerText = post.textContent.toLowerCase();
                let matches = false;
                
                // Check username
                if (inputData.username) {
                  const username = inputData.username.toLowerCase().replace(/^@/, '');
                  if (lowerText.includes(username)) {
                    matches = true;
                  }
                }
                
                // Check search query
                if (inputData.searchQuery && !matches) {
                  const queryTerms = inputData.searchQuery.toLowerCase().split(' ');
                  if (queryTerms.some(term => lowerText.includes(term))) {
                    matches = true;
                  }
                }
                
                // Check tweet content
                if (inputData.tweetContent && !matches) {
                  const contentTerms = inputData.tweetContent.toLowerCase().split(' ');
                  if (contentTerms.some(term => lowerText.includes(term))) {
                    matches = true;
                  }
                }
                
                if (matches) {
                  matching.push(i);
                }
              }
            }
            
            return matching;
          }, input);
          
          if (matchingPosts.length > 0) {
            logWithTimestamp(`Found ${matchingPosts.length} matching posts in the feed!`);
            foundMatchingPost = true;
            
            // Try to like matching posts
            for (const postIndex of matchingPosts) {
              if (likesCompleted >= likeCount) break;
              
              // Human-like: Scroll to the post
              const scrollToPostSuccess = await page.evaluate((idx) => {
                const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
                if (idx < posts.length) {
                  posts[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return true;
                }
                return false;
              }, postIndex);
              
              if (scrollToPostSuccess) {
                // Human pause after scrolling to the post
                await simulateReading();
                
                // Take screenshot before liking
                await saveScreenshot(page, `before_like_post_${likesCompleted + 1}.png`);
                
                // Check if already liked and attempt to like
                const likeResult = await page.evaluate((idx) => {
                  const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
                  if (idx >= posts.length) return { success: false, reason: 'Post not found' };
                  
                  const targetPost = posts[idx];
                  const likeButton = targetPost.querySelector('[data-testid="like"]') as HTMLElement;
                  
                  if (!likeButton) {
                    return { success: false, reason: 'Like button not found' };
                  }
                  
                  // Check if already liked
                  const isAlreadyLiked = likeButton.getAttribute('aria-pressed') === 'true';
                  if (isAlreadyLiked) {
                    return { success: false, reason: 'Already liked' };
                  }
                  
                  // Hover and click
                  likeButton.dispatchEvent(new MouseEvent('mouseover'));
                  setTimeout(() => {
                    likeButton.click();
                  }, 300);
                  
                  return { success: true, reason: 'Liked successfully' };
                }, postIndex);
                
                if (likeResult.success) {
                  likesCompleted++;
                  logWithTimestamp(`✅ Successfully liked post ${likesCompleted}/${likeCount} in feed`);
                  
                  // Human-like: Wait after liking
                  await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
                  
                  await saveScreenshot(page, `after_like_post_${likesCompleted}.png`);
                } else {
                  logWithTimestamp(`⚠️ Could not like post: ${likeResult.reason}`);
                }
              }
            }
            
            if (likesCompleted >= likeCount) {
              likeSuccess = true;
              break;
            }
          }
        } catch (err: any) {
          logWithTimestamp(`Error checking for posts: ${err.message}`);
        }
        
        // Human-like: Random pause between scrolls
        const pauseTime = Math.floor(Math.random() * 800) + 200;
        await new Promise(resolve => setTimeout(resolve, pauseTime));
      }
      
      logWithTimestamp(`Feed search completed. Found matching posts: ${foundMatchingPost}, Likes completed: ${likesCompleted}/${likeCount}`);
    }
    
    // Step 2: Visit profile if needed and enabled
    if (visitProfile && likesCompleted < likeCount) {
      logWithTimestamp('Step 2: Searching profile for tweets to like...');
      
      let profileUrl = input.profileUrl;
      
      // If no direct profile URL, try to construct one or search for the user
      if (!profileUrl && input.username) {
        const cleanUsername = input.username.replace(/^@/, '');
        profileUrl = `https://twitter.com/${cleanUsername}`;
        logWithTimestamp(`Constructed profile URL: ${profileUrl}`);
      }
      
      // If still no profile URL, try searching for the user
      if (!profileUrl && (input.searchQuery || input.username)) {
        logWithTimestamp('No profile URL available, attempting to search for user...');
        
        // Try to find search box and search for the user
        const searchBoxSelectors = [
          'input[aria-label="Search query"]',
          'input[data-testid="SearchBox_Search_Input"]',
          'input[placeholder="Search Twitter"]',
          'input[placeholder="Search"]'
        ];
        
        let searchBoxFound = false;
        for (const selector of searchBoxSelectors) {
          try {
            const searchBox = await page.$(selector);
            if (searchBox) {
              logWithTimestamp(`Found search box with selector: ${selector}`);
              
              // Human-like: Click with pause
              await new Promise(resolve => setTimeout(resolve, 500));
              await page.click(selector);
              
              // Type search query
              const searchQuery = buildSearchQuery(input);
              logWithTimestamp(`Typing search query: "${searchQuery}"`);
              
              for (let i = 0; i < searchQuery.length; i++) {
                await page.keyboard.type(searchQuery[i], { 
                  delay: Math.floor(Math.random() * 150) + 50 
                });
              }
              
              await new Promise(resolve => setTimeout(resolve, 800));
              await page.keyboard.press('Enter');
              
              // Wait for search results
              await new Promise(resolve => setTimeout(resolve, 2500));
              await saveScreenshot(page, 'search_results.png');
              
              // Try to find profile link in search results
              const profileSelectors = [
                'a[data-testid="UserCell"]',
                'div[data-testid="UserCell"] a[role="link"]',
                'div[data-testid="TypeaheadUser"] a'
              ];
              
              for (const pSelector of profileSelectors) {
                try {
                  const profileLink = await page.$(pSelector);
                  if (profileLink) {
                    logWithTimestamp(`Found profile link with selector: ${pSelector}`);
                    
                    await profileLink.hover();
                    await new Promise(resolve => setTimeout(resolve, 700));
                    await profileLink.click();
                    
                    // Wait for profile to load
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    profileUrl = await page.url();
                    logWithTimestamp(`Successfully navigated to profile: ${profileUrl}`);
                    break;
                  }
                } catch (err) {
                  continue;
                }
              }
              
              searchBoxFound = true;
              break;
            }
          } catch (err) {
            continue;
          }
        }
        
        if (!searchBoxFound) {
          logWithTimestamp('Could not find search box to search for user');
        }
      }
      
      // If we have a profile URL, navigate to it
      if (profileUrl && !profileUrl.includes('/search')) {
        try {
          if (profileUrl !== await page.url()) {
            logWithTimestamp(`Navigating to profile: ${profileUrl}`);
            await promiseWithTimeout(
              page.goto(profileUrl, { waitUntil: 'networkidle2' }),
              60000,
              'Navigation to profile timed out'
            );
          }
          
          await saveScreenshot(page, 'profile_page.png');
          
          // Wait for tweets to load
          logWithTimestamp('Waiting for profile tweets to load...');
          
          const tweetSelectors = [
            'article[data-testid="tweet"]',
            'article[role="article"]',
            'div[data-testid="cellInnerDiv"]',
            '[data-testid="tweetText"]'
          ];
          
          let tweetsLoaded = false;
          for (const selector of tweetSelectors) {
            try {
              await promiseWithTimeout(
                page.waitForSelector(selector, { timeout: 10000 }),
                10000,
                `Waiting for tweets with selector ${selector} timed out`
              );
              logWithTimestamp(`Found tweets with selector: ${selector}`);
              tweetsLoaded = true;
              break;
            } catch (err) {
              continue;
            }
          }
          
          if (tweetsLoaded) {
            // Human-like: Scroll down a bit to see more tweets
            logWithTimestamp('Scrolling down profile to find tweets to like...');
            
            for (let i = 0; i < 3 && likesCompleted < likeCount; i++) {
              await page.evaluate(() => {
                window.scrollBy(0, Math.floor(Math.random() * 300) + 200);
              });
              
              await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 800) + 400));
            }
            
            await saveScreenshot(page, 'profile_after_scroll.png');
            
            // Find and like tweets on profile
            const likeButtons = await page.$$('[data-testid="like"]');
            
            if (likeButtons.length > 0) {
              logWithTimestamp(`Found ${likeButtons.length} like buttons on profile`);
              
              // Human-like: Don't always pick the first tweet
              for (let attempt = 0; attempt < Math.min(likeButtons.length, likeCount - likesCompleted + 2); attempt++) {
                const buttonIndex = Math.min(attempt, likeButtons.length - 1);
                
                // Check if already liked
                const isAlreadyLiked = await page.evaluate((idx) => {
                  const buttons = Array.from(document.querySelectorAll('[data-testid="like"]'));
                  if (idx >= buttons.length) return true;
                  return buttons[idx].getAttribute('aria-pressed') === 'true';
                }, buttonIndex);
                
                if (!isAlreadyLiked) {
                  // Human-like: Hover, pause, then click
                  await likeButtons[buttonIndex].hover();
                  await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 700) + 300));
                  await likeButtons[buttonIndex].click();
                  
                  likesCompleted++;
                  logWithTimestamp(`✅ Successfully liked tweet ${likesCompleted}/${likeCount} on profile`);
                  
                  // Wait for like action to register
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  await saveScreenshot(page, `after_profile_like_${likesCompleted}.png`);
                  
                  if (likesCompleted >= likeCount) {
                    likeSuccess = true;
                    break;
                  }
                  
                  // Human-like pause between likes
                  await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 3000) + 2000));
                } else {
                  logWithTimestamp(`Tweet ${buttonIndex + 1} is already liked, trying next one`);
                }
              }
            } else {
              logWithTimestamp('No like buttons found on profile');
            }
          } else {
            logWithTimestamp('Could not load tweets on profile');
          }
        } catch (error: any) {
          logWithTimestamp(`Error navigating to or processing profile: ${error.message}`);
        }
      }
    }
    
    // Final result
    if (likesCompleted > 0) {
      likeSuccess = true;
      logWithTimestamp(`✅ Successfully completed ${likesCompleted}/${likeCount} likes`);
      
      // Human-like: Return to home page
      logWithTimestamp('Returning to home page...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        await page.goto('https://twitter.com/home', { waitUntil: 'load' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        await saveScreenshot(page, 'back_to_home.png');
        logWithTimestamp('Successfully returned to home page');
      } catch (err) {
        logWithTimestamp('Could not return to home page');
      }
    } else {
      logWithTimestamp('❌ Failed to like any tweets matching the criteria');
      throw new Error('Could not like any tweets matching the specified criteria');
    }
    
  } catch (error: any) {
    logWithTimestamp(`Error during generic like operation: ${error.message}`);
    
    // Take a screenshot of the error state
    try {
      const page = (await browser.pages())[0];
      await saveScreenshot(page, 'generic_like_error.png');
    } catch (err) {
      logWithTimestamp('Could not take error screenshot');
    }
    
    throw error;
  }
}
