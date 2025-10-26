/**
 * @file MovementMessage.ts
 * @description Represents a movement message with x and y coordinates.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import * as z from "zod"; 
import { UserSchema, type User } from "./User";

/**
 * Interface representing a movement message with x and y coordinates.
 */
export interface MovementMessage {
    user: User;
    x: number;
    y: number;
}
 
export const MovementMessageSchema = z.object({ 
  user: UserSchema,
  x: z.number(),
  y: z.number()
});