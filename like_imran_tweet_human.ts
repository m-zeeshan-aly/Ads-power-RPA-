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

// Helper function to log with timestamps
function logWithTimestamp(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(path.join(logsDir, 'imran_like_human.log'), logMessage + '\n');
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

// Function to get WebSocket URL from .env file
async function getWebSocketUrl(): Promise<string> {
  try {
    logWithTimestamp('Getting WebSocket URL from .env file...');
    
    // First try reading the .env file manually to ensure we get the latest value
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
      logWithTimestamp('Check HOW_TO_GET_WEBSOCKET_URL.md for instructions.');
      process.exit(1);
    }
    
    return wsEndpoint;
  } catch (error: any) {
    logWithTimestamp(`Error getting WebSocket URL: ${error.message}`);
    throw error;
  }
}

// Function to connect to browser with Puppeteer
async function connectToBrowser(wsEndpoint: string): Promise<puppeteer.Browser> {
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

// Function to save a screenshot
async function saveScreenshot(page: puppeteer.Page, filename: string): Promise<void> {
  try {
    const filePath = path.join(logsDir, filename);
    // Workaround for TypeScript issues with screenshot path
    const buffer = await page.screenshot();
    fs.writeFileSync(filePath, buffer);
    logWithTimestamp(`Screenshot saved to ${filename}`);
  } catch (error: any) {
    logWithTimestamp(`Failed to save screenshot (${filename}): ${error.message}`);
  }
}

// Function to like an Imran Khan tweet with human-like behavior
async function likeImranKhanTweet(browser: puppeteer.Browser): Promise<void> {
  logWithTimestamp('Starting human-like Twitter browsing and Imran Khan tweet like operation');
  
  try {
    // Get all pages and use the first one
    const pages = await browser.pages();
    if (pages.length === 0) {
      logWithTimestamp('No browser pages found. Creating a new page...');
      await browser.newPage();
      // Refresh pages list
      const newPages = await browser.pages();
      if (newPages.length === 0) {
        throw new Error('Failed to create a new page');
      }
    }
    
    const page = (await browser.pages())[0];
    logWithTimestamp(`Current page URL: ${await page.url()}`);
    
    // Take a screenshot of initial state
    logWithTimestamp('Taking screenshot of initial state...');
    await saveScreenshot(page, 'imran_like_initial.png');
    
    // Step 1: First navigate to Twitter home - human-like behavior
    const twitterHomeUrl = 'https://twitter.com/home';
    logWithTimestamp(`Navigating to Twitter home page: ${twitterHomeUrl}`);
    
    try {
      await promiseWithTimeout(
        page.goto(twitterHomeUrl, { waitUntil: 'networkidle2' }),
        60000, // 60 second timeout
        'Navigation to Twitter home page timed out'
      );
    } catch (navError: any) {
      logWithTimestamp(`Initial navigation attempt failed: ${navError.message}`);
      logWithTimestamp('Trying again with different waitUntil strategy...');
      
      // Try again with a different navigation strategy
      await promiseWithTimeout(
        page.goto(twitterHomeUrl, { waitUntil: 'load' }),
        60000,
        'Second navigation attempt to Twitter home page timed out'
      );
    }
    
    logWithTimestamp('Successfully navigated to Twitter home page');
    await saveScreenshot(page, 'twitter_home_page.png');

    // Step 2: Human-like scrolling on home page for at least 10 seconds
    logWithTimestamp('Scrolling down the feed like a human user...');

    // Wait for feed to load
    const feedSelectors = [
      'div[aria-label="Timeline: Your Home Timeline"]', 
      'div[data-testid="primaryColumn"]',
      'section[aria-label="Timeline: Your Home Timeline"]',
      'div[role="region"]'
    ];

    let feedFound = false;
    for (const selector of feedSelectors) {
      try {
        const feedExists = await page.$(selector);
        if (feedExists) {
          logWithTimestamp(`Found feed with selector: ${selector}`);
          feedFound = true;
          break;
        }
      } catch (err) {
        continue;
      }
    }
    
    if (!feedFound) {
      logWithTimestamp('Could not find feed with known selectors, but will try scrolling anyway');
    }

    // Human-like scrolling with variable speed and random pauses
    const scrollStartTime = Date.now();
    let foundImranPost = false;
    let scrollCount = 0;
    
    // Scroll for at least 10 seconds
    logWithTimestamp('Starting to scroll the feed for at least 10 seconds...');
    while (Date.now() - scrollStartTime < 10000 || scrollCount < 5) {
      scrollCount++;
      
      // Human-like: Random scroll distance
      const scrollAmount = Math.floor(Math.random() * 400) + 300; // 300-700px
      
      await page.evaluate((scrollDistance) => {
        window.scrollBy(0, scrollDistance);
      }, scrollAmount);
      
      // Take occasional screenshots
      if (scrollCount % 2 === 0) {
        await saveScreenshot(page, `scroll_${scrollCount}.png`);
      }
      
      // Look for Imran Khan posts while scrolling
      logWithTimestamp(`Scroll ${scrollCount}: Looking for Imran Khan posts...`);
      
      try {
        // Check for Imran Khan's posts in the timeline
        const imranPostFound = await page.evaluate(() => {
          const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
          return posts.some(post => 
            post.textContent && 
            (post.textContent.includes('Imran Khan') || 
             post.textContent.includes('ImranKhanPTI'))
          );
        });
        
        if (imranPostFound) {
          logWithTimestamp('Found an Imran Khan post in the feed!');
          foundImranPost = true;
          break;
        }
      } catch (err: any) {
        logWithTimestamp(`Error checking for posts: ${err.message}`);
      }
      
      // Human-like: Random pause between scrolls
      const pauseTime = Math.floor(Math.random() * 800) + 200; // 200-1000ms
      await new Promise(resolve => setTimeout(resolve, pauseTime));
    }
    
    logWithTimestamp(`Finished scrolling (${scrollCount} scrolls in ${(Date.now() - scrollStartTime) / 1000}s)`);
    await saveScreenshot(page, 'after_scrolling.png');
    
    // Track if we've successfully liked a post
    let likeSuccess = false;

    // Step 3: If we found an Imran Khan post, try to like it
    if (foundImranPost) {
      logWithTimestamp('Attempting to like an Imran Khan post found in the feed');
      
      // Find posts that contain Imran Khan's name
      const imranPosts = await page.evaluate(() => {
        const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
        return posts
          .filter(post => 
            post.textContent && 
            (post.textContent.includes('Imran Khan') || 
             post.textContent.includes('ImranKhanPTI'))
          )
          .map((_, index) => index);
      });
      
      if (imranPosts.length > 0) {
        // Human-like: Don't select the first post (if multiple available)
        const postIndex = imranPosts.length > 1 
          ? Math.floor(Math.random() * (imranPosts.length - 1)) + 1 
          : 0;
        
        logWithTimestamp(`Found ${imranPosts.length} Imran Khan posts, selecting post #${postIndex + 1}`);
        
        // Human-like: Scroll to the selected post
        const scrollToPostSuccess = await page.evaluate((idx) => {
          const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
          const targetPosts = posts.filter(post => 
            post.textContent && 
            (post.textContent.includes('Imran Khan') || 
             post.textContent.includes('ImranKhanPTI'))
          );
          
          if (idx >= targetPosts.length) idx = 0;
          
          const targetPost = targetPosts[idx];
          if (targetPost) {
            // Smooth scroll to the post
            targetPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
          }
          return false;
        }, postIndex);
        
        if (scrollToPostSuccess) {
          // Human pause after scrolling to the post
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
          
          // Take screenshot before liking
          await saveScreenshot(page, 'before_like_action.png');
          
          // Check if the post is already liked
          const isAlreadyLiked = await page.evaluate((idx) => {
            const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
            const targetPosts = posts.filter(post => 
              post.textContent && 
              (post.textContent.includes('Imran Khan') || 
               post.textContent.includes('ImranKhanPTI'))
            );
            
            if (idx >= targetPosts.length) idx = 0;
            
            const targetPost = targetPosts[idx];
            if (!targetPost) return true; // Safety check
            
            // Check if like button is already active
            const likeButton = targetPost.querySelector('[data-testid="like"]');
            return likeButton && likeButton.getAttribute('aria-pressed') === 'true';
          }, postIndex);
          
          if (isAlreadyLiked) {
            logWithTimestamp('Post is already liked. Will try another post or profile visit.');
          } else {
            // Human-like: Find and click the like button
            logWithTimestamp('Attempting to like the post...');
            
            // Click the like button
            likeSuccess = await page.evaluate((idx) => {
              const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
              const targetPosts = posts.filter(post => 
                post.textContent && 
                (post.textContent.includes('Imran Khan') || 
                 post.textContent.includes('ImranKhanPTI'))
              );
              
              if (idx >= targetPosts.length) idx = 0;
              
              const targetPost = targetPosts[idx];
              if (!targetPost) return false;
              
              const likeButton = targetPost.querySelector('[data-testid="like"]');
              if (likeButton && likeButton instanceof HTMLElement) {
                // Hover effect before clicking (human-like)
                likeButton.dispatchEvent(new MouseEvent('mouseover'));
                
                // Short delay before clicking
                setTimeout(() => {
                  likeButton.click();
                }, 300);
                
                return true;
              }
              return false;
            }, postIndex);
            
            if (likeSuccess) {
              // Human-like: Wait after clicking like
              await new Promise(resolve => setTimeout(resolve, 2000));
              logWithTimestamp('Successfully liked Imran Khan post from feed');
              await saveScreenshot(page, 'after_like_action.png');
            } else {
              logWithTimestamp('Failed to click like button, will try profile page');
            }
          }
        }
      }
    }
    
    // Step 4: If no post found in feed or liking failed, search for Imran's profile
    if (!foundImranPost || !likeSuccess) {
      logWithTimestamp(!foundImranPost 
        ? 'No Imran Khan posts found in feed, searching for profile...' 
        : 'Like action in feed failed, searching for profile instead...');
      
      // Human-like: First try using search
      let profileFound = false;
      
      // Try to find and click search box
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
            
            // Human-like: Click with a small pause first
            await new Promise(resolve => setTimeout(resolve, 500));
            await page.click(selector);
            
            searchBoxFound = true;
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      if (searchBoxFound) {
        // Human-like: Type search query with variable speed
        const searchQuery = "Imran Khan PTI";
        logWithTimestamp(`Typing search query: "${searchQuery}"`);
        
        for (let i = 0; i < searchQuery.length; i++) {
          // Variable typing speed
          await page.keyboard.type(searchQuery[i], { 
            delay: Math.floor(Math.random() * 150) + 50 
          });
        }
        
        // Human-like: Slight pause before pressing Enter
        await new Promise(resolve => setTimeout(resolve, 800));
        await page.keyboard.press('Enter');
        
        // Wait for search results
        await new Promise(resolve => setTimeout(resolve, 2500));
        await saveScreenshot(page, 'search_results.png');
        
        // Try to find Imran Khan's profile in search results
        const profileSelectors = [
          'a[href="/ImranKhanPTI"]',
          'div[data-testid="UserCell"] a[role="link"]',
          'div[data-testid="TypeaheadUser"]'
        ];
        
        for (const selector of profileSelectors) {
          try {
            const profileLink = await page.$(selector);
            if (profileLink) {
              logWithTimestamp(`Found profile link with selector: ${selector}`);
              
              // Human-like: Hover and wait before clicking
              await profileLink.hover();
              await new Promise(resolve => setTimeout(resolve, 700));
              
              await profileLink.click();
              profileFound = true;
              
              // Wait for profile page to load
              await new Promise(resolve => setTimeout(resolve, 3000));
              break;
            }
          } catch (err) {
            continue;
          }
        }
      }
      
      // If search failed, navigate directly to profile
      if (!profileFound) {
        logWithTimestamp('Search unsuccessful, navigating directly to profile page');
        
        // Navigate directly to Imran Khan's profile
        const imranProfileUrl = 'https://twitter.com/ImranKhanPTI';
        
        try {
          await promiseWithTimeout(
            page.goto(imranProfileUrl, { waitUntil: 'networkidle2' }),
            60000,
            'Navigation to Imran Khan\'s profile timed out'
          );
          profileFound = true;
        } catch (navError: any) {
          logWithTimestamp(`Profile navigation failed: ${navError.message}`);
          logWithTimestamp('Trying again with different wait strategy');
          
          try {
            await promiseWithTimeout(
              page.goto(imranProfileUrl, { waitUntil: 'load' }),
              60000,
              'Second navigation attempt to profile failed'
            );
            profileFound = true;
          } catch (err: any) {
            logWithTimestamp(`Failed to navigate to profile: ${err.message}`);
            throw err;
          }
        }
      }
      
      if (profileFound) {
        logWithTimestamp('Successfully navigated to Imran Khan\'s profile');
        await saveScreenshot(page, 'imran_profile_page.png');
        
        // Wait for tweets to load - using multiple possible selectors
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
        
        if (!tweetsLoaded) {
          throw new Error('Tweets failed to load with any known selector');
        }
        
        // Human-like: Scroll down a bit to not select the first post
        logWithTimestamp('Scrolling down to find a tweet to like...');
        
        // Scroll down with human-like behavior (multiple small scrolls)
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => {
            window.scrollBy(0, Math.floor(Math.random() * 300) + 200);
          });
          
          // Pause between scrolls
          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 800) + 400));
        }
        
        // Take screenshot before like
        await saveScreenshot(page, 'before_profile_like.png');
        
        // Find and click a like button (not necessarily the first one)
        logWithTimestamp('Looking for a like button on a tweet...');
        
        // Find all like buttons
        const likeButtons = await page.$$('[data-testid="like"]');
        
        if (likeButtons.length > 0) {
          // Human-like: Don't choose the first like button if multiple available
          const buttonIndex = likeButtons.length > 2 ? 
            Math.floor(Math.random() * (likeButtons.length - 1)) + 1 : 0;
          
          logWithTimestamp(`Found ${likeButtons.length} like buttons, selecting #${buttonIndex + 1}`);
          
          // Check if it's already liked
          const isAlreadyLiked = await page.evaluate((idx) => {
            const likeButtons = Array.from(document.querySelectorAll('[data-testid="like"]'));
            if (idx >= likeButtons.length) idx = 0;
            
            return likeButtons[idx].getAttribute('aria-pressed') === 'true';
          }, buttonIndex);
          
          if (isAlreadyLiked) {
            logWithTimestamp('Selected tweet is already liked, trying another one');
            
            // Try the first button instead if we had selected another one
            const newIndex = buttonIndex === 0 ? 
              (likeButtons.length > 1 ? 1 : 0) : 0;
            
            // Check if this one is already liked too
            const alsoLiked = await page.evaluate((idx) => {
              const likeButtons = Array.from(document.querySelectorAll('[data-testid="like"]'));
              if (idx >= likeButtons.length) return true;
              return likeButtons[idx].getAttribute('aria-pressed') === 'true';
            }, newIndex);
            
            if (!alsoLiked) {
              // Human-like: Hover, pause, then click
              await likeButtons[newIndex].hover();
              await new Promise(resolve => setTimeout(resolve, 700));
              await likeButtons[newIndex].click();
              
              likeSuccess = true;
              logWithTimestamp('Successfully liked an alternative tweet on profile');
            } else {
              // Scroll up to the top and try to like the pinned tweet if any
              logWithTimestamp('Multiple tweets already liked, scrolling to top to find pinned tweet');
              
              await page.evaluate(() => {
                window.scrollTo(0, 0);
              });
              
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              const topButtons = await page.$$('[data-testid="like"]');
              if (topButtons.length > 0) {
                await topButtons[0].hover();
                await new Promise(resolve => setTimeout(resolve, 500));
                await topButtons[0].click();
                
                likeSuccess = true;
                logWithTimestamp('Successfully liked top tweet on profile');
              }
            }
          } else {
            // Like button not already pressed, click it
            // Human-like: Hover, pause, then click
            await likeButtons[buttonIndex].hover();
            await new Promise(resolve => setTimeout(resolve, 700));
            await likeButtons[buttonIndex].click();
            
            likeSuccess = true;
            logWithTimestamp('Successfully liked selected tweet on profile');
          }
          
          // Wait a moment for the like action to register
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Take a screenshot after liking
          await saveScreenshot(page, 'after_profile_like.png');
        } else {
          logWithTimestamp('No like buttons found on profile tweets');
          throw new Error('Could not find any like buttons on profile tweets');
        }
      }
    }
    
    // Step 5: Human-like - Return to home page
    if (likeSuccess) {
      logWithTimestamp('✅ Successfully liked a tweet! Returning to home page...');
      
      // Human-like: Wait a bit before navigating back
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Click on Home icon or navigate to home
      const homeButtonSelectors = [
        'a[aria-label="Home"]',
        'a[href="/home"]',
        'a[data-testid="AppTabBar_Home_Link"]'
      ];
      
      let homeButtonFound = false;
      for (const selector of homeButtonSelectors) {
        try {
          const homeButton = await page.$(selector);
          if (homeButton) {
            logWithTimestamp(`Found home button with selector: ${selector}`);
            await homeButton.click();
            homeButtonFound = true;
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      if (!homeButtonFound) {
        // Navigate directly to home
        logWithTimestamp('Home button not found, navigating directly to home');
        await page.goto('https://twitter.com/home', { waitUntil: 'load' });
      }
      
      // Final screenshot on home page
      await new Promise(resolve => setTimeout(resolve, 3000));
      await saveScreenshot(page, 'back_to_home.png');
      
      logWithTimestamp('Successfully returned to home page');
    } else {
      logWithTimestamp('Failed to like any tweets');
      throw new Error('Could not like any tweets after multiple attempts');
    }
  } catch (error: any) {
    logWithTimestamp(`Error during human-like tweet liking: ${error.message}`);
    
    // Take a screenshot of the error state
    try {
      const page = (await browser.pages())[0];
      await saveScreenshot(page, 'like_error_state.png');
    } catch (err) {
      logWithTimestamp('Could not take error screenshot');
    }
    
    throw error;
  }
}

// Main function
async function main() {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('Starting human-like Imran Khan tweet interaction');
  logWithTimestamp('='.repeat(50));
  
  // Log system info for debugging
  logWithTimestamp(`Node.js version: ${process.version}`);
  logWithTimestamp(`Platform: ${process.platform}`);
  logWithTimestamp(`Working directory: ${process.cwd()}`);
  
  let browser: puppeteer.Browser | null = null;
  
  try {
    // Get WebSocket URL
    const wsEndpoint = await getWebSocketUrl();
    
    // Connect to browser
    browser = await connectToBrowser(wsEndpoint);
    
    // Like an Imran Khan tweet with human-like behavior
    await likeImranKhanTweet(browser);
    
    logWithTimestamp('Script completed successfully');
  } catch (error: any) {
    logWithTimestamp(`Script failed: ${error.message}`);
  } finally {
    // Clean up
    if (browser) {
      logWithTimestamp('Closing browser connection...');
      await browser.disconnect();
      logWithTimestamp('Browser connection closed');
    }
    
    logWithTimestamp('='.repeat(50));
    logWithTimestamp('Script execution finished');
    logWithTimestamp('='.repeat(50));
  }
}

// Run the main function
main().catch((error) => {
  logWithTimestamp(`Unhandled error: ${error.message}`);
  process.exit(1);
});
