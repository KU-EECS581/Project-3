/**
 * @file BlackjackActionMessage.ts
 * @description Message for blackjack game actions from a client.
 */
import * as z from 'zod';
import { UserSchema } from './User';

export const BlackjackActionType = [
  'HIT',
  'STAND',
  'DOUBLE_DOWN',
  'SPLIT',
  'BET',
  'DEAL',
  'SIT_OUT',
  'SPECTATE'
] as const;

export type BlackjackActionType = typeof BlackjackActionType[number];

export const BlackjackActionMessageSchema = z.object({
  user: UserSchema,
  action: z.enum(BlackjackActionType),
  amount: z.number().min(0).optional(),
  seatId: z.number().min(0).max(4).optional(),
});

export type BlackjackActionMessage = z.infer<typeof BlackjackActionMessageSchema>;

