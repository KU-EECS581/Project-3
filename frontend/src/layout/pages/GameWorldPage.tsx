/**
 * @file GameWorldPage.tsx
 * @description Page for the game world.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useGameServer } from "@/api";
import { PlayableMap } from "@/components";
import type { PlayerCharacter } from "@/models";
import { useCharacter, useConnectionCheck, useGameWorld } from "@/hooks";
import { useMouse } from "@uidotdev/usehooks";
import { MapDebugPanel } from "@/components/MapDebugPanel";

export function GameWorldPage() {
  const [mouse, ref] = useMouse();
  const server = useGameServer();
  const { self } = useCharacter();

  const { handleMovement, handleDisconnect, handleEnterEntity, debug, handleToggleDebug } = useGameWorld({
    mouse
  });

  // Check connection status and redirect if disconnected
  useConnectionCheck();
  
  // Show connecting state
  // TODO: Better loading visualization or component
  if (server.isConnecting) {
    return <h2>Connecting{server.host && server.port ? ` to ${server.host}:${server.port}` : ''}...</h2>;
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
