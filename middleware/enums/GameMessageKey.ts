/**
 * @file GameMessageType.ts
 * @description An enum of game message types.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

// Use a const tuple + derived union to stay compatible with `erasableSyntaxOnly`
export const GameMessageKeys = [
    "JOIN",
    "DISCONNECT",
    "MOVE",
    "JOIN_POKER",
    "LEAVE_POKER",
    "START_POKER",
    "POKER_LOBBY_STATE"
] as const;

export type GameMessageKeyType = typeof GameMessageKeys[number];

// Convenience map for readable access (e.g., GameMessageKey.MOVE)
export const GameMessageKey: Record<GameMessageKeyType, GameMessageKeyType> = {
    JOIN: "JOIN",
    DISCONNECT: "DISCONNECT",
    MOVE: "MOVE",
    JOIN_POKER: "JOIN_POKER",
    LEAVE_POKER: "LEAVE_POKER",
    START_POKER: "START_POKER",
    POKER_LOBBY_STATE: "POKER_LOBBY_STATE"
};