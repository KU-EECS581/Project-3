/**
 * @file CardSuit.ts
 * @description Enum for playing card suits.
 * @class N/A
 * @module Enums/Cards
 * @inputs N/A
 * @outputs CardSuit constant & type
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-01-XX
 */

export const CardSuit = {
    SPADES: 'spades',
    HEARTS: 'hearts',
    DIAMONDS: 'diamonds',
    CLUBS: 'clubs',
} as const;

export type CardSuitType = typeof CardSuit[keyof typeof CardSuit];

