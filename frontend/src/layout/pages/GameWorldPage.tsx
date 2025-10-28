/**
 * @file GameWorldPage.tsx
 * @description Page for the game world.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useGameServer } from "@/api";
import { PlayableMap } from "@/components";
import type { PlayerCharacter } from "@/models";
import { useCharacter, useGameWorld } from "@/hooks";
import { useMouse } from "@uidotdev/usehooks";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";
import { MapDebugPanel } from "@/components/MapDebugPanel";

export function GameWorldPage() {
  const [mouse, ref] = useMouse();
  const server = useGameServer();
  const navigate = useNavigate();
  const { self } = useCharacter();

  const { handleMovement, handleDisconnect, handleEnterEntity, debug, handleToggleDebug } = useGameWorld({
    mouse
  });

  useEffect(() => {
    // If disconnected, go to home
    if (server.isClosed) {
      navigate(RoutePath.HOME);
      return;
    }
  }, [server, navigate]);

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
              debug={debug}
          />
          <label htmlFor="debug">Debug: </label>
          <input type='checkbox' name="debug" checked={debug} onChange={handleToggleDebug} />

          <MapDebugPanel self={self} mouse={mouse} onDisconnectClicked={handleDisconnect} hidden={!debug} />

      </>
  )
}