/**
 * @file types.ts
 * @description Basic poker types and helpers used by the client UI.
 */

import type { User } from "~middleware/models";

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'T'|'J'|'Q'|'K'|'A';

export interface Card {
    rank: Rank;
    suit: Suit;
}

export interface PlayerState {
    user: User;
    chips: number;
    hole: Card[]; // 0-2
    hasFolded: boolean;
    isAllIn: boolean;
    currentBet: number;
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface TableState {
    players: PlayerState[];
    community: Card[]; // 0-5
    pot: number;
    street: Street;
    dealerIndex: number;
    currentPlayerIndex: number;
    currentBet: number; // highest bet this street
    minBet: number;
    maxBet: number;
}

export function isRedSuit(suit: Suit) {
    return suit === '♥' || suit === '♦';
}
