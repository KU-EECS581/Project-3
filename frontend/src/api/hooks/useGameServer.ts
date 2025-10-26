/**
 * @file useGameServer.ts
 * @description Custom hook for managing WebSocket connections to the game server.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import { useContext } from "react";
import { GameServerContext } from "@/contexts/GameServerContext";

export function useGameServer() {
    const context = useContext(GameServerContext);
    if (!context) {
        throw new Error("useUserData must be used within a UserDataProvider");
    }
    return context;
}