/**
 * @file useGameWorld.ts
 * @description Custom hook for managing game world interactions and state.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import { useGameServer } from "@/api";
import { DEFAULT_CHARACTER_X, DEFAULT_CHARACTER_Y, CHARACTER_MOVEMENT_DELAY_MS, MAP_ENTITIES } from "@/constants";
import { RoutePath } from "@/layout/enums";
import type { MapEntity } from "@/models";
import type { MousePosition } from "@uidotdev/usehooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useCharacter } from "./useCharacter";

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

    // Reset navigation flag when returning to map (allows re-entering entities after moving out)
    useEffect(() => {
        if (location.pathname === RoutePath.JOIN_GAME) {
            // Reset navigation flag when on map page
            navigatingRef.current = false;
        }
    }, [location.pathname]);

    const handleDisconnect = useCallback(() => {
        // Ask for confirmation before disconnecting
        const confirmExit = window.confirm("Are you sure you want to exit the game world?");
        if (confirmExit) {
        server.disconnect();
        }
    }, [server]);

    const { boundingBox } = useCharacter();
    
    // Helper to check if a point is inside an entity
    const isPointInEntity = useCallback((x: number, y: number, entity: MapEntity): boolean => {
        return x >= entity.pos.x && 
               x <= entity.pos.x + entity.size.width &&
               y >= entity.pos.y && 
               y <= entity.pos.y + entity.size.height;
    }, []);

    // Helper to check if player is inside an entity
    const isPlayerInEntity = useCallback((entity: MapEntity): boolean => {
        if (!boundingBox) return false;
        return boundingBox.x < entity.pos.x + entity.size.width &&
               boundingBox.x + boundingBox.width > entity.pos.x &&
               boundingBox.y < entity.pos.y + entity.size.height &&
               boundingBox.y + boundingBox.height > entity.pos.y;
    }, [boundingBox]);

    const handleEnterEntity = useCallback((entity: MapEntity, allowReEntry = false) => {
        // Prevent spamming navigation or re-entrancy
        if (navigatingRef.current) return;
        
        // If we're already on the map and this is not a manual re-entry, don't navigate
        // (This prevents infinite loops when returning to map)
        if (location.pathname === RoutePath.JOIN_GAME && !allowReEntry) return;
    
        // Calculate position at the center of the entity where player clicked
        const entityCenterX = entity.pos.x + (entity.size.width / 2);
        const entityCenterY = entity.pos.y + (entity.size.height / 2);
    
        // Delay navigation to allow movement to register
        setTimeout(() => {
          // Keep player at the entity position (where they clicked) instead of resetting to spawn
          // This way other players see them at the game they clicked on
          server.sendMovement({ x: entityCenterX, y: entityCenterY });
    
          // If an exit, handle specially
          if (entity.type === "exit") {
            handleDisconnect();
            return;
          }
    
          navigatingRef.current = true;
          navigate(entity.route ?? RoutePath.MAP);
        }, CHARACTER_MOVEMENT_DELAY_MS);
    
        // Placeholder for other entity types
        console.log(`Entered entity: ${entity.name} (${entity.type})${allowReEntry ? ' - re-entry' : ''}`);
      }, [handleDisconnect, server, navigate, location.pathname]);

    const handleMovement = useCallback(() => {
        if (!server.isConnected) return;
        
        const clickX = mouse.elementX;
        const clickY = mouse.elementY;
        
        // Check if click is within any entity bounds
        for (const entity of MAP_ENTITIES) {
            if (isPointInEntity(clickX, clickY, entity)) {
                // Check if player is already inside this entity
                if (isPlayerInEntity(entity)) {
                    // Player is already inside - allow re-entry by passing allowReEntry flag
                    console.log(`[Map] Player clicked on entity ${entity.name} they're already inside - allowing re-entry`);
                    handleEnterEntity(entity, true); // Pass true to allow re-entry
                    return; // Don't move, just re-enter
                }
            }
        }
        
        // Normal movement - not clicking on an entity
        server.sendMovement({ x: clickX, y: clickY });
    }, [server, mouse, isPointInEntity, isPlayerInEntity, handleEnterEntity]);

    const handleToggleDebug = useCallback(() => {
        setDebug((prev) => !prev);
        console.log(`Debug mode: ${!debug ? 'ON' : 'OFF'}`);
    }, [setDebug, debug]);

    return {
        handleMovement,
        handleDisconnect,
        handleEnterEntity,
        handleToggleDebug,
        debug,
    }
}