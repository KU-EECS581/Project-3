/**
 * @file JoinGameMenu.tsx
 * @description Form component for joining a game server.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import React, { useCallback } from "react"

interface JoinGameMenuProps extends React.ComponentProps<'form'> {
    onJoinGame: (host: string, port: number) => void
    disabled?: boolean
}

export function JoinGameMenu({ onJoinGame, hidden, disabled = false }: JoinGameMenuProps) {

    const handleFormSubmission = useCallback((event: React.FormEvent) => {
        event.preventDefault()

        if (disabled) return;

        const form = event.target as HTMLFormElement
        const host = (form.elements.namedItem("host") as HTMLInputElement).value
        const port = (form.elements.namedItem("port") as HTMLInputElement).value
        onJoinGame(host, Number(port));
    }, [onJoinGame, disabled]);

    return (
        <form onSubmit={handleFormSubmission} hidden={hidden}>
            <div>
                <label htmlFor="host">Host IP Address: </label>
                <input 
                    disabled={disabled} 
                    type="text" 
                    id="host" 
                    placeholder='192.168.1.105'
                    title="Enter the hosting device's LAN IP address (e.g., 192.168.1.105). Use 'localhost' or '127.0.0.1' only if connecting from the same machine."
                />
                <small style={{ display: 'block', color: '#666', fontSize: '0.85em', marginTop: '4px' }}>
                    <strong>Use 127.0.0.1 or localhost</strong> when hosting on this same device.<br/>
                    <strong>Use 192.168.x.x</strong> when joining another device on your WiFi.
                </small>
            </div>
            <br/>
            <div>
                <label htmlFor="port">Port: </label>
                <input 
                    disabled={disabled} 
                    type="text" 
                    id="port" 
                    defaultValue='51337'
                    placeholder='51337'
                    title="Enter the port number the server is running on (default: 51337)"
                />
            </div>
            <br/>
            <button type="submit" disabled={disabled}>Join Game</button>
        </form>
    )
}