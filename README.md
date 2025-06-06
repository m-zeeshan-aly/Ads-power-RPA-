# Twitter Automation with Puppeteer and AdsPower

This project contains multiple Twitter automation scripts using Puppeteer and AdsPower. Each script has two versions:
- **Regular version**: Standard automation behavior
- **Human version**: Includes human-like delays, scrolling, and typing patterns

## Available Scripts

### PTI Comment Scripts
- `pti_comment.ts` - Comments on PTI tweets
- `pti_comment_human.ts` - Human-like version of PTI commenting
- `pti_comment_retweet.ts` - Combined PTI actions (like, comment, retweet)

### Imran Khan Tweet Scripts  
- `like_imran_tweet.ts` - Likes Imran Khan's tweets
- `like_imran_tweet_human.ts` - Human-like version of liking tweets
- `imran_retweet.ts` - Retweets Imran Khan's tweets
- `imran_retweet_human.ts` - Human-like version of retweeting

### Animal Tweet Scripts
- `post_animal_tweet.ts` - Posts animal-related tweets
- `post_animal_tweet_human.ts` - Human-like version of posting animal tweets

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
2. Obtain the WebSocket endpoint URL from AdsPower
3. Create a `.env` file in the project root with:
   
   ```
   WS_ENDPOINT=ws://127.0.0.1:PORT/devtools/browser/ID
   ```

### Running Scripts

#### Regular versions:
```bash
npm run comment        # PTI comment
npm run like           # Like Imran Khan tweet
npm run retweet        # Retweet Imran Khan tweet  
npm run post           # Post animal tweet
npm run pti-action     # Combined PTI actions
```

#### Human-like versions:
```bash
npm run commenth       # PTI comment (human-like)
npm run likeh          # Like Imran Khan tweet (human-like)
npm run retweeth       # Retweet Imran Khan tweet (human-like)
npm run posth          # Post animal tweet (human-like)
```

## Output

- Console logs showing the progress of the automation
- Screenshots saved in the `debug_logs` directory for debugging
- Detailed log files for each script in the `debug_logs` directory

## Troubleshooting

- If the script fails to connect to AdsPower, ensure the WebSocket URL is correct and AdsPower is running
- Check the log files in the `debug_logs` directory for detailed error information
- Make sure your AdsPower profile is already logged into Twitter
- If Twitter interactions fail, the scripts will try to continue with the next steps

## File Structure

- **Regular scripts**: Standard automation with minimal delays
- **Human scripts**: Include realistic human behavior patterns (scrolling, typing delays, etc.)
- **Combined script**: `pti_comment_retweet.ts` performs multiple PTI-related actions in sequence
