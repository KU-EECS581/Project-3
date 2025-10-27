/**
 * @file PlayableMap.tsx
 * @description Component representing the playable map area.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import { CHARACTER_HEIGHT, CHARACTER_WIDTH, MAP_ENTITIES, MAP_HEIGHT, MAP_WIDTH } from "@/constants";
import type { MapEntity, PlayerCharacter } from "@/models";
import React, { useState } from "react";

interface PlayableMapProps extends React.HTMLAttributes<HTMLDivElement> {
    onMovement?: () => void;
    players: PlayerCharacter[];
    mouseRef: React.RefObject<HTMLDivElement | null>;
}

export function PlayableMap({ onMovement, players, mouseRef, hidden }: PlayableMapProps) {
    const [entities] = useState<MapEntity[]>(MAP_ENTITIES);

    return (
        <div
            hidden={hidden}
            ref={mouseRef}
            style={{ position: 'relative', border: '1px solid black', backgroundColor: 'green', width: `${MAP_WIDTH}px`, height: `${MAP_HEIGHT}px`, marginTop: '20px' }} // TODO: move styling to CSS
            onClick={onMovement}
        >
            {entities.map((entity) => (
                <div
                    style={{
                        position: 'absolute',
                        left: `${entity.pos.x}px`,
                        top: `${entity.pos.y}px`,
                        width: `${entity.size.width}px`,
                        height: `${entity.size.height}px`,
                        backgroundColor: 'red', // Placeholder color if sprite fails to load
                    }}>
                    <img
                        key={entity.name}
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