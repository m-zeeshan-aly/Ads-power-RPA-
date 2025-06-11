// Common Twitter/X selectors and element finding utilities

import * as puppeteer from 'puppeteer-core';

// Common Twitter/X element selectors organized by functionality
export const TWITTER_SELECTORS = {
  // Navigation elements
  HOME_BUTTONS: [
    'a[aria-label="Home"]',
    'a[href="/home"]',
    'a[data-testid="AppTabBar_Home_Link"]'
  ],
  
  // Tweet composition elements
  COMPOSE_BUTTONS: [
    '[data-testid="SideNav_NewTweet_Button"]',
    '[aria-label="Tweet"]',
    '[data-testid="tweetButton"]',
    'a[href="/compose/tweet"]'
  ],
  
  COMPOSE_TEXTAREAS: [
    'div[data-testid="tweetTextarea_0"]',
    'div[role="textbox"]',
    'div[contenteditable="true"]',
    '[data-testid="tweetTextarea_0"] div[role="textbox"]'
  ],
  
  TWEET_SUBMIT_BUTTONS: [
    '[data-testid="tweetButtonInline"]',
    '[data-testid="tweetButton"]',
    'div[data-testid="tweetButton"]'
  ],
  
  // Search elements
  SEARCH_BOXES: [
    'input[data-testid="SearchBox_Search_Input"]',
    'input[placeholder="Search Twitter"]',
    'input[placeholder="Search"]',
    'input[aria-label="Search query"]'
  ],
  
  // Tweet interaction elements
  LIKE_BUTTONS: [
    '[data-testid="like"]',
    'div[data-testid="like"]',
    'button[data-testid="like"]'
  ],
  
  RETWEET_BUTTONS: [
    '[data-testid="retweet"]',
    'div[data-testid="retweet"]',
    'button[data-testid="retweet"]'
  ],
  
  RETWEET_CONFIRM_BUTTONS: [
    '[data-testid="retweetConfirm"]',
    'div[data-testid="retweetConfirm"]',
    'button[data-testid="retweetConfirm"]'
  ],
  
  REPLY_BUTTONS: [
    '[data-testid="reply"]',
    'div[data-testid="reply"]',
    'button[data-testid="reply"]'
  ],
  
  // Tweet content elements
  TWEETS: [
    'article[data-testid="tweet"]',
    'article[role="article"]',
    'div[data-testid="cellInnerDiv"]'
  ],
  
  TWEET_TEXT: [
    '[data-testid="tweetText"]',
    'div[data-testid="tweetText"]',
    '[lang] span'
  ],
  
  // Profile elements
  PROFILE_LINKS: [
    'div[data-testid="UserCell"] a[role="link"]',
    'a[role="link"]',
    'div[data-testid="UserAvatar-Container-unknown"] a'
  ],
  
  // Feed elements
  FEED_CONTAINERS: [
    'div[data-testid="primaryColumn"]',
    'main[role="main"]',
    'div[aria-label="Timeline: Your Home Timeline"]'
  ],
  
  // Modal and overlay elements
  MODAL_CLOSE_BUTTONS: [
    'button[aria-label="Close"]',
    'div[data-testid="app-bar-close"]',
    'button[data-testid="confirmationSheetCancel"]'
  ]
};

// Function to find an element using multiple selectors with timeout
export async function findElementWithSelectors(
  page: puppeteer.Page,
  selectors: string[],
  timeout: number = 30000
): Promise<puppeteer.ElementHandle<Element> | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          return element;
        }
      } catch (error) {
        // Continue trying other selectors
        continue;
      }
    }
    
    // Wait a bit before trying again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return null;
}

// Function to wait for any of multiple selectors to appear
export async function waitForAnySelector(
  page: puppeteer.Page,
  selectors: string[],
  timeout: number = 30000
): Promise<{ element: puppeteer.ElementHandle<Element>; selector: string } | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          return { element, selector };
        }
      } catch (error) {
        // Continue trying other selectors
        continue;
      }
    }
    
    // Wait a bit before trying again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return null;
}

// Function to click using multiple selector attempts
export async function clickWithSelectors(
  page: puppeteer.Page,
  selectors: string[],
  timeout: number = 30000
): Promise<boolean> {
  const result = await waitForAnySelector(page, selectors, timeout);
  
  if (result) {
    await result.element.click();
    return true;
  }
  
  return false;
}

// Function to type text using multiple selector attempts
export async function typeWithSelectors(
  page: puppeteer.Page,
  selectors: string[],
  text: string,
  timeout: number = 30000
): Promise<boolean> {
  const result = await waitForAnySelector(page, selectors, timeout);
  
  if (result) {
    await result.element.focus();
    await page.keyboard.type(text);
    return true;
  }
  
  return false;
}

// Function to get all tweets on the current page
export async function getAllTweets(page: puppeteer.Page): Promise<puppeteer.ElementHandle<Element>[]> {
  const tweets: puppeteer.ElementHandle<Element>[] = [];
  
  for (const selector of TWITTER_SELECTORS.TWEETS) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        tweets.push(...elements);
        break; // Found tweets with this selector, no need to try others
      }
    } catch (error) {
      continue;
    }
  }
  
  return tweets;
}

// Function to check if an element contains specific text
export async function elementContainsText(
  element: puppeteer.ElementHandle<Element>,
  searchText: string,
  caseSensitive: boolean = false
): Promise<boolean> {
  try {
    const text = await element.evaluate(el => el.textContent || '');
    const searchValue = caseSensitive ? searchText : searchText.toLowerCase();
    const elementText = caseSensitive ? text : text.toLowerCase();
    
    return elementText.includes(searchValue);
  } catch (error) {
    return false;
  }
}

// Function to find tweets containing specific text
export async function findTweetsWithText(
  page: puppeteer.Page,
  searchText: string,
  caseSensitive: boolean = false
): Promise<puppeteer.ElementHandle<Element>[]> {
  const allTweets = await getAllTweets(page);
  const matchingTweets: puppeteer.ElementHandle<Element>[] = [];
  
  for (const tweet of allTweets) {
    if (await elementContainsText(tweet, searchText, caseSensitive)) {
      matchingTweets.push(tweet);
    }
  }
  
  return matchingTweets;
}

// Function to find and click a button within a specific tweet
export async function clickButtonInTweet(
  tweet: puppeteer.ElementHandle<Element>,
  buttonSelectors: string[]
): Promise<boolean> {
  for (const selector of buttonSelectors) {
    try {
      const button = await tweet.$(selector);
      if (button) {
        await button.click();
        return true;
      }
    } catch (error) {
      continue;
    }
  }
  
  return false;
}

// Function to scroll to a specific element smoothly
export async function scrollToElement(
  page: puppeteer.Page,
  element: puppeteer.ElementHandle<Element>
): Promise<void> {
  await page.evaluate((el) => {
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, element);
  
  // Wait for scroll to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Function to check if page is on Twitter/X
export async function isOnTwitter(page: puppeteer.Page): Promise<boolean> {
  try {
    const url = page.url();
    return url.includes('twitter.com') || url.includes('x.com');
  } catch (error) {
    return false;
  }
}

// Function to navigate to Twitter home if not already there
export async function ensureOnTwitterHome(page: puppeteer.Page): Promise<void> {
  const currentUrl = page.url();
  
  if (!currentUrl.includes('twitter.com/home') && !currentUrl.includes('x.com/home')) {
    await page.goto('https://twitter.com/home', { waitUntil: 'networkidle2' });
  }
}

// Function to check if user is logged in to Twitter
export async function isLoggedInToTwitter(page: puppeteer.Page): Promise<boolean> {
  try {
    // Look for elements that only appear when logged in
    const loggedInSelectors = [
      '[data-testid="SideNav_NewTweet_Button"]',
      'div[data-testid="primaryColumn"]',
      '[aria-label="Home"]'
    ];
    
    const result = await waitForAnySelector(page, loggedInSelectors, 5000);
    return result !== null;
  } catch (error) {
    return false;
  }
}
