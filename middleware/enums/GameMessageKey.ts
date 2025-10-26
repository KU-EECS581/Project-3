/**
 * @file GameMessageType.ts
 * @description An enum of game message types.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

const GameMessageKey = {
    JOIN: "JOIN",
    DISCONNECT: "DISCONNECT",
    MOVE: "MOVE",
    JOIN_POKER: "JOIN_POKER"
} as const;

type GameMessageKeyType = typeof GameMessageKey[keyof typeof GameMessageKey];

export { GameMessageKey, type GameMessageKeyType };