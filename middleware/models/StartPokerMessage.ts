/**
 * @file StartPokerMessage.ts
 * @description Message indicating a request to start a poker game.
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import * as z from 'zod';
import { UserSchema, type User } from './User';

export interface StartPokerMessage {
    user: User; // initiator
}

export const StartPokerMessageSchema = z.object({
    user: UserSchema,
});
