/**
 * @file App.tsx
 * @description Main application component.
 * @author Riley Meyerkorth
 * @date 2025-10-24
 */

import { useCallback, useState } from 'react'
import './App.css'
import { useGameServer, type ServerConnectionRequest } from '@api/index'
import { JoinGameMenu, PlayableMap } from '@components/index';
import { useMouse } from '@uidotdev/usehooks';
import type { PlayerCharacter } from './models';
import { useUserData } from './hooks';
import { CreatePlayerForm } from './components/CreatePlayerForm';
import { DEFAULT_CHARACTER_X, DEFAULT_CHARACTER_Y, DEFAULT_HOST, DEFAULT_PORT, DEFAULT_USER } from './constants';

function App() {
  const [mouse, ref] = useMouse();

  // TODO: Replace with actual user data.
  const [request, setRequest] = useState<ServerConnectionRequest>({
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    user: DEFAULT_USER
  });
  const websocket = useGameServer(request);

  const userData = useUserData();

  const handleCreatePlayer = useCallback((name: string) => {
    console.log("Creating player with name:", name);
    userData.saveUser({ name: name, balance: 1000, dateCreated: new Date(), dateUpdated: new Date() });
  }, [userData]);

  const handleResetPlayer = useCallback(() => {
    userData.clearUser();
  }, [userData]);

  const handleJoinGame = useCallback((host: string, port: number) => {
    setRequest((prev) => ({
      ...prev,
      host,
      port: Number(port),
      // Bind the connection user to the created user if available
      user: userData.user ?? prev.user,
    }));

    // Add our player locally so we render immediately on connect
    if (userData.user) {
      websocket.addPlayer({ user: userData.user, x: DEFAULT_CHARACTER_X, y: DEFAULT_CHARACTER_Y });
    } else {
      console.warn('Joining without a created player; movement may affect a default user. Create a player for individualized control.');
    }

    console.log(`Joining server at ${host}:${port}...`)
  }, [websocket, userData]);

  const handleMovement = useCallback(() => {
    if (websocket.isConnected) {
      websocket.sendMovement({ x: mouse.elementX, y: mouse.elementY });
    }
  }, [websocket, mouse]);

  return (
    <>
      <h1>EECS 581 - Casino</h1>

      <CreatePlayerForm hidden={userData.exists} onCreatePlayer={handleCreatePlayer} />

      <JoinGameMenu
        hidden={websocket.isConnected}
        onJoinGame={handleJoinGame}
      />

      <PlayableMap
        players={websocket.players as PlayerCharacter[]}
        mouseRef={ref as React.RefObject<HTMLDivElement>}
        onMovement={handleMovement}
        hidden={!websocket.isConnected}
      />

      <button onClick={handleResetPlayer}>Reset Player Data</button>
    </>
  )
}

export default App
