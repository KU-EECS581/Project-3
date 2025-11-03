/**
 * @file UserMessage.ts
 * @description Represents a message for passing a user.
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import * as z from "zod"; 
import { UserSchema, type User } from "./User";

/**
 * Interface representing a message for passing a user.
 */
export interface UserMessage {
    user: User;
}

export const UserMessageSchema = z.object({
    user: UserSchema,
});