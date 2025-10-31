/**
 * @file poker.ts
 * @description Exports types and interfaces related to poker games.
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import { type User } from "../../models";
import { Card } from "../Card";

export const Street = {
    Preflop: 'preflop',
    Flop: 'flop',
    Turn: 'turn',
    River: 'river',
    Showdown: 'showdown'
} as const;

export type Street = typeof Street[keyof typeof Street];

export interface PlayerState {
    user: User;
    chips: number;
    hole: Card[]; // 0-2
    hasFolded: boolean;
    isAllIn: boolean;
    currentBet: number;
}

export interface TableState {
    players: PlayerState[];
    community: Card[]; // 0-5
    pot: number;
    street: Street;
    dealerIndex: number;
    currentPlayerIndex: number;
    /**
     * First player to act on this street (normally left of dealer).
     * Used to determine completion when no bets occur (check-around case).
     */
    streetStartIndex: number;
    /** Index of the last player who made a bet or raise this street. */
    lastAggressorIndex?: number;
    currentBet: number; // highest bet this street
    minBet: number;
    maxBet: number;
}
