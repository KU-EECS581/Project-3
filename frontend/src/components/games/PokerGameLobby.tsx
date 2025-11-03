/**
 * @file PokerGameLobby.tsx
 * @description Component for the poker game lobby.
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import { useGameServer } from "@/api";
import { ConnectedPlayersList } from "../ConnectedPlayersList";
import { useCallback, useEffect } from "react";
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

    // Join poker lobby on mount, leave on unmount
    useEffect(() => {
        server.joinPoker();
        return () => server.leavePoker();
        // We intentionally depend only on stable server methods
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStartClicked = useCallback(() => {
        server.startPoker();
        onGameStarted?.();
    }, [server, onGameStarted]);

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
                <h2>Players ({server.pokerPlayers.length})</h2>
                <ConnectedPlayersList players={server.pokerPlayers} />
            </div>

            <div>
                <h2>Settings</h2>
                <form onSubmit={handleSettingsSubmitted}>
                    {/* TODO: inputs for minBet / maxBet */}
                    <button type="submit">Update Settings</button>
                </form>
            </div>

            {server.pokerInGame ? (
                <p>Game in progress…</p>
            ) : (
                <button onClick={handleStartClicked} disabled={server.pokerPlayers.length < 2}>
                    Start Game
                </button>
            )}

        </div>
    );
}