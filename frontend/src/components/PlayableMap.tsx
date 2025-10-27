/**
 * @file PlayableMap.tsx
 * @description Component representing the playable map area.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import { CHARACTER_HEIGHT, CHARACTER_WIDTH, MAP_ENTITIES, MAP_HEIGHT, MAP_WIDTH } from "@/constants";
import type { MapEntity, PlayerCharacter } from "@/models";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface PlayableMapProps extends React.HTMLAttributes<HTMLDivElement> {
    onMovement?: () => void;
    players: PlayerCharacter[];
    mouseRef: React.RefObject<HTMLDivElement | null>;
    /** The current player's character; used for collision detection with entities */
    self?: PlayerCharacter;
    /** Called once when self enters an entity's bounds */
    onEnterEntity?: (entity: MapEntity) => void;
    /** Called once when self exits an entity's bounds */
    onExitEntity?: (entity: MapEntity) => void;
}

export function PlayableMap({ onMovement, players, mouseRef, hidden, self, onEnterEntity, onExitEntity }: PlayableMapProps) {
    const [entities] = useState<MapEntity[]>(MAP_ENTITIES);

    // Track which entities we're currently inside to avoid re-firing events (ref avoids rerenders)
    const activeEntityNamesRef = useRef<Set<string>>(new Set());

    const selfRect = useMemo(() => {
        if (!self) return undefined;
        return {
            x: self.x,
            y: self.y,
            w: CHARACTER_WIDTH,
            h: CHARACTER_HEIGHT,
        } as const;
    }, [self]);

    // Axis-aligned bounding box intersection
    const intersects = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
        a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    useEffect(() => {
        // If hidden or no self, treat as exiting all
        const active = activeEntityNamesRef.current;
        if (hidden || !selfRect) {
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
            const rect = { x: e.pos.x, y: e.pos.y, w: e.size.width, h: e.size.height };
            if (intersects(selfRect, rect)) {
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
    }, [hidden, selfRect, entities, onEnterEntity, onExitEntity]);

    return (
        <div
            hidden={hidden}
            ref={mouseRef}
            style={{ position: 'relative', border: '1px solid black', backgroundColor: 'green', width: `${MAP_WIDTH}px`, height: `${MAP_HEIGHT}px`, marginTop: '20px' }} // TODO: move styling to CSS
            onClick={onMovement}
        >
            {entities.map((entity) => (
                <div
                    key={entity.name}
                    style={{
                        position: 'absolute',
                        left: `${entity.pos.x}px`,
                        top: `${entity.pos.y}px`,
                        width: `${entity.size.width}px`,
                        height: `${entity.size.height}px`,
                        backgroundColor: 'red', // Placeholder color if sprite fails to load
                    }}>
                    <img
                        src={entity.spritePath}
                        alt={entity.name}
                        style={{
                            width: `${entity.size.width}px`,
                            height: `${entity.size.height}px`,
                        }}
                    />
                </div>
            ))}

            {players.map((player) => (
                <div
                    key={player.user.name}
                    style={{
                        position: 'absolute',
                        left: `${player.x}px`,
                        top: `${player.y}px`,
                        width: `${CHARACTER_WIDTH}px`,
                        height: `${CHARACTER_HEIGHT}px`,
                        backgroundColor: 'blue',
                        color: 'white',
                    }}
                >
                    {player.user.name}
                </div>
            ))}
        </div>
    );
}