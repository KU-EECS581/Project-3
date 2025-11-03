/**
 * @file utils.ts
 * @description Utility functions for slots game logic
 */

import { Symbol, SYMBOL_WEIGHTS, PAYOUTS } from "./types";

/**
 * Generate a random symbol based on weighted probabilities
 */
export function generateRandomSymbol(): Symbol {
  const totalWeight = Object.values(SYMBOL_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [symbol, weight] of Object.entries(SYMBOL_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return symbol as Symbol;
    }
  }
  
  // Fallback (should never happen)
  return Symbol.CHERRY;
}

/**
 * Generate symbols for a reel (creates a pool of symbols for animation)
 */
export function generateReelSymbols(count: number = 20): Symbol[] {
  return Array.from({ length: count }, () => generateRandomSymbol());
}

/**
 * Check for winning combinations and calculate payout
 */
export function calculateWin(reels: Symbol[], bet: number): number {
  // Create symbol strings for matching
  const line = reels.join("");
  
  // Check for three of a kind (highest priority)
  for (const [pattern, multiplier] of Object.entries(PAYOUTS)) {
    if (line === pattern) {
      return Math.floor(bet * multiplier);
    }
  }
  
  // Check for two of a kind on first two reels
  // Use the base symbol from three-of-a-kind patterns
  if (reels[0] === reels[1] && reels[0] !== reels[2]) {
    const twoSymbolPattern = reels[0] + reels[0];
    // Check if this symbol has a three-of-a-kind pattern, then apply reduced payout
    const threePattern = twoSymbolPattern + reels[0];
    if (PAYOUTS[threePattern]) {
      // Two of a kind pays 20% of three-of-a-kind
      return Math.floor(bet * PAYOUTS[threePattern] * 0.2);
    }
  }
  
  return 0;
}

/**
 * Check if all three symbols match (any symbol)
 */
export function isThreeOfAKind(reels: Symbol[]): boolean {
  return reels[0] === reels[1] && reels[1] === reels[2];
}

/**
 * Get the winning line description
 */
export function getWinDescription(reels: Symbol[]): string {
  const win = calculateWin(reels, 1);
  if (win === 0) return "";
  
  if (isThreeOfAKind(reels)) {
    return `Three ${reels[0]}s!`;
  }
  
  if (reels[0] === reels[1]) {
    return `Two ${reels[0]}s!`;
  }
  
  return "Win!";
}

