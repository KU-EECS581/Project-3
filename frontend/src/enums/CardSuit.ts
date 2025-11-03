/**
 * @file CardSuit.ts
 * @description Enum for playing card suits.
 * @date 2025-01-XX
 */

export const CardSuit = {
    SPADES: 'spades',
    HEARTS: 'hearts',
    DIAMONDS: 'diamonds',
    CLUBS: 'clubs',
} as const;

export type CardSuitType = typeof CardSuit[keyof typeof CardSuit];

