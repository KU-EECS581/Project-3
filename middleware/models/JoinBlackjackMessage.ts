/**
 * @file JoinBlackjackMessage.ts
 * @description Represents a message for joining a blackjack game.
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

