// notification_reply_human.ts - Reply to specific notifications with human-like behavior
import * as puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';

// Import shared utilities
import { 
  BehaviorType, 
  getBehaviorOrDefault, 
  BehaviorPattern
} from '../shared/human-behavior';
import { 
  humanScroll, 
  humanTypeText, 
  simulateReading, 
  humanClick,
  humanDelay,
  simulateThinking,
  humanHover,
  humanWaitForSelector,
  humanNavigate
} from '../shared/human-actions';
import { 
  logWithTimestamp, 
  promiseWithTimeout, 
  saveScreenshot, 
  randomBetween,
  cleanUsername,
  fuzzyMatchScore
} from '../shared/utilities';

// Load environment variables
dotenv.config();

// Define notification reply input interface
export interface NotificationReplyInput {
  // Target notification identification
  username: string;                    // Username of the person whose notification we want to reply to
  notificationContent?: string;        // Partial content to match the notification
  notificationText?: string;          // Alternative: exact notification text to match
  notificationId?: string;            // Alternative: specific notification ID if available
  
  // Reply content
  replyMessage: string;               // The actual reply message to send
  
  // Optional behavior parameters
  behaviorType?: BehaviorType;        // Human behavior pattern to use
  maxNotificationsToCheck?: number;   // Max notifications to scan through (default: 20)
  scrollAttempts?: number;           // How many times to scroll if not found (default: 3)
  waitAfterReply?: number;           // Wait time after sending reply in ms (default: 3000)
}

// Notification match result interface
interface NotificationMatch {
  element: puppeteer.ElementHandle;
  confidence: number;
  notificationText: string;
  username: string;
  content: string;
}

// Function to validate notification reply input
function validateNotificationReplyInput(input: NotificationReplyInput): { isValid: boolean; error?: string } {
  if (!input.username || typeof input.username !== 'string') {
    return {
      isValid: false,
      error: 'username is required and must be a string'
    };
  }
  
  if (!input.replyMessage || typeof input.replyMessage !== 'string') {
    return {
      isValid: false,
      error: 'replyMessage is required and must be a string'
    };
  }
  
  if (input.replyMessage.length > 280) {
    return {
      isValid: false,
      error: 'replyMessage must be 280 characters or less'
    };
  }
  
  if (input.maxNotificationsToCheck && (input.maxNotificationsToCheck < 1 || input.maxNotificationsToCheck > 50)) {
    return {
      isValid: false,
      error: 'maxNotificationsToCheck must be between 1 and 50'
    };
  }
  
  if (input.scrollAttempts && (input.scrollAttempts < 1 || input.scrollAttempts > 10)) {
    return {
      isValid: false,
      error: 'scrollAttempts must be between 1 and 10'
    };
  }
  
  return { isValid: true };
}

// Function to extract notification information for matching
async function extractNotificationInfo(page: puppeteer.Page, notificationElement: puppeteer.ElementHandle): Promise<{
  username: string;
  content: string;
  notificationText: string;
  isReply: boolean;
  isMention: boolean;
}> {
  try {
    const notificationInfo = await page.evaluate((element) => {
      const fullText = element.textContent?.trim() || '';
      
      // Extract username patterns
      let username = '';
      const usernameMatch = fullText.match(/@([a-zA-Z0-9_]+)/);
      if (usernameMatch) {
        username = usernameMatch[1];
      } else {
        // Try to find username from links
        const links = element.querySelectorAll('a[href*="/"]');
        for (const link of links) {
          const href = link.getAttribute('href') || '';
          if (href.match(/^\/[^\/]+$/) && !href.includes('/status/')) {
            username = href.replace('/', '');
            break;
          }
        }
      }
      
      // Determine if it's a reply or mention
      const lowerText = fullText.toLowerCase();
      const isReply = lowerText.includes('replied to') || 
                     lowerText.includes('replying to') || 
                     lowerText.includes('commented on');
      const isMention = lowerText.includes('mentioned you') || 
                       lowerText.includes('tagged you') ||
                       (lowerText.includes('@') && !isReply);
      
      // Extract meaningful content (the actual comment/mention text)
      let content = '';
      const lines = fullText.split('\n').filter(line => line.trim());
      for (const line of lines) {
        // Skip timestamp lines, navigation elements, etc.
        if (line.match(/^\d+[smhd]$/) || 
            line.includes('·') || 
            line.length < 5 ||
            line.includes('Replying to') ||
            line.includes('mentioned you')) {
          continue;
        }
        if (line.length > content.length && line.length > 10) {
          content = line;
        }
      }
      
      return {
        username: username || 'unknown',
        content: content || fullText,
        notificationText: fullText,
        isReply,
        isMention
      };
    }, notificationElement);
    
    return notificationInfo;
  } catch (error: any) {
    logWithTimestamp(`Error extracting notification info: ${error.message}`, 'REPLY');
    return {
      username: 'unknown',
      content: '',
      notificationText: '',
      isReply: false,
      isMention: false
    };
  }
}

// Function to find matching notification
async function findMatchingNotification(
  page: puppeteer.Page,
  targetUsername: string,
  notificationContent?: string,
  notificationText?: string,
  maxToCheck: number = 20
): Promise<NotificationMatch | null> {
  logWithTimestamp(`Searching for notification from @${targetUsername}`, 'REPLY');
  
  // Get notification elements
  const notificationSelectors = [
    '[data-testid="cellInnerDiv"]',
    '[role="article"]',
    'div[data-testid="cellInnerDiv"]',
    '[data-testid="primaryColumn"] div[data-testid="cellInnerDiv"]'
  ];
  
  let notificationElements: puppeteer.ElementHandle[] = [];
  
  for (const selector of notificationSelectors) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        notificationElements = elements;
        logWithTimestamp(`Found ${elements.length} notifications with selector: ${selector}`, 'REPLY');
        break;
      }
    } catch (error) {
      continue;
    }
  }
  
  if (notificationElements.length === 0) {
    logWithTimestamp('No notification elements found', 'REPLY');
    return null;
  }
  
  const candidates: NotificationMatch[] = [];
  const checkLimit = Math.min(notificationElements.length, maxToCheck);
  
  logWithTimestamp(`Checking ${checkLimit} notifications for matches`, 'REPLY');
  
  // Check each notification for matches
  for (let i = 0; i < checkLimit; i++) {
    const element = notificationElements[i];
    
    try {
      const notificationInfo = await extractNotificationInfo(page, element);
      
      logWithTimestamp(`Notification ${i + 1}: @${notificationInfo.username} - "${notificationInfo.content.substring(0, 50)}..."`, 'REPLY');
      
      // Calculate match confidence
      let confidence = 0;
      
      // Username match (most important)
      if (notificationInfo.username.toLowerCase() === targetUsername.toLowerCase()) {
        confidence += 50;
        logWithTimestamp(`✅ Username match found: @${notificationInfo.username}`, 'REPLY');
      } else if (notificationInfo.username.toLowerCase().includes(targetUsername.toLowerCase()) ||
                 targetUsername.toLowerCase().includes(notificationInfo.username.toLowerCase())) {
        confidence += 30;
        logWithTimestamp(`🔍 Partial username match: @${notificationInfo.username}`, 'REPLY');
      }
      
      // Content match (if provided)
      if (notificationContent) {
        const contentScore = fuzzyMatchScore(notificationContent.toLowerCase(), notificationInfo.content.toLowerCase());
        confidence += contentScore * 30;
        if (contentScore > 0.3) {
          logWithTimestamp(`🔍 Content match score: ${contentScore.toFixed(2)}`, 'REPLY');
        }
      }
      
      // Exact notification text match (if provided)
      if (notificationText) {
        const textScore = fuzzyMatchScore(notificationText.toLowerCase(), notificationInfo.notificationText.toLowerCase());
        confidence += textScore * 40;
        if (textScore > 0.3) {
          logWithTimestamp(`🔍 Notification text match score: ${textScore.toFixed(2)}`, 'REPLY');
        }
      }
      
      // Only consider notifications that are replies or mentions
      if (notificationInfo.isReply || notificationInfo.isMention) {
        confidence += 10;
      }
      
      // Add to candidates if confidence is reasonable
      if (confidence > 20) {
        candidates.push({
          element,
          confidence,
          notificationText: notificationInfo.notificationText,
          username: notificationInfo.username,
          content: notificationInfo.content
        });
        
        logWithTimestamp(`📋 Added candidate with confidence: ${confidence.toFixed(1)}`, 'REPLY');
      }
      
    } catch (error: any) {
      logWithTimestamp(`Error processing notification ${i + 1}: ${error.message}`, 'REPLY');
      continue;
    }
  }
  
  // Sort by confidence and return best match
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.confidence - a.confidence);
    const bestMatch = candidates[0];
    
    logWithTimestamp(`🎯 Best match found: @${bestMatch.username} (confidence: ${bestMatch.confidence.toFixed(1)})`, 'REPLY');
    logWithTimestamp(`📝 Content: "${bestMatch.content.substring(0, 100)}..."`, 'REPLY');
    
    return bestMatch;
  }
  
  logWithTimestamp(`❌ No matching notification found for @${targetUsername}`, 'REPLY');
  return null;
}

// Function to open notification and reply
async function openNotificationAndReply(
  page: puppeteer.Page,
  notificationMatch: NotificationMatch,
  replyMessage: string,
  behavior: BehaviorPattern
): Promise<boolean> {
  logWithTimestamp(`Opening notification from @${notificationMatch.username} to reply`, 'REPLY');
  
  try {
    // Scroll the notification into view
    await page.evaluate((element) => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, notificationMatch.element);
    
    await humanDelay(undefined, behavior.actionDelays);
    await saveScreenshot(page, 'notification_in_view.png', 'REPLY');
    
    // Human-like hover over the notification
    await humanHover(page, '', behavior);
    await humanDelay(undefined, { min: 500, max: 1000 });
    
    // Try to click on the notification to open it
    logWithTimestamp('Clicking on notification to open...', 'REPLY');
    
    const clickSuccess = await page.evaluate((element) => {
      try {
        // Look for clickable areas in the notification
        const clickableElements = [
          element.querySelector('a[href*="/status/"]'),
          element.querySelector('[role="button"]'),
          element.querySelector('[data-testid="reply"]'),
          element
        ];
        
        for (const clickable of clickableElements) {
          if (clickable && clickable instanceof HTMLElement) {
            clickable.click();
            return true;
          }
        }
        return false;
      } catch (error) {
        return false;
      }
    }, notificationMatch.element);
    
    if (!clickSuccess) {
      // Fallback: try clicking the element directly
      await notificationMatch.element.click();
    }
    
    logWithTimestamp('Clicked on notification, waiting for reply interface...', 'REPLY');
    await humanDelay(undefined, { min: 2000, max: 4000 });
    await saveScreenshot(page, 'notification_opened.png', 'REPLY');
    
    // Wait for reply interface to appear
    const replySelectors = [
      '[data-testid="reply"]',
      '[role="textbox"]',
      'div[contenteditable="true"]',
      'textarea',
      '[data-testid="tweetTextarea_0"]'
    ];
    
    let replyButtonFound = false;
    let replyButton: puppeteer.ElementHandle | null = null;
    
    // First, try to find and click the reply button
    for (const selector of ['[data-testid="reply"]', '[aria-label*="Reply"]', 'button[aria-label*="Reply"]']) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        replyButton = await page.$(selector);
        if (replyButton) {
          logWithTimestamp(`Found reply button with selector: ${selector}`, 'REPLY');
          
          await humanHover(page, selector, behavior);
          await humanDelay(undefined, { min: 300, max: 600 });
          
          await humanClick(page, selector, behavior);
          replyButtonFound = true;
          
          logWithTimestamp('Clicked reply button, waiting for text area...', 'REPLY');
          await humanDelay(undefined, { min: 2000, max: 3000 });
          await saveScreenshot(page, 'reply_dialog_opened.png', 'REPLY');
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!replyButtonFound) {
      logWithTimestamp('Reply button not found, notification might already be open for replies', 'REPLY');
    }
    
    // Now find the text area for typing the reply
    let textAreaFound = false;
    
    for (const selector of replySelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        const textArea = await page.$(selector);
        
        if (textArea) {
          logWithTimestamp(`Found reply text area with selector: ${selector}`, 'REPLY');
          
          // Human-like behavior: pause to think about the reply
          logWithTimestamp('Thinking about the reply message...', 'REPLY');
          await simulateThinking(behavior);
          
          // Click on text area to focus
          await humanClick(page, selector, behavior);
          await humanDelay(undefined, { min: 500, max: 1000 });
          
          // Clear any existing text and type the reply
          await page.evaluate((sel) => {
            const element = document.querySelector(sel) as HTMLElement;
            if (element) {
              if ('value' in element) {
                element.value = '';
              } else {
                element.textContent = '';
              }
              element.focus();
            }
          }, selector);
          
          logWithTimestamp(`Typing reply message: "${replyMessage}"`, 'REPLY');
          await humanTypeText(page, selector, replyMessage, behavior);
          
          await saveScreenshot(page, 'reply_typed.png', 'REPLY');
          textAreaFound = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!textAreaFound) {
      throw new Error('Could not find reply text area');
    }
    
    // Find and click the send/tweet button
    logWithTimestamp('Looking for send button...', 'REPLY');
    await humanDelay(undefined, { min: 1000, max: 2000 });
    
    const sendButtonSelectors = [
      '[data-testid="tweetButton"]',
      '[data-testid="tweetButtonInline"]',
      'button[data-testid="tweetButton"]',
      '[role="button"][aria-label*="Reply"]',
      '[role="button"][aria-label*="Tweet"]',
      'button[type="submit"]'
    ];
    
    let sendButtonFound = false;
    
    for (const selector of sendButtonSelectors) {
      try {
        const sendButton = await page.$(selector);
        if (sendButton) {
          // Check if button is enabled
          const isEnabled = await page.evaluate((sel) => {
            const button = document.querySelector(sel) as HTMLButtonElement;
            return button && !button.disabled && !button.hasAttribute('disabled');
          }, selector);
          
          if (isEnabled) {
            logWithTimestamp(`Found enabled send button with selector: ${selector}`, 'REPLY');
            
            // Human-like hover before clicking
            await humanHover(page, selector, behavior);
            await humanDelay(undefined, { min: 500, max: 1000 });
            
            // Click the send button
            await humanClick(page, selector, behavior);
            sendButtonFound = true;
            
            logWithTimestamp('✅ Reply sent successfully!', 'REPLY');
            await humanDelay(undefined, { min: 2000, max: 4000 });
            await saveScreenshot(page, 'reply_sent.png', 'REPLY');
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!sendButtonFound) {
      throw new Error('Could not find or click send button');
    }
    
    return true;
    
  } catch (error: any) {
    logWithTimestamp(`Error during reply process: ${error.message}`, 'REPLY');
    await saveScreenshot(page, 'reply_error.png', 'REPLY');
    throw error;
  }
}

// Main function to reply to notification with human-like behavior
export async function replyToNotificationHuman(browser: puppeteer.Browser, input: NotificationReplyInput): Promise<void> {
  logWithTimestamp('Starting human-like notification reply operation', 'REPLY');
  
  // Validate input
  const validation = validateNotificationReplyInput(input);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  // Set defaults and get behavior pattern
  const maxNotificationsToCheck = input.maxNotificationsToCheck || 20;
  const scrollAttempts = input.scrollAttempts || 3;
  const waitAfterReply = input.waitAfterReply || 3000;
  const behavior = getBehaviorOrDefault(input.behaviorType);
  
  logWithTimestamp(`Reply target: @${input.username}`, 'REPLY');
  logWithTimestamp(`Reply message: "${input.replyMessage}"`, 'REPLY');
  logWithTimestamp(`Using behavior pattern: ${behavior.name}`, 'REPLY');
  
  try {
    const pages = await browser.pages();
    if (pages.length === 0) {
      logWithTimestamp('No browser pages found. Creating a new page...', 'REPLY');
      await browser.newPage();
      const newPages = await browser.pages();
      if (newPages.length === 0) {
        throw new Error('Failed to create a new page');
      }
    }
    
    const page = pages[0];
    logWithTimestamp(`Current page URL: ${await page.url()}`, 'REPLY');
    
    await saveScreenshot(page, 'reply_initial.png', 'REPLY');
    
    // Navigate to Twitter notifications page in a human-like way
    logWithTimestamp('Navigating to notifications page...', 'REPLY');
    
    const notificationsUrl = 'https://x.com/notifications';
    await humanNavigate(page, notificationsUrl, behavior);
    
    logWithTimestamp('Successfully navigated to notifications page', 'REPLY');
    await saveScreenshot(page, 'notifications_page.png', 'REPLY');
    
    // Human-like behavior: pause to let page load and read
    logWithTimestamp('Reading notifications page...', 'REPLY');
    await simulateReading();
    await humanDelay(undefined, behavior.readingTime);
    
    // Try to find the target notification
    let notificationMatch: NotificationMatch | null = null;
    let scrollAttempt = 0;
    
    while (!notificationMatch && scrollAttempt < scrollAttempts) {
      scrollAttempt++;
      logWithTimestamp(`Search attempt ${scrollAttempt}/${scrollAttempts}`, 'REPLY');
      
      // Search for matching notification
      notificationMatch = await findMatchingNotification(
        page,
        input.username,
        input.notificationContent,
        input.notificationText,
        maxNotificationsToCheck
      );
      
      if (!notificationMatch && scrollAttempt < scrollAttempts) {
        logWithTimestamp('Target notification not found, scrolling to load more...', 'REPLY');
        
        // Human-like scrolling to load more notifications
        await humanScroll(page, randomBetween(3000, 6000), behavior);
        await humanDelay(undefined, behavior.readingTime);
        await saveScreenshot(page, `notifications_scroll_${scrollAttempt}.png`, 'REPLY');
        
        // Brief pause to let new notifications load
        await humanDelay(undefined, { min: 2000, max: 4000 });
      }
    }
    
    if (!notificationMatch) {
      throw new Error(`Could not find notification from @${input.username} after ${scrollAttempts} scroll attempts`);
    }
    
    // Reply to the found notification
    logWithTimestamp(`Found target notification from @${notificationMatch.username}`, 'REPLY');
    const replySuccess = await openNotificationAndReply(page, notificationMatch, input.replyMessage, behavior);
    
    if (!replySuccess) {
      throw new Error('Failed to send reply');
    }
    
    // Post-reply human behavior
    logWithTimestamp('Reply sent successfully! Taking a moment to observe...', 'REPLY');
    await humanDelay(undefined, { min: waitAfterReply, max: waitAfterReply + 2000 });
    
    // Optionally return to notifications page
    if (Math.random() < 0.7) { // 70% chance to return to notifications
      logWithTimestamp('Returning to notifications page...', 'REPLY');
      await humanNavigate(page, 'https://x.com/notifications', behavior);
      await saveScreenshot(page, 'back_to_notifications.png', 'REPLY');
    }
    
    logWithTimestamp('✅ Notification reply operation completed successfully!', 'REPLY');
    
  } catch (error: any) {
    logWithTimestamp(`Error during notification reply operation: ${error.message}`, 'REPLY');
    
    try {
      const page = (await browser.pages())[0];
      await saveScreenshot(page, 'notification_reply_error.png', 'REPLY');
    } catch (err) {
      logWithTimestamp('Could not take error screenshot', 'REPLY');
    }
    
    throw error;
  }
}

// Export everything needed
export {
  validateNotificationReplyInput,
  findMatchingNotification,
  openNotificationAndReply,
  extractNotificationInfo
};
