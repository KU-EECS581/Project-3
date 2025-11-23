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
    "END_POKER",
    "POKER_LOBBY_STATE",
    // New keys for poker game synchronization
    "POKER_GAME_STATE",
    "POKER_ACTION",
    // Blackjack multiplayer keys
    "JOIN_BLACKJACK",
    "LEAVE_BLACKJACK",
    "BLACKJACK_LOBBY_STATE",
    "BLACKJACK_GAME_STATE",
    "BLACKJACK_ACTION"
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
    END_POKER: "END_POKER",
    POKER_LOBBY_STATE: "POKER_LOBBY_STATE",
    POKER_GAME_STATE: "POKER_GAME_STATE",
    POKER_ACTION: "POKER_ACTION",
    JOIN_BLACKJACK: "JOIN_BLACKJACK",
    LEAVE_BLACKJACK: "LEAVE_BLACKJACK",
    BLACKJACK_LOBBY_STATE: "BLACKJACK_LOBBY_STATE",
    BLACKJACK_GAME_STATE: "BLACKJACK_GAME_STATE",
    BLACKJACK_ACTION: "BLACKJACK_ACTION"
};