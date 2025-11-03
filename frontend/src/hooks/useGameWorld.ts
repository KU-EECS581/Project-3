/**
 * @file useGameWorld.ts
 * @description Custom hook for managing game world interactions and state.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import { useGameServer } from "@/api";
import { DEFAULT_CHARACTER_X, DEFAULT_CHARACTER_Y, CHARACTER_MOVEMENT_DELAY_MS } from "@/constants";
import { RoutePath } from "@/layout/enums";
import type { MapEntity } from "@/models";
import type { MousePosition } from "@uidotdev/usehooks";
import { useCallback, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

interface UseGameWorldProps {
    mouse: MousePosition;
}

export function useGameWorld({
    mouse
}: UseGameWorldProps) {
    const server = useGameServer();
    const navigatingRef = useRef(false);
    const navigate = useNavigate();
    const location = useLocation();

    const [debug, setDebug] = useState(false);

    const handleMovement = useCallback(() => {
        if (server.isConnected) {
        server.sendMovement({ x: mouse.elementX, y: mouse.elementY });
        }
    }, [server, mouse]);

    const handleDisconnect = useCallback(() => {
        // Ask for confirmation before disconnecting
        const confirmExit = window.confirm("Are you sure you want to exit the game world?");
        if (confirmExit) {
        server.disconnect();
        }
    }, [server]);

    const handleToggleDebug = useCallback(() => {
        setDebug((prev) => !prev);
        console.log(`Debug mode: ${!debug ? 'ON' : 'OFF'}`);
    }, [setDebug, debug]);

    const handleEnterEntity = useCallback((entity: MapEntity) => {
        // Prevent spamming navigation or re-entrancy
        if (navigatingRef.current) return;
        if (location.pathname === RoutePath.JOIN_GAME) return;
    
        // Delay navigation to allow movement to register
        setTimeout(() => {
          // Move player to spawn point of map to avoid infinite collisions
          server.sendMovement({ x: DEFAULT_CHARACTER_X, y: DEFAULT_CHARACTER_Y });
    
          // If an exit, handle specially
          if (entity.type === "exit") {
            handleDisconnect();
            return;
          }
    
          navigatingRef.current = true;
          navigate(entity.route ?? RoutePath.MAP);
        }, CHARACTER_MOVEMENT_DELAY_MS);
    
        // Placeholder for other entity types
        console.log(`Entered entity: ${entity.name} (${entity.type})`);
      }, [handleDisconnect, server, navigate, location.pathname]);

    return {
        handleMovement,
        handleDisconnect,
        handleEnterEntity,
        handleToggleDebug,
        debug,
    }
}