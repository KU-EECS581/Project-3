/**
 * @file index.ts
 * @description Barrel file for custom hooks.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

/**
 * The user model interface. Holds basic user information.
 */
export interface User {
    name: string;
    balance: number;
    dateCreated: Date;
    dateUpdated: Date;
}