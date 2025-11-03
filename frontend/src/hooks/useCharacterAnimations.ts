/**
 * @file useCharacterAnimations.ts
 * @description Custom hook for managing character animations on the playable map.
 * @author Riley Meyerkorth
 * @date 2025-10-27
 */

import type { PlayerCharacter } from "@/models/PlayerCharacter";
import { useEffect, useState } from "react";


export function useCharacterAnimations(players: PlayerCharacter[]) {

    // Track animated positions for each player
    const [animatedPositions, setAnimatedPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

    // Update animated positions when players change
    useEffect(() => {
        setAnimatedPositions((prev) => {
            const updated = new Map(prev);
            for (const player of players) {
                // Initialize position if player is new
                if (!updated.has(player.user.name)) {
                    updated.set(player.user.name, { x: player.x, y: player.y });
                    break;
                }

                // Update to new position (CSS transition will animate)
                updated.set(player.user.name, { x: player.x, y: player.y });
            }
            // Remove players that are no longer in the game
            for (const name of updated.keys()) {
                if (!players.find(p => p.user.name === name)) {
                    updated.delete(name);
                }
            }
            return updated;
        });
    }, [players]);

    return {
        animatedPositions,
    };
}