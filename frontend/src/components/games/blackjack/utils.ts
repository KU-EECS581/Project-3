/**
 * @file utils.ts
 * @description Blackjack hand evaluation & dealer decision utilities.
 * @class N/A (utility functions)
 * @module Components/Blackjack
 * @inputs Arrays of Card objects for evaluation
 * @outputs Value calculations (hard/soft/blackjack), bust checks, dealer hit decision
 * @external_sources Middleware card enums
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import type { Card } from "~middleware/cards";
import { Rank } from "~middleware/cards";

/**
 * Calculate the value of a blackjack hand
 * Returns an object with hard value and soft value (if ace present)
 */
export function calculateHandValue(cards: Card[]): { hard: number; soft: number | null; isBlackjack: boolean } {
  let hardValue = 0;
  let aceCount = 0;

  // Count all non-ace cards first
  for (const card of cards) {
    if (card.rank === Rank.ACE) {
      aceCount++;
    } else if ([Rank.JACK, Rank.QUEEN, Rank.KING].includes(card.rank)) {
      hardValue += 10;
    } else {
      // Number cards 2-10
      hardValue += parseInt(card.rank);
    }
  }

  // Handle aces
  let softValue: number | null = null;
  if (aceCount > 0) {
    // Try using aces as 11 (one at a time)
    let tempValue = hardValue;
    for (let i = 0; i < aceCount; i++) {
      if (tempValue + 11 <= 21) {
        tempValue += 11;
        if (i === 0) {
          softValue = tempValue; // Only first ace can be soft
        }
      } else {
        tempValue += 1; // Use ace as 1
      }
    }
    hardValue = tempValue;
  }

  // Check for blackjack (21 with exactly 2 cards)
  const isBlackjack = cards.length === 2 && (hardValue === 21 || softValue === 21);

  return { hard: hardValue, soft: softValue, isBlackjack };
}

/**
 * Get the best value for a hand (highest without busting)
 */
export function getBestHandValue(cards: Card[]): number {
  const { hard, soft } = calculateHandValue(cards);
  if (soft !== null && soft <= 21) {
    return soft > hard ? soft : hard;
  }
  return hard;
}

/**
 * Check if hand is busted
 */
export function isBusted(cards: Card[]): boolean {
  return getBestHandValue(cards) > 21;
}

/**
 * Dealer decision logic: must hit on soft 17 or below
 */
export function shouldDealerHit(cards: Card[]): boolean {
  const { hard, soft } = calculateHandValue(cards);
  const bestValue = soft !== null && soft <= 21 ? Math.max(soft, hard) : hard;
  return bestValue < 17 || (soft !== null && soft === 17);
}

