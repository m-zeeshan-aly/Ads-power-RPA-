// server/retweet/retweet-handler.ts
import * as http from 'http';
import BrowserConnection from '../shared/browser-connection';
import { RetweetInput, BehaviorType, retweetGenericTweetHuman } from './generic_retweet_human';

export async function handleRetweetRequest(
  body: any,
  res: http.ServerResponse,
  sendSuccess: Function,
  sendError: Function
): Promise<void> {
  try {
    // Validate input
    const validationResult = validateRetweetInput(body);
    if (!validationResult.isValid) {
      sendError(res, 400, validationResult.error);
      return;
    }

    const retweetInput = validationResult.retweetInput!;
    
    BrowserConnection.logWithTimestamp(`Processing retweet request: ${JSON.stringify({
      username: retweetInput.username,
      searchQuery: retweetInput.searchQuery,
      retweetCount: retweetInput.retweetCount || 1,
      behaviorType: retweetInput.behaviorType || 'social_engager'
    })}`, 'RETWEET');

    // Get browser connection
    const browser = await BrowserConnection.getBrowserConnection();
    
    // Perform retweet action using existing functionality
    const startTime = Date.now();
    await retweetGenericTweetHuman(browser, retweetInput);
    const duration = Date.now() - startTime;

    BrowserConnection.logWithTimestamp(`Retweet operation completed successfully in ${duration}ms`, 'RETWEET');

    sendSuccess(res, {
      message: 'Retweet operation completed successfully',
      input: {
        username: retweetInput.username,
        searchQuery: retweetInput.searchQuery,
        tweetContent: retweetInput.tweetContent,
        profileUrl: retweetInput.profileUrl,
        retweetCount: retweetInput.retweetCount || 1,
        scrollTime: retweetInput.scrollTime || 10000,
        searchInFeed: retweetInput.searchInFeed !== false,
        visitProfile: retweetInput.visitProfile !== false,
        behaviorType: retweetInput.behaviorType || BehaviorType.SOCIAL_ENGAGER
      },
      duration: `${duration}ms`
    });

  } catch (error: any) {
    BrowserConnection.logWithTimestamp(`Retweet operation failed: ${error.message}`, 'RETWEET');
    sendError(res, 500, 'Failed to complete retweet operation', { error: error.message });
  }
}

function validateRetweetInput(data: any): { isValid: boolean; error?: string; retweetInput?: RetweetInput } {
  // Check if at least one targeting parameter is provided
  if (!data.username && !data.searchQuery && !data.tweetContent && !data.profileUrl) {
    return { 
      isValid: false, 
      error: 'At least one targeting parameter must be provided (username, searchQuery, tweetContent, or profileUrl)' 
    };
  }

  const retweetInput: RetweetInput = {
    username: data.username,
    searchQuery: data.searchQuery,
    tweetContent: data.tweetContent,
    profileUrl: data.profileUrl,
    retweetCount: data.retweetCount,
    scrollTime: data.scrollTime,
    searchInFeed: data.searchInFeed,
    visitProfile: data.visitProfile,
    behaviorType: data.behaviorType
  };

  // Validate behavior type if provided
  if (data.behaviorType && !Object.values(BehaviorType).includes(data.behaviorType)) {
    return { 
      isValid: false, 
      error: `Invalid behaviorType. Must be one of: ${Object.values(BehaviorType).join(', ')}` 
    };
  }

  // Validate optional parameters
  if (data.retweetCount !== undefined) {
    if (!Number.isInteger(data.retweetCount) || data.retweetCount < 1 || data.retweetCount > 10) {
      return { isValid: false, error: 'retweetCount must be an integer between 1 and 10' };
    }
  }

  if (data.scrollTime !== undefined) {
    if (!Number.isInteger(data.scrollTime) || data.scrollTime < 1000 || data.scrollTime > 60000) {
      return { isValid: false, error: 'scrollTime must be an integer between 1000 and 60000 milliseconds' };
    }
  }

  if (data.searchInFeed !== undefined && typeof data.searchInFeed !== 'boolean') {
    return { isValid: false, error: 'searchInFeed must be a boolean' };
  }

  if (data.visitProfile !== undefined && typeof data.visitProfile !== 'boolean') {
    return { isValid: false, error: 'visitProfile must be a boolean' };
  }

  return { isValid: true, retweetInput };
}
