// shared/browser-connection.ts
import * as puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Shared browser connection instance
let globalBrowser: puppeteer.Browser | null = null;
let connectionPromise: Promise<puppeteer.Browser> | null = null;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../..', 'debug_logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logging utility
function logWithTimestamp(message: string, service: string = 'BROWSER'): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${service}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(path.join(logsDir, 'shared-browser.log'), logMessage + '\n');
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

// Get WebSocket URL from environment
export async function getWebSocketUrl(): Promise<string> {
  try {
    logWithTimestamp('Getting WebSocket URL from .env file...');
    
    let wsEndpoint: string;
    try {
      const envPath = path.join(__dirname, '../..', '.env');
      const envContent = fs.readFileSync(envPath, 'utf8');
      const wsMatch = envContent.match(/WS_ENDPOINT=(.+)/);
      wsEndpoint = wsMatch ? wsMatch[1].trim() : '';
      
      if (wsEndpoint) {
        logWithTimestamp(`Found WebSocket endpoint: ${wsEndpoint.substring(0, 30)}...`);
      }
    } catch (err: any) {
      logWithTimestamp(`Could not read .env file directly: ${err.message}`);
      wsEndpoint = process.env.WS_ENDPOINT || '';
    }
    
    if (!wsEndpoint || wsEndpoint.trim() === '') {
      throw new Error('No WebSocket URL found. Please add WS_ENDPOINT to the .env file.');
    }
    
    return wsEndpoint;
  } catch (error: any) {
    logWithTimestamp(`Error getting WebSocket URL: ${error.message}`);
    throw error;
  }
}

// Connect to browser with retry logic
export async function connectToBrowser(): Promise<puppeteer.Browser> {
  if (globalBrowser && globalBrowser.isConnected()) {
    logWithTimestamp('Using existing browser connection');
    return globalBrowser;
  }

  if (connectionPromise) {
    logWithTimestamp('Browser connection in progress, waiting...');
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      const wsEndpoint = await getWebSocketUrl();
      logWithTimestamp(`Attempting to connect to browser: ${wsEndpoint.substring(0, 30)}...`);
      
      const browser = await promiseWithTimeout(
        puppeteer.connect({
          browserWSEndpoint: wsEndpoint,
          defaultViewport: null
        }),
        30000, // 30 second timeout
        'Browser connection timed out'
      );
      
      // Test connection
      const version = await browser.version();
      logWithTimestamp(`Successfully connected to browser. Version: ${version}`);
      
      // Handle disconnection events
      browser.on('disconnected', () => {
        logWithTimestamp('Browser connection lost');
        globalBrowser = null;
        connectionPromise = null;
      });

      globalBrowser = browser;
      return browser;
    } catch (error: any) {
      logWithTimestamp(`Failed to connect to browser: ${error.message}`);
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

// Get browser connection (with automatic reconnection)
export async function getBrowserConnection(): Promise<puppeteer.Browser> {
  try {
    return await connectToBrowser();
  } catch (error: any) {
    logWithTimestamp(`Browser connection failed: ${error.message}`);
    // Reset connection state and retry once
    globalBrowser = null;
    connectionPromise = null;
    
    logWithTimestamp('Retrying browser connection...');
    return await connectToBrowser();
  }
}

// Check if browser is connected
export function isBrowserConnected(): boolean {
  return globalBrowser !== null && globalBrowser.isConnected();
}

// Disconnect browser (for cleanup)
export async function disconnectBrowser(): Promise<void> {
  if (globalBrowser) {
    try {
      await globalBrowser.disconnect();
      logWithTimestamp('Browser disconnected successfully');
    } catch (error: any) {
      logWithTimestamp(`Error disconnecting browser: ${error.message}`);
    } finally {
      globalBrowser = null;
      connectionPromise = null;
    }
  }
}

// Browser status for health checks
export function getBrowserStatus(): { connected: boolean; version?: string } {
  if (globalBrowser && globalBrowser.isConnected()) {
    return { connected: true };
  }
  return { connected: false };
}

// Save screenshot utility (shared across all services)
export async function saveScreenshot(page: puppeteer.Page, filename: string, service: string = 'SHARED'): Promise<void> {
  try {
    const filePath = path.join(logsDir, filename);
    const buffer = await page.screenshot();
    fs.writeFileSync(filePath, buffer);
    logWithTimestamp(`Screenshot saved: ${filename}`, service);
  } catch (error: any) {
    logWithTimestamp(`Failed to save screenshot (${filename}): ${error.message}`, service);
  }
}

export default {
  getWebSocketUrl,
  connectToBrowser,
  getBrowserConnection,
  isBrowserConnected,
  disconnectBrowser,
  getBrowserStatus,
  saveScreenshot,
  logWithTimestamp
};
