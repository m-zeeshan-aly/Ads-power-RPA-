# Like Imran Khan Tweet Script

This script automates the process of liking a tweet from Imran Khan's Twitter profile using Puppeteer with AdsPower browser.

## Overview

The script performs the following actions:
1. Connects to an AdsPower browser instance using a WebSocket URL
2. Navigates to Imran Khan's Twitter profile
3. Finds and likes his most recent tweet
4. Takes screenshots at various stages for debugging purposes

## Prerequisites

- Node.js installed
- AdsPower browser installed and running
- Valid AdsPower WebSocket endpoint URL

## Usage

1. Start your AdsPower browser instance
2. Obtain the WebSocket endpoint URL from AdsPower (See HOW_TO_GET_WEBSOCKET_URL.md for details)
3. Configure your WebSocket endpoint in a `.env` file:

   ```
   WS_ENDPOINT=ws://127.0.0.1:PORT/devtools/browser/ID
   ```
   
4. Run the script:

   ```bash
   npm run like
   # or
   npx ts-node like_imran_tweet.ts
   ```

## Output

- Console logs showing the progress of the automation
- Screenshots saved in the `debug_logs` directory:
  - `imran_like_initial.png`: Initial state before navigation
  - `imran_profile_page.png`: Imran Khan's profile page
  - `before_like_action.png`: Before clicking the like button
  - `after_like_action.png`: After clicking the like button
  - `like_error_state.png`: If an error occurs during the process

## Troubleshooting

- If the script fails to connect to AdsPower, ensure the WebSocket URL is correct and AdsPower is running
- Check the log files in the `debug_logs` directory for detailed error information
- Make sure your AdsPower profile is already logged into Twitter
