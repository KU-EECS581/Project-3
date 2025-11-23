/**
 * @file UserMessage.ts
 * @description Message carrying a user payload.
 * @class N/A
 * @module User Messages
 * @inputs User identity
 * @outputs Serialized user message schema & type
 * @external_sources zod (schema validation)
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