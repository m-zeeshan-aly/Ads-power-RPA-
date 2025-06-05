# Twitter Automation with Playwright and AdsPower

This script automates Twitter interactions using Playwright and AdsPower. It performs the following actions:

1. Searches for PTI-related tweets and retweets one
2. Visits Imran Khan's profile to like and reply to a tweet
3. Composes a new tweet with specific hashtags

## Prerequisites

- Node.js installed
- AdsPower browser installed and running
- Valid AdsPower WebSocket endpoint URL

## Installation

```bash
# Install dependencies
npm install
```

## Usage

1. Start your AdsPower browser instance
2. Obtain the WebSocket endpoint URL from AdsPower (See HOW_TO_GET_WEBSOCKET_URL.md for details)
3. Configure your WebSocket endpoint:

   **Option 1: Using .env file (Recommended)**
   
   Create or edit `.env` file in the project root with:
   
   ```
   WS_ENDPOINT=ws://127.0.0.1:PORT/devtools/browser/ID
   ```
   
   Then simply run:
   
   ```bash
   npm start
   # or
   npx ts-node index.ts
   ```

   **Option 2: Pass as command line argument**
   ```bash
   npx ts-node index.ts ws://127.0.0.1:44209/devtools/browser/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
   
   **Option 3: Set as environment variable**
   ```bash
   WS_ENDPOINT=ws://127.0.0.1:44209/devtools/browser/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx npx ts-node index.ts
   ```

## Output

- Console logs showing the progress of the automation
- Screenshot saved as `rpa_output.png` at the end of the automation

## Troubleshooting

- If the script fails to connect to AdsPower, ensure the WebSocket URL is correct and AdsPower is running
- If Twitter interactions fail, the script will try to continue with the next steps
- Check the error messages in the console for specific issues
