/**
 * @file BlackjackLobbyState.ts
 * @description State of the blackjack lobby/table.
 * @class N/A
 * @module Blackjack Models
 * @inputs N/A
 * @outputs Lobby state schema & types
 * @external_sources zod (schema validation)
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */
import * as z from 'zod';
import { UserSchema } from './User';

export interface BlackjackSeat {
    id: number; // 0-4
    occupant?: {
        user: z.infer<typeof UserSchema>;
        isSpectating: boolean;
        isSittingOut: boolean;
    };
}

export const BlackjackSeatSchema = z.object({
    id: z.number().min(0).max(4),
    occupant: z.object({
        user: UserSchema,
        isSpectating: z.boolean(),
        isSittingOut: z.boolean(),
    }).optional(),
});

export const BlackjackLobbyStateSchema = z.object({
    seats: z.array(BlackjackSeatSchema),
    inGame: z.boolean(),
});

export type BlackjackLobbyState = z.infer<typeof BlackjackLobbyStateSchema>;

