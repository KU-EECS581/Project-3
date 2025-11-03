/**
 * @file PokerActionMessage.ts
 * @description Message for poker game actions from a client.
 */
import * as z from 'zod';
import { UserSchema } from './User';

export const PokerActionType = [
  'CHECK',
  'CALL',
  'BET',
  'RAISE',
  'FOLD'
] as const;

export type PokerActionType = typeof PokerActionType[number];

export const PokerActionMessageSchema = z.object({
  user: UserSchema,
  action: z.enum(PokerActionType),
  amount: z.number().min(0).optional(),
});

export type PokerActionMessage = z.infer<typeof PokerActionMessageSchema>;
