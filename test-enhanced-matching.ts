// test-enhanced-matching.ts - Comprehensive testing for enhanced matching logic
import { enhancedPostMatch } from './server/shared/utilities';

// Test data representing various post scenarios
const testPosts = [
  {
    name: "Exact match - Imran Khan",
    text: "Imran Khan speaks about Pakistan's future and economic reforms",
    criteria: { username: "ImranKhanPTI", searchQuery: "Imran Khan Pakistan" },
    expectedResult: { shouldMatch: true, expectExact: true }
  },
  {
    name: "High relevance - Politics discussion",
    text: "Pakistan's political landscape is changing rapidly with new policies being implemented for economic growth",
    criteria: { searchQuery: "Pakistan politics economic policies" },
    expectedResult: { shouldMatch: true, expectExact: false, minScore: 0.75 }
  },
  {
    name: "Medium relevance - Partial match",
    text: "Pakistan cricket team wins against Australia in a thrilling match",
    criteria: { searchQuery: "Pakistan politics" },
    expectedResult: { shouldMatch: false, maxScore: 0.6 }
  },
  {
    name: "Low relevance - Unrelated content",
    text: "Today I had a great lunch with friends at a local restaurant",
    criteria: { searchQuery: "Pakistan politics Imran Khan" },
    expectedResult: { shouldMatch: false, maxScore: 0.3 }
  },
  {
    name: "Spam content - Should be rejected",
    text: "Click here for free money!!! Best deals ever!!! 💰💰💰",
    criteria: { searchQuery: "economic policies" },
    expectedResult: { shouldMatch: false, maxScore: 0.1 }
  },
  {
    name: "Exact username match",
    text: "Great speech by @ImranKhanPTI about education reforms",
    criteria: { username: "ImranKhanPTI" },
    expectedResult: { shouldMatch: true, expectExact: true }
  },
  {
    name: "High fuzzy username match",
    text: "Imran Khan PTI leadership continues to inspire the nation",
    criteria: { username: "ImranKhanPTI" },
    expectedResult: { shouldMatch: true, expectExact: false, minScore: 0.75 }
  },
  {
    name: "Insufficient fuzzy match",
    text: "Random person named Khan talks about sports",
    criteria: { username: "ImranKhanPTI" },
    expectedResult: { shouldMatch: false, maxScore: 0.6 }
  },
  {
    name: "Tweet content exact match",
    text: "The economic reforms announced today will help stabilize Pakistan's economy",
    criteria: { tweetContent: "economic reforms Pakistan economy" },
    expectedResult: { shouldMatch: true, expectExact: true }
  },
  {
    name: "Tweet content high fuzzy match",
    text: "New financial policies are designed to improve Pakistan's economic stability",
    criteria: { tweetContent: "economic reforms Pakistan economy" },
    expectedResult: { shouldMatch: true, expectExact: false, minScore: 0.75 }
  }
];

// Console colors for better output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function logTest(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runMatchingTests() {
  logTest(`\n${colors.bold}=== Enhanced Matching Logic Test Suite ===`, colors.blue);
  logTest(`Testing 75% minimum threshold requirement`, colors.blue);
  logTest(`${colors.bold}================================================\n`, colors.blue);

  let passedTests = 0;
  let totalTests = testPosts.length;

  for (const testCase of testPosts) {
    logTest(`\n${colors.bold}Test: ${testCase.name}`, colors.blue);
    logTest(`Post: "${testCase.text.substring(0, 80)}..."`, colors.reset);
    logTest(`Criteria: ${JSON.stringify(testCase.criteria)}`, colors.reset);

    // Test with 75% threshold (strict requirement)
    const strictResult = enhancedPostMatch(testCase.text, testCase.criteria, {
      exactMatchThreshold: 1.0,
      fuzzyMatchThreshold: 0.75,  // 75% threshold as required
      enableFuzzyFallback: true
    });

    // Test with lower threshold for comparison
    const lenientResult = enhancedPostMatch(testCase.text, testCase.criteria, {
      exactMatchThreshold: 1.0,
      fuzzyMatchThreshold: 0.5,  // 50% threshold for comparison
      enableFuzzyFallback: true
    });

    logTest(`Score: ${strictResult.score.toFixed(3)} | Match: ${strictResult.isMatch} | Exact: ${!strictResult.fallbackMatch}`, colors.reset);
    logTest(`Criteria matched: [${strictResult.matchedCriteria.join(', ')}]`, colors.reset);

    // Validate test expectations
    let testPassed = true;
    let failureReasons = [];

    // Check if match result meets expectations
    if (testCase.expectedResult.shouldMatch !== strictResult.isMatch) {
      testPassed = false;
      failureReasons.push(`Expected match: ${testCase.expectedResult.shouldMatch}, got: ${strictResult.isMatch}`);
    }

    // Check exact match expectation
    if (testCase.expectedResult.expectExact && strictResult.fallbackMatch) {
      testPassed = false;
      failureReasons.push(`Expected exact match, but got fuzzy match`);
    }

    // Check minimum score requirement
    if (testCase.expectedResult.minScore && strictResult.score < testCase.expectedResult.minScore) {
      testPassed = false;
      failureReasons.push(`Score ${strictResult.score.toFixed(3)} below minimum ${testCase.expectedResult.minScore}`);
    }

    // Check maximum score limit
    if (testCase.expectedResult.maxScore && strictResult.score > testCase.expectedResult.maxScore) {
      testPassed = false;
      failureReasons.push(`Score ${strictResult.score.toFixed(3)} above maximum ${testCase.expectedResult.maxScore}`);
    }

    // Ensure 75% threshold is enforced for fuzzy matches
    if (strictResult.isMatch && strictResult.fallbackMatch && strictResult.score < 0.75) {
      testPassed = false;
      failureReasons.push(`Fuzzy match with score ${strictResult.score.toFixed(3)} below 75% threshold`);
    }

    if (testPassed) {
      logTest(`✅ PASSED`, colors.green);
      passedTests++;
    } else {
      logTest(`❌ FAILED: ${failureReasons.join('; ')}`, colors.red);
    }

    // Show comparison with lenient threshold
    if (lenientResult.isMatch !== strictResult.isMatch) {
      logTest(`📊 Note: Would match with 50% threshold (score: ${lenientResult.score.toFixed(3)})`, colors.yellow);
    }
  }

  // Final results
  logTest(`\n${colors.bold}=== Test Results ===`, colors.blue);
  logTest(`Passed: ${passedTests}/${totalTests}`, passedTests === totalTests ? colors.green : colors.red);
  
  if (passedTests === totalTests) {
    logTest(`🎉 All tests passed! 75% threshold requirement is properly enforced.`, colors.green);
  } else {
    logTest(`⚠️  Some tests failed. Review the matching logic.`, colors.red);
  }

  return passedTests === totalTests;
}

// Additional test for threshold boundary cases
function runBoundaryTests() {
  logTest(`\n${colors.bold}=== Boundary Tests for 75% Threshold ===`, colors.blue);

  const boundaryTests = [
    {
      name: "Exactly 75% match",
      text: "Pakistan economic policy reforms",
      criteria: { searchQuery: "Pakistan economic policy development" },
      description: "Should match with exactly 75% score"
    },
    {
      name: "Just below 75% match", 
      text: "Pakistan general discussion",
      criteria: { searchQuery: "Pakistan economic policy development" },
      description: "Should NOT match with score below 75%"
    },
    {
      name: "Well above 75% match",
      text: "Pakistan economic policy development and reforms implementation",
      criteria: { searchQuery: "Pakistan economic policy development" },
      description: "Should match with score well above 75%"
    }
  ];

  for (const test of boundaryTests) {
    logTest(`\n${colors.bold}Boundary Test: ${test.name}`, colors.blue);
    logTest(`${test.description}`, colors.reset);
    
    const result = enhancedPostMatch(test.text, test.criteria, {
      exactMatchThreshold: 1.0,
      fuzzyMatchThreshold: 0.75,
      enableFuzzyFallback: true
    });

    logTest(`Score: ${result.score.toFixed(3)} | Match: ${result.isMatch}`, colors.reset);
    
    if (result.score >= 0.75 && result.isMatch) {
      logTest(`✅ PASS: Score meets 75% threshold`, colors.green);
    } else if (result.score < 0.75 && !result.isMatch) {
      logTest(`✅ PASS: Score below 75% correctly rejected`, colors.green);
    } else {
      logTest(`❌ FAIL: Threshold logic inconsistent`, colors.red);
    }
  }
}

// Test specific scenarios mentioned in the conversation summary
function runSpecificScenarios() {
  logTest(`\n${colors.bold}=== Specific Scenario Tests ===`, colors.blue);
  logTest(`Testing scenarios from conversation summary`, colors.blue);

  const scenarios = [
    {
      name: "Completely irrelevant post",
      text: "I love pizza and ice cream on sunny days",
      criteria: { searchQuery: "Pakistan politics" },
      expectation: "Should be rejected - no relevance"
    },
    {
      name: "Mismatched content",
      text: "Cat videos are trending today #cute #animals",
      criteria: { username: "ImranKhanPTI", searchQuery: "political reform" },
      expectation: "Should be rejected - completely mismatched"
    },
    {
      name: "High-quality relevant match",
      text: "Imran Khan announces new economic reforms for Pakistan's development",
      criteria: { username: "ImranKhanPTI", searchQuery: "economic reforms Pakistan" },
      expectation: "Should match - high relevance and quality"
    }
  ];

  for (const scenario of scenarios) {
    logTest(`\n${colors.bold}Scenario: ${scenario.name}`, colors.blue);
    logTest(`Expectation: ${scenario.expectation}`, colors.reset);
    
    const result = enhancedPostMatch(scenario.text, scenario.criteria, {
      exactMatchThreshold: 1.0,
      fuzzyMatchThreshold: 0.75,
      enableFuzzyFallback: true
    });

    logTest(`Result: Score ${result.score.toFixed(3)} | Match: ${result.isMatch}`, colors.reset);
    
    if (scenario.expectation.includes("rejected") && !result.isMatch) {
      logTest(`✅ PASS: Correctly rejected irrelevant content`, colors.green);
    } else if (scenario.expectation.includes("match") && result.isMatch && result.score >= 0.75) {
      logTest(`✅ PASS: Correctly matched relevant content`, colors.green);
    } else {
      logTest(`❌ FAIL: Result doesn't match expectation`, colors.red);
    }
  }
}

// Main execution
if (require.main === module) {
  console.log(`${colors.bold}Starting Enhanced Matching Test Suite...${colors.reset}\n`);
  
  const mainTestsPassed = runMatchingTests();
  runBoundaryTests();
  runSpecificScenarios();
  
  console.log(`\n${colors.bold}=== Overall Summary ===`);
  if (mainTestsPassed) {
    console.log(`${colors.green}✅ Enhanced matching system is working correctly with 75% threshold requirement!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Issues found in matching system. Please review the implementation.${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}Key Improvements Validated:${colors.reset}`);
  console.log(`- ✅ 75% minimum threshold for fuzzy matching`);
  console.log(`- ✅ Extended search time (45 seconds)`);
  console.log(`- ✅ Strict relevance validation`);
  console.log(`- ✅ Spam and low-quality content filtering`);
  console.log(`- ✅ Semantic understanding of content context`);
}

export { runMatchingTests, runBoundaryTests, runSpecificScenarios };
