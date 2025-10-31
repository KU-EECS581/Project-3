/**
 * @file PokerGameStateMessage.ts
 * @description Message containing poker table state for synchronization.
 */
import * as z from 'zod';
import { CardSchema } from '../cards/Card';
import { UserSchema } from './User';

export const StreetEnum = z.enum(['preflop','flop','turn','river','showdown']);

export const PlayerStateSchema = z.object({
  user: UserSchema,
  chips: z.number(),
  hole: z.array(CardSchema),
  hasFolded: z.boolean(),
  isAllIn: z.boolean(),
  currentBet: z.number(),
});

export const TableStateSchema = z.object({
  players: z.array(PlayerStateSchema),
  community: z.array(CardSchema),
  pot: z.number(),
  street: StreetEnum,
  dealerIndex: z.number(),
  currentPlayerIndex: z.number(),
  currentBet: z.number(),
  minBet: z.number(),
  maxBet: z.number(),
  // Extras for clients
  turnEndsAt: z.number().optional(), // epoch ms when current turn ends
  gameOver: z.boolean().optional(),
  winner: UserSchema.optional(),
});

export type PokerGameStateMessage = z.infer<typeof TableStateSchema>;
