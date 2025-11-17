/**
 * @file JoinGamePage.tsx
 * @description Page for joining a game.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useGameServer } from "@/api";
import { JoinGameMenu } from "@/components";
import { DEFAULT_CHARACTER_X, DEFAULT_CHARACTER_Y } from "@/constants";
import { useUserData } from "@/hooks";
import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";

export function JoinGamePage() {
    const userData = useUserData();
    const server = useGameServer();
    const navigate = useNavigate();

    const handleJoinGame = useCallback((host: string, port: number) => {
        // Parse port as number, fallback to default if invalid
        const parsedPort = Number(port);
        const validPort = Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort <= 65535 
            ? parsedPort 
            : 51337; // DEFAULT_PORT
        
        server.setRequest(
        (prev) => ({
            ...prev,
            host: host.trim(), // Trim whitespace from host
            port: validPort,
            // Bind the connection user to the created user if available
            user: userData.user ?? prev.user,
        }));

        // Add our player locally so we render immediately on connect
        if (userData.user) {
            server.addPlayer({ user: userData.user, x: DEFAULT_CHARACTER_X, y: DEFAULT_CHARACTER_Y });
        } else {
            console.warn('Joining without a created player; movement may affect a default user. Create a player for individualized control.');
        }

        console.log(`Joining server at ${host}:${port}...`)
    }, [server, userData]);

    useEffect(() => {
        // If already connected, go to game world
        if (server.isConnected) {
            navigate(RoutePath.MAP);
            return;
        }

        // If connecting, stay on this page
        if (server.isConnecting) {
            return;
        }
    }, [server, navigate]);

    return (
        <>
            <h2>Join a Server</h2>
            <JoinGameMenu
                hidden={server.isConnected}
                disabled={server.isConnecting}
                onJoinGame={handleJoinGame}
                />
            {server.isConnecting && server.host && server.port && <h2>Connecting to {server.host}:{server.port}...</h2>}
            {server.error && <h3 style={{ color: 'red' }}>Error: {server.error}</h3>}
        </>
    );
}