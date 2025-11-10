/**
 * @file GameServerContext.tsx
 * @description Context for game server connection.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import type { ServerConnectionRequest } from "@/api";
import type { PlayerCharacter } from "@/models";
import { createContext } from "react";
import type { MovementMessage, User, PokerGameStateMessage, BlackjackLobbyState, BlackjackGameStateMessage } from "~middleware/models";

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
    host: string;
    port: number;
    error: string | undefined;
    pokerPlayers: User[];
    pokerInGame: boolean;
    pokerState?: PokerGameStateMessage;
    joinPoker: () => void;
    leavePoker: () => void;
    startPoker: () => void;
    endPoker: () => void;
    pokerCheck: () => void;
    pokerCall: () => void;
    pokerBet: (amount: number) => void;
    pokerRaise: (amount: number) => void;
    pokerFold: () => void;
    // Blackjack multiplayer
    blackjackLobbyState?: BlackjackLobbyState;
    blackjackGameState?: BlackjackGameStateMessage;
    joinBlackjack: (seatId?: number) => void;
    leaveBlackjack: () => void;
    blackjackAction: (action: string, amount?: number, seatId?: number) => void;
}

export const GameServerContext = createContext<GameServerContextProps | undefined>(undefined);