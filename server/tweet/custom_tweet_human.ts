// custom_tweet_human.ts - Refactored to use shared utilities
import * as puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';

// Import shared utilities
import { 
  BehaviorType, 
  BehaviorPattern,
  getRandomBehavior,
  getBehaviorOrDefault 
} from '../shared/human-behavior';
import { 
  humanScroll, 
  humanTypeText, 
  simulateReading, 
  humanClick,
  humanDelay,
  humanHover
} from '../shared/human-actions';
import { 
  logWithTimestamp, 
  promiseWithTimeout, 
  saveScreenshot, 
  randomBetween
} from '../shared/utilities';
import { 
  TWITTER_SELECTORS,
  waitForAnySelector,
  clickWithSelectors,
  ensureOnTwitterHome
} from '../shared/selectors';
import { getBrowserConnection } from '../shared/browser-connection';

// Load environment variables from .env file
dotenv.config();

// Define tweet input interface
export interface TweetInput {
  message: string;
  hashtags?: string[];
  mentions?: string[];
}

// Input validation function
function validateTweetInput(input: TweetInput): void {
  if (!input.message || typeof input.message !== 'string') {
    throw new Error('message is required and must be a string');
  }
  
  if (input.message.length > 280) {
    throw new Error('message must be 280 characters or less');
  }
}

// Function to format tweet text with hashtags and mentions
function formatTweetText(input: TweetInput): string {
  let tweetText = input.message;
  
  // Add mentions at the beginning if provided
  if (input.mentions && input.mentions.length > 0) {
    const mentionText = input.mentions.map(mention => 
      mention.startsWith('@') ? mention : `@${mention}`
    ).join(' ');
    tweetText = `${mentionText} ${tweetText}`;
  }
  
  // Add hashtags at the end if provided
  if (input.hashtags && input.hashtags.length > 0) {
    const hashtagText = input.hashtags.map(tag => 
      tag.startsWith('#') ? tag : `#${tag}`
    ).join(' ');
    tweetText = `${tweetText} ${hashtagText}`;
  }
  
  return tweetText;
}

// Main function to post a custom tweet with human-like behavior
export async function postCustomTweetHuman(browser: puppeteer.Browser, tweetInput: TweetInput): Promise<void> {
  // Validate input
  validateTweetInput(tweetInput);
  
  // Get random behavior from shared utilities
  const behavior = getRandomBehavior();
  
  const tweetText = formatTweetText(tweetInput);
  logWithTimestamp(`Starting custom tweet posting with behavior: ${behavior.name}`, 'TWEET');
  logWithTimestamp(`Tweet content: "${tweetText}"`, 'TWEET');
  
  try {
    // Get all pages and use the first one
    const pages = await browser.pages();
    if (pages.length === 0) {
      logWithTimestamp('No browser pages found. Creating a new page...', 'TWEET');
      await browser.newPage();
      const newPages = await browser.pages();
      if (newPages.length === 0) {
        throw new Error('Failed to create a new page');
      }
    }
    
    const page = (await browser.pages())[0];
    logWithTimestamp(`Current page URL: ${await page.url()}`, 'TWEET');
    
    // Take a screenshot of initial state
    await saveScreenshot(page, 'custom_tweet_initial.png');
    
    // Step 1: Navigate to Twitter home using shared utility
    await ensureOnTwitterHome(page);
    
    logWithTimestamp('Successfully navigated to Twitter home page', 'TWEET');
    await saveScreenshot(page, 'twitter_home_custom.png');
    
    // Step 2: Behavior-specific pre-posting browsing using shared humanScroll
    logWithTimestamp(`Starting ${behavior.name} pre-posting behavior...`, 'TWEET');
    
    const preScrollTime = randomBetween(behavior.preScrollTime.min, behavior.preScrollTime.max);
    await humanDelay(behavior, { min: 1000, max: 2000 });
    
    // Use shared humanScroll with screenshot callback
    await humanScroll(page, preScrollTime, behavior, async (filename) => {
      await saveScreenshot(page, `pre_posting_${filename}`);
    });
    
    await saveScreenshot(page, 'after_browsing_behavior.png');
    
    // Behavior-specific pause before composing using shared utilities
    await simulateReading(behavior);
    
    // Step 3: Find compose box using shared selectors
    logWithTimestamp('Looking for tweet compose options...', 'TWEET');
    
    // First check if compose textbox is already visible
    let composeResult: { element: puppeteer.ElementHandle<Element>; selector: string } | null = null;
    try {
      composeResult = await waitForAnySelector(page, TWITTER_SELECTORS.COMPOSE_TEXTAREAS, 3000);
    } catch (error: any) {
      logWithTimestamp(`Compose textbox not immediately visible: ${error.message}`, 'TWEET');
    }

    // If no compose textbox visible, click compose button
    if (!composeResult) {
      logWithTimestamp('No compose textbox visible, looking for compose button...', 'TWEET');
      
      const composeButton = await waitForAnySelector(page, TWITTER_SELECTORS.COMPOSE_BUTTONS, 5000);
      if (composeButton) {
        await humanClick(page, composeButton.selector, behavior);
        await humanDelay(behavior);
        
        // Wait for compose textbox to appear
        composeResult = await waitForAnySelector(page, TWITTER_SELECTORS.COMPOSE_TEXTAREAS, 5000);
      }
    }
    
    if (!composeResult) {
      await saveScreenshot(page, 'compose_box_not_found_custom.png');
      throw new Error('Could not find tweet compose box with known selectors');
    }
    
    logWithTimestamp(`Found compose element with selector: ${composeResult.selector}`, 'TWEET');
    
    // Behavior-specific pause before typing
    await humanDelay(behavior);
    
    // Step 4: Type the tweet using shared humanTypeText
    await saveScreenshot(page, 'before_typing_custom.png');
    
    await humanClick(page, composeResult.selector, behavior);
    await humanDelay(behavior, { min: 200, max: 500 });
    
    // Use shared humanTypeText with behavior patterns
    await humanTypeText(page, composeResult.selector, tweetText, behavior);
    logWithTimestamp('Finished typing tweet text', 'TWEET');
    
    // Behavior-specific review time using shared simulateReading
    await simulateReading(behavior);
    
    await saveScreenshot(page, 'typed_custom_tweet.png');
    
    // Step 5: Find and click the tweet button using shared utilities
    logWithTimestamp('Looking for tweet button...', 'TWEET');
    
    // Additional review pause based on behavior
    if (behavior.reviewTime) {
      const reviewTime = randomBetween(behavior.reviewTime.min, behavior.reviewTime.max);
      logWithTimestamp(`Final review pause: ${reviewTime/1000}s`, 'TWEET');
      await new Promise(resolve => setTimeout(resolve, reviewTime));
    }
    
    await saveScreenshot(page, 'before_tweet_button_click_custom.png');
    
    // Find tweet button using shared selectors
    const tweetButtonResult = await waitForAnySelector(page, TWITTER_SELECTORS.TWEET_SUBMIT_BUTTONS, 10000);
    if (!tweetButtonResult) {
      await saveScreenshot(page, 'tweet_button_not_found_custom.png');
      throw new Error('Could not find tweet button with known selectors');
    }
    
    logWithTimestamp(`Found tweet button with selector: ${tweetButtonResult.selector}`, 'TWEET');
    
    // Use shared humanHover and humanClick for consistent behavior
    await humanHover(page, tweetButtonResult.selector, behavior);
    
    // Click with retry logic using shared utilities
    logWithTimestamp('Clicking tweet button to send the tweet...', 'TWEET');
    
    const maxAttempts = 3;
    let clickSuccess = false;
    
    for (let attempt = 1; attempt <= maxAttempts && !clickSuccess; attempt++) {
      logWithTimestamp(`Tweet button click attempt ${attempt}/${maxAttempts} (${behavior.name} behavior)`, 'TWEET');
      
      try {
        await humanClick(page, tweetButtonResult.selector, behavior);
        
        // Wait and check if compose box disappeared
        await humanDelay(behavior, { min: 1000, max: 2000 });
        
        const composeBoxStillVisible = await page.$(composeResult.selector).then(el => !!el).catch(() => false);
        if (!composeBoxStillVisible) {
          logWithTimestamp('Tweet button click successful (compose box gone)', 'TWEET');
          clickSuccess = true;
          break;
        }
        
        // Fallback click using shared clickWithSelectors
        if (!clickSuccess && attempt < maxAttempts) {
          logWithTimestamp('First click may not have worked, trying alternative method...', 'TWEET');
          await humanDelay(behavior, { min: 200, max: 400 });
          
          await clickWithSelectors(page, TWITTER_SELECTORS.TWEET_SUBMIT_BUTTONS);
          
          await humanDelay(behavior);
          
          const composeBoxGoneNow = await page.$(composeResult.selector).then(el => !!el).catch(() => false);
          if (!composeBoxGoneNow) {
            logWithTimestamp('Alternative click method successful', 'TWEET');
            clickSuccess = true;
            break;
          }
        }
      } catch (clickErr: any) {
        logWithTimestamp(`Error during click attempt ${attempt}: ${clickErr.message}`, 'TWEET');
      }
      
      if (!clickSuccess && attempt < maxAttempts) {
        await humanDelay(behavior);
      }
    }
    
    if (!clickSuccess) {
      logWithTimestamp('⚠️ Could not confirm successful tweet button click after multiple attempts', 'TWEET');
    } else {
      logWithTimestamp('✅ Tweet button clicked successfully', 'TWEET');
    }
    
    // Wait for tweet to be processed
    const postWaitTime = randomBetween(behavior.actionDelays.min * 2, behavior.actionDelays.max * 2);
    logWithTimestamp(`Waiting ${postWaitTime/1000} seconds for tweet to be processed...`, 'TWEET');
    await new Promise(resolve => setTimeout(resolve, postWaitTime));
    
    await saveScreenshot(page, 'after_custom_tweet_sent.png');
    
    // Step 6: Behavior-specific post-posting activity using shared humanScroll
    logWithTimestamp(`Starting ${behavior.name} post-posting behavior...`, 'TWEET');
    
    const postScrollTime = behavior.postScrollTime ? 
      randomBetween(behavior.postScrollTime.min, behavior.postScrollTime.max) :
      randomBetween(3000, 6000);
      
    await humanScroll(page, postScrollTime, behavior, async (filename) => {
      await saveScreenshot(page, `post_posting_${filename}`);
    });
    
    await saveScreenshot(page, 'final_custom_tweet_state.png');
    
    logWithTimestamp(`✅ Successfully posted custom tweet with ${behavior.name} behavior!`, 'TWEET');
    logWithTimestamp(`Tweet content: "${tweetText}"`, 'TWEET');
    
  } catch (error: any) {
    logWithTimestamp(`Error during custom tweet posting: ${error.message}`, 'TWEET');
    
    try {
      const page = (await browser.pages())[0];
      await saveScreenshot(page, 'custom_tweet_error.png');
    } catch (err) {
      logWithTimestamp('Could not take error screenshot', 'TWEET');
    }
    
    throw error;
  }
}

// Export everything needed by the unified server
export {
  connectToBrowser,
  getWebSocketUrl
} from '../shared/browser-connection';

// Export utilities that other modules might need
export {
  logWithTimestamp,
  saveScreenshot
} from '../shared/utilities';
