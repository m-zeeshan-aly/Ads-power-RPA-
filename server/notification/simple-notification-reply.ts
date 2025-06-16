// simple-notification-reply.ts - Simple and concise notification reply
import * as puppeteer from 'puppeteer-core';
import { BehaviorType, getBehaviorOrDefault, BehaviorPattern } from '../shared/human-behavior';
import { 
  humanDelay, 
  humanClick, 
  humanTypeText, 
  humanScroll,
  humanNavigate 
} from '../shared/human-actions';
import { logWithTimestamp, saveScreenshot, cleanUsername } from '../shared/utilities';

export interface NotificationReplyInput {
  username: string;
  replyMessage: string;
  notificationContent?: string;
  behaviorType?: BehaviorType;
}

// Step 1: Navigate to notifications section
async function navigateToNotifications(page: puppeteer.Page, behavior: BehaviorPattern): Promise<void> {
  logWithTimestamp('Step 1: Navigating to notifications section...', 'REPLY');
  await humanNavigate(page, 'https://twitter.com/notifications', behavior);
  await humanDelay(undefined, { min: 3000, max: 5000 });
  await saveScreenshot(page, 'notifications_page.png', 'REPLY');
}

// Step 2: Find and match the notification
async function findAndMatchNotification(
  page: puppeteer.Page, 
  username: string, 
  notificationContent?: string
): Promise<puppeteer.ElementHandle | null> {
  logWithTimestamp(`Step 2: Finding notification from @${username}...`, 'REPLY');
  
  const cleanedUsername = cleanUsername(username);
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      // Get all notification elements
      const notifications = await page.$$('[data-testid="cellInnerDiv"]');
      logWithTimestamp(`Checking ${notifications.length} notifications...`, 'REPLY');
      
      for (const notification of notifications) {
        const text = await page.evaluate(el => el.textContent || '', notification);
        
        // Check if notification matches username
        const hasUsername = text.toLowerCase().includes(cleanedUsername.toLowerCase()) ||
                           text.toLowerCase().includes(`@${cleanedUsername.toLowerCase()}`);
        
        // Check content match if provided
        let hasContent = true;
        if (notificationContent) {
          hasContent = text.toLowerCase().includes(notificationContent.toLowerCase());
        }
        
        if (hasUsername && hasContent) {
          logWithTimestamp(`✅ Found matching notification from @${username}`, 'REPLY');
          return notification;
        }
      }
      
      // Scroll down to load more notifications
      if (attempts < maxAttempts - 1) {
        logWithTimestamp('Scrolling to load more notifications...', 'REPLY');
        await humanScroll(page, 3);
        await humanDelay(undefined, { min: 2000, max: 3000 });
      }
      
      attempts++;
    } catch (error) {
      attempts++;
    }
  }
  
  return null;
}

// Step 3: Click and open the notification
async function clickAndOpenNotification(
  page: puppeteer.Page, 
  notification: puppeteer.ElementHandle, 
  behavior: BehaviorPattern
): Promise<void> {
  logWithTimestamp('Step 3: Clicking and opening notification...', 'REPLY');
  
  // Scroll notification into view
  await page.evaluate(el => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, notification);
  
  await humanDelay(undefined, { min: 500, max: 1000 });
  
  // Click the notification
  await notification.click();
  await humanDelay(undefined, { min: 3000, max: 5000 });
  await saveScreenshot(page, 'notification_opened.png', 'REPLY');
}

// Step 4: Enter the reply
async function enterReply(page: puppeteer.Page, replyMessage: string, behavior: BehaviorPattern): Promise<void> {
  logWithTimestamp('Step 4: Entering reply message...', 'REPLY');
  
  // First, try to click reply button if it exists
  const replySelectors = [
    '[data-testid="reply"]',
    '[aria-label*="Reply"]',
    'button[aria-label*="Reply"]'
  ];
  
  let replyButtonClicked = false;
  for (const selector of replySelectors) {
    try {
      const replyButton = await page.$(selector);
      if (replyButton) {
        await humanClick(page, selector, behavior);
        await humanDelay(undefined, { min: 2000, max: 3000 });
        replyButtonClicked = true;
        break;
      }
    } catch (error) {
      continue;
    }
  }
  
  if (!replyButtonClicked) {
    logWithTimestamp('Reply button not found, notification might already be open for replies', 'REPLY');
  }
  
  // Find and type in text area
  const textAreaSelectors = [
    '[data-testid="tweetTextarea_0"]',
    '[role="textbox"]',
    'div[contenteditable="true"]',
    'textarea'
  ];
  
  let textAreaFound = false;
  for (const selector of textAreaSelectors) {
    try {
      const textArea = await page.$(selector);
      if (textArea) {
        logWithTimestamp(`Typing reply: "${replyMessage}"`, 'REPLY');
        await humanClick(page, selector, behavior);
        await humanDelay(undefined, { min: 500, max: 1000 });
        
        // Clear and type message
        await page.evaluate(sel => {
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
    throw new Error('Could not find text area for reply');
  }
}

// Step 5: Click post button
async function clickPostButton(page: puppeteer.Page, behavior: BehaviorPattern): Promise<void> {
  logWithTimestamp('Step 5: Clicking post button...', 'REPLY');
  
  // Wait for button to be ready
  await humanDelay(undefined, { min: 1000, max: 2000 });
  
  const postSelectors = [
    '[data-testid="tweetButton"]',
    '[data-testid="tweetButtonInline"]',
    'button[data-testid="tweetButton"]',
    '[role="button"][aria-label*="Tweet"]',
    '[role="button"][aria-label*="Reply"]'
  ];
  
  for (const selector of postSelectors) {
    try {
      const postButton = await page.$(selector);
      if (postButton) {
        // Check if button is enabled
        const isEnabled = await page.evaluate(sel => {
          const button = document.querySelector(sel) as HTMLButtonElement;
          return button && !button.disabled && !button.hasAttribute('disabled');
        }, selector);
        
        if (isEnabled) {
          logWithTimestamp('Clicking post button...', 'REPLY');
          await humanClick(page, selector, behavior);
          await humanDelay(undefined, { min: 3000, max: 5000 });
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

// Main function - follows the exact steps with human behavior
export async function replyToNotificationSimple(browser: puppeteer.Browser, input: NotificationReplyInput): Promise<void> {
  if (!input.username || !input.replyMessage) {
    throw new Error('Username and reply message are required');
  }
  
  if (input.replyMessage.length > 280) {
    throw new Error('Reply message must be 280 characters or less');
  }
  
  const behavior = getBehaviorOrDefault(input.behaviorType);
  logWithTimestamp(`Starting simple notification reply for @${input.username}`, 'REPLY');
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  try {
    // Step 1: Move to notifications section
    await navigateToNotifications(page, behavior);
    
    // Step 2: Find and match the notification
    const notification = await findAndMatchNotification(page, input.username, input.notificationContent);
    if (!notification) {
      throw new Error(`Notification from @${input.username} not found`);
    }
    
    // Step 3: Click and open that notification
    await clickAndOpenNotification(page, notification, behavior);
    
    // Step 4: Enter the reply
    await enterReply(page, input.replyMessage, behavior);
    
    // Step 5: Click post button so reply will be done
    await clickPostButton(page, behavior);
    
    logWithTimestamp(`✅ Successfully replied to @${input.username}'s notification`, 'REPLY');
    
  } catch (error: any) {
    logWithTimestamp(`❌ Simple notification reply failed: ${error.message}`, 'REPLY');
    await saveScreenshot(page, 'reply_error.png', 'REPLY');
    throw error;
  }
}
