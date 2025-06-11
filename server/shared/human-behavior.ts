// Centralized human behavior patterns and selection logic

export enum BehaviorType {
  CASUAL_BROWSER = 'casual_browser',
  FOCUSED_POSTER = 'focused_poster',
  SOCIAL_ENGAGER = 'social_engager',
  QUICK_POSTER = 'quick_poster',
  THOUGHTFUL_WRITER = 'thoughtful_writer'
}

// Unified behavior pattern interface that covers all use cases
export interface BehaviorPattern {
  name: string;
  description: string;
  
  // Scrolling behaviors
  preScrollTime: { min: number; max: number };
  scrollPauseTime: { min: number; max: number };
  scrollBehavior: { 
    scrollsPerAction: { min: number; max: number }; 
    scrollDistance: { min: number; max: number } 
  };
  
  // Interaction behaviors
  hoverTime: { min: number; max: number };
  readingTime: { min: number; max: number };
  actionDelays: { min: number; max: number };
  
  // Thinking and pausing behaviors
  thinkingPauseChance: number;
  thinkingPauseDuration: { min: number; max: number };
  
  // Typing behaviors (for tweet composition)
  typingSpeed?: { min: number; max: number };
  reviewTime?: { min: number; max: number };
  postScrollTime?: { min: number; max: number };
}

// Centralized human behavior configurations
export const HUMAN_BEHAVIORS: Record<BehaviorType, BehaviorPattern> = {
  [BehaviorType.CASUAL_BROWSER]: {
    name: 'Casual Browser',
    description: 'Scrolls extensively, takes time to read, natural pauses',
    preScrollTime: { min: 8000, max: 15000 },
    scrollPauseTime: { min: 800, max: 1500 },
    scrollBehavior: { 
      scrollsPerAction: { min: 3, max: 6 }, 
      scrollDistance: { min: 250, max: 450 } 
    },
    hoverTime: { min: 400, max: 800 },
    readingTime: { min: 2000, max: 4000 },
    actionDelays: { min: 1000, max: 2500 },
    thinkingPauseChance: 0.15,
    thinkingPauseDuration: { min: 1000, max: 2500 },
    
    // Tweet-specific behaviors
    typingSpeed: { min: 80, max: 200 },
    reviewTime: { min: 3000, max: 6000 },
    postScrollTime: { min: 4000, max: 8000 }
  },
  
  [BehaviorType.FOCUSED_POSTER]: {
    name: 'Focused Poster',
    description: 'Minimal scrolling, direct approach, quick decisions',
    preScrollTime: { min: 2000, max: 5000 },
    scrollPauseTime: { min: 300, max: 600 },
    scrollBehavior: { 
      scrollsPerAction: { min: 1, max: 3 }, 
      scrollDistance: { min: 200, max: 350 } 
    },
    hoverTime: { min: 200, max: 400 },
    readingTime: { min: 800, max: 1500 },
    actionDelays: { min: 500, max: 1200 },
    thinkingPauseChance: 0.08,
    thinkingPauseDuration: { min: 300, max: 800 },
    
    // Tweet-specific behaviors
    typingSpeed: { min: 60, max: 120 },
    reviewTime: { min: 1500, max: 3000 },
    postScrollTime: { min: 1000, max: 3000 }
  },
  
  [BehaviorType.SOCIAL_ENGAGER]: {
    name: 'Social Engager',
    description: 'Moderate scrolling, careful selection, thoughtful interaction',
    preScrollTime: { min: 6000, max: 12000 },
    scrollPauseTime: { min: 500, max: 1000 },
    scrollBehavior: { 
      scrollsPerAction: { min: 2, max: 4 }, 
      scrollDistance: { min: 200, max: 400 } 
    },
    hoverTime: { min: 300, max: 600 },
    readingTime: { min: 1500, max: 3000 },
    actionDelays: { min: 800, max: 1800 },
    thinkingPauseChance: 0.12,
    thinkingPauseDuration: { min: 500, max: 1500 },
    
    // Tweet-specific behaviors
    typingSpeed: { min: 70, max: 150 },
    reviewTime: { min: 2500, max: 5000 },
    postScrollTime: { min: 3000, max: 6000 }
  },
  
  [BehaviorType.QUICK_POSTER]: {
    name: 'Quick Poster',
    description: 'Fast scrolling, minimal delays, efficient actions',
    preScrollTime: { min: 1000, max: 3000 },
    scrollPauseTime: { min: 200, max: 400 },
    scrollBehavior: { 
      scrollsPerAction: { min: 1, max: 2 }, 
      scrollDistance: { min: 300, max: 500 } 
    },
    hoverTime: { min: 150, max: 300 },
    readingTime: { min: 500, max: 1000 },
    actionDelays: { min: 300, max: 800 },
    thinkingPauseChance: 0.05,
    thinkingPauseDuration: { min: 200, max: 500 },
    
    // Tweet-specific behaviors
    typingSpeed: { min: 40, max: 80 },
    reviewTime: { min: 800, max: 1500 },
    postScrollTime: { min: 500, max: 2000 }
  },
  
  [BehaviorType.THOUGHTFUL_WRITER]: {
    name: 'Thoughtful Writer',
    description: 'Extensive reading, long pauses, careful consideration',
    preScrollTime: { min: 10000, max: 20000 },
    scrollPauseTime: { min: 1000, max: 2000 },
    scrollBehavior: { 
      scrollsPerAction: { min: 4, max: 8 }, 
      scrollDistance: { min: 150, max: 300 } 
    },
    hoverTime: { min: 500, max: 1000 },
    readingTime: { min: 3000, max: 6000 },
    actionDelays: { min: 1500, max: 3000 },
    thinkingPauseChance: 0.20,
    thinkingPauseDuration: { min: 1000, max: 3000 },
    
    // Tweet-specific behaviors
    typingSpeed: { min: 100, max: 250 },
    reviewTime: { min: 4000, max: 8000 },
    postScrollTime: { min: 5000, max: 10000 }
  }
};

// Utility functions for behavior management
export function getBehaviorByType(behaviorType: BehaviorType): BehaviorPattern {
  return HUMAN_BEHAVIORS[behaviorType];
}

export function getRandomBehavior(): BehaviorPattern {
  const behaviors = Object.values(BehaviorType);
  const randomType = behaviors[Math.floor(Math.random() * behaviors.length)];
  return HUMAN_BEHAVIORS[randomType];
}

export function getBehaviorOrDefault(behaviorType?: BehaviorType): BehaviorPattern {
  return behaviorType ? HUMAN_BEHAVIORS[behaviorType] : HUMAN_BEHAVIORS[BehaviorType.SOCIAL_ENGAGER];
}

// Export behavior types and patterns for external use
export { BehaviorType as HumanBehaviorType };
export type { BehaviorPattern as HumanBehaviorPattern };
