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
    user: {
        name: string;
        balance: number;
        dateCreated: Date;
        dateUpdated: Date;
    };
    x: number;
    y: number;
}
 
export const MovementMessageSchema = z.object({ 
  user: z.object({
    name: z.string(),
    balance: z.number(),
    // Accept either ISO strings or Date instances from the wire
    dateCreated: z.coerce.date(),
    dateUpdated: z.coerce.date(),
  }),
  x: z.number(),
  y: z.number()
});