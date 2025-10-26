/**
 * @file GameServerContext.tsx
 * @description Context for game server connection.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import type { ServerConnectionRequest } from "@/api";
import type { PlayerCharacter } from "@/models";
import { createContext } from "react";
import type { MovementMessage } from "~middleware/models";

export interface GameServerContextProps {
    isConnecting: boolean;
    isClosing: boolean;
    isClosed: boolean;
    isConnected: boolean;
    sendMessage: (message: string) => void;
    sendMovement: (movement: Omit<MovementMessage, "user">) => void;
    receivedMessages: string[];
    players: PlayerCharacter[];
    addPlayer: (player: PlayerCharacter) => void;
    setRequest: React.Dispatch<React.SetStateAction<ServerConnectionRequest>>;
    disconnect: () => void;
}

export const GameServerContext = createContext<GameServerContextProps | undefined>(undefined);