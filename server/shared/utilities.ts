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
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.substring(1)) : []; // Remove # symbol
}

// Function to extract mentions from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@[a-zA-Z0-9_]+/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(mention => mention.substring(1)) : []; // Remove @ symbol
}

// Function to validate URL format
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Function to clean username (remove @ if present)
export function cleanUsername(username: string): string {
  return username.startsWith('@') ? username.substring(1) : username;
}

// Function to format Twitter profile URL
export function formatTwitterProfileUrl(username: string): string {
  const cleanedUsername = cleanUsername(username);
  return `https://twitter.com/${cleanedUsername}`;
}

// Function to validate Twitter username format
export function isValidTwitterUsername(username: string): boolean {
  const cleanedUsername = cleanUsername(username);
  const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
  return usernameRegex.test(cleanedUsername);
}

// Function to truncate text to specified length
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

// Function to format file size
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Function to get memory usage info
export function getMemoryUsage(): { rss: string; heapUsed: string; heapTotal: string; external: string } {
  const usage = process.memoryUsage();
  return {
    rss: formatFileSize(usage.rss),
    heapUsed: formatFileSize(usage.heapUsed),
    heapTotal: formatFileSize(usage.heapTotal),
    external: formatFileSize(usage.external)
  };
}

// Function to create error response object
export function createErrorResponse(message: string, code?: string, details?: any): {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
} {
  return {
    success: false,
    error: message,
    ...(code && { code }),
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
}

// Function to create success response object
export function createSuccessResponse(data: any = {}, message?: string): {
  success: true;
  message?: string;
  data: any;
  timestamp: string;
} {
  return {
    success: true,
    ...(message && { message }),
    data,
    timestamp: new Date().toISOString()
  };
}

// Function to retry an operation with exponential backoff
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  serviceName: string = 'RETRY'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logWithTimestamp(`Attempt ${attempt}/${maxRetries}`, serviceName);
      return await operation();
    } catch (error: any) {
      lastError = error;
      logWithTimestamp(`Attempt ${attempt} failed: ${error.message}`, serviceName);
      
      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        logWithTimestamp(`Retrying in ${delayMs}ms...`, serviceName);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError!;
}
