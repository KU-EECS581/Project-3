/**
 * @file JoinPokerMessage.ts
 * @description Message for joining a poker game.
 * @class N/A
 * @module Poker Messages
 * @inputs User identity
 * @outputs Serialized join poker message schema & type
 * @external_sources zod (schema validation)
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import * as z from "zod"; 
import { UserSchema, type User } from "./User";

/**
 * Interface representing a message for joining a poker game.
 */
export interface JoinPokerMessage {
    user: User;
}

export const JoinPokerMessageSchema = z.object({
    user: UserSchema,
});