/**
 * @file PlayableMap.tsx
 * @description Component representing the playable map area.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import type { PlayerCharacter } from "@/models";
import React from "react";

interface PlayableMapProps extends React.HTMLAttributes<HTMLDivElement> {
    onMovement?: () => void;
    players: PlayerCharacter[];
    mouseRef: React.RefObject<HTMLDivElement | null>;
}

export const PlayableMap = React.forwardRef<HTMLDivElement, PlayableMapProps>(({ onMovement, players, mouseRef, hidden}) => {
    // Positioning is relative to the map container

    return (
        <div
            hidden={hidden}
            ref={mouseRef}
            style={{ position: 'relative', border: '1px solid black', backgroundColor: 'green', width: '500px', height: '500px', marginTop: '20px' }} // TODO: move styling to CSS
            onClick={onMovement}
        >
            {players.map((player) => (
                <div
                    key={player.user.id}
                    style={{
                        position: 'absolute',
                        left: `${player.x}px`,
                        top: `${player.y}px`,
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'blue',
                        color: 'white',
                    }}
                >
                    {player.user.name}
                </div>
            ))}
        </div>
    );
});