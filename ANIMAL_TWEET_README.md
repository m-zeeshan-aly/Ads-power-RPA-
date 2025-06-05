# Animal Tweet Posting Script

This script automatically posts an animal-related tweet with relevant hashtags from your Twitter account.

## Features

- Connects to an existing AdsPower browser session
- Navigates to Twitter's home page
- Composes a tweet about animals with appropriate hashtags
- Posts the tweet
- Takes screenshots throughout the process for debugging

## Tweet Content

The script randomly selects one of several pre-written tweets about animals, including:
- Wildlife conservation
- Animal facts
- Ocean conservation
- Endangered species
- Nature observations

Each tweet includes multiple relevant hashtags to increase visibility.

## Prerequisites

1. AdsPower browser must be installed and running
2. A `.env` file with `WS_ENDPOINT` variable set to the WebSocket URL for your AdsPower profile
3. You must be logged into Twitter in your AdsPower browser profile
4. Node.js and npm installed

## Usage

```bash
# Run the script
npm run post
```

## Troubleshooting

- Check the `debug_logs/animal_tweet.log` file for detailed execution logs
- Review screenshots in the `debug_logs` directory to see what happened at each step
- Make sure your AdsPower profile is logged into Twitter
- Verify the WebSocket URL is correct and up to date in your `.env` file

## Notes

- This script uses Puppeteer (not Playwright) to connect to AdsPower
- All steps are extensively logged for debugging purposes
- The script has built-in error handling and recovery mechanisms
