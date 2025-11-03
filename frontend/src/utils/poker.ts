/**
 * @file poker.ts
 * @description Utilities for poker hand evaluation and gameplay.
 * @date 2025-01-XX
 */

import type { Card } from "@/models";
import { CardRank, CardSuit } from "@/enums";

/**
 * Poker hand rankings (lower number = better hand)
 */
export enum PokerHandRank {
    HIGH_CARD = 0,
    PAIR = 1,
    TWO_PAIR = 2,
    THREE_OF_A_KIND = 3,
    STRAIGHT = 4,
    FLUSH = 5,
    FULL_HOUSE = 6,
    FOUR_OF_A_KIND = 7,
    STRAIGHT_FLUSH = 8,
    ROYAL_FLUSH = 9,
}

export interface EvaluatedHand {
    rank: PokerHandRank;
    name: string;
    tieBreakers: number[]; // For comparing hands of the same rank
}

/**
 * Gets the numeric rank value for comparison
 */
function getRankValue(rank: string): number {
    switch (rank) {
        case 'ace':
            return 14; // Ace is high
        case 'king':
            return 13;
        case 'queen':
            return 12;
        case 'jack':
            return 11;
        default:
            return parseInt(rank, 10);
    }
}

/**
 * Evaluates the best poker hand from player cards + community cards
 */
export function evaluatePokerHand(playerCards: Card[], communityCards: Card[]): EvaluatedHand {
    const allCards = [...playerCards, ...communityCards];
    
    if (allCards.length < 5) {
        // Not enough cards, return high card evaluation
        const sorted = allCards
            .map(c => getRankValue(c.rank))
            .sort((a, b) => b - a);
        return {
            rank: PokerHandRank.HIGH_CARD,
            name: 'High Card',
            tieBreakers: sorted.slice(0, 5),
        };
    }

    // Check for flush
    const suitCounts = new Map<string, number>();
    allCards.forEach(card => {
        suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
    });
    const flushSuit = Array.from(suitCounts.entries()).find(([_, count]) => count >= 5)?.[0];
    
    // Group by rank
    const rankCounts = new Map<number, number>();
    allCards.forEach(card => {
        const rankValue = getRankValue(card.rank);
        rankCounts.set(rankValue, (rankCounts.get(rankValue) || 0) + 1);
    });

    const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
    const sortedRanks = Array.from(rankCounts.entries())
        .sort((a, b) => {
            if (a[1] !== b[1]) return b[1] - a[1]; // Sort by count first
            return b[0] - a[0]; // Then by rank value
        })
        .map(([rank]) => rank);

    // Check for straight
    const uniqueRanks = Array.from(new Set(allCards.map(c => getRankValue(c.rank)))).sort((a, b) => a - b);
    let straightHigh = 0;
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        let consecutive = 1;
        for (let j = i + 1; j < uniqueRanks.length && uniqueRanks[j] === uniqueRanks[j - 1] + 1; j++) {
            consecutive++;
            if (consecutive === 5) {
                straightHigh = uniqueRanks[j];
                break;
            }
        }
        if (consecutive === 5) break;
    }
    
    // Check for A-2-3-4-5 straight (wheel)
    if (!straightHigh && uniqueRanks.includes(14) && uniqueRanks.includes(2) && 
        uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
        straightHigh = 5;
    }

    const flushCards = flushSuit ? allCards.filter(c => c.suit === flushSuit).map(c => getRankValue(c.rank)).sort((a, b) => b - a) : [];

    // Check for royal flush
    if (flushSuit && straightHigh === 14 && uniqueRanks.includes(14) && uniqueRanks.includes(13) && 
        uniqueRanks.includes(12) && uniqueRanks.includes(11) && uniqueRanks.includes(10)) {
        return {
            rank: PokerHandRank.ROYAL_FLUSH,
            name: 'Royal Flush',
            tieBreakers: [14],
        };
    }

    // Check for straight flush
    if (flushSuit && straightHigh > 0) {
        return {
            rank: PokerHandRank.STRAIGHT_FLUSH,
            name: 'Straight Flush',
            tieBreakers: [straightHigh],
        };
    }

    // Check for four of a kind
    if (counts[0] === 4) {
        const fourKind = sortedRanks[0];
        const kicker = sortedRanks.find(r => r !== fourKind) || 0;
        return {
            rank: PokerHandRank.FOUR_OF_A_KIND,
            name: 'Four of a Kind',
            tieBreakers: [fourKind, kicker],
        };
    }

    // Check for full house
    if (counts[0] === 3 && counts[1] === 2) {
        const threeKind = sortedRanks[0];
        const pair = sortedRanks.find(r => r !== threeKind && rankCounts.get(r) === 2) || 0;
        return {
            rank: PokerHandRank.FULL_HOUSE,
            name: 'Full House',
            tieBreakers: [threeKind, pair],
        };
    }

    // Check for flush
    if (flushSuit && flushCards.length >= 5) {
        return {
            rank: PokerHandRank.FLUSH,
            name: 'Flush',
            tieBreakers: flushCards.slice(0, 5),
        };
    }

    // Check for straight
    if (straightHigh > 0) {
        return {
            rank: PokerHandRank.STRAIGHT,
            name: 'Straight',
            tieBreakers: [straightHigh],
        };
    }

    // Check for three of a kind
    if (counts[0] === 3) {
        const threeKind = sortedRanks[0];
        const kickers = sortedRanks.filter(r => r !== threeKind).slice(0, 2);
        return {
            rank: PokerHandRank.THREE_OF_A_KIND,
            name: 'Three of a Kind',
            tieBreakers: [threeKind, ...kickers],
        };
    }

    // Check for two pair
    if (counts[0] === 2 && counts[1] === 2) {
        const pairs = sortedRanks.filter(r => rankCounts.get(r) === 2).slice(0, 2);
        const kicker = sortedRanks.find(r => !pairs.includes(r)) || 0;
        return {
            rank: PokerHandRank.TWO_PAIR,
            name: 'Two Pair',
            tieBreakers: [...pairs.sort((a, b) => b - a), kicker],
        };
    }

    // Check for pair
    if (counts[0] === 2) {
        const pair = sortedRanks[0];
        const kickers = sortedRanks.filter(r => r !== pair).slice(0, 3);
        return {
            rank: PokerHandRank.PAIR,
            name: 'Pair',
            tieBreakers: [pair, ...kickers],
        };
    }

    // High card
    return {
        rank: PokerHandRank.HIGH_CARD,
        name: 'High Card',
        tieBreakers: sortedRanks.slice(0, 5),
    };
}

/**
 * Compares two evaluated hands to determine the winner
 * Returns: -1 if hand1 wins, 1 if hand2 wins, 0 if tie
 */
export function compareHands(hand1: EvaluatedHand, hand2: EvaluatedHand): number {
    if (hand1.rank !== hand2.rank) {
        return hand2.rank - hand1.rank; // Higher rank wins
    }

    // Same rank, compare tie breakers
    for (let i = 0; i < Math.max(hand1.tieBreakers.length, hand2.tieBreakers.length); i++) {
        const val1 = hand1.tieBreakers[i] || 0;
        const val2 = hand2.tieBreakers[i] || 0;
        if (val1 !== val2) {
            return val2 - val1; // Higher value wins
        }
    }

    return 0; // Tie
}

