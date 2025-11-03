/**
 * @file useCharacter.ts
 * @description Custom hook for managing the character on the playable map.
 * @author Riley Meyerkorth
 * @date 2025-10-27
 */

import type { PlayerCharacter } from "@/models/PlayerCharacter";
import { useUserData } from "./useUserData";
import { useGameServer } from "@/api";
import { useMemo } from "react";
import { CHARACTER_HEIGHT, CHARACTER_WIDTH } from "@/constants";
import { type BoundingBox } from "@/models";

export function useCharacter() {
    const { user } = useUserData();
    const { players } = useGameServer();

    /**
     * The current player's character data.
     */
    const self = (user ? players.find(p => p.user.name === user.name) : undefined) as PlayerCharacter | undefined;

    /**
     * The bounding box of the current player.
     */
    const boundingBox = useMemo<BoundingBox | undefined>(() => {
        if (!self) return undefined;
        return {
            x: self.x,
            y: self.y,
            width: CHARACTER_WIDTH,
            height: CHARACTER_HEIGHT,
        };
    }, [self]);

    return {
        self,
        boundingBox,
    };
}