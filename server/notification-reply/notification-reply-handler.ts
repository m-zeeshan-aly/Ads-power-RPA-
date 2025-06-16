// notification-reply-handler.ts - Handler for notification reply requests
import * as http from 'http';
import { getBrowserConnection } from '../shared/browser-connection';
import { 
  NotificationReplyInput, 
  replyToNotificationHuman, 
  validateNotificationReplyInput 
} from './notification_reply_human';

export async function handleNotificationReplyRequest(
  body: any,
  res: http.ServerResponse,
  sendSuccess: Function,
  sendError: Function
): Promise<void> {
  try {
    // Validate input
    const validationResult = validateNotificationReplyInput(body);
    if (!validationResult.isValid) {
      sendError(res, 400, validationResult.error);
      return;
    }

    const replyInput: NotificationReplyInput = {
      username: body.username,
      notificationContent: body.notificationContent,
      notificationText: body.notificationText,
      notificationId: body.notificationId,
      replyMessage: body.replyMessage,
      behaviorType: body.behaviorType,
      maxNotificationsToCheck: body.maxNotificationsToCheck,
      scrollAttempts: body.scrollAttempts,
      waitAfterReply: body.waitAfterReply
    };
    
    logWithTimestamp(`Processing notification reply request: ${JSON.stringify({
      username: replyInput.username,
      replyMessage: replyInput.replyMessage.substring(0, 50) + (replyInput.replyMessage.length > 50 ? '...' : ''),
      hasNotificationContent: !!replyInput.notificationContent,
      hasNotificationText: !!replyInput.notificationText,
      maxNotificationsToCheck: replyInput.maxNotificationsToCheck || 20,
      scrollAttempts: replyInput.scrollAttempts || 3
    })}`, 'REPLY');

    // Get browser connection
    const browser = await getBrowserConnection();
    
    // Perform notification reply action
    const startTime = Date.now();
    await replyToNotificationHuman(browser, replyInput);
    const duration = Date.now() - startTime;
    
    logWithTimestamp(`Notification reply operation completed successfully in ${duration}ms`, 'REPLY');

    sendSuccess(res, {
      message: 'Notification reply sent successfully',
      input: {
        targetUsername: replyInput.username,
        replyMessage: replyInput.replyMessage,
        notificationContent: replyInput.notificationContent,
        notificationText: replyInput.notificationText,
        maxNotificationsToCheck: replyInput.maxNotificationsToCheck || 20,
        scrollAttempts: replyInput.scrollAttempts || 3,
        behaviorType: replyInput.behaviorType || 'default'
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logWithTimestamp(`Notification reply operation failed: ${error.message}`, 'REPLY');
    sendError(res, 500, 'Failed to send notification reply', { error: error.message });
  }
}

function logWithTimestamp(message: string, service: string = 'REPLY'): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${service}] ${message}`);
}

function validateNotificationReplyRequest(data: any): { isValid: boolean; error?: string; replyInput?: NotificationReplyInput } {
  // Check required parameters
  if (!data.username || typeof data.username !== 'string') {
    return { 
      isValid: false, 
      error: 'username is required and must be a string' 
    };
  }

  if (!data.replyMessage || typeof data.replyMessage !== 'string') {
    return { 
      isValid: false, 
      error: 'replyMessage is required and must be a string' 
    };
  }

  const replyInput: NotificationReplyInput = {
    username: data.username,
    notificationContent: data.notificationContent,
    notificationText: data.notificationText,
    notificationId: data.notificationId,
    replyMessage: data.replyMessage,
    behaviorType: data.behaviorType,
    maxNotificationsToCheck: data.maxNotificationsToCheck,
    scrollAttempts: data.scrollAttempts,
    waitAfterReply: data.waitAfterReply
  };

  // Validate reply message length
  if (data.replyMessage.length > 280) {
    return { isValid: false, error: 'replyMessage must be 280 characters or less' };
  }

  // Validate optional parameters
  if (data.maxNotificationsToCheck !== undefined) {
    if (!Number.isInteger(data.maxNotificationsToCheck) || data.maxNotificationsToCheck < 1 || data.maxNotificationsToCheck > 50) {
      return { isValid: false, error: 'maxNotificationsToCheck must be an integer between 1 and 50' };
    }
  }

  if (data.scrollAttempts !== undefined) {
    if (!Number.isInteger(data.scrollAttempts) || data.scrollAttempts < 1 || data.scrollAttempts > 10) {
      return { isValid: false, error: 'scrollAttempts must be an integer between 1 and 10' };
    }
  }

  if (data.waitAfterReply !== undefined) {
    if (!Number.isInteger(data.waitAfterReply) || data.waitAfterReply < 1000 || data.waitAfterReply > 30000) {
      return { isValid: false, error: 'waitAfterReply must be an integer between 1000 and 30000 milliseconds' };
    }
  }

  // Validate that at least one identification method is provided
  if (!data.notificationContent && !data.notificationText && !data.notificationId) {
    // Username alone is acceptable, but warn that it might be less precise
    logWithTimestamp(`Warning: Only username provided for notification matching. This may match multiple notifications.`, 'REPLY');
  }

  return { isValid: true, replyInput };
}
