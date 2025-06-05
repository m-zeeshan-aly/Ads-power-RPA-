# PTI Comment & Imran Khan Retweet Script

This script automates the following actions on Twitter:
1. Likes a tweet from the PTI official account
2. Comments on a PTI tweet
3. Retweets a tweet from Imran Khan's account

## Prerequisites

1. AdsPower browser must be installed and running
2. A `.env` file with `WS_ENDPOINT` variable set to the WebSocket URL for your AdsPower profile
3. Node.js and npm installed
4. Your AdsPower browser profile must be logged into Twitter

## How to Get WebSocket URL

1. Open AdsPower and launch your browser profile
2. Use one of these methods:
   - Run the `refresh_ws_url.sh` script to automatically update the `.env` file
   - Manually copy the WebSocket URL from AdsPower UI and update the `.env` file
   - See `HOW_TO_GET_WEBSOCKET_URL.md` for detailed instructions

## Installation

```bash
npm install
```

## Usage

```bash
npm run pti-action
```

or directly:

```bash
npx ts-node pti_comment_retweet.ts
```

## What This Script Does

1. Connects to an existing AdsPower browser session using Puppeteer
2. Navigates to the PTI official Twitter account (@PTIofficial)
3. Likes the first tweet on the profile
4. Comments on the same tweet with a supportive message
5. Navigates to Imran Khan's profile (@ImranKhanPTI)
6. Retweets the first tweet on Imran Khan's profile
7. Takes screenshots at each step for debugging purposes

## Troubleshooting

- Check the logs in the `debug_logs/pti_action.log` file
- Review the screenshots in the `debug_logs` directory
- Make sure your AdsPower profile is logged into Twitter
- Verify the WebSocket URL is correct and up to date in your `.env` file

## Notes

- This script uses only Puppeteer (not Playwright) as requested
- All actions are extensively logged for debugging purposes
- Screenshots are saved at each step to help diagnose issues
