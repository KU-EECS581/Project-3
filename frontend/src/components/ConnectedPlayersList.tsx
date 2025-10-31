/**
 * @file ConnectedPlayersList.tsx
 * @description List of connected players in a game lobby.
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