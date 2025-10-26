/**
 * @file index.ts
 * @description Barrel file for custom hooks.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import z from "zod";

/**
 * The user model interface. Holds basic user information.
 */
export interface User {
    name: string;
    balance: number;
    dateCreated: Date;
    dateUpdated: Date;
}

export const UserSchema = z.object({ 
    name: z.string(),
    balance: z.number(),
    dateCreated: z.coerce.date(),
    dateUpdated: z.coerce.date(),
});