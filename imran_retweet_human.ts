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
  fs.appendFileSync(path.join(logsDir, 'imran_retweet_human.log'), logMessage + '\n');
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

// Function to simulate human-like reading pause
async function simulateReading(): Promise<void> {
  // Simulate a reading pause between 2-8 seconds
  const readTime = Math.floor(Math.random() * 6000) + 2000;
  await new Promise(resolve => setTimeout(resolve, readTime));
}

// Function to simulate human typing with variable speed
async function humanTypeText(page: puppeteer.Page, selector: string, text: string): Promise<void> {
  // Focus on the element
  await page.focus(selector);
  
  // Type each character with variable speed
  for (let i = 0; i < text.length; i++) {
    // Variable typing speed (between 50ms and 250ms per character)
    const typingSpeed = Math.floor(Math.random() * 200) + 50;
    
    // Type the character
    await page.keyboard.type(text[i], { delay: typingSpeed });
    
    // Occasionally pause for longer as if thinking (1 in 10 chance)
    if (Math.random() < 0.1) {
      const thinkingPause = Math.floor(Math.random() * 1000) + 300;
      await new Promise(resolve => setTimeout(resolve, thinkingPause));
    }
  }
}

// Function to scroll like a human
async function humanScroll(page: puppeteer.Page, duration: number = 10000): Promise<void> {
  const startTime = Date.now();
  let scrollCount = 0;
  
  // Continue scrolling until the duration is met
  while (Date.now() - startTime < duration) {
    scrollCount++;
    
    // Random scroll distance (300-700px)
    const scrollAmount = Math.floor(Math.random() * 400) + 300;
    
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    
    // Take occasional screenshot (every 2-3 scrolls)
    if (scrollCount % (Math.random() > 0.5 ? 2 : 3) === 0) {
      await saveScreenshot(page, `human_scroll_retweet_${scrollCount}.png`);
    }
    
    // Random pause between scrolls (200-1200ms)
    const pauseTime = Math.floor(Math.random() * 1000) + 200;
    await new Promise(resolve => setTimeout(resolve, pauseTime));
    
    // Occasionally pause longer as if reading content (1 in 4 chance)
    if (Math.random() < 0.25) {
      await simulateReading();
    }
  }
  
  return;
}

// Function to retweet an Imran Khan tweet with human-like behavior
async function retweetImranKhanHuman(browser: puppeteer.Browser): Promise<void> {
  logWithTimestamp('Starting human-like Twitter browsing and Imran Khan retweet operation');
  
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
    await saveScreenshot(page, 'imran_retweet_human_initial.png');
    
    // Step 1: First navigate to Twitter home - natural starting point
    const twitterHomeUrl = 'https://twitter.com/home';
    logWithTimestamp(`Navigating to Twitter home page: ${twitterHomeUrl}`);
    
    // Human-like navigation with potential for retry
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
    await saveScreenshot(page, 'twitter_home_human_retweet.png');
    
    // Human-like: Wait a moment before starting to scroll
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
    
    // Step 2: Scroll down the home timeline like a human for at least 10 seconds
    logWithTimestamp('Starting to scroll the feed like a human user...');
    
    // Track if we find any Imran Khan posts
    let foundImranPost = false;
    
    // Scroll for at least 10 seconds while looking for Imran Khan content
    const scrollStartTime = Date.now();
    let scrollCount = 0;
    
    while (Date.now() - scrollStartTime < 10000 || scrollCount < 5) {
      scrollCount++;
      
      // Human-like: Random scroll distance
      const scrollAmount = Math.floor(Math.random() * 400) + 300; // 300-700px
      
      await page.evaluate((scrollDistance) => {
        window.scrollBy(0, scrollDistance);
      }, scrollAmount);
      
      // Take occasional screenshots
      if (scrollCount % 2 === 0) {
        await saveScreenshot(page, `scroll_feed_retweet_${scrollCount}.png`);
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
      
      // Occasionally seem interested and pause to read content
      if (Math.random() < 0.2) {
        logWithTimestamp('Pausing to read interesting content...');
        await simulateReading();
      }
    }
    
    logWithTimestamp(`Finished scrolling (${scrollCount} scrolls in ${(Date.now() - scrollStartTime) / 1000}s)`);
    await saveScreenshot(page, 'after_feed_scrolling_retweet.png');
    
    // Track if we've successfully retweeted a post
    let retweetSuccess = false;
    
    // Step 3: If we found an Imran Khan post, try to retweet it
    if (foundImranPost) {
      logWithTimestamp('Found Imran Khan post in feed, preparing to retweet...');
      
      // Find posts that contain Imran Khan
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
          // Human pause after scrolling to the post - appear to read it
          await simulateReading();
          
          // Take screenshot before attempting to retweet
          await saveScreenshot(page, 'before_feed_retweet.png');
          
          // Check if post is already retweeted
          const isAlreadyRetweeted = await page.evaluate((idx) => {
            const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
            const targetPosts = posts.filter(post => 
              post.textContent && 
              (post.textContent.includes('Imran Khan') || 
               post.textContent.includes('ImranKhanPTI'))
            );
            
            if (idx >= targetPosts.length) idx = 0;
            
            const targetPost = targetPosts[idx];
            if (!targetPost) return true;
            
            const retweetButton = targetPost.querySelector('[data-testid="retweet"]');
            return retweetButton && retweetButton.getAttribute('aria-pressed') === 'true';
          }, postIndex);
          
          if (isAlreadyRetweeted) {
            logWithTimestamp('Post is already retweeted. Looking for another post...');
          } else {
            // Find and click the retweet button on the selected post
            const retweetButtonClicked = await page.evaluate((idx) => {
              const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
              const targetPosts = posts.filter(post => 
                post.textContent && 
                (post.textContent.includes('Imran Khan') || 
                 post.textContent.includes('ImranKhanPTI'))
              );
              
              if (idx >= targetPosts.length) idx = 0;
              
              const targetPost = targetPosts[idx];
              if (!targetPost) return false;
              
              // Find retweet button in this post
              const retweetButton = targetPost.querySelector('[data-testid="retweet"]');
              if (retweetButton && retweetButton instanceof HTMLElement) {
                // Hover before clicking (human-like)
                retweetButton.dispatchEvent(new MouseEvent('mouseover'));
                
                // Short delay before clicking
                setTimeout(() => {
                  retweetButton.click();
                }, 300);
                
                return true;
              }
              return false;
            }, postIndex);
            
            if (retweetButtonClicked) {
              // Human-like: Wait for retweet menu to appear
              await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
              
              // Take screenshot after clicking retweet button
              await saveScreenshot(page, 'retweet_menu_opened.png');
              
              // Find and click the "Retweet" option in the menu
              const retweetConfirmSelectors = [
                '[data-testid="retweetConfirm"]',
                'div[data-testid="retweetConfirm"]',
                '[role="menuitem"]:has-text("Retweet")'
              ];
              
              let confirmButtonClicked = false;
              
              for (const selector of retweetConfirmSelectors) {
                try {
                  const confirmButton = await page.$(selector);
                  if (confirmButton) {
                    // Human-like: Hover and pause before clicking
                    await confirmButton.hover();
                    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 200));
                    
                    await confirmButton.click();
                    confirmButtonClicked = true;
                    break;
                  }
                } catch (err) {
                  continue;
                }
              }
              
              if (confirmButtonClicked) {
                // Wait for the retweet to complete
                await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1500) + 1000));
                
                // Take screenshot after retweet
                await saveScreenshot(page, 'after_feed_retweet.png');
                
                retweetSuccess = true;
                logWithTimestamp('Successfully retweeted an Imran Khan post from the feed');
              } else {
                logWithTimestamp('Could not find or click the retweet confirmation button');
              }
            } else {
              logWithTimestamp('Could not click the retweet button on the post');
            }
          }
        }
      }
    }
    
    // Step 4: If no post found in feed or retweet failed, search for Imran's profile
    if (!foundImranPost || !retweetSuccess) {
      logWithTimestamp(!foundImranPost 
        ? 'No Imran Khan posts found in feed, searching for profile...' 
        : 'Retweet action in feed failed, searching for profile instead...');
      
      // Human-like: Pause a moment before searching
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1500) + 1000));
      
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
            
            // Human-like: Move cursor and pause before clicking
            await page.hover(selector);
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 300));
            await page.click(selector);
            
            searchBoxFound = true;
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      let profileFound = false;
      
      if (searchBoxFound) {
        // Human-like: Type search query with variable speed using our humanTypeText function
        const searchQuery = "Imran Khan PTI";
        logWithTimestamp(`Typing search query: "${searchQuery}"`);
        
        await humanTypeText(page, ':focus', searchQuery);
        
        // Human-like: Slight pause before pressing Enter
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 800) + 500));
        await page.keyboard.press('Enter');
        
        // Wait for search results
        await new Promise(resolve => setTimeout(resolve, 2500));
        await saveScreenshot(page, 'imran_search_results.png');
        
        // Human-like: Look over results for a moment
        await simulateReading();
        
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
              logWithTimestamp(`Found Imran Khan profile link with selector: ${selector}`);
              
              // Human-like: Hover, pause, then click
              await profileLink.hover();
              await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 700) + 300));
              
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
        logWithTimestamp('Search unsuccessful, navigating directly to Imran Khan profile');
        
        // Human-like: Slight pause before navigating
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
        
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
        await saveScreenshot(page, 'imran_profile_page_human.png');
        
        // Human-like: Take a moment to look at the profile page
        await simulateReading();
        
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
        
        if (!tweetsLoaded) {
          throw new Error('Tweets failed to load with any known selector');
        }
        
        // Human-like: Scroll down a bit to not select the first post
        logWithTimestamp('Scrolling down to find tweets to retweet...');
        
        // Scroll down with human-like behavior (multiple small scrolls)
        for (let i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
          await page.evaluate(() => {
            window.scrollBy(0, Math.floor(Math.random() * 300) + 200);
          });
          
          // Pause between scrolls
          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 800) + 400));
        }
        
        // Take screenshot after scrolling
        await saveScreenshot(page, 'before_profile_retweet.png');
        
        // Human-like: Look at the tweets for a moment
        await simulateReading();
        
        // Find retweet buttons
        const retweetButtons = await page.$$('[data-testid="retweet"]');
        
        if (retweetButtons.length > 0) {
          // Human-like: Don't choose the first button if multiple available
          const buttonIndex = retweetButtons.length > 2 ? 
            Math.floor(Math.random() * (retweetButtons.length - 1)) + 1 : 0;
          
          logWithTimestamp(`Found ${retweetButtons.length} retweet buttons, selecting #${buttonIndex + 1}`);
          
          // Check if it's already retweeted
          const isAlreadyRetweeted = await page.evaluate((idx) => {
            const buttons = Array.from(document.querySelectorAll('[data-testid="retweet"]'));
            if (idx >= buttons.length) idx = 0;
            
            return buttons[idx].getAttribute('aria-pressed') === 'true';
          }, buttonIndex);
          
          if (isAlreadyRetweeted) {
            logWithTimestamp('Selected tweet is already retweeted, trying another one');
            
            // Try another button
            const newIndex = buttonIndex === 0 ? 
              (retweetButtons.length > 1 ? 1 : 0) : 0;
            
            // Check if this one is already retweeted too
            const alsoRetweeted = await page.evaluate((idx) => {
              const buttons = Array.from(document.querySelectorAll('[data-testid="retweet"]'));
              if (idx >= buttons.length) return true;
              return buttons[idx].getAttribute('aria-pressed') === 'true';
            }, newIndex);
            
            if (!alsoRetweeted) {
              // Human-like: Hover, pause, then click
              await retweetButtons[newIndex].hover();
              await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 700) + 300));
              await retweetButtons[newIndex].click();
              
              // Wait for retweet menu
              await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
              await saveScreenshot(page, 'retweet_menu_profile.png');
              
              // Click on "Retweet" in the menu
              const confirmSelectors = [
                '[data-testid="retweetConfirm"]',
                'div[data-testid="retweetConfirm"]',
                '[role="menuitem"]:has-text("Retweet")'
              ];
              
              for (const selector of confirmSelectors) {
                try {
                  const confirmButton = await page.$(selector);
                  if (confirmButton) {
                    // Human-like: Hover, pause, then click
                    await confirmButton.hover();
                    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 200));
                    await confirmButton.click();
                    
                    retweetSuccess = true;
                    
                    // Wait for retweet to complete
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await saveScreenshot(page, 'after_profile_retweet.png');
                    
                    logWithTimestamp('Successfully retweeted an alternative tweet from profile');
                    break;
                  }
                } catch (err) {
                  continue;
                }
              }
            } else {
              // Try scrolling up to find a non-retweeted post
              logWithTimestamp('Multiple tweets already retweeted, scrolling to top to find another');
              
              await page.evaluate(() => {
                window.scrollTo(0, 0);
              });
              
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Get fresh list of retweet buttons
              const topButtons = await page.$$('[data-testid="retweet"]');
              
              if (topButtons.length > 0) {
                await topButtons[0].hover();
                await new Promise(resolve => setTimeout(resolve, 500));
                await topButtons[0].click();
                
                // Wait for menu to appear
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Click confirm button
                const confirmSelector = '[data-testid="retweetConfirm"]';
                try {
                  await page.waitForSelector(confirmSelector, { timeout: 3000 });
                  await page.hover(confirmSelector);
                  await new Promise(resolve => setTimeout(resolve, 300));
                  await page.click(confirmSelector);
                  
                  retweetSuccess = true;
                  logWithTimestamp('Successfully retweeted top tweet on profile');
                } catch (err) {
                  logWithTimestamp('Could not find or click retweet confirmation button');
                }
              }
            }
          } else {
            // Not already retweeted, proceed normally
            // Human-like: Hover, pause, then click
            await retweetButtons[buttonIndex].hover();
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 700) + 300));
            await retweetButtons[buttonIndex].click();
            
            // Wait for retweet menu
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
            await saveScreenshot(page, 'retweet_menu_profile.png');
            
            // Click on "Retweet" in the menu
            const confirmSelectors = [
              '[data-testid="retweetConfirm"]',
              'div[data-testid="retweetConfirm"]',
              '[role="menuitem"]:has-text("Retweet")'
            ];
            
            for (const selector of confirmSelectors) {
              try {
                const confirmButton = await page.$(selector);
                if (confirmButton) {
                  // Human-like: Hover, pause, then click
                  await confirmButton.hover();
                  await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 200));
                  await confirmButton.click();
                  
                  retweetSuccess = true;
                  
                  // Wait for retweet to complete
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  await saveScreenshot(page, 'after_profile_retweet.png');
                  
                  logWithTimestamp('Successfully retweeted selected tweet from profile');
                  break;
                }
              } catch (err) {
                continue;
              }
            }
          }
        } else {
          logWithTimestamp('No retweet buttons found on profile tweets');
          throw new Error('Could not find any retweet buttons on profile tweets');
        }
      }
    }
    
    // Step 5: Human-like - Return to home page if successful
    if (retweetSuccess) {
      logWithTimestamp('✅ Successfully retweeted a tweet! Returning to home page...');
      
      // Human-like: Wait a bit before navigating back
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
      
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
            
            // Human-like: Hover, pause, then click
            await page.hover(selector);
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 300));
            
            await page.click(selector);
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
      
      // One final human-like action - scroll the home feed a bit
      await new Promise(resolve => setTimeout(resolve, 3000));
      await saveScreenshot(page, 'back_to_home_after_retweet.png');
      
      // Scroll a bit more on the home page
      logWithTimestamp('Scrolling home feed a bit more before finishing...');
      await humanScroll(page, 5000);
      
      logWithTimestamp('Successfully returned to home page and finished browsing');
    } else {
      logWithTimestamp('Failed to retweet any tweets');
      throw new Error('Could not retweet any tweets after multiple attempts');
    }
  } catch (error: any) {
    logWithTimestamp(`Error during human-like tweet retweeting: ${error.message}`);
    
    // Take a screenshot of the error state
    try {
      const page = (await browser.pages())[0];
      await saveScreenshot(page, 'retweet_human_error.png');
    } catch (err) {
      logWithTimestamp('Could not take error screenshot');
    }
    
    throw error;
  }
}

// Main function
async function main() {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('Starting human-like Imran Khan tweet retweet operation');
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
    
    // Retweet an Imran Khan tweet with human-like behavior
    await retweetImranKhanHuman(browser);
    
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
