/**
 * @file RoutePath.ts
 * @description An enum containing route paths for the application to reduce hardcoding.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

// NOTE: apparently, TypeScript enums are not being used anymore in modern TS/JS development.
// We'll use an object instead.
const RoutePath = {
    HOME: "/",
    JOIN_GAME: "/join",
    CREATE_PLAYER: "/create-character",
    MAP: "/game",
    MAP_POKER: "/game/poker",
    MAP_BLACKJACK: "/game/blackjack",
    MAP_SLOTS: "/game/slots",
    MAP_SHOP: "/game/shop",
    MAP_BANK: "/game/bank",
} as const;

type RoutePathType = typeof RoutePath[keyof typeof RoutePath];

export { RoutePath, type RoutePathType };
