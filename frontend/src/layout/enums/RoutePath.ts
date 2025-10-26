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
    GAME_WORLD: "/game",
    CREATE_PLAYER: "/create-character",
} as const;

type RoutePathType = typeof RoutePath[keyof typeof RoutePath];

export { RoutePath, type RoutePathType };
