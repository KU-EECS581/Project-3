/**
 * @file useGameServer.ts
 * @description Hook exposing game server connection & action helpers.
 * @class useGameServer
 * @module Hooks/Server
 * @inputs GameServerContext
 * @outputs Server state & action functions
 * @external_sources React
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import { useContext } from "react";
import { GameServerContext } from "../contexts";

export function useGameServer() {
    const context = useContext(GameServerContext);
    if (!context) {
        throw new Error("useGameServer must be used within a GameServerProvider");
    }
    return context;
}