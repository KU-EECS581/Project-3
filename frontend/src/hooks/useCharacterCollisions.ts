/**
 * @file useCharacterCollisions.ts
 * @description Custom hook for managing character collisions on the playable map.
 * @author Riley Meyerkorth
 * @date 2025-10-27
 */

import type { BoundingBox, MapEntity } from "@/models";
import { useCallback, useEffect, useRef } from "react";
import { useCharacter } from "./useCharacter";

interface UseCharacterCollisionsParams {
    entities: MapEntity[];
    onEnterEntity?: (entity: MapEntity) => void;
    onExitEntity?: (entity: MapEntity) => void;
}

export function useCharacterCollisions({ entities, onEnterEntity, onExitEntity }: UseCharacterCollisionsParams) {
    const { boundingBox } = useCharacter(); // Current player's bounding box

    // Track which entities we're currently inside to avoid re-firing events (ref avoids rerenders)
    const activeEntityNamesRef = useRef<Set<string>>(new Set());
    
    // Axis-aligned bounding box intersection
    const intersects = useCallback((a: BoundingBox, b: BoundingBox) =>
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y, []);

    useEffect(() => {
        // If hidden or no self, treat as exiting all
        const active = activeEntityNamesRef.current;
        if (!boundingBox) {
            if (active.size > 0 && onExitEntity) {
                for (const name of active) {
                    const e = entities.find((x) => x.name === name);
                    if (e) onExitEntity(e);
                }
            }
            if (active.size > 0) activeEntityNamesRef.current = new Set();
            return;
        }

        // Determine which entities we're currently overlapping
        const current = new Set<string>();
        const currentEntities: MapEntity[] = [];
        for (const e of entities) {
            const rect: BoundingBox = { x: e.pos.x, y: e.pos.y, width: e.size.width, height: e.size.height };
            if (intersects(boundingBox, rect)) {
                current.add(e.name);
                currentEntities.push(e);
            }
        }

        // Compute enters and exits
        const enters: MapEntity[] = [];
        const exits: MapEntity[] = [];

        // Enter if in current but not in active
        for (const e of currentEntities) {
            if (!active.has(e.name)) enters.push(e);
        }

        // Exit if in active but not in current
        for (const name of active) {
            if (!current.has(name)) {
                const e = entities.find((x) => x.name === name);
                if (e) exits.push(e);
            }
        }

        // Fire callbacks
        if (enters.length && onEnterEntity) enters.forEach(onEnterEntity);
        if (exits.length && onExitEntity) exits.forEach(onExitEntity);

        // Update active set if changed
        const changed = enters.length > 0 || exits.length > 0;
        if (changed) activeEntityNamesRef.current = current;
    }, [intersects, boundingBox, entities, onEnterEntity, onExitEntity]);

    return {
        intersects,
    }
}