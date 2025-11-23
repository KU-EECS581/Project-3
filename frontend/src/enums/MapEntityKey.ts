/**
 * @file MapEntityKey.ts
 * @description Enum for map entity key identifiers.
 * @class N/A
 * @module Enums/Map
 * @inputs N/A
 * @outputs MapEntityKey constant & type
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

const MapEntityKey = {
    PLAYER: 'player',
    NPC: 'npc',
    ITEM: 'item',
    GAME_SLOTS: 'slots_game',
    GAME_POKER: 'poker_game',
    GAME_BLACKJACK: 'blackjack_game',
    SHOP: 'shop',
    BANK: 'bank',
    EXIT: 'exit',
} as const;

type MapEntityKeyType = typeof MapEntityKey[keyof typeof MapEntityKey];

export { MapEntityKey, type MapEntityKeyType };