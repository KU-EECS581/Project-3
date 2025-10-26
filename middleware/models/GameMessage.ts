/**
 * @file GameMessage.ts
 * @description Represents a generic game message.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import z from 'zod';
import { GameMessageKey, type GameMessageKeyType } from "../enums";

export interface GameMessage {
    key: GameMessageKeyType;
}

export const GameMessageSchema = z.object({
    key: z.enum(GameMessageKey)
});