/**
 * @file GameWorldPage.tsx
 * @description Page for the game world.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useGameServer } from "@/api";
import { PlayableMap } from "@/components";
import type { PlayerCharacter } from "@/models";
import { useMouse } from "@uidotdev/usehooks";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";

export function GameWorldPage() {
  const [mouse, ref] = useMouse();
  const server = useGameServer();
  const navigate = useNavigate();

  const handleMovement = useCallback(() => {
    if (server.isConnected) {
      server.sendMovement({ x: mouse.elementX, y: mouse.elementY });
    }
  }, [server, mouse]);

  const handleDisconnect = useCallback(() => {
    server.disconnect();
    navigate(RoutePath.HOME);
  }, [server, navigate]);

  return (
      <>
          <PlayableMap
              players={server.players as PlayerCharacter[]}
              mouseRef={ref as React.RefObject<HTMLDivElement>}
              onMovement={handleMovement}
              hidden={!server.isConnected}
          />
          <button onClick={handleDisconnect}>Disconnect</button>
      </>
  )
}