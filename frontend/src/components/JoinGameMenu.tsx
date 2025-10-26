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
            <label htmlFor="host">Host: </label>
            <input disabled={disabled} type="text" id="host" placeholder='localhost'/> <br/>
            <label htmlFor="port">Port: </label>
            <input disabled={disabled} type="text" id="port" placeholder='8080'/> <br/>
            <button type="submit" disabled={disabled}>Join Game</button>
        </form>
    )
}