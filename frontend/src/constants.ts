/**
 * @file constants.ts
 * @description Barrel file for constants.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import type { User } from "~middleware/models";

export const USER_DATA_KEY = "userData";
export const DEFAULT_HOST = "localhost";
export const DEFAULT_PORT = -1; // Invalid port to force user input
export const DEFAULT_USER: User = { name: 'Player1', balance: 1000, dateCreated: new Date(), dateUpdated: new Date() }; // Placeholder user
export const DEFAULT_CHARACTER_X = 50;
export const DEFAULT_CHARACTER_Y = 50;