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

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = -1; // Invalid port to force user input
const DEFAULT_USER = { id: 'user1', name: 'Player1' }; // Placeholder user

function App() {
  const [mouse, ref] = useMouse();

  // TODO: Replace with actual user data.
  const [request, setRequest] = useState<ServerConnectionRequest>({
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    user: DEFAULT_USER
  });
  const websocket = useGameServer(request);

  const handleJoinGame = useCallback((host: string, port: number) => {
    setRequest((prev) => ({
      ...prev,
      host,
      port: Number(port)
    }));

    console.log(`Joining server at ${host}:${port}...`)
  }, []);

  const handleMovement = useCallback(() => {
    if (websocket.isConnected) {
      websocket.sendMovement({ x: mouse.elementX, y: mouse.elementY });
    }
  }, [websocket, mouse]);

  return (
    <>
      <h1>EECS 581 - Casino</h1>

      <JoinGameMenu hidden={websocket.isConnected} onJoinGame={handleJoinGame} />

      <PlayableMap ref={ref as React.RefObject<HTMLDivElement>} onMovement={handleMovement} hidden={!websocket.isConnected} />
    </>
  )
}

export default App
