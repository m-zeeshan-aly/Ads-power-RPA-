// Centralized human-like action functions used across all services

import * as puppeteer from 'puppeteer-core';
import { BehaviorPattern } from './human-behavior';
import { randomBetween } from './utilities';

// Function to simulate human-like reading pause
export async function simulateReading(behavior?: BehaviorPattern): Promise<void> {
  let readTime: number;
  
  if (behavior) {
    readTime = randomBetween(behavior.readingTime.min, behavior.readingTime.max);
  } else {
    // Default reading time if no behavior specified
    readTime = randomBetween(2000, 6000);
  }
  
  await new Promise(resolve => setTimeout(resolve, readTime));
}

// Function to simulate thinking pauses based on behavior
export async function simulateThinking(behavior: BehaviorPattern): Promise<void> {
  if (Math.random() < behavior.thinkingPauseChance) {
    const thinkingTime = randomBetween(
      behavior.thinkingPauseDuration.min, 
      behavior.thinkingPauseDuration.max
    );
    await new Promise(resolve => setTimeout(resolve, thinkingTime));
  }
}

// Function to simulate human typing with behavior-specific patterns
export async function humanTypeText(
  page: puppeteer.Page, 
  selector: string, 
  text: string, 
  behavior?: BehaviorPattern
): Promise<void> {
  await page.focus(selector);
  
  for (let i = 0; i < text.length; i++) {
    let typingSpeed: number;
    
    if (behavior && behavior.typingSpeed) {
      typingSpeed = randomBetween(behavior.typingSpeed.min, behavior.typingSpeed.max);
    } else {
      // Default typing speed if no behavior specified
      typingSpeed = randomBetween(50, 200);
    }
    
    await page.keyboard.type(text[i], { delay: typingSpeed });
    
    // Behavior-specific thinking pauses while typing
    if (behavior) {
      await simulateThinking(behavior);
    } else {
      // Default thinking pause chance (10%)
      if (Math.random() < 0.1) {
        const thinkingPause = randomBetween(300, 1000);
        await new Promise(resolve => setTimeout(resolve, thinkingPause));
      }
    }
  }
}

// Function to perform human-like scrolling with behavior patterns
export async function humanScroll(
  page: puppeteer.Page, 
  duration: number = 10000, 
  behavior?: BehaviorPattern,
  screenshotCallback?: (filename: string) => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  let scrollCount = 0;
  
  while (Date.now() - startTime < duration) {
    scrollCount++;
    
    let scrollDistance: number;
    let pauseTime: number;
    
    if (behavior) {
      scrollDistance = randomBetween(
        behavior.scrollBehavior.scrollDistance.min, 
        behavior.scrollBehavior.scrollDistance.max
      );
      pauseTime = randomBetween(behavior.scrollPauseTime.min, behavior.scrollPauseTime.max);
    } else {
      // Default scroll behavior
      scrollDistance = randomBetween(300, 500);
      pauseTime = randomBetween(200, 1000);
    }
    
    await page.evaluate((distance) => {
      window.scrollBy(0, distance);
    }, scrollDistance);
    
    // Take occasional screenshots if callback provided
    if (screenshotCallback && scrollCount % (Math.random() > 0.5 ? 2 : 3) === 0) {
      await screenshotCallback(`scroll_${scrollCount}.png`);
    }
    
    await new Promise(resolve => setTimeout(resolve, pauseTime));
    
    // Behavior-specific thinking pauses during scrolling
    if (behavior) {
      await simulateThinking(behavior);
    } else {
      // Default reading pause chance (25%)
      if (Math.random() < 0.25) {
        await simulateReading();
      }
    }
  }
}

// Function to perform human-like hovering
export async function humanHover(
  page: puppeteer.Page, 
  selector: string, 
  behavior?: BehaviorPattern
): Promise<void> {
  let hoverTime: number;
  
  if (behavior) {
    hoverTime = randomBetween(behavior.hoverTime.min, behavior.hoverTime.max);
  } else {
    hoverTime = randomBetween(300, 600);
  }
  
  await page.hover(selector);
  await new Promise(resolve => setTimeout(resolve, hoverTime));
}

// Function to perform human-like clicking with delays
export async function humanClick(
  page: puppeteer.Page, 
  selector: string, 
  behavior?: BehaviorPattern
): Promise<void> {
  // Hover before clicking
  await humanHover(page, selector, behavior);
  
  // Small delay before actual click
  let actionDelay: number;
  if (behavior) {
    actionDelay = randomBetween(behavior.actionDelays.min, behavior.actionDelays.max);
  } else {
    actionDelay = randomBetween(300, 800);
  }
  
  await new Promise(resolve => setTimeout(resolve, actionDelay));
  await page.click(selector);
}

// Function to wait for element with human-like behavior
export async function humanWaitForSelector(
  page: puppeteer.Page,
  selector: string,
  options: { timeout?: number; visible?: boolean } = {}
): Promise<puppeteer.ElementHandle<Element> | null> {
  const timeout = options.timeout || 30000;
  const visible = options.visible !== false;
  
  try {
    return await page.waitForSelector(selector, { 
      timeout, 
      visible 
    });
  } catch (error) {
    // Add small delay even on failure to seem more human
    await new Promise(resolve => setTimeout(resolve, randomBetween(500, 1500)));
    throw error;
  }
}

// Function to perform human-like navigation
export async function humanNavigate(
  page: puppeteer.Page,
  url: string,
  behavior?: BehaviorPattern
): Promise<void> {
  // Pre-navigation pause (thinking about where to go)
  if (behavior) {
    const preNavDelay = randomBetween(behavior.actionDelays.min, behavior.actionDelays.max);
    await new Promise(resolve => setTimeout(resolve, preNavDelay));
  }
  
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Post-navigation pause (looking at the page)
  await simulateReading(behavior);
}

// Function to perform human-like element selection from multiple options
export function selectHumanLikeIndex(arrayLength: number): number {
  if (arrayLength <= 1) return 0;
  
  // Avoid always selecting the first element - more human-like
  if (arrayLength === 2) {
    return Math.random() > 0.7 ? 0 : 1; // 30% chance of first, 70% chance of second
  }
  
  // For more elements, avoid the first one and select randomly from the rest
  return Math.floor(Math.random() * (arrayLength - 1)) + 1;
}

// Function to check if we should perform an action (with human-like randomness)
export function shouldPerformAction(probability: number = 0.8): boolean {
  return Math.random() < probability;
}

// Function to generate human-like delay based on behavior
export async function humanDelay(behavior?: BehaviorPattern, customRange?: { min: number; max: number }): Promise<void> {
  let delay: number;
  
  if (customRange) {
    delay = randomBetween(customRange.min, customRange.max);
  } else if (behavior) {
    delay = randomBetween(behavior.actionDelays.min, behavior.actionDelays.max);
  } else {
    delay = randomBetween(500, 1500);
  }
  
  await new Promise(resolve => setTimeout(resolve, delay));
}
