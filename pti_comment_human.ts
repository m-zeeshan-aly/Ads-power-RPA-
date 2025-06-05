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
  fs.appendFileSync(path.join(logsDir, 'pti_comment_human.log'), logMessage + '\n');
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

// Function to generate a human-like comment for PTI posts
function generatePtiComment(): string {
  // An array of possible comments to choose from randomly
  const possibleComments = [
    "Great work PTI! Keep up the good fight! #StandWithPTI 🇵🇰",
    "This is exactly what Pakistan needs right now. Well done PTI! #PTIForPakistan",
    "Full support for these policies! Pakistan will prosper with good leadership. #IStandWithPTI",
    "Thank you for speaking the truth. PTI has my support always! 🇵🇰❤️",
    "Keep fighting for Pakistan's future! We stand with you. #PTI #Pakistan",
    "This resonates with so many of us. Thank you for your dedication! #PTIStandStrong",
    "Looking forward to seeing more progressive policies like this! #SupportPTI 🇵🇰",
    "Much respect for taking a stand on this important issue. #Pakistan #PTI",
    "Your consistent leadership has been inspiring. Great work team PTI! 👏",
    "Pakistan needs more honest policies like this. Keep going PTI! 🇵🇰✌️",
    "This makes me hopeful for Pakistan's future. Thank you PTI! #StandWithPTI"
  ];
  
  // Select a random comment from the array
  return possibleComments[Math.floor(Math.random() * possibleComments.length)];
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
      await saveScreenshot(page, `human_scroll_${scrollCount}.png`);
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

// Main function to comment on a PTI post with human-like behavior
async function commentOnPtiPostHuman(browser: puppeteer.Browser): Promise<void> {
  logWithTimestamp('Starting human-like browsing and PTI comment operation');
  
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
    await saveScreenshot(page, 'pti_comment_human_initial.png');
    
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
      logWithTimestamp('Trying again with different strategy...');
      
      // Try again with a different navigation strategy
      await promiseWithTimeout(
        page.goto(twitterHomeUrl, { waitUntil: 'load' }),
        60000,
        'Second navigation attempt to Twitter home page timed out'
      );
    }
    
    logWithTimestamp('Successfully navigated to Twitter home page');
    await saveScreenshot(page, 'twitter_home_human.png');
    
    // Human-like: Wait a moment before starting to scroll
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
    
    // Step 2: Scroll down the home timeline like a human for at least 10 seconds
    logWithTimestamp('Starting to scroll the feed like a human user...');
    
    // Track if we find any PTI posts
    let foundPtiPost = false;
    
    // Scroll for at least 10 seconds while looking for PTI content
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
        await saveScreenshot(page, `scroll_feed_${scrollCount}.png`);
      }
      
      // Look for PTI posts while scrolling
      logWithTimestamp(`Scroll ${scrollCount}: Looking for PTI posts...`);
      
      try {
        // Check for PTI posts in the timeline
        const ptiPostFound = await page.evaluate(() => {
          const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
          return posts.some(post => 
            post.textContent && 
            (post.textContent.includes('PTI') || 
             post.textContent.includes('Pakistan Tehreek-e-Insaf') ||
             post.textContent.includes('PTIofficial'))
          );
        });
        
        if (ptiPostFound) {
          logWithTimestamp('Found a PTI post in the feed!');
          foundPtiPost = true;
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
    await saveScreenshot(page, 'after_feed_scrolling.png');
    
    // Track if we've successfully commented on a post
    let commentSuccess = false;
    
    // Step 3: If we found a PTI post, try to comment on it
    if (foundPtiPost) {
      logWithTimestamp('Found PTI post in feed, preparing to comment...');
      
      // Find posts that contain PTI
      const ptiPosts = await page.evaluate(() => {
        const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
        return posts
          .filter(post => 
            post.textContent && 
            (post.textContent.includes('PTI') || 
             post.textContent.includes('Pakistan Tehreek-e-Insaf') ||
             post.textContent.includes('PTIofficial'))
          )
          .map((_, index) => index);
      });
      
      if (ptiPosts.length > 0) {
        // Human-like: Don't select the first post (if multiple available)
        const postIndex = ptiPosts.length > 1 
          ? Math.floor(Math.random() * (ptiPosts.length - 1)) + 1 
          : 0;
        
        logWithTimestamp(`Found ${ptiPosts.length} PTI posts, selecting post #${postIndex + 1}`);
        
        // Human-like: Scroll to the selected post
        const scrollToPostSuccess = await page.evaluate((idx) => {
          const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
          const targetPosts = posts.filter(post => 
            post.textContent && 
            (post.textContent.includes('PTI') || 
             post.textContent.includes('Pakistan Tehreek-e-Insaf') ||
             post.textContent.includes('PTIofficial'))
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
          
          // Take screenshot before attempting to comment
          await saveScreenshot(page, 'before_feed_comment.png');
          
          // Find and click the reply button on the selected post
          const replySuccess = await page.evaluate((idx) => {
            const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
            const targetPosts = posts.filter(post => 
              post.textContent && 
              (post.textContent.includes('PTI') || 
               post.textContent.includes('Pakistan Tehreek-e-Insaf') ||
               post.textContent.includes('PTIofficial'))
            );
            
            if (idx >= targetPosts.length) idx = 0;
            
            const targetPost = targetPosts[idx];
            if (!targetPost) return false;
            
            // Find reply button in this post
            const replyButton = targetPost.querySelector('[data-testid="reply"]');
            if (replyButton && replyButton instanceof HTMLElement) {
              // Hover before clicking (human-like)
              replyButton.dispatchEvent(new MouseEvent('mouseover'));
              
              // Short delay before clicking
              setTimeout(() => {
                replyButton.click();
              }, 300);
              
              return true;
            }
            return false;
          }, postIndex);
          
          if (replySuccess) {
            // Human-like: Wait for reply dialog to appear
            await new Promise(resolve => setTimeout(resolve, 1500));
            await saveScreenshot(page, 'reply_dialog_opened.png');
            
            // Find and focus the reply textbox
            const textboxSelector = '[role="textbox"]';
            try {
              await page.waitForSelector(textboxSelector, { timeout: 5000 });
              
              // Generate a human-like comment
              const comment = generatePtiComment();
              logWithTimestamp(`Typing comment: "${comment}"`);
              
              // Type the comment with human-like typing behavior
              await humanTypeText(page, textboxSelector, comment);
              
              // Take screenshot after typing comment
              await saveScreenshot(page, 'comment_typed.png');
              
              // Human-like pause after typing before submitting
              await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1500) + 1000));
              
              // Submit the comment
              const replySubmitSelector = '[data-testid="tweetButton"]';
              await page.waitForSelector(replySubmitSelector, { timeout: 5000 });
              
              // Hover before clicking (human-like)
              await page.hover(replySubmitSelector);
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Click the reply button
              await page.click(replySubmitSelector);
              
              // Wait for comment to be processed
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Take screenshot after sending comment
              await saveScreenshot(page, 'after_feed_comment_sent.png');
              
              commentSuccess = true;
              logWithTimestamp('Successfully commented on PTI post from feed');
            } catch (error: any) {
              logWithTimestamp(`Error while trying to comment: ${error.message}`);
              await saveScreenshot(page, 'comment_error_state.png');
            }
          } else {
            logWithTimestamp('Could not click reply button on the post');
          }
        }
      }
    }
    
    // Step 4: If no post found in feed or commenting failed, search for PTI's profile
    if (!foundPtiPost || !commentSuccess) {
      logWithTimestamp(!foundPtiPost 
        ? 'No PTI posts found in feed, searching for PTI profile...' 
        : 'Comment action in feed failed, searching for PTI profile instead...');
      
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
        // Human-like: Type search query with variable speed
        const searchQuery = "PTI Official";
        logWithTimestamp(`Typing search query: "${searchQuery}"`);
        
        await humanTypeText(page, ':focus', searchQuery);
        
        // Human-like: Slight pause before pressing Enter
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 800) + 500));
        await page.keyboard.press('Enter');
        
        // Wait for search results
        await new Promise(resolve => setTimeout(resolve, 2500));
        await saveScreenshot(page, 'pti_search_results.png');
        
        // Human-like: Look over results for a moment
        await simulateReading();
        
        // Try to find PTI's profile in search results
        const profileSelectors = [
          'a[href="/PTIofficial"]',
          'div[data-testid="UserCell"] a[role="link"]',
          'div[data-testid="TypeaheadUser"]'
        ];
        
        for (const selector of profileSelectors) {
          try {
            const profileLink = await page.$(selector);
            if (profileLink) {
              logWithTimestamp(`Found PTI profile link with selector: ${selector}`);
              
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
        logWithTimestamp('Search unsuccessful, navigating directly to PTI profile');
        
        // Human-like: Slight pause before navigating
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
        
        // Navigate directly to PTI's profile
        const ptiProfileUrl = 'https://twitter.com/PTIofficial';
        
        try {
          await promiseWithTimeout(
            page.goto(ptiProfileUrl, { waitUntil: 'networkidle2' }),
            60000,
            'Navigation to PTI profile timed out'
          );
          profileFound = true;
        } catch (navError: any) {
          logWithTimestamp(`Profile navigation failed: ${navError.message}`);
          logWithTimestamp('Trying again with different wait strategy');
          
          try {
            await promiseWithTimeout(
              page.goto(ptiProfileUrl, { waitUntil: 'load' }),
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
        logWithTimestamp('Successfully navigated to PTI\'s profile');
        await saveScreenshot(page, 'pti_profile_page_human.png');
        
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
        logWithTimestamp('Scrolling down to find tweets to comment on...');
        
        // Scroll down with human-like behavior (multiple small scrolls)
        for (let i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
          await page.evaluate(() => {
            window.scrollBy(0, Math.floor(Math.random() * 300) + 200);
          });
          
          // Pause between scrolls
          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 800) + 400));
        }
        
        // Take screenshot after scrolling
        await saveScreenshot(page, 'before_profile_comment.png');
        
        // Human-like: Look at the tweets for a moment
        await simulateReading();
        
        // Find reply buttons
        const replyButtons = await page.$$('[data-testid="reply"]');
        
        if (replyButtons.length > 0) {
          // Human-like: Don't choose the first button if multiple available
          const buttonIndex = replyButtons.length > 2 ? 
            Math.floor(Math.random() * (replyButtons.length - 1)) + 1 : 0;
          
          logWithTimestamp(`Found ${replyButtons.length} reply buttons, selecting #${buttonIndex + 1}`);
          
          // Human-like: Hover, pause, then click
          await replyButtons[buttonIndex].hover();
          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 700) + 300));
          
          await replyButtons[buttonIndex].click();
          
          // Wait for reply dialog
          await new Promise(resolve => setTimeout(resolve, 2000));
          await saveScreenshot(page, 'profile_reply_dialog.png');
          
          // Find and focus the reply textbox
          const textboxSelector = '[role="textbox"]';
          try {
            await page.waitForSelector(textboxSelector, { timeout: 5000 });
            
            // Generate a human-like comment
            const comment = generatePtiComment();
            logWithTimestamp(`Typing comment: "${comment}"`);
            
            // Type the comment with human-like typing behavior
            await humanTypeText(page, textboxSelector, comment);
            
            // Take screenshot after typing
            await saveScreenshot(page, 'profile_comment_typed.png');
            
            // Human-like pause after typing before submitting
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1500) + 1000));
            
            // Submit the comment
            const replySubmitSelector = '[data-testid="tweetButton"]';
            await page.waitForSelector(replySubmitSelector, { timeout: 5000 });
            
            // Hover before clicking
            await page.hover(replySubmitSelector);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Click the reply button
            await page.click(replySubmitSelector);
            
            // Wait for comment to be processed
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Take screenshot after sending
            await saveScreenshot(page, 'after_profile_comment_sent.png');
            
            commentSuccess = true;
            logWithTimestamp('Successfully commented on PTI tweet from profile');
          } catch (error: any) {
            logWithTimestamp(`Error while trying to comment on profile tweet: ${error.message}`);
            await saveScreenshot(page, 'profile_comment_error.png');
          }
        } else {
          logWithTimestamp('No reply buttons found on profile tweets');
          throw new Error('Could not find any reply buttons on profile tweets');
        }
      }
    }
    
    // Step 5: Human-like - Return to home page
    if (commentSuccess) {
      logWithTimestamp('✅ Successfully commented on a tweet! Returning to home page...');
      
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
      await saveScreenshot(page, 'back_to_home_human.png');
      
      // Scroll a bit more on the home page
      logWithTimestamp('Scrolling home feed a bit more before finishing...');
      await humanScroll(page, 5000);
      
      logWithTimestamp('Successfully returned to home page and finished browsing');
    } else {
      logWithTimestamp('Failed to comment on any tweets');
      throw new Error('Could not comment on any tweets after multiple attempts');
    }
  } catch (error: any) {
    logWithTimestamp(`Error during human-like tweet commenting: ${error.message}`);
    
    // Take a screenshot of the error state
    try {
      const page = (await browser.pages())[0];
      await saveScreenshot(page, 'pti_comment_human_error.png');
    } catch (err) {
      logWithTimestamp('Could not take error screenshot');
    }
    
    throw error;
  }
}

// Main function
async function main() {
  logWithTimestamp('='.repeat(50));
  logWithTimestamp('Starting human-like PTI tweet comment operation');
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
    
    // Comment on a PTI tweet with human-like behavior
    await commentOnPtiPostHuman(browser);
    
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
