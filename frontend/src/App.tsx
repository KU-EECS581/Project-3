/**
 * @file App.tsx
 * @description Main application component.
 * @author Riley Meyerkorth
 * @date 2025-10-24
 */

import { useCallback, useState } from 'react'
import './App.css'
import { useWebSocket } from './websockets/useWebSocket'

function App() {
  const [websocketUrl, setWebsocketUrl] = useState('ws://localhost:8080')
  const websocket = useWebSocket(websocketUrl)

  const handleJoinGame = useCallback((event: React.FormEvent) => {
    event.preventDefault()
    console.log("Joining server...")
    // TODO: Future implementation for joining a game will go here.
  }, [])

  return (
    <>
      <h1>EECS 581 - Casino</h1>

      <h2>Join a Server</h2>
      <form onSubmit={handleJoinGame}>
        <label htmlFor="host">Host: </label>
        <input type="text" id="host" placeholder='localhost'/> <br/>
        <label htmlFor="port">Port: </label>
        <input type="text" id="port" placeholder='8080'/> <br/>
        <button type="submit">Join Game</button>
      </form>
    </>
  )
}

export default App
