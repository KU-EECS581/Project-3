/**
 * @file GameMessage.ts
 * @description Generic, versioned WebSocket message envelope with typed payload.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import * as z from 'zod';
import { GameMessageKeys, type GameMessageKeyType } from "../enums";
import { MovementMessageSchema, type MovementMessage } from './MovementMessage';
import { JoinPokerMessageSchema, type JoinPokerMessage } from './JoinPokerMessage';
import { PokerLobbyStateSchema, type PokerLobbyState } from './PokerLobbyState';
import { StartPokerMessageSchema, type StartPokerMessage } from './StartPokerMessage';
import { PokerActionSchema, type PokerAction } from './PokerAction';
import { PokerStateSchema, type PokerState } from './PokerState';

export const MESSAGE_VERSION = 1 as const;

// Base envelope (without payload shape)
export interface GameMessage<P = unknown, K extends GameMessageKeyType = GameMessageKeyType> {
    key: K;
    v: typeof MESSAGE_VERSION;
    payload: P;
    ts?: number; // epoch ms
    requestId?: string; // optional correlation id (uuid)
    lobbyId?: string; // optional lobby routing
}

export const GameMessageBaseSchema = z.object({
    key: z.enum(GameMessageKeys),
    v: z.literal(MESSAGE_VERSION),
    ts: z.number().optional(),
    requestId: z.string().uuid().optional(),
    lobbyId: z.string().optional(),
});

// Any message (unknown payload)
export const AnyGameMessageSchema = GameMessageBaseSchema.extend({
    payload: z.unknown(),
});

// Helper to create a typed schema for a specific key + payload schema
export function createGameMessageSchema<
    P extends z.ZodTypeAny,
    K extends GameMessageKeyType
>(key: K, payloadSchema: P) {
    return GameMessageBaseSchema.extend({
        key: z.literal(key),
        payload: payloadSchema,
    });
}

// Typed message helpers for common messages
export type MoveGameMessage = GameMessage<MovementMessage, 'MOVE'>;
export const MoveGameMessageSchema = createGameMessageSchema('MOVE', MovementMessageSchema);

export type JoinPokerGameMessage = GameMessage<JoinPokerMessage, 'JOIN_POKER'>;
export const JoinPokerGameMessageSchema = createGameMessageSchema('JOIN_POKER', JoinPokerMessageSchema);

export type LeavePokerGameMessage = GameMessage<JoinPokerMessage, 'LEAVE_POKER'>;
export const LeavePokerGameMessageSchema = createGameMessageSchema('LEAVE_POKER', JoinPokerMessageSchema);

export type StartPokerGameMessage = GameMessage<StartPokerMessage, 'START_POKER'>;
export const StartPokerGameMessageSchema = createGameMessageSchema('START_POKER', StartPokerMessageSchema);

export type PokerLobbyStateGameMessage = GameMessage<PokerLobbyState, 'POKER_LOBBY_STATE'>;
export const PokerLobbyStateGameMessageSchema = createGameMessageSchema('POKER_LOBBY_STATE', PokerLobbyStateSchema);

export type PokerActionGameMessage = GameMessage<PokerAction, 'POKER_ACTION'>;
export const PokerActionGameMessageSchema = createGameMessageSchema('POKER_ACTION', PokerActionSchema);

export type PokerStateGameMessage = GameMessage<PokerState, 'POKER_STATE'>;
export const PokerStateGameMessageSchema = createGameMessageSchema('POKER_STATE', PokerStateSchema);