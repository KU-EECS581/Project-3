/**
 * @file MapEntity.ts
 * @description The model for entities on the map, including shops, games, etc.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import type { MapEntityKeyType } from "@/enums";

export interface MapEntity {
    key: MapEntityKeyType;
    name: string;
    type: 'shop' | 'game' | 'other';
    spritePath?: string;
    
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