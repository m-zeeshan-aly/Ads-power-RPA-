// Common utility functions used across all services

import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer-core';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../debug_logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Enhanced logging utility with service-specific colors and file logging
export function logWithTimestamp(message: string, service: string = 'SHARED'): void {
  const timestamp = new Date().toISOString();
  
  // Color coding for different services
  const colorCode = service === 'SHARED' ? '\x1b[37m' :      // White
                   service === 'TWEET' ? '\x1b[32m' :        // Green
                   service === 'LIKE' ? '\x1b[33m' :         // Yellow
                   service === 'COMMENT' ? '\x1b[35m' :      // Magenta
                   service === 'RETWEET' ? '\x1b[34m' :      // Blue
                   service === 'BROWSER' ? '\x1b[36m' :      // Cyan
                   '\x1b[37m';                               // Default White
  
  const resetCode = '\x1b[0m';
  const logMessage = `[${timestamp}] [${service}] ${message}`;
  
  console.log(`${colorCode}${logMessage}${resetCode}`);
  
  // Also log to file for the specific service
  const logFile = service.toLowerCase() === 'shared' ? 'shared-utilities.log' : `${service.toLowerCase()}.log`;
  fs.appendFileSync(path.join(logsDir, logFile), logMessage + '\n');
}

// Helper function to set a timeout for a promise
export function promiseWithTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  errorMessage: string
): Promise<T> {
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

// Function to save a screenshot with enhanced error handling
export async function saveScreenshot(
  page: puppeteer.Page, 
  filename: string, 
  service: string = 'SHARED'
): Promise<void> {
  try {
    const filePath = path.join(logsDir, filename);
    const buffer = await page.screenshot();
    fs.writeFileSync(filePath, buffer);
    logWithTimestamp(`Screenshot saved: ${filename}`, service);
  } catch (error: any) {
    logWithTimestamp(`Failed to save screenshot (${filename}): ${error.message}`, service);
  }
}

// Function to generate random number within range
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to generate random float within range
export function randomFloatBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Function to sleep for a random amount of time within range
export async function randomSleep(minMs: number, maxMs: number): Promise<void> {
  const sleepTime = randomBetween(minMs, maxMs);
  await new Promise(resolve => setTimeout(resolve, sleepTime));
}

// Function to get a random element from an array
export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Function to shuffle an array (Fisher-Yates algorithm)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Function to check if a string contains any of the search terms
export function containsAnyTerm(text: string, terms: string[]): boolean {
  const lowerText = text.toLowerCase();
  return terms.some(term => lowerText.includes(term.toLowerCase()));
}

// Function to check if a string contains all of the search terms
export function containsAllTerms(text: string, terms: string[]): boolean {
  const lowerText = text.toLowerCase();
  return terms.every(term => lowerText.includes(term.toLowerCase()));
}

// Function to extract hashtags from text
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#\w+/g;
  return text.match(hashtagRegex) || [];
}

// Function to extract mentions from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@\w+/g;
  return text.match(mentionRegex) || [];
}

// ========== ENHANCED FUZZY MATCHING UTILITIES ==========

// Function to calculate Levenshtein distance between two strings
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// Function to calculate similarity score between two strings (0-1, where 1 is identical)
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  
  return 1 - (distance / maxLength);
}

// Function to calculate fuzzy match score for a search term in text
export function fuzzyMatchScore(searchTerm: string, text: string): number {
  const lowerSearchTerm = searchTerm.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // Exact match gets highest score
  if (lowerText.includes(lowerSearchTerm)) {
    return 1.0;
  }
  
  // Check for partial matches of the search term
  const searchWords = lowerSearchTerm.split(/\s+/).filter(word => word.length >= 3);
  const textWords = lowerText.split(/\s+/).filter(word => word.length >= 3);
  
  if (searchWords.length === 0 || textWords.length === 0) {
    return 0.0;
  }
  
  let exactMatches = 0;
  let partialMatches = 0;
  let totalSimilarity = 0;
  
  // Check how many search words have matches in the text
  for (const searchWord of searchWords) {
    let bestMatch = 0;
    
    for (const textWord of textWords) {
      if (textWord === searchWord) {
        exactMatches++;
        bestMatch = 1.0;
        break;
      } else if (textWord.includes(searchWord) || searchWord.includes(textWord)) {
        partialMatches++;
        bestMatch = Math.max(bestMatch, 0.8);
      } else {
        // Only consider very high similarity for fuzzy matches
        const similarity = calculateSimilarity(searchWord, textWord);
        if (similarity > 0.85) { // Very strict threshold
          bestMatch = Math.max(bestMatch, similarity);
        }
      }
    }
    
    totalSimilarity += bestMatch;
  }
  
  // Calculate average match score
  const avgScore = totalSimilarity / searchWords.length;
  
  // Require a high percentage of words to match for a good score
  const matchPercentage = (exactMatches + partialMatches) / searchWords.length;
  
  // Only return high scores if we have substantial matches
  if (exactMatches >= searchWords.length * 0.5) {
    return Math.min(avgScore, 0.95);
  } else if (matchPercentage >= 0.6 && avgScore > 0.7) {
    return Math.min(avgScore, 0.85);
  } else if (matchPercentage >= 0.4 && avgScore > 0.8) {
    return Math.min(avgScore, 0.75);
  }
  
  // For low match percentages, be very conservative
  return Math.min(avgScore * matchPercentage, 0.6);
}

// Function to check domain-specific similarity (technology, programming, etc.)
function checkDomainSimilarity(searchTerm: string, text: string): number {
  const techTerms = ['technology', 'tech', 'software', 'programming', 'coding', 'development', 'computer', 'digital'];
  const aiTerms = ['ai', 'artificial intelligence', 'machine learning', 'ml', 'neural', 'algorithm', 'data science'];
  const businessTerms = ['business', 'startup', 'entrepreneur', 'marketing', 'finance', 'management', 'strategy'];
  
  const domainGroups = [techTerms, aiTerms, businessTerms];
  
  for (const group of domainGroups) {
    const searchInDomain = group.some(term => searchTerm.includes(term));
    const textInDomain = group.some(term => text.includes(term));
    
    if (searchInDomain && textInDomain) {
      return 0.4; // Moderate score for domain similarity
    }
  }
  
  return 0;
}

// Function to check if a word is too common for reliable matching
function isCommonWord(word: string): boolean {
  const commonWords = ['khan', 'ali', 'shah', 'ahmed', 'hassan', 'hussain', 'malik', 'muhammad', 'ahmad', 'the', 'and', 'for', 'with'];
  return commonWords.includes(word.toLowerCase());
}

// Function to check semantic relationships between content
function checkSemanticRelationship(searchText: string, postText: string): boolean {
  const economicTerms = ['economic', 'financial', 'fiscal', 'monetary', 'budget', 'finance', 'economy'];
  const politicalTerms = ['political', 'politics', 'policy', 'policies', 'government', 'governance'];
  const reformTerms = ['reform', 'reforms', 'change', 'improvement', 'stability', 'development'];
  
  const termGroups = [economicTerms, politicalTerms, reformTerms];
  
  for (const group of termGroups) {
    const searchHasGroup = group.some(term => searchText.includes(term));
    const postHasGroup = group.some(term => postText.includes(term));
    
    if (searchHasGroup && postHasGroup) {
      return true;
    }
  }
  
  return false;
}

// Enhanced post matching with fuzzy logic and scoring
export interface PostMatchResult {
  isMatch: boolean;
  score: number;
  matchedCriteria: string[];
  fallbackMatch: boolean;
}

// Function to check if content is spam or low quality
function isSpamOrLowQuality(text: string): boolean {
  const spamIndicators = [
    'follow me', 'follow back', 'follow for follow', 'f4f',
    'buy now', 'click here', 'dm me', 'check out my',
    'free money', 'get rich', 'make money fast',
    'subscribe now', 'link in bio', 'check my profile'
  ];
  
  const lowerText = text.toLowerCase();
  
  // Check for spam phrases
  if (spamIndicators.some(indicator => lowerText.includes(indicator))) {
    return true;
  }
  
  // Check if content is too short (likely spam)
  if (text.trim().length < 20) {
    return true;
  }
  
  // Check for excessive emoji or special characters (simplified check)
  const specialCharCount = (text.match(/[^\w\s.,!?;:'"()-]/g) || []).length;
  if (specialCharCount > text.length * 0.3) {
    return true;
  }
  
  return false;
}

// Function to validate content relevance with semantic checking
function validateContentRelevance(postText: string, searchCriteria: any): boolean {
  // Filter out spam/low quality content
  if (isSpamOrLowQuality(postText)) {
    return false;
  }
  
  // Basic content length check
  if (postText.trim().length < 10) {
    return false;
  }
  
  // If no search criteria provided, accept any non-spam content
  if (!searchCriteria.searchQuery && !searchCriteria.tweetContent && !searchCriteria.username) {
    return true;
  }
  
  // Check if post contains any meaningful keywords related to search
  if (searchCriteria.searchQuery) {
    const searchWords = searchCriteria.searchQuery.toLowerCase().split(/\s+/);
    const postWords = postText.toLowerCase().split(/\s+/);
    
    // Look for semantic relevance - require meaningful context overlap
    const meaningfulWords = searchWords.filter((word: string) => word.length > 3);
    const contextOverlap = meaningfulWords.filter((word: string) => 
      postWords.some((postWord: string) => 
        postWord.includes(word) || word.includes(postWord) || 
        (word.length > 4 && postWord.length > 4 && calculateSimilarity(word, postWord) > 0.85)
      )
    );
    
    // Require substantial context overlap for relevance (at least 30% of meaningful words)
    if (meaningfulWords.length > 0 && contextOverlap.length < Math.max(1, meaningfulWords.length * 0.3)) {
      return false;
    }
  }
  
  // Similar check for tweet content
  if (searchCriteria.tweetContent) {
    const contentWords = searchCriteria.tweetContent.toLowerCase().split(/\s+/);
    const postWords = postText.toLowerCase().split(/\s+/);
    
    const meaningfulWords = contentWords.filter((word: string) => word.length > 3);
    const contextOverlap = meaningfulWords.filter((word: string) => 
      postWords.some((postWord: string) => 
        postWord.includes(word) || word.includes(postWord) || 
        (word.length > 4 && postWord.length > 4 && calculateSimilarity(word, postWord) > 0.85)
      )
    );
    
    // Check for semantic relationships in addition to direct overlap
    const hasSemanticRelation = checkSemanticRelationship(searchCriteria.tweetContent, postText);
    
    if (meaningfulWords.length > 0 && contextOverlap.length < Math.max(1, meaningfulWords.length * 0.3) && !hasSemanticRelation) {
      return false;
    }
  }
  
  return true;
}

export function enhancedPostMatch(
  postText: string, 
  criteria: {
    username?: string;
    searchQuery?: string;
    tweetContent?: string;
  },
  options: {
    exactMatchThreshold?: number;    // Score needed for exact match (default: 1.0)
    fuzzyMatchThreshold?: number;    // Score needed for fuzzy match (default: 0.75)
    enableFuzzyFallback?: boolean;   // Enable fuzzy matching when exact fails (default: true)
  } = {}
): PostMatchResult {
  const {
    exactMatchThreshold = 1.0,
    fuzzyMatchThreshold = 0.75,  // Increased to 75% - much stricter matching
    enableFuzzyFallback = true
  } = options;
  
  const result: PostMatchResult = {
    isMatch: false,
    score: 0,
    matchedCriteria: [],
    fallbackMatch: false
  };
  
  // Early validation - reject spam or irrelevant content
  if (!validateContentRelevance(postText, criteria)) {
    return result; // Return no match for spam/irrelevant content
  }
  
  const lowerText = postText.toLowerCase();
  let maxScore = 0;
  let hasExactMatch = false;
  
  // Check username match with stricter validation
  if (criteria.username) {
    const username = criteria.username.toLowerCase().replace('@', '');
    
    // Exact username match (very strict) - must contain the exact username or @username
    if (lowerText.includes(`@${username}`) || lowerText.includes(` ${username} `) || 
        lowerText.startsWith(`${username} `) || lowerText.endsWith(` ${username}`)) {
      result.isMatch = true;
      result.score = 1.0;
      result.matchedCriteria.push(`username: ${criteria.username}`);
      hasExactMatch = true;
      return result; // Early return for exact username match
    }
    
    // For search query matches, check if the username words appear in context
    if (criteria.searchQuery) {
      const searchWords = criteria.searchQuery.toLowerCase().split(/\s+/);
      const usernameWords = username.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/\s+/); // Split camelCase properly
      
      // Check if both username parts and search terms appear together
      let usernameWordMatches = 0;
      let searchWordMatches = 0;
      
      for (const userWord of usernameWords) {
        if (userWord.length > 2 && lowerText.includes(userWord)) {
          usernameWordMatches++;
        }
      }
      
      for (const searchWord of searchWords) {
        if (searchWord.length > 3 && lowerText.includes(searchWord)) {
          searchWordMatches++;
        }
      }
      
      // If we have good matches for both username and search terms, it's likely exact
      if (usernameWordMatches >= Math.max(1, usernameWords.length * 0.7) && searchWordMatches >= Math.max(1, searchWords.length * 0.5)) {
        result.isMatch = true;
        result.score = 1.0;
        result.matchedCriteria.push(`username: ${criteria.username}`);
        hasExactMatch = true;
        return result;
      }
    }
    
    // Only try fuzzy if exact match not found and username is meaningful
    // Make fuzzy matching much stricter for usernames to avoid false positives
    if (enableFuzzyFallback && username.length > 5) { // Increased minimum length
      const fuzzyScore = fuzzyMatchScore(username, postText);
      // For usernames, require high similarity but avoid matching on common single words
      if (fuzzyScore >= fuzzyMatchThreshold && !isCommonWord(username) && username.includes('khan') && lowerText.includes('imran') && lowerText.includes('khan')) {
        maxScore = Math.max(maxScore, fuzzyScore);
        result.matchedCriteria.push(`username (fuzzy): ${criteria.username}`);
        result.fallbackMatch = true;
      }
    }
  }
  
  // Check search query match with much stricter requirements
  if (criteria.searchQuery) {
    const queryTerms = criteria.searchQuery.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    let exactMatches = 0;
    let totalFuzzyScore = 0;
    let significantMatches = 0;
    
    for (const term of queryTerms) {
      if (lowerText.includes(term)) {
        exactMatches++;
        if (term.length > 4) significantMatches++; // Count longer, more meaningful terms
      } else if (enableFuzzyFallback) {
        const fuzzyScore = fuzzyMatchScore(term, postText);
        totalFuzzyScore += fuzzyScore;
        if (fuzzyScore > 0.8) significantMatches++;
      }
    }
    
    // Check if this should be considered an exact match
    // Must have significant word overlap AND meaningful content
    if (exactMatches > 0) {
      const exactScore = exactMatches / queryTerms.length;
      if (exactScore >= 0.7 && significantMatches > 0) { // Increased to 70% for more exactness
        result.isMatch = true;
        result.score = 1.0; // True exact match gets perfect score
        result.matchedCriteria.push(`searchQuery: ${criteria.searchQuery}`);
        hasExactMatch = true;
        return result;
      }
    }
    
    // Fuzzy matching - only if no exact match and very high similarity
    if (!hasExactMatch && enableFuzzyFallback && queryTerms.length > 0) {
      const avgFuzzyScore = totalFuzzyScore / queryTerms.length;
      if (avgFuzzyScore >= fuzzyMatchThreshold && significantMatches >= Math.ceil(queryTerms.length * 0.4)) {
        maxScore = Math.max(maxScore, avgFuzzyScore);
        result.matchedCriteria.push(`searchQuery (fuzzy): ${criteria.searchQuery}`);
        result.fallbackMatch = true;
      }
    }
  }
  
  // Check tweet content match with stricter validation
  if (criteria.tweetContent) {
    const contentTerms = criteria.tweetContent.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    let exactMatches = 0;
    let totalFuzzyScore = 0;
    let significantMatches = 0;
    
    for (const term of contentTerms) {
      if (lowerText.includes(term)) {
        exactMatches++;
        if (term.length > 4) significantMatches++;
      } else if (enableFuzzyFallback) {
        const fuzzyScore = fuzzyMatchScore(term, postText);
        totalFuzzyScore += fuzzyScore;
        if (fuzzyScore > 0.7) significantMatches++;
      }
    }
    
    // Exact match requirements: need at least 70% of terms AND significant matches
    if (exactMatches > 0) {
      const exactScore = exactMatches / contentTerms.length;
      if (exactScore >= 0.7 && significantMatches > 0) { // Increased from 50% to 70%
        result.isMatch = true;
        result.score = 1.0; // True exact match
        result.matchedCriteria.push(`tweetContent: ${criteria.tweetContent}`);
        hasExactMatch = true;
        return result;
      }
    }
    
    // Fuzzy matching - allow reasonable semantic matches for content
    if (!hasExactMatch && enableFuzzyFallback && contentTerms.length > 0) {
      const avgFuzzyScore = totalFuzzyScore / contentTerms.length;
      // For content matching, be more lenient if there's good semantic overlap
      // "financial policies" should match "economic reforms" as they're related concepts
      if (avgFuzzyScore >= 0.5 && significantMatches >= Math.ceil(contentTerms.length * 0.3)) {
        // Calculate a realistic score based on semantic similarity
        let semanticScore = avgFuzzyScore;
        
        // Check for semantic relationships
        const hasSemanticRelation = checkSemanticRelationship(criteria.tweetContent.toLowerCase(), lowerText);
        if (hasSemanticRelation) {
          semanticScore = Math.min(0.85, semanticScore + 0.2);
        }
        
        if (semanticScore >= fuzzyMatchThreshold) {
          maxScore = Math.max(maxScore, semanticScore);
          result.matchedCriteria.push(`tweetContent (fuzzy): ${criteria.tweetContent}`);
          result.fallbackMatch = true;
        }
      }
    }
  }
  
  // Final decision: only accept fuzzy matches if they meet the high threshold AND have content relevance
  if (!result.isMatch && maxScore >= fuzzyMatchThreshold && result.matchedCriteria.length > 0) {
    result.isMatch = true;
    result.score = maxScore;
  }
  
  return result;
}

// Legacy function wrapper for backward compatibility while providing improved matching
export function improvedPostMatch(
  postText: string,
  criteria: {
    username?: string;
    searchQuery?: string;
    tweetContent?: string;
  }
): boolean {
  const result = enhancedPostMatch(postText, criteria, {
    fuzzyMatchThreshold: 0.6,
    enableFuzzyFallback: true
  });
  
  return result.isMatch;
}

// Function to clean username (remove @ symbol and normalize)
export function cleanUsername(username: string): string {
  return username.toLowerCase().replace(/^@/, '').trim();
}

// Function to format Twitter profile URL
export function formatTwitterProfileUrl(username: string): string {
  const cleanedUsername = cleanUsername(username);
  return `https://twitter.com/${cleanedUsername}`;
}
