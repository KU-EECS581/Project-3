/**
 * @file PokerGame.tsx
 * @description Component for the poker game.
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import { useCallback, useState } from "react";
import { PokerGameLobby } from "./PokerGameLobby";
import { type PokerGameSettings } from "~middleware/models";
import { MAP_HEIGHT, MAP_WIDTH } from "@/constants";

// TODO: move these constants to config/separate file
const DEFAULT_MIN_BET = 10;
const DEFAULT_MAX_BET = 1000;

const DEFAULT_SETTINGS: PokerGameSettings = {
    minBet: DEFAULT_MIN_BET,
    maxBet: DEFAULT_MAX_BET,
}


interface PokerGameProps {
    onGameStarted?: () => void;
    onGameEnded?: () => void;
}

export function PokerGame({
    onGameStarted,
    onGameEnded
}: PokerGameProps) {
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [settings, setSettings] = useState<PokerGameSettings>(DEFAULT_SETTINGS);

    const handleStartGame = useCallback(() => {
        setIsGameStarted(true);
        onGameStarted?.();
    }, [onGameStarted]);

    const handleEndGame = useCallback(() => {
        setIsGameStarted(false);
        onGameEnded?.();
    }, [onGameEnded]);

    const handleSettingsChanged = useCallback((newSettings: PokerGameSettings) => {
        setSettings(newSettings);
    }, []);

    return (
        <div
            style={{
                width: `${MAP_WIDTH}px`,
                height: `${MAP_HEIGHT}px`, // TODO: make these dynamic or separate from map?
                border: '2px solid black',
                display: 'flex',
                backgroundColor: 'green',
                }} >
                
            { !isGameStarted && <PokerGameLobby settings={settings} onGameStarted={handleStartGame} onSettingsChanged={handleSettingsChanged} /> }
            { isGameStarted && (
                <div>
                    <button onClick={handleEndGame}>End Game (debug button)</button>
                </div>
            )}
        </div>
    );
}