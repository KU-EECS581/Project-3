/**
 * @file App.tsx
 * @description Main application component.
 * @author Riley Meyerkorth
 * @date 2025-10-24
 */

import { useCallback, useState } from 'react'
import './App.css'
import { useGameServer } from './api/hooks/useGameServer'
import { JoinGameMenu } from './components/JoinGameMenu';
import type { ServerConnectionRequest } from './api';

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = -1; // Invalid port to force user input
const DEFAULT_USER = { id: 'user1', name: 'Player1' }; // Placeholder user

function App() {
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

  const handleTestMessage = useCallback(() => {
    if (websocket.isConnected) {
      websocket.sendMessage("Hello World!");
    }
  }, [websocket]);

  return (
    <>
      <h1>EECS 581 - Casino</h1>

      <JoinGameMenu hidden={websocket.isConnected} onJoinGame={handleJoinGame} />

      <button hidden={!websocket.isConnected} onClick={handleTestMessage}>Send Test Message</button>
    </>
  )
}

export default App
