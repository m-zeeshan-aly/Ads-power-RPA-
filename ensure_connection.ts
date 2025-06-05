import { chromium, Browser } from 'playwright';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Create a logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'debug_logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Helper function to log with timestamps
function logWithTimestamp(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(path.join(logsDir, 'connection.log'), logMessage + '\n');
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

// Function to ensure connection to browser using only the WebSocket URL from the env file
async function ensureConnection(): Promise<Browser> {
  logWithTimestamp('Ensuring connection to browser...');
  
  try {
    // Try reading the .env file manually to ensure we get the latest value
    let wsEndpoint: string;
    try {
      const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      const wsMatch = envContent.match(/WS_ENDPOINT=(.+)/);
      wsEndpoint = wsMatch ? wsMatch[1].trim() : '';
      if (wsEndpoint) {
        logWithTimestamp(`Found WebSocket endpoint in .env: ${wsEndpoint.substring(0, 30)}...`);
      }
    } catch (err: any) {
      logWithTimestamp(`Could not read .env file directly: ${err.message}`);
      wsEndpoint = process.env.WS_ENDPOINT || '';
    }
    
    if (!wsEndpoint || wsEndpoint.trim() === '') {
      logWithTimestamp('No WebSocket URL found in .env file. Exiting process.');
      process.exit(1);
    }
    
    logWithTimestamp(`Attempting to connect using WebSocket URL: ${wsEndpoint.substring(0, 30)}...`);
    
    // Try to connect with the WebSocket URL with extended timeout
    const browser = await promiseWithTimeout(
      chromium.connect({ 
        wsEndpoint,
        timeout: 30000 // Increase connection timeout
      }),
      30000, // 30 second timeout
      'Connection to browser timed out with the WebSocket URL'
    );
    
    // Test if the connection is actually working
    logWithTimestamp('Testing browser connection...');
    await browser.version();
    logWithTimestamp('Connection test successful');
    return browser;
  } catch (error: any) {
    logWithTimestamp(`Connection failed: ${error.message || 'Unknown error'}`);
    logWithTimestamp('Exiting process due to connection failure.');
    process.exit(1);
  }
}

// Export the connection function
module.exports = ensureConnection;
