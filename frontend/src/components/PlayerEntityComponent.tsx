/**
 * @file PlayerEntityComponent.tsx
 * @description Component representing a player entity.
 * @author Riley Meyerkorth
 * @date 2025-10-27
 */

import { CHARACTER_HEIGHT, CHARACTER_MOVEMENT_DELAY_MS, CHARACTER_WIDTH } from "@/constants";
import type { PlayerCharacter } from "@/models";

interface PlayerEntityComponentProps {
    player: PlayerCharacter;
    debug?: boolean;
    animatedPos: { x: number; y: number; }; // TODO/CONSIDER: use model?
    movementDelayMs?: number;
    characterWidth?: number;
    characterHeight?: number;
}

export function PlayerEntityComponent({ 
    player, 
    animatedPos, 
    debug = false,
    movementDelayMs = CHARACTER_MOVEMENT_DELAY_MS,
    characterWidth = CHARACTER_WIDTH,
    characterHeight = CHARACTER_HEIGHT 
}: PlayerEntityComponentProps) {
    return (
        <div
            key={player.user.name}
            className="player"
            style={{
                left: `${animatedPos.x}px`,
                top: `${animatedPos.y}px`,
                width: `${characterWidth}px`,
                height: `${characterHeight}px`,
                backgroundColor: debug ? 'rgba(0, 0, 255, 0.5)' : 'blue',
                border: debug ? '2px solid blue' : 'none',
                transition: `left ${movementDelayMs}ms ease-in-out, top ${movementDelayMs}ms ease-in-out`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
            }}
        >
            {player.user.name}
            {debug && (
                <span style={{
                    position: 'absolute',
                    bottom: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '8px',
                    whiteSpace: 'nowrap',
                    color: 'yellow',
                    textShadow: '1px 1px 2px black',
                }}>
                    {Math.round(animatedPos.x)}, {Math.round(animatedPos.y)}
                </span>
            )}
        </div>
    )
}