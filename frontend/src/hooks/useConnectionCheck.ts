/**
 * @file useConnectionCheck.ts
 * @description Custom hook for checking if the connection to the game server is active. If not, redirects to the home page.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import { useGameServer } from "@/api";
import { RoutePath } from "@/layout/enums";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export function useConnectionCheck() {
    const server = useGameServer();
    const navigate = useNavigate();
    useEffect(() => {
    // If disconnected, go to home
    if (server.isClosed) {
        navigate(RoutePath.HOME);
        return;
    }
    }, [server, navigate]);

    return {};
}