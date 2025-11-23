/**
 * @file Card.ts
 * @description Playing card model + value helpers.
 * @class N/A
 * @module Models/Cards
 * @inputs Suit & rank types
 * @outputs Card interface & helper functions
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-01-XX
 */

import type { CardSuitType, CardRankType } from "@/enums";

export interface Card {
    suit: CardSuitType;
    rank: CardRankType;
}

/**
 * Gets the numeric value of a card rank for blackjack scoring.
 * Aces return 11 (handling soft/hard aces is game logic).
 */
export function getCardValue(rank: CardRankType): number {
    switch (rank) {
        case 'ace':
            return 11; // Caller should handle soft/hard ace logic
        case 'jack':
        case 'queen':
        case 'king':
            return 10;
        default:
            return parseInt(rank, 10);
    }
}

/**
 * Checks if a card is a face card (Jack, Queen, King).
 */
export function isFaceCard(rank: CardRankType): boolean {
    return rank === 'jack' || rank === 'queen' || rank === 'king';
}

/**
 * Checks if a card is an Ace.
 */
export function isAce(rank: CardRankType): boolean {
    return rank === 'ace';
}

