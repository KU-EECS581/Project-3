/**
 * @file CreatePlayerForm.tsx
 * @description Simple controlled form to create a player profile.
 * @class CreatePlayerForm
 * @module Components/Player
 * @inputs onCreatePlayer callback, form input playerName
 * @outputs invokes onCreatePlayer(name)
 * @external_sources React (useCallback)
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import { useCallback } from "react";

interface CreatePlayerFormProps extends React.HTMLAttributes<HTMLFormElement> {
    onCreatePlayer: (playerName: string) => void;
}

export function CreatePlayerForm({ onCreatePlayer, hidden }: CreatePlayerFormProps) {

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const playerName = formData.get("playerName") as string;
        onCreatePlayer(playerName);
    }, [onCreatePlayer]);

    return (
        <form onSubmit={handleSubmit} hidden={hidden}>
            <label>
                Player Name: 
                <input type="text" name="playerName" />
            </label>
            <button type="submit">Create Player</button>
        </form>
    );
}