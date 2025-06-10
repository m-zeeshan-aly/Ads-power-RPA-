// generic_comment_human.ts
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

// Define comment input interface
export interface CommentInput {
  // At least one of these must be provided
  username?: string;        // Target username (e.g., "ImranKhanPTI", "PTIofficial")
  searchQuery?: string;     // Search terms to find tweets (e.g., "Imran Khan", "PTI politics")
  tweetContent?: string;    // Specific content to look for in tweets
  profileUrl?: string;      // Direct profile URL to visit
  
  // Comment configuration
  comments?: string[];      // Custom comments to use (one will be selected randomly)
  commentText?: string;     // Specific comment to post (overrides random selection)
  
  // Optional parameters
  commentCount?: number;    // Number of tweets to comment on (default: 1)
  scrollTime?: number;      // Time to scroll in milliseconds (default: 10000)
  searchInFeed?: boolean;   // Whether to search in home feed first (default: true)
  visitProfile?: boolean;   // Whether to visit profile if feed search fails (default: true)
}

// Helper function to log with timestamps
function logWithTimestamp(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(path.join(logsDir, 'generic_comment_human.log'), logMessage + '\n');
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
export async function getWebSocketUrl(): Promise<string> {
  try {
    logWithTimestamp('Getting WebSocket URL from .env file...');
    
    // First try reading the .env file manually to ensure we get the latest value
    let wsEndpoint: string;
    try {
      const envContent = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8');
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
      throw new Error('WS_ENDPOINT not found in environment variables');
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

// Function to generate a comment based on input
function generateComment(input: CommentInput): string {
  // If specific comment text is provided, use it
  if (input.commentText) {
    return input.commentText;
  }
  
  // If custom comments array is provided, select randomly
  if (input.comments && input.comments.length > 0) {
    return input.comments[Math.floor(Math.random() * input.comments.length)];
  }
  
  // Default generic comments
  const defaultComments = [
    "Great post! Thanks for sharing this. 👍",
    "Very insightful content. Keep up the good work! 💯",
    "This is exactly what we need to see more of. Well said! 🔥",
    "Thank you for this important message. Much appreciated! ❤️",
    "Fully agree with this perspective. Great point! 👏",
    "This resonates with so many people. Thank you for speaking up! 💪",
    "Important information that everyone should know. Thanks! 📢",
    "Well articulated and timely. Keep up the excellent work! ⭐",
    "This is the kind of content that makes a difference. Respect! 🙌",
    "Thank you for consistently sharing valuable insights! 🎯"
  ];
  
  return defaultComments[Math.floor(Math.random() * defaultComments.length)];
}

// Function to simulate human-like reading pause
async function simulateReading(): Promise<void> {
  const readTime = Math.floor(Math.random() * 6000) + 2000;
  await new Promise(resolve => setTimeout(resolve, readTime));
}

// Function to simulate human typing with variable speed
async function humanTypeText(page: puppeteer.Page, selector: string, text: string): Promise<void> {
  await page.focus(selector);
  
  for (let i = 0; i < text.length; i++) {
    const typingSpeed = Math.floor(Math.random() * 200) + 50;
    await page.keyboard.type(text[i], { delay: typingSpeed });
    
    // Occasionally pause for longer as if thinking
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
  
  while (Date.now() - startTime < duration) {
    scrollCount++;
    
    const scrollAmount = Math.floor(Math.random() * 400) + 300;
    
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    
    if (scrollCount % (Math.random() > 0.5 ? 2 : 3) === 0) {
      await saveScreenshot(page, `human_scroll_${scrollCount}.png`);
    }
    
    const pauseTime = Math.floor(Math.random() * 1000) + 200;
    await new Promise(resolve => setTimeout(resolve, pauseTime));
    
    if (Math.random() < 0.25) {
      await simulateReading();
    }
  }
}

// Function to check if content matches search criteria
function contentMatches(content: string, input: CommentInput): boolean {
  if (!content) return false;
  
  const lowerContent = content.toLowerCase();
  
  // Check username match
  if (input.username) {
    const username = input.username.toLowerCase().replace('@', '');
    if (lowerContent.includes(username)) return true;
  }
  
  // Check search query match
  if (input.searchQuery) {
    const searchTerms = input.searchQuery.toLowerCase().split(' ');
    if (searchTerms.some(term => lowerContent.includes(term))) return true;
  }
  
  // Check tweet content match
  if (input.tweetContent) {
    const searchTerms = input.tweetContent.toLowerCase().split(' ');
    if (searchTerms.some(term => lowerContent.includes(term))) return true;
  }
  
  return false;
}

// Main function to comment on posts with human-like behavior
export async function commentOnPostsHuman(browser: puppeteer.Browser, input: CommentInput): Promise<void> {
  logWithTimestamp('Starting human-like browsing and comment operation');
  
  // Validate input
  if (!input.username && !input.searchQuery && !input.tweetContent && !input.profileUrl) {
    throw new Error('At least one of username, searchQuery, tweetContent, or profileUrl must be provided');
  }
  
  // Set defaults
  const commentCount = input.commentCount || 1;
  const scrollTime = input.scrollTime || 10000;
  const searchInFeed = input.searchInFeed !== false;
  const visitProfile = input.visitProfile !== false;
  
  try {
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
    
    await saveScreenshot(page, 'comment_initial.png');
    
    let commentsPosted = 0;
    let foundTargetPost = false;
    
    // Step 1: Search in home feed if enabled
    if (searchInFeed) {
      logWithTimestamp('Searching for target content in home feed...');
      
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
        await promiseWithTimeout(
          page.goto(twitterHomeUrl, { waitUntil: 'load' }),
          60000,
          'Second navigation attempt to Twitter home page timed out'
        );
      }
      
      logWithTimestamp('Successfully navigated to Twitter home page');
      await saveScreenshot(page, 'twitter_home.png');
      
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
      
      // Scroll and look for matching posts
      const scrollStartTime = Date.now();
      let scrollCount = 0;
      
      while (Date.now() - scrollStartTime < scrollTime && scrollCount < 8) {
        scrollCount++;
        
        const scrollAmount = Math.floor(Math.random() * 400) + 300;
        
        await page.evaluate((scrollDistance) => {
          window.scrollBy(0, scrollDistance);
        }, scrollAmount);
        
        if (scrollCount % 2 === 0) {
          await saveScreenshot(page, `scroll_feed_${scrollCount}.png`);
        }
        
        logWithTimestamp(`Scroll ${scrollCount}: Looking for target posts...`);
        
        try {
          const matchingPosts = await page.evaluate((criteria) => {
            const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
            return posts.filter(post => {
              if (!post.textContent) return false;
              const content = post.textContent.toLowerCase();
              
              // Check username match
              if (criteria.username) {
                const username = criteria.username.toLowerCase().replace('@', '');
                if (content.includes(username)) return true;
              }
              
              // Check search query match
              if (criteria.searchQuery) {
                const searchTerms = criteria.searchQuery.toLowerCase().split(' ');
                if (searchTerms.some(term => content.includes(term))) return true;
              }
              
              // Check tweet content match
              if (criteria.tweetContent) {
                const searchTerms = criteria.tweetContent.toLowerCase().split(' ');
                if (searchTerms.some(term => content.includes(term))) return true;
              }
              
              return false;
            }).length;
          }, input);
          
          if (matchingPosts > 0) {
            logWithTimestamp(`Found ${matchingPosts} matching posts in the feed!`);
            foundTargetPost = true;
            break;
          }
        } catch (err: any) {
          logWithTimestamp(`Error checking for posts: ${err.message}`);
        }
        
        const pauseTime = Math.floor(Math.random() * 800) + 200;
        await new Promise(resolve => setTimeout(resolve, pauseTime));
        
        if (Math.random() < 0.2) {
          logWithTimestamp('Pausing to read interesting content...');
          await simulateReading();
        }
      }
      
      // Try to comment on matching posts in feed
      if (foundTargetPost && commentsPosted < commentCount) {
        logWithTimestamp('Found matching posts in feed, attempting to comment...');
        
        const commentSuccess = await page.evaluate((criteria) => {
          const posts = Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
          const matchingPosts = posts.filter(post => {
            if (!post.textContent) return false;
            const content = post.textContent.toLowerCase();
            
            if (criteria.username) {
              const username = criteria.username.toLowerCase().replace('@', '');
              if (content.includes(username)) return true;
            }
            
            if (criteria.searchQuery) {
              const searchTerms = criteria.searchQuery.toLowerCase().split(' ');
              if (searchTerms.some(term => content.includes(term))) return true;
            }
            
            if (criteria.tweetContent) {
              const searchTerms = criteria.tweetContent.toLowerCase().split(' ');
              if (searchTerms.some(term => content.includes(term))) return true;
            }
            
            return false;
          });
          
          if (matchingPosts.length > 0) {
            const postIndex = matchingPosts.length > 1 
              ? Math.floor(Math.random() * (matchingPosts.length - 1)) + 1 
              : 0;
            
            const targetPost = matchingPosts[postIndex];
            targetPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Find reply button
            const replyButton = targetPost.querySelector('[data-testid="reply"]');
            if (replyButton && replyButton instanceof HTMLElement) {
              replyButton.dispatchEvent(new MouseEvent('mouseover'));
              setTimeout(() => {
                replyButton.click();
              }, 300);
              return true;
            }
          }
          return false;
        }, input);
        
        if (commentSuccess) {
          await simulateReading();
          await saveScreenshot(page, 'reply_dialog_opened.png');
          
          const textboxSelector = '[role="textbox"]';
          try {
            await page.waitForSelector(textboxSelector, { timeout: 5000 });
            
            const comment = generateComment(input);
            logWithTimestamp(`Typing comment: "${comment}"`);
            
            await humanTypeText(page, textboxSelector, comment);
            await saveScreenshot(page, 'comment_typed.png');
            
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1500) + 1000));
            
            const replySubmitSelector = '[data-testid="tweetButton"]';
            await page.waitForSelector(replySubmitSelector, { timeout: 5000 });
            
            await page.hover(replySubmitSelector);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            await page.click(replySubmitSelector);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            await saveScreenshot(page, 'after_feed_comment_sent.png');
            
            commentsPosted++;
            logWithTimestamp('Successfully commented on post from feed');
          } catch (error: any) {
            logWithTimestamp(`Error while trying to comment: ${error.message}`);
            await saveScreenshot(page, 'comment_error_state.png');
          }
        }
      }
    }
    
    // Step 2: Visit profile if needed and enabled
    if (commentsPosted < commentCount && visitProfile && (input.username || input.profileUrl)) {
      logWithTimestamp('Visiting profile to find more posts to comment on...');
      
      let profileUrl = input.profileUrl;
      if (!profileUrl && input.username) {
        const username = input.username.startsWith('@') ? input.username.substring(1) : input.username;
        profileUrl = `https://twitter.com/${username}`;
      }
      
      if (profileUrl) {
        logWithTimestamp(`Navigating to profile: ${profileUrl}`);
        
        try {
          await promiseWithTimeout(
            page.goto(profileUrl, { waitUntil: 'networkidle2' }),
            60000,
            'Navigation to profile timed out'
          );
        } catch (navError: any) {
          logWithTimestamp(`Profile navigation failed: ${navError.message}`);
          await promiseWithTimeout(
            page.goto(profileUrl, { waitUntil: 'load' }),
            60000,
            'Second navigation attempt to profile failed'
          );
        }
        
        logWithTimestamp('Successfully navigated to profile');
        await saveScreenshot(page, 'profile_page.png');
        
        await simulateReading();
        
        // Wait for tweets to load
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
          // Scroll down to find tweets
          for (let i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
            await page.evaluate(() => {
              window.scrollBy(0, Math.floor(Math.random() * 300) + 200);
            });
            
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 800) + 400));
          }
          
          await saveScreenshot(page, 'before_profile_comment.png');
          await simulateReading();
          
          // Comment on remaining posts needed
          while (commentsPosted < commentCount) {
            const replyButtons = await page.$$('[data-testid="reply"]');
            
            if (replyButtons.length > 0) {
              const buttonIndex = replyButtons.length > 2 ? 
                Math.floor(Math.random() * (replyButtons.length - 1)) + 1 : 0;
              
              logWithTimestamp(`Found ${replyButtons.length} reply buttons, selecting #${buttonIndex + 1}`);
              
              await replyButtons[buttonIndex].hover();
              await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 700) + 300));
              
              await replyButtons[buttonIndex].click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              await saveScreenshot(page, 'profile_reply_dialog.png');
              
              const textboxSelector = '[role="textbox"]';
              try {
                await page.waitForSelector(textboxSelector, { timeout: 5000 });
                
                const comment = generateComment(input);
                logWithTimestamp(`Typing comment: "${comment}"`);
                
                await humanTypeText(page, textboxSelector, comment);
                await saveScreenshot(page, 'profile_comment_typed.png');
                
                await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1500) + 1000));
                
                const replySubmitSelector = '[data-testid="tweetButton"]';
                await page.waitForSelector(replySubmitSelector, { timeout: 5000 });
                
                await page.hover(replySubmitSelector);
                await new Promise(resolve => setTimeout(resolve, 300));
                
                await page.click(replySubmitSelector);
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                await saveScreenshot(page, 'after_profile_comment_sent.png');
                
                commentsPosted++;
                logWithTimestamp(`Successfully commented on profile tweet (${commentsPosted}/${commentCount})`);
                
                // Break if we've posted enough comments
                if (commentsPosted >= commentCount) {
                  break;
                }
                
                // Wait before next comment
                await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 3000) + 2000));
              } catch (error: any) {
                logWithTimestamp(`Error while trying to comment on profile tweet: ${error.message}`);
                await saveScreenshot(page, 'profile_comment_error.png');
                break;
              }
            } else {
              logWithTimestamp('No more reply buttons found on profile tweets');
              break;
            }
          }
        }
      }
    }
    
    // Return to home page
    if (commentsPosted > 0) {
      logWithTimestamp(`✅ Successfully posted ${commentsPosted} comment(s)! Returning to home page...`);
      
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
      
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
        logWithTimestamp('Home button not found, navigating directly to home');
        await page.goto('https://twitter.com/home', { waitUntil: 'load' });
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      await saveScreenshot(page, 'back_to_home.png');
      
      logWithTimestamp('Successfully returned to home page');
    } else {
      logWithTimestamp('Failed to comment on any posts');
      throw new Error('Could not comment on any posts after attempting multiple strategies');
    }
  } catch (error: any) {
    logWithTimestamp(`Error during human-like comment operation: ${error.message}`);
    
    try {
      const page = (await browser.pages())[0];
      await saveScreenshot(page, 'comment_human_error.png');
    } catch (err) {
      logWithTimestamp('Could not take error screenshot');
    }
    
    throw error;
  }
}