/**
 * @file ConnectedPlayersList.tsx
 * @description Renders list of connected lobby players.
 * @class ConnectedPlayersList
 * @module Components/Lobby
 * @inputs players array (User[])
 * @outputs <ul/> with player name <li/> items
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import type { User } from "~middleware/models"

interface ConnectedPlayersListProps {
    players: User[];
}

export function ConnectedPlayersList({ players }: ConnectedPlayersListProps) {

    return (
        <ul>
            {players.map(player => (
                <li key={player.name}>{player.name}</li>
            ))}
        </ul>
    )
}