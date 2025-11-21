/**
 * @file PokerLobbyState.ts
 * @description State of a poker lobby broadcast to clients.
 * @class N/A
 * @module Poker Models
 * @inputs N/A
 * @outputs Lobby state schema & interface
 * @external_sources zod (schema validation)
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import * as z from 'zod';
import { UserSchema, type User } from './User';
import { type PokerGameSettings } from './PokerGameSettings';

export interface PokerLobbyState {
    players: User[];
    settings: PokerGameSettings;
    inGame: boolean;
}

export const PokerLobbyStateSchema = z.object({
    players: z.array(UserSchema),
    settings: z.object({
        minBet: z.number(),
        maxBet: z.number(),
    }),
    inGame: z.boolean(),
});
