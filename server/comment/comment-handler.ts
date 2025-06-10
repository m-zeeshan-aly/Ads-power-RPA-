// server/comment/comment-handler.ts
import * as http from 'http';
import BrowserConnection from '../shared/browser-connection';
import { CommentInput, commentOnPostsHuman } from './generic_comment_human';

export async function handleCommentRequest(
  body: any,
  res: http.ServerResponse,
  sendSuccess: Function,
  sendError: Function
): Promise<void> {
  try {
    // Validate input
    const validationResult = validateCommentInput(body);
    if (!validationResult.isValid) {
      sendError(res, 400, validationResult.error);
      return;
    }

    const commentInput = validationResult.commentInput!;
    
    BrowserConnection.logWithTimestamp(`Processing comment request: ${JSON.stringify({
      username: commentInput.username,
      searchQuery: commentInput.searchQuery,
      commentCount: commentInput.commentCount || 1,
      hasCustomText: !!commentInput.commentText,
      hasCustomComments: commentInput.comments ? commentInput.comments.length : 0
    })}`, 'COMMENT');

    // Get browser connection
    const browser = await BrowserConnection.getBrowserConnection();
    
    // Perform comment action using existing functionality
    const startTime = Date.now();
    await commentOnPostsHuman(browser, commentInput);
    const duration = Date.now() - startTime;

    BrowserConnection.logWithTimestamp(`Comment operation completed successfully in ${duration}ms`, 'COMMENT');

    sendSuccess(res, {
      message: 'Comment operation completed successfully',
      input: {
        username: commentInput.username,
        searchQuery: commentInput.searchQuery,
        tweetContent: commentInput.tweetContent,
        profileUrl: commentInput.profileUrl,
        commentCount: commentInput.commentCount || 1,
        scrollTime: commentInput.scrollTime || 10000,
        searchInFeed: commentInput.searchInFeed !== false,
        visitProfile: commentInput.visitProfile !== false,
        hasCustomComments: commentInput.comments ? commentInput.comments.length : 0,
        hasCustomText: !!commentInput.commentText
      },
      duration: `${duration}ms`
    });

  } catch (error: any) {
    BrowserConnection.logWithTimestamp(`Comment operation failed: ${error.message}`, 'COMMENT');
    sendError(res, 500, 'Failed to complete comment operation', { error: error.message });
  }
}

function validateCommentInput(data: any): { isValid: boolean; error?: string; commentInput?: CommentInput } {
  // Check if at least one targeting parameter is provided
  if (!data.username && !data.searchQuery && !data.tweetContent && !data.profileUrl) {
    return { 
      isValid: false, 
      error: 'At least one targeting parameter must be provided (username, searchQuery, tweetContent, or profileUrl)' 
    };
  }

  const commentInput: CommentInput = {
    username: data.username,
    searchQuery: data.searchQuery,
    tweetContent: data.tweetContent,
    profileUrl: data.profileUrl,
    commentText: data.commentText,
    comments: data.comments,
    commentCount: data.commentCount,
    scrollTime: data.scrollTime,
    searchInFeed: data.searchInFeed,
    visitProfile: data.visitProfile
  };

  // Validate comment text
  if (data.commentText && typeof data.commentText !== 'string') {
    return { isValid: false, error: 'commentText must be a string' };
  }

  // Validate comments array
  if (data.comments && (!Array.isArray(data.comments) || !data.comments.every((c: any) => typeof c === 'string'))) {
    return { isValid: false, error: 'comments must be an array of strings' };
  }

  // Validate optional parameters
  if (data.commentCount !== undefined) {
    if (!Number.isInteger(data.commentCount) || data.commentCount < 1 || data.commentCount > 10) {
      return { isValid: false, error: 'commentCount must be an integer between 1 and 10' };
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

  return { isValid: true, commentInput };
}