/**
 * @file poker.ts
 * @description Exports types and interfaces related to poker games.
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import { type User } from "../../models";
import { Card } from "../Card";

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

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
    currentBet: number; // highest bet this street
    minBet: number;
    maxBet: number;
}
