/**
 * @file JoinPokerMessage.ts
 * @description Represents a message for joining a poker game.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import * as z from "zod"; 
import { UserSchema, type User } from "./User";
import type { GameMessage } from "./GameMessage";

/**
 * Interface representing a message for joining a poker game.
 */
export interface JoinPokerMessage extends GameMessage {
    user: User;
    gameId: string;
}

export const JoinPokerMessageSchema = z.object({
    user: UserSchema,
    gameId: z.string(), // TODO/CONSIDER: use uuid?
});