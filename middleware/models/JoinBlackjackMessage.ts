/**
 * @file JoinBlackjackMessage.ts
 * @description Message for joining a blackjack game (optional seat selection).
 * @class N/A
 * @module Blackjack Messages
 * @inputs User identity, optional seatId
 * @outputs Serialized join blackjack message schema & type
 * @external_sources zod (schema validation)
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import * as z from "zod"; 
import { UserSchema, type User } from "./User";

/**
 * Interface representing a message for joining a blackjack game.
 */
export interface JoinBlackjackMessage {
    user: User;
    seatId?: number; // 0-4 for seat selection
}

export const JoinBlackjackMessageSchema = z.object({
    user: UserSchema,
    seatId: z.number().min(0).max(4).optional(),
});

