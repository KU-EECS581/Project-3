/**
 * @file MapEntityKey.ts
 * @description Enum for map entity keys.
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
} as const;

type MapEntityKeyType = typeof MapEntityKey[keyof typeof MapEntityKey];

export { MapEntityKey, type MapEntityKeyType };