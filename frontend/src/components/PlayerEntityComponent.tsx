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
                transition: `left ${movementDelayMs}ms ease-in-out, top ${movementDelayMs}ms ease-in-out`,
            }}
        >
            {player.user.name}
        </div>
    )
}