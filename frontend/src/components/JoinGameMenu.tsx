/**
 * @file JoinGameMenu.tsx
 * @description Form component for joining a game server.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import React, { useCallback } from "react"

interface JoinGameMenuProps extends React.ComponentProps<'form'> {
    onJoinGame: (host: string, port: number) => void
}

export function JoinGameMenu({ onJoinGame, hidden }: JoinGameMenuProps) {

    const handleFormSubmission = useCallback((event: React.FormEvent) => {
        event.preventDefault()
        const form = event.target as HTMLFormElement
        const host = (form.elements.namedItem("host") as HTMLInputElement).value
        const port = (form.elements.namedItem("port") as HTMLInputElement).value
        onJoinGame(host, Number(port));
    }, [onJoinGame]);

    return (
        <div hidden={hidden} >
            <h2>Join a Server</h2>
            <form onSubmit={handleFormSubmission}>
                <label htmlFor="host">Host: </label>
                <input type="text" id="host" placeholder='localhost'/> <br/>
                <label htmlFor="port">Port: </label>
                <input type="text" id="port" placeholder='8080'/> <br/>
                <button type="submit">Join Game</button>
            </form>
        </div>
    )
}