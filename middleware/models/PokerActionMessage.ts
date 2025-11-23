/**
 * @file PokerActionMessage.ts
 * @description Message for poker game actions from a client.
 * @class N/A
 * @module Poker Messages
 * @inputs User, action type, optional amount
 * @outputs Serialized poker action message schema & type
 * @external_sources zod (schema validation)
 * @author Riley Meyerkorth
 * @date 2025-10-28
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
