/**
 * @file constants.ts
 * @description Frontend constants (map entities, defaults, user placeholders).
 * @class N/A
 * @module Frontend Constants
 * @inputs N/A
 * @outputs Exported constant values & arrays
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import type { User } from "~middleware/models";
import type { MapEntity, MapEntitySize } from "./models";
import { MapEntityKey } from "./enums";
import { RoutePath } from "./layout/enums";

export const USER_DATA_KEY = "userData";
export const DEFAULT_HOST = "localhost";
export const DEFAULT_PORT = 51337; // Default port for LAN multiplayer
export const DEFAULT_USER: User = { name: 'Player1', balance: 1000, dateCreated: new Date(), dateUpdated: new Date() }; // Placeholder user

export const CHARACTER_MOVEMENT_DELAY_MS = 500;
export const CHARACTER_WIDTH = 24;
export const CHARACTER_HEIGHT = 24;

export const MAP_WIDTH = 768; // Based on the placeholder image
export const MAP_HEIGHT = 512; // Based on the placeholder image

// Basically the spawnpoint
// Swapped center-spawning for specific spawnpoint (cave entrance)
export const DEFAULT_CHARACTER_X = 170; //MAP_WIDTH/2 - CHARACTER_WIDTH/2;
export const DEFAULT_CHARACTER_Y = 100; //MAP_HEIGHT/2 - CHARACTER_HEIGHT/2;

export const BANK_FUNDS_AMOUNT = 100;

export const DEFAULT_MAP_ENTITY_SIZE: MapEntitySize = {
    width: 64,
    height: 64,
}

export const MAP_ENTITIES: MapEntity[] = [
    {
        key: MapEntityKey.SHOP,
        name: "Shop",
        type: "shop",
        spritePath: "/assets/sprites/shop.png",
        route: RoutePath.MAP_SHOP,
        pos: { x: 200, y: 425 },
        size: DEFAULT_MAP_ENTITY_SIZE,
    },
    {
        key: MapEntityKey.BANK,
        name: "Bank",
        type: "shop",
        spritePath: "/assets/sprites/bank.png",
        route: RoutePath.MAP_BANK,
        pos: { x: 300, y: 100 },
        size: {
            width: 150,
            height: 60
        },
    },
    {
        key: MapEntityKey.GAME_POKER,
        name: "Poker Table",
        type: "game",
        spritePath: "/assets/sprites/poker_table.png",
        route: RoutePath.MAP_POKER,
        pos: { x: 15, y: 125 },
        size: {
            width: 125,
            height: 90,
        },
    },
    {
        key: MapEntityKey.GAME_BLACKJACK,
        name: "Blackjack Table",
        type: "game",
        spritePath: "/assets/sprites/blackjack_table.png",
        route: RoutePath.MAP_BLACKJACK,
        pos: { x: 10, y: 275 },
        size: {
            width: 170,
            height: 125,
        },
    },
    {
        key: MapEntityKey.GAME_SLOTS,
        name: "Slot Machine",
        type: "game",
        spritePath: "/assets/sprites/slot_machine.png",
        route: RoutePath.MAP_SLOTS,
        pos: { x: 525, y: 60 },
        size: {
            width: 210,
            height: 125,
        },
    },
    {
        key: MapEntityKey.EXIT,
        name: "Exit",
        type: "exit",
        spritePath: "/assets/sprites/exit.png",
        pos: { x: 110, y: 5 },
        size: {
            width: 100,
            height: 85,
        },
    }
]