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
    // Track if we've already processed entities when returning to map (to prevent infinite re-entry)
    const hasProcessedInitialEntitiesRef = useRef<boolean>(false);
    
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
            if (active.size > 0) {
                activeEntityNamesRef.current = new Set();
                hasProcessedInitialEntitiesRef.current = false; // Reset when bounding box is cleared
            }
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

        // Special handling: If we're returning to the map and already inside entities,
        // silently add them to active set WITHOUT triggering entry callbacks
        // This prevents infinite re-entry when clicking "Back to Map"
        if (!hasProcessedInitialEntitiesRef.current && current.size > 0 && active.size === 0) {
            // We're on the map for the first time (or returning) and already inside entities
            // Silently add them to active set without triggering callbacks
            console.log('[Collision] Player returned to map already inside entities, silently adding to active set:', Array.from(current));
            activeEntityNamesRef.current = new Set(current);
            hasProcessedInitialEntitiesRef.current = true;
            return; // Don't fire any callbacks
        }

        // Fire callbacks only for actual enters/exits (not when silently initializing)
        if (enters.length && onEnterEntity) enters.forEach(onEnterEntity);
        if (exits.length && onExitEntity) exits.forEach(onExitEntity);

        // Update active set if changed
        const changed = enters.length > 0 || exits.length > 0;
        if (changed) {
            activeEntityNamesRef.current = current;
            hasProcessedInitialEntitiesRef.current = true;
        }
    }, [intersects, boundingBox, entities, onEnterEntity, onExitEntity]);

    return {
        intersects,
    }
}