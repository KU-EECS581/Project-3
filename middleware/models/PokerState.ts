/**
 * @file PokerState.ts
 * @description Defines the poker game state message.
 * @author GitHub Copilot
 * @date 2025-10-30
 */

import * as z from 'zod';
import { UserSchema } from './User';

// Card schema
const CardSchema = z.object({
    suit: z.enum(['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES']),
    rank: z.enum(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'JACK', 'QUEEN', 'KING', 'ACE']),
});

// Player state schema
const PlayerStateSchema = z.object({
    user: UserSchema,
    chips: z.number(),
    hole: z.array(CardSchema),
    hasFolded: z.boolean(),
    isAllIn: z.boolean(),
    currentBet: z.number(),
});

// Poker game state schema
export const PokerStateSchema = z.object({
    players: z.array(PlayerStateSchema),
    community: z.array(CardSchema),
    pot: z.number(),
    street: z.enum(['preflop', 'flop', 'turn', 'river', 'showdown']),
    dealerIndex: z.number(),
    currentPlayerIndex: z.number(),
    currentBet: z.number(),
    minBet: z.number(),
    maxBet: z.number(),
});

export type PokerState = z.infer<typeof PokerStateSchema>;
