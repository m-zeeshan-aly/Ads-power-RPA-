# PTI Comment and Imran Khan Retweet Scripts

This folder contains scripts for automated Twitter interactions with PTI and Imran Khan accounts using Puppeteer.

## Available Scripts

### 1. PTI Tweet Comment (`pti_comment.ts`)
This script automatically comments on a tweet from the official PTI Twitter account.

### 2. Imran Khan Tweet Retweet (`imran_retweet.ts`)
This script automatically retweets a tweet from Imran Khan's Twitter account.

### 3. Combined Actions Script (`pti_comment_retweet.ts`)
This script combines both actions - liking and commenting on a PTI tweet and then retweeting an Imran Khan tweet.

### 4. Like Imran Khan Tweet (`like_imran_tweet.ts`)
This script likes a tweet from Imran Khan's Twitter account.

### 5. Animal Tweet Posting (`post_animal_tweet.ts`)
This script automatically composes and posts a tweet about animals with relevant hashtags.

## Prerequisites

1. AdsPower browser must be installed and running
2. A `.env` file with `WS_ENDPOINT` variable set to the WebSocket URL for your AdsPower profile
3. Node.js and npm installed

## How to Get WebSocket URL

See `HOW_TO_GET_WEBSOCKET_URL.md` for detailed instructions.

## Installation

```bash
npm install
```

## Usage

### To comment on a PTI tweet:
```bash
npm run comment
```

### To retweet an Imran Khan tweet:
```bash
npm run retweet
```

### To like an Imran Khan tweet:
```bash
npm run like
```

### To post an animal-related tweet:
```bash
npm run post
```

### To run all PTI and Imran Khan actions together:
```bash
npm run pti-action
```

## Troubleshooting

- Check the logs in the `debug_logs` directory for detailed operation logs
- Make sure your AdsPower profile is logged into Twitter
- Verify the WebSocket URL is correct and up to date in your `.env` file

## Notes

- All scripts use Puppeteer (not Playwright) as requested
- Each action is logged extensively for debugging purposes
- Screenshots are saved at each step to help diagnose any issues
