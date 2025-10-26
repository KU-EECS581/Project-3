/**
 * @file PlayerCharacter.ts
 * @description Barrel file for player character models.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import type { User } from "~middleware/models";

export interface PlayerCharacter {
    user: User;
    x: number;
    y: number;
}