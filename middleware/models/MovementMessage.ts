/**
 * @file MovementMessage.ts
 * @description Represents a movement message with x and y coordinates.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import * as z from "zod"; 

/**
 * Interface representing a movement message with x and y coordinates.
 */
export interface MovementMessage {
    x: number;
    y: number;
}
 
export const MovementMessageSchema = z.object({ 
  x: z.number(),
  y: z.number()
});