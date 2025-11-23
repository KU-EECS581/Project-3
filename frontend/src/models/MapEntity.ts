/**
 * @file MapEntity.ts
 * @description Map entity model (shops, games, exits) with position & size.
 * @class N/A
 * @module Models/Map
 * @inputs Key/type, position, size, optional route/sprite
 * @outputs MapEntity interface & related types
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import type { MapEntityKeyType } from "@/enums";

export interface MapEntity {
    key: MapEntityKeyType;
    name: string;
    type: 'shop' | 'game' | 'exit' | 'other';
    spritePath?: string;
    route?: string;
    
    pos: MapPosition;
    size: MapEntitySize;
}

export interface MapPosition {
    x: number;
    y: number;
}

export interface MapEntitySize {
    width: number;
    height: number;
}