/**
 * @file BlackjackGameStateMessage.ts
 * @description State of the blackjack game.
 */
import * as z from 'zod';
import { CardSchema } from '../cards';
import { UserSchema } from './User';

export const BlackjackHandSchema = z.object({
    cards: z.array(CardSchema),
    bet: z.number(),
    isStanding: z.boolean(),
    isBusted: z.boolean(),
    isBlackjack: z.boolean(),
    value: z.number(),
});

export const BlackjackPlayerStateSchema = z.object({
    user: UserSchema,
    seatId: z.number(),
    hand: BlackjackHandSchema.optional(),
    bet: z.number(),
    isActive: z.boolean(),
    isFinished: z.boolean(),
});

export const BlackjackGameStateSchema = z.object({
    phase: z.enum(['waiting', 'betting', 'dealing', 'player_turn', 'dealer_turn', 'finished']),
    dealerHand: z.array(CardSchema),
    dealerVisible: z.boolean(),
    players: z.array(BlackjackPlayerStateSchema),
    currentPlayerId: z.string().nullable(),
    turnEndsAt: z.number().optional(), // epoch ms when current turn ends
    roundNumber: z.number(),
});

export type BlackjackGameStateMessage = z.infer<typeof BlackjackGameStateSchema>;

