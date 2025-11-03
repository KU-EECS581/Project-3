/**
 * @file PlayableMap.tsx
 * @description Component representing the playable map area.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import { MAP_ENTITIES, MAP_HEIGHT, MAP_WIDTH } from "@/constants";
import type { MapEntity, PlayerCharacter } from "@/models";
import React, { useState } from "react";
import { useCharacterAnimations } from "@/hooks";
import { useCharacterCollisions } from "@/hooks/useCharacterCollisions";
import "@styles/PlayableMap.css";
import { EntityComponent } from "./EntityComponent";
import { PlayerEntityComponent } from "./PlayerEntityComponent";

interface PlayableMapProps extends React.HTMLAttributes<HTMLDivElement> {
    onMovement?: () => void;
    players: PlayerCharacter[];
    mouseRef: React.RefObject<HTMLDivElement | null>;
    self?: PlayerCharacter;
    onEnterEntity?: (entity: MapEntity) => void;
    onExitEntity?: (entity: MapEntity) => void;
    debug?: boolean;
}

export function PlayableMap({ onMovement, players, mouseRef, hidden, self, onEnterEntity, onExitEntity, debug = false }: PlayableMapProps) {
    const [entities] = useState<MapEntity[]>(MAP_ENTITIES);
    const { animatedPositions } = useCharacterAnimations(players);
    useCharacterCollisions({ entities, onEnterEntity, onExitEntity });

    return (
        <div
            hidden={hidden}
            ref={mouseRef}
            className={`map-container ${debug ? 'debug' : ''}`}
            style={{
                width: `${MAP_WIDTH}px`,
                height: `${MAP_HEIGHT}px`
            }}
            onClick={onMovement}
        >
            {entities.map((entity) => <EntityComponent key={entity.name} entity={entity} debug={debug} /> )}

            {players.map((player) => {
                const animatedPos = animatedPositions.get(player.user.name) || { x: player.x, y: player.y };
                return (
                    <PlayerEntityComponent 
                        player={player} 
                        key={player.user.name} 
                        animatedPos={animatedPos} 
                        debug={debug} 
                    />
                );
            })}
        </div>
    );
}
