// notification-reply.ts - Simple notification reply functionality
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
import { 
  TWITTER_SELECTORS,
  waitForAnySelector,
  clickWithSelectors,
  ensureOnTwitterHome
} from '../shared/selectors';

// Load environment variables
dotenv.config();

// Simple notification reply input interface
export interface NotificationReplyInput {
  username: string;
  replyMessage: string;
  notificationContent?: string;
  behaviorType?: BehaviorType;
  maxNotificationsToCheck?: number;
  scrollAttempts?: number;
}

// Validate input
function validateInput(input: NotificationReplyInput): void {
  if (!input.username || typeof input.username !== 'string') {
    throw new Error('Username is required and must be a string');
  }
  if (!input.replyMessage || typeof input.replyMessage !== 'string') {
    throw new Error('Reply message is required and must be a string');
  }
  if (input.replyMessage.length > 280) {
    throw new Error('Reply message must be 280 characters or less');
  }
}

// Navigate to notifications page
async function navigateToNotifications(page: puppeteer.Page, behavior: BehaviorPattern): Promise<void> {
  logWithTimestamp('Navigating to notifications page...', 'REPLY');
  
  try {
    // Go to notifications page
    await humanNavigate(page, 'https://twitter.com/notifications', behavior);
    await humanDelay(undefined, { min: 2000, max: 4000 });
    
    // Wait for notifications to load
    await humanWaitForSelector(page, '[data-testid="cellInnerDiv"]', { timeout: 10000 });
    await saveScreenshot(page, 'notifications_page.png', 'REPLY');
    
    logWithTimestamp('Successfully navigated to notifications page', 'REPLY');
  } catch (error: any) {
    throw new Error(`Failed to navigate to notifications: ${error.message}`);
  }
}

// Find notification by username and content
async function findNotification(
  page: puppeteer.Page, 
  username: string, 
  notificationContent?: string,
  maxNotifications: number = 20,
  scrollAttempts: number = 3
): Promise<puppeteer.ElementHandle | null> {
  logWithTimestamp(`Looking for notification from @${username}...`, 'REPLY');
  
  const cleanedUsername = cleanUsername(username);
  let attempts = 0;
  
  while (attempts < scrollAttempts) {
    try {
      // Get all notification elements
      const notifications = await page.$$('[data-testid="cellInnerDiv"]');
      logWithTimestamp(`Found ${notifications.length} notifications to check`, 'REPLY');
      
      // Check each notification
      for (let i = 0; i < Math.min(notifications.length, maxNotifications); i++) {
        const notification = notifications[i];
        
        try {
          // Get notification text
          const notificationText = await page.evaluate((el) => {
            return el.textContent || '';
          }, notification);
          
          // Check if notification matches username
          const hasUsername = notificationText.toLowerCase().includes(cleanedUsername.toLowerCase()) ||
                             notificationText.toLowerCase().includes(`@${cleanedUsername.toLowerCase()}`);
          
          // Check content match if provided
          let hasContent = true;
          if (notificationContent) {
            hasContent = notificationText.toLowerCase().includes(notificationContent.toLowerCase());
          }
          
          if (hasUsername && hasContent) {
            logWithTimestamp(`✅ Found matching notification from @${username}`, 'REPLY');
            await saveScreenshot(page, 'notification_found.png', 'REPLY');
            return notification;
          }
        } catch (error) {
          continue; // Skip this notification and continue
        }
      }
      
      // Scroll down to load more notifications
      if (attempts < scrollAttempts - 1) {
        logWithTimestamp(`Scrolling to load more notifications (attempt ${attempts + 1}/${scrollAttempts})`, 'REPLY');
        await humanScroll(page, 3);
        await humanDelay(undefined, { min: 2000, max: 3000 });
      }
      
      attempts++;
    } catch (error) {
      attempts++;
      continue;
    }
  }
  
  logWithTimestamp(`❌ Could not find notification from @${username}`, 'REPLY');
  return null;
}

// Click on notification to open it
async function openNotification(page: puppeteer.Page, notification: puppeteer.ElementHandle, behavior: BehaviorPattern): Promise<void> {
  logWithTimestamp('Opening notification...', 'REPLY');
  
  try {
    // Scroll notification into view
    await page.evaluate((el) => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, notification);
    
    await humanDelay(undefined, { min: 500, max: 1000 });
    
    // Click on the notification
    await notification.click();
    await humanDelay(undefined, { min: 2000, max: 4000 });
    
    await saveScreenshot(page, 'notification_opened.png', 'REPLY');
    logWithTimestamp('Notification opened successfully', 'REPLY');
    
  } catch (error: any) {
    throw new Error(`Failed to open notification: ${error.message}`);
  }
}

// Click reply button
async function clickReplyButton(page: puppeteer.Page, behavior: BehaviorPattern): Promise<void> {
  logWithTimestamp('Looking for reply button...', 'REPLY');
  
  const replySelectors = [
    '[data-testid="reply"]',
    '[aria-label*="Reply"]',
    'button[aria-label*="Reply"]',
    '[role="button"][aria-label*="Reply"]'
  ];
  
  for (const selector of replySelectors) {
    try {
      await humanWaitForSelector(page, selector, { timeout: 3000 });
      const replyButton = await page.$(selector);
      
      if (replyButton) {
        logWithTimestamp(`Found reply button: ${selector}`, 'REPLY');
        await humanClick(page, selector, behavior);
        await humanDelay(undefined, { min: 2000, max: 3000 });
        await saveScreenshot(page, 'reply_button_clicked.png', 'REPLY');
        return;
      }
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Could not find reply button');
}

// Type reply message
async function typeReplyMessage(page: puppeteer.Page, replyMessage: string, behavior: BehaviorPattern): Promise<void> {
  logWithTimestamp(`Typing reply message: "${replyMessage}"`, 'REPLY');
  
  const textAreaSelectors = [
    '[data-testid="tweetTextarea_0"]',
    '[role="textbox"]',
    'div[contenteditable="true"]',
    'textarea'
  ];
  
  for (const selector of textAreaSelectors) {
    try {
      await humanWaitForSelector(page, selector, { timeout: 5000 });
      const textArea = await page.$(selector);
      
      if (textArea) {
        logWithTimestamp(`Found text area: ${selector}`, 'REPLY');
        
        // Click to focus
        await humanClick(page, selector, behavior);
        await humanDelay(undefined, { min: 500, max: 1000 });
        
        // Clear existing text
        await page.evaluate((sel) => {
          const element = document.querySelector(sel) as HTMLElement;
          if (element) {
            if ('value' in element) {
              (element as any).value = '';
            } else {
              element.textContent = '';
            }
            element.focus();
          }
        }, selector);
        
        // Type the message
        await humanTypeText(page, selector, replyMessage, behavior);
        await saveScreenshot(page, 'reply_typed.png', 'REPLY');
        return;
      }
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Could not find text area for reply');
}

// Click post/tweet button
async function clickPostButton(page: puppeteer.Page, behavior: BehaviorPattern): Promise<void> {
  logWithTimestamp('Looking for post button...', 'REPLY');
  
  const postSelectors = [
    '[data-testid="tweetButton"]',
    '[data-testid="tweetButtonInline"]',
    'button[data-testid="tweetButton"]',
    '[role="button"][aria-label*="Tweet"]',
    '[role="button"][aria-label*="Reply"]'
  ];
  
  // Wait a moment for button to become enabled
  await humanDelay(undefined, { min: 1000, max: 2000 });
  
  for (const selector of postSelectors) {
    try {
      const postButton = await page.$(selector);
      
      if (postButton) {
        // Check if button is enabled
        const isEnabled = await page.evaluate((sel) => {
          const button = document.querySelector(sel) as HTMLButtonElement;
          return button && !button.disabled && !button.hasAttribute('disabled');
        }, selector);
        
        if (isEnabled) {
          logWithTimestamp(`Found enabled post button: ${selector}`, 'REPLY');
          await humanClick(page, selector, behavior);
          await humanDelay(undefined, { min: 2000, max: 4000 });
          await saveScreenshot(page, 'reply_posted.png', 'REPLY');
          return;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Could not find or click post button');
}

// Main function to reply to notification
export async function replyToNotification(browser: puppeteer.Browser, input: NotificationReplyInput): Promise<void> {
  validateInput(input);
  
  const behavior = getBehaviorOrDefault(input.behaviorType);
  const maxNotifications = input.maxNotificationsToCheck || 20;
  const scrollAttempts = input.scrollAttempts || 3;
  
  logWithTimestamp(`Starting notification reply process for @${input.username}`, 'REPLY');
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  try {
    // Step 1: Navigate to notifications
    await navigateToNotifications(page, behavior);
    
    // Step 2: Find the notification
    const notification = await findNotification(
      page, 
      input.username, 
      input.notificationContent, 
      maxNotifications, 
      scrollAttempts
    );
    
    if (!notification) {
      throw new Error(`Notification from @${input.username} not found`);
    }
    
    // Step 3: Open the notification
    await openNotification(page, notification, behavior);
    
    // Step 4: Click reply button
    await clickReplyButton(page, behavior);
    
    // Step 5: Type reply message
    await typeReplyMessage(page, input.replyMessage, behavior);
    
    // Step 6: Post the reply
    await clickPostButton(page, behavior);
    
    logWithTimestamp(`✅ Successfully replied to @${input.username}'s notification`, 'REPLY');
    
  } catch (error: any) {
    logWithTimestamp(`❌ Failed to reply to notification: ${error.message}`, 'REPLY');
    await saveScreenshot(page, 'reply_error.png', 'REPLY');
    throw error;
  }
}
