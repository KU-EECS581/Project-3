/**
 * @file constants.ts
 * @description Barrel file for constants.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import type { User } from "~middleware/models";
import type { MapEntity, MapEntitySize } from "./models";
import { MapEntityKey } from "./enums";
import { RoutePath } from "./layout/enums";

export const USER_DATA_KEY = "userData";
export const DEFAULT_HOST = "localhost";
export const DEFAULT_PORT = -1; // Invalid port to force user input
export const DEFAULT_USER: User = { name: 'Player1', balance: 1000, dateCreated: new Date(), dateUpdated: new Date() }; // Placeholder user

export const CHARACTER_MOVEMENT_DELAY_MS = 500;
export const CHARACTER_WIDTH = 32;
export const CHARACTER_HEIGHT = 32;

export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 600;

export const DEFAULT_CHARACTER_X = MAP_WIDTH/2 - CHARACTER_WIDTH/2;
export const DEFAULT_CHARACTER_Y = MAP_HEIGHT/2 - CHARACTER_HEIGHT/2;

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
        pos: { x: 100, y: 100 },
        size: DEFAULT_MAP_ENTITY_SIZE,
    },
    {
        key: MapEntityKey.BANK,
        name: "Bank",
        type: "shop",
        spritePath: "/assets/sprites/bank.png",
        route: RoutePath.MAP_BANK,
        pos: { x: 100, y: 400 },
        size: DEFAULT_MAP_ENTITY_SIZE,
    },
    {
        key: MapEntityKey.BANK,
        name: "Poker Table",
        type: "game",
        spritePath: "/assets/sprites/poker_table.png",
        route: RoutePath.MAP_POKER,
        pos: { x: 125, y: 300 },
        size: DEFAULT_MAP_ENTITY_SIZE,
    },
    {
        key: MapEntityKey.GAME_BLACKJACK,
        name: "Blackjack Table",
        type: "game",
        spritePath: "/assets/sprites/blackjack_table.png",
        route: RoutePath.MAP_BLACKJACK,
        pos: { x: 700, y: 200 },
        size: DEFAULT_MAP_ENTITY_SIZE,
    },
    {
        key: MapEntityKey.GAME_SLOTS,
        name: "Slot Machine",
        type: "game",
        spritePath: "/assets/sprites/slot_machine.png",
        route: RoutePath.MAP_SLOTS,
        pos: { x: 600, y: 500 },
        size: DEFAULT_MAP_ENTITY_SIZE,
    }
]