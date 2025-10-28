/**
 * @file PokerGameLobby.tsx
 * @description Component for the poker game lobby.
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import { useGameServer } from "@/api";
import { ConnectedPlayersList } from "../ConnectedPlayersList";
import { useCallback } from "react";
import type { PokerGameSettings } from "~middleware/models/PokerGameSettings";

interface PokerGameLobbyProps {
    settings: PokerGameSettings;
    onSettingsChanged?: (newSettings: PokerGameSettings) => void;
    onGameStarted?: () => void;
}

export function PokerGameLobby({
    settings,
    onSettingsChanged,
    onGameStarted
}: PokerGameLobbyProps) {
    const server = useGameServer();

    const handleStartClicked = useCallback(() => {
        onGameStarted?.();
    }, [onGameStarted]);

    const handleSettingsSubmitted = useCallback((event: React.FormEvent) => {
        event.preventDefault();

        // TODO: implement settings form and validation
        const newSettings = {
            ...settings,
        }

        onSettingsChanged?.(newSettings);
    }, [onSettingsChanged, settings]);

    return (
        <div>
            <div>
                {/* TODO: clean this up or separate it out more. It's messy, I know. */}
                <h2>Players</h2>
                <ConnectedPlayersList players={server.pokerPlayers} />
            </div>

            <div>
                <h2>Settings</h2>
                <form onSubmit={handleSettingsSubmitted}>

                    <button type="submit">Update Settings</button>
                </form>
            </div>

            <button onClick={handleStartClicked}>Start Game</button>

        </div>
    );
}