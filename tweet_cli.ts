// tweet_cli.ts
import * as readline from 'readline';
import { TweetInput, postCustomTweetHuman, connectToBrowser, getWebSocketUrl } from './server/tweet/custom_tweet_human';
import { BehaviorType, HUMAN_BEHAVIORS } from './server/shared/human-behavior';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function getUserInputInteractive(): Promise<TweetInput> {
  console.log('\n=== Custom Tweet Input ===');
  
  const message = await question('Enter your tweet message: ');
  
  const hashtagsInput = await question('Enter hashtags (comma-separated, without #): ');
  const hashtags = hashtagsInput ? hashtagsInput.split(',').map(h => h.trim()).filter(h => h) : [];
  
  const mentionsInput = await question('Enter mentions (comma-separated, without @): ');
  const mentions = mentionsInput ? mentionsInput.split(',').map(m => m.trim()).filter(m => m) : [];
  
  return {
    message: message.trim(),
    hashtags: hashtags.length > 0 ? hashtags : undefined,
    mentions: mentions.length > 0 ? mentions : undefined
  };
}

async function main() {
  try {
    console.log('🤖 Custom Human-like Tweet Poster');
    console.log('Available behaviors:');
    Object.entries(HUMAN_BEHAVIORS).forEach(([key, behavior]) => {
      console.log(`  - ${behavior.name}: ${behavior.description}`);
    });
    console.log('(A random behavior will be selected for each tweet)\n');
    
    const tweetInput = await getUserInputInteractive();
    
    console.log('\nTweet Preview:');
    const message = tweetInput.message;
    const mentions = tweetInput.mentions ? tweetInput.mentions.map(m => `@${m}`).join(' ') + ' ' : '';
    const hashtags = tweetInput.hashtags ? ' ' + tweetInput.hashtags.map(h => `#${h}`).join(' ') : '';
    const fullTweet = `${mentions}${message}${hashtags}`;
    console.log(`"${fullTweet}"`);
    console.log(`Character count: ${fullTweet.length}/280\n`);
    
    const confirm = await question('Proceed with posting? (y/N): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Tweet cancelled.');
      rl.close();
      return;
    }
    
    console.log('\nConnecting to browser...');
    const browser = await connectToBrowser();
    
    console.log('Posting tweet with human-like behavior...');
    await postCustomTweetHuman(browser, tweetInput);
    
    await browser.disconnect();
    console.log('\n✅ Tweet posted successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

main();