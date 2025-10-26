/**
 * @file useGameServer.ts
 * @description Custom hook for managing WebSocket connections to the game server.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_PORT, MIN_PORT, type ServerConnectionRequest } from "@api/index";
import { DEFAULT_CHARACTER_X, DEFAULT_CHARACTER_Y } from "@/constants";
import type { MovementMessage } from "~middleware/models";
import { MovementMessageSchema } from "~middleware/models";
import type { PlayerCharacter } from "@/models";

export interface UseGameServerReturn {
    isConnecting: boolean;
    isConnected: boolean;
    isClosing: boolean;
    isClosed: boolean;
    sendMessage: (message: string) => void;
    sendMovement: (movement: Omit<MovementMessage, "user">) => void;
    receivedMessages: string[];
    players: PlayerCharacter[];
    addPlayer: (player: PlayerCharacter) => void;
}

export function useGameServer(request: ServerConnectionRequest) {
    const [players, setPlayers] = useState<PlayerCharacter[]>([]);
    const [receivedMessages, /*setReceivedMessages*/] = useState<string[]>([]);
    const userRef = useRef(request.user);

    // Keep a ref to the latest user without retriggering socket effect
    useEffect(() => {
        userRef.current = request.user;
    }, [request.user]);

    /**
     * Checks each part of the ServerConnectionRequest for validity.
     * @returns True if the request is valid, false otherwise.
     */
    const isRequestValid = useCallback(() => {
        // Validate host
        if (!request.host) {
            console.error(`Invalid host: ${request.host}`);
            return false;
        }

        // Validate port
        if (isNaN(request.port) || request.port < MIN_PORT || request.port > MAX_PORT) {
            console.error(`Invalid port: ${request.port}`);
            return false;
        }

        // Validate user
        if (!request.user || !request.user.name) {
            console.error(`Invalid user data`);
            return false;
        }

        return true;
    }, [request]);

    // Create the WebSocket instance when request changes (host/port/user)
    const ws = useMemo(() => {
        if (!isRequestValid()) {
            return undefined;
        }

        try {
            return new WebSocket(`ws://${request.host}:${request.port}`);
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            return undefined;
        }
    }, [request, isRequestValid]);

    // Keep track of readyState in React state so renders update when it changes
    const [readyState, setReadyState] = useState<number | undefined>(ws?.readyState);

    // Derived booleans from readyState (stable values causing re-renders when readyState updates)
    const isConnecting = useMemo(() => readyState === WebSocket.CONNECTING, [readyState]);
    const isConnected = useMemo(() => readyState === WebSocket.OPEN, [readyState]);
    const isClosing = useMemo(() => readyState === WebSocket.CLOSING, [readyState]);
    const isClosed = useMemo(() => readyState === WebSocket.CLOSED, [readyState]);

    /**
     * Sends a message through the WebSocket connection.
     * @param message The message to send as a string.
     */
    const sendMessage = useCallback((message: string) => {
        if (!ws) {
            console.error('WebSocket is not available');
            return;
        }

        if (ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not open - cannot send message');
            return;
        }

        ws.send(message);
    }, [ws]);

    /**
     * Sends a movement message to the server.
     * @param movement The movement message containing x and y coordinates.
     */
    const sendMovement = useCallback((movement: Omit<MovementMessage, "user">) => {
        if (!request.user) return;
        const payload: MovementMessage = { user: request.user, ...movement };

        // Optimistic update locally
        setPlayers((prev) => {
            const idx = prev.findIndex(p => p.user.name === request.user.name);
            const updated: PlayerCharacter = { user: request.user, x: movement.x, y: movement.y };
            if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = updated;
                return copy;
            }
            return [...prev, updated];
        });

        sendMessage(JSON.stringify(payload));
    }, [sendMessage, request.user, setPlayers]);

    const addPlayer = useCallback((player: PlayerCharacter) => {
        setPlayers((prev) => {
            const exists = prev.some(p => p.user.name === player.user.name);
            if (exists) return prev;
            return [...prev, player];
        });
    }, [setPlayers]);

    useEffect(() => {
        if (!ws) {
            setReadyState(undefined);
            return;
        }

        // Initialize readyState from ws
        setReadyState(ws.readyState);

        // Event handlers that update React state (causes re-render when state changes)
        const handleOpen = () => {
            console.log('WebSocket connection established');
            setReadyState(ws.readyState);

            // Announce presence immediately so other clients see us without waiting for movement
            try {
                const currentUser = userRef.current;
                if (currentUser) {
                    // Use defaults on join; server will sync any last-known position
                    const payload = JSON.stringify({ user: currentUser, x: DEFAULT_CHARACTER_X, y: DEFAULT_CHARACTER_Y });
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(payload);
                    }
                }
            } catch (e) {
                console.error('Failed to send join presence message:', e);
            }
        };

    const handleMessage = (event: MessageEvent) => {
            // setReceivedMessages((prev) => [...prev, /* event.data */]);
            try {
                const parsed = JSON.parse(event.data);
                const result = MovementMessageSchema.safeParse(parsed);
                if (result.success) {
                    const { user, x, y } = result.data;
                    setPlayers((prev) => {
                        const idx = prev.findIndex(p => p.user.name === user.name);
                        const updated: PlayerCharacter = { user, x, y };
                        if (idx >= 0) {
                            const copy = [...prev];
                            copy[idx] = updated;
                            return copy;
                        }
                        return [...prev, updated];
                    });
                } else {
                    // Not a movement message; ignore for now
                    // console.debug('Non-movement message received');
                }
            } catch {
                // Non-JSON; ignore
            }
            setReadyState(ws.readyState);
        };

        const handleClose = () => {
            console.log('WebSocket connection closed');
            setReadyState(ws.readyState);
        };

        const handleError = (error: Event) => {
            console.error('WebSocket error:', error);
            // readyState may be CLOSING/CLOSED after errors
            setReadyState(ws.readyState);
        };

        ws.addEventListener('open', handleOpen);
        ws.addEventListener('message', handleMessage as EventListener);
        ws.addEventListener('close', handleClose);
        ws.addEventListener('error', handleError);

        return () => {
            // Remove listeners and close socket on cleanup
            try {
                ws.removeEventListener('open', handleOpen);
                ws.removeEventListener('message', handleMessage as EventListener);
                ws.removeEventListener('close', handleClose);
                ws.removeEventListener('error', handleError);
            } catch {
                // ignore
            }

            try {
                // Only close if not already closed
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
            } catch {
                // ignore
            }
        };
    }, [ws]);

    return {
        isConnecting,
        isClosing,
        isClosed,
        isConnected,
        sendMessage,
        sendMovement,
        receivedMessages,
        players,
        addPlayer,
    };
}