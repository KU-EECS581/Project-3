/**
 * @file CardRank.ts
 * @description Enum for playing card ranks.
 * @class N/A
 * @module Enums/Cards
 * @inputs N/A
 * @outputs CardRank constant & type
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-01-XX
 */

export const CardRank = {
    ACE: 'ace',
    TWO: '2',
    THREE: '3',
    FOUR: '4',
    FIVE: '5',
    SIX: '6',
    SEVEN: '7',
    EIGHT: '8',
    NINE: '9',
    TEN: '10',
    JACK: 'jack',
    QUEEN: 'queen',
    KING: 'king',
} as const;

export type CardRankType = typeof CardRank[keyof typeof CardRank];

