/**
 * @file PlayerCharacter.ts
 * @description Player character position + user association model.
 * @class N/A
 * @module Models/Player
 * @inputs User reference, x/y coordinates
 * @outputs PlayerCharacter interface
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import type { User } from "~middleware/models";

export interface PlayerCharacter {
    user: User;
    x: number;
    y: number;
}