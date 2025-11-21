/**
 * @file GameMessage.ts
 * @description Generic, versioned WebSocket message envelope with typed payload.
 * @class N/A
 * @module Messages
 * @inputs Key, version, payload object
 * @outputs Message schemas, envelope types
 * @external_sources zod (schema validation)
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import * as z from 'zod';
import { GameMessageKeys, type GameMessageKeyType } from "../enums";
import { MovementMessageSchema, type MovementMessage } from './MovementMessage';
import { JoinPokerMessageSchema, type JoinPokerMessage } from './JoinPokerMessage';
import { PokerLobbyStateSchema, type PokerLobbyState } from './PokerLobbyState';
import { StartPokerMessageSchema, type StartPokerMessage } from './StartPokerMessage';
import { JoinBlackjackMessageSchema, type JoinBlackjackMessage } from './JoinBlackjackMessage';
import { BlackjackLobbyStateSchema, type BlackjackLobbyState } from './BlackjackLobbyState';
import { BlackjackGameStateSchema, type BlackjackGameStateMessage } from './BlackjackGameStateMessage';
import { BlackjackActionMessageSchema, type BlackjackActionMessage } from './BlackjackActionMessage';

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

// END_POKER uses the same simple payload shape as Join/Leave (user announces intent)
export type EndPokerGameMessage = GameMessage<JoinPokerMessage, 'END_POKER'>;
export const EndPokerGameMessageSchema = createGameMessageSchema('END_POKER', JoinPokerMessageSchema);

export type PokerLobbyStateGameMessage = GameMessage<PokerLobbyState, 'POKER_LOBBY_STATE'>;
export const PokerLobbyStateGameMessageSchema = createGameMessageSchema('POKER_LOBBY_STATE', PokerLobbyStateSchema);

// Blackjack message schemas
export type JoinBlackjackGameMessage = GameMessage<JoinBlackjackMessage, 'JOIN_BLACKJACK'>;
export const JoinBlackjackGameMessageSchema = createGameMessageSchema('JOIN_BLACKJACK', JoinBlackjackMessageSchema);

export type LeaveBlackjackGameMessage = GameMessage<JoinBlackjackMessage, 'LEAVE_BLACKJACK'>;
export const LeaveBlackjackGameMessageSchema = createGameMessageSchema('LEAVE_BLACKJACK', JoinBlackjackMessageSchema);

export type BlackjackLobbyStateGameMessage = GameMessage<BlackjackLobbyState, 'BLACKJACK_LOBBY_STATE'>;
export const BlackjackLobbyStateGameMessageSchema = createGameMessageSchema('BLACKJACK_LOBBY_STATE', BlackjackLobbyStateSchema);

export type BlackjackGameStateGameMessage = GameMessage<BlackjackGameStateMessage, 'BLACKJACK_GAME_STATE'>;
export const BlackjackGameStateGameMessageSchema = createGameMessageSchema('BLACKJACK_GAME_STATE', BlackjackGameStateSchema);