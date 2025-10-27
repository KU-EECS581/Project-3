/**
 * @file GameWorldPage.tsx
 * @description Page for the game world.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useGameServer } from "@/api";
import { PlayableMap } from "@/components";
import type { MapEntity, PlayerCharacter } from "@/models";
import { useUserData } from "@/hooks";
import { useMouse } from "@uidotdev/usehooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { RoutePath } from "../enums";
import { CHARACTER_MOVEMENT_DELAY_MS, DEFAULT_CHARACTER_X, DEFAULT_CHARACTER_Y } from "@/constants";

export function GameWorldPage() {
  const [mouse, ref] = useMouse();
  const server = useGameServer();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserData();
  const navigatingRef = useRef(false);
  const [isDebug, setIsDebug] = useState(false);

  const handleMovement = useCallback(() => {
    if (server.isConnected) {
      server.sendMovement({ x: mouse.elementX, y: mouse.elementY });
    }
  }, [server, mouse]);

  const handleDisconnect = useCallback(() => {
    server.disconnect();
  }, [server]);

  useEffect(() => {
    // If disconnected, go to home
    if (server.isClosed) {
      navigate(RoutePath.HOME);
      return;
    }
  }, [server, navigate]);

  const self = (user ? server.players.find(p => p.user.name === user.name) : undefined) as PlayerCharacter | undefined;

  const handleEnterEntity = useCallback((entity: MapEntity) => {
    // Prevent spamming navigation or re-entrancy
    if (navigatingRef.current) return;
    if (location.pathname === RoutePath.JOIN_GAME) return;

    // Delay navigation to allow movement to register
    setTimeout(() => {
      // Move player to spawn point of map to avoid infinite collisions
      server.sendMovement({ x: DEFAULT_CHARACTER_X, y: DEFAULT_CHARACTER_Y });

      navigatingRef.current = true;
      navigate(entity.route ?? RoutePath.MAP);
    }, CHARACTER_MOVEMENT_DELAY_MS);

    // Placeholder for other entity types
    console.log(`Entered entity: ${entity.name} (${entity.type})`);
  }, [server, navigate, location.pathname]);

  const handleToggleDebug = useCallback(() => {
    setIsDebug((prev) => !prev);
    console.log(`Debug mode: ${!isDebug ? 'ON' : 'OFF'}`);
  }, [setIsDebug, isDebug]);

  // Show connecting state
  // TODO: Better loading visualization or component
  if (server.isConnecting) {
    return <h2>Connecting to {server.host}:{server.port}...</h2>;
  }

  // Show disconnecting state
  // TODO: Better loading visualization or component
  if (server.isClosing) {
    return <h2>Disconnecting...</h2>;
  }

  // Iff connected, show the game world
  return (
      <>
          <PlayableMap
              players={server.players as PlayerCharacter[]}
              mouseRef={ref as React.RefObject<HTMLDivElement>}
              onMovement={handleMovement}
              self={self}
              onEnterEntity={handleEnterEntity}
              hidden={!server.isConnected}
              debug={isDebug}
          />
          <input type='checkbox' name="debug" checked={isDebug} onChange={handleToggleDebug} />
          <button onClick={handleDisconnect}>Disconnect</button>

          { isDebug && (
            <>
              <p>Character Position: {self?.x}, {Math.ceil(self?.y ?? 0)}</p>
              <p>Mouse Position: {mouse.elementX}, {Math.ceil(mouse.elementY ?? 0)}</p>
            </>
          )}
          
      </>
  )
}