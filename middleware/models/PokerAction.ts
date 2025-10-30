/**
 * @file PokerAction.ts
 * @description Defines poker action messages and types.
 * @author GitHub Copilot
 * @date 2025-10-30
 */

import * as z from 'zod';
import { UserSchema } from './User';

export type PokerActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise';

export const PokerActionSchema = z.object({
    user: UserSchema,
    actionType: z.enum(['fold', 'check', 'call', 'bet', 'raise']),
    amount: z.number().optional(), // for bet/raise
});

export type PokerAction = z.infer<typeof PokerActionSchema>;
