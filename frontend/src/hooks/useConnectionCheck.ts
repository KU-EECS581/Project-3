/**
 * @file useConnectionCheck.ts
 * @description Hook ensuring active server connection; redirects if closed.
 * @class useConnectionCheck
 * @module Hooks/Server
 * @inputs GameServer context, React Router navigate
 * @outputs Side-effect redirect logic
 * @external_sources React Router
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