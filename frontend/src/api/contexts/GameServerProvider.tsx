/**
 * @file GameServerProvider.tsx
 * @description Context for game server connection.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { MAX_PORT, MIN_PORT, type ServerConnectionRequest } from "@/api";
import { GameServerContext } from "./GameServerContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CHARACTER_X, DEFAULT_CHARACTER_Y, DEFAULT_HOST, DEFAULT_PORT, DEFAULT_USER } from "@/constants";
import type { PlayerCharacter } from "@/models";
import { AnyGameMessageSchema, MESSAGE_VERSION, type MovementMessage, MovementMessageSchema, type User } from "~middleware/models";
import { GameMessageKey } from "~middleware/enums";

export function GameServerProvider({children}: {children: React.ReactNode}) {
    const [request, setRequest] = useState<ServerConnectionRequest>({
        host: DEFAULT_HOST,
        port: DEFAULT_PORT,
        user: DEFAULT_USER
    });
    const [error, setError] = useState<string | undefined>(undefined);
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
            setError('Invalid host');
            return false;
        }

        // Validate port
        if (isNaN(request.port) || request.port < MIN_PORT || request.port > MAX_PORT) {
            console.error(`Invalid port: ${request.port}`);
            setError('Invalid port');
            return false;
        }

        // Validate user
        if (!request.user || !request.user.name) {
            console.error(`Invalid user data`);
            setError('Invalid user data');
            return false;
        }

        setError(undefined);
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
            setError(`Failed to create WebSocket: ${err}`);
            console.error('Failed to create WebSocket:', err);
            return undefined;
        }
    }, [request, isRequestValid]);

    // Keep track of readyState in React state so renders update when it changes
    const [readyState, setReadyState] = useState<number | undefined>(ws?.readyState);

    // Derived booleans from readyState (stable values causing re-renders when readyState updates)
    const isConnecting = useMemo(() => readyState === WebSocket.CONNECTING && ws !== undefined, [readyState, ws]);
    const isConnected = useMemo(() => readyState === WebSocket.OPEN && ws !== undefined, [readyState, ws]);
    const isClosing = useMemo(() => readyState === WebSocket.CLOSING && ws !== undefined, [readyState, ws]);
    const isClosed = useMemo(() => readyState === WebSocket.CLOSED || ws === undefined, [readyState, ws]);

    /**
     * Closes the WebSocket connection if open or connecting.
     */
    const disconnect = useCallback(() => {
        if (!ws || readyState === WebSocket.CLOSING || readyState === WebSocket.CLOSED) {
            console.error('WebSocket is not open or is already closing/closed');
            return;
        }

        ws.close();
    }, [ws, readyState]);

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
        const envelope = {
            key: GameMessageKey.MOVE,
            v: MESSAGE_VERSION,
            payload,
            ts: Date.now(),
        } as const;

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

        sendMessage(JSON.stringify(envelope));
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
                    const envelope = {
                        key: GameMessageKey.MOVE,
                        v: MESSAGE_VERSION,
                        payload: { user: currentUser, x: DEFAULT_CHARACTER_X, y: DEFAULT_CHARACTER_Y } satisfies MovementMessage,
                        ts: Date.now(),
                    } as const;
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(envelope));
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
                // Prefer new envelope format
                const env = AnyGameMessageSchema.safeParse(parsed);
                if (!env.success) {
                    // Non-envelope message; ignore for now
                    console.warn('Received non-envelope message:', parsed);
                    return;
                }

                const msg = env.data;
                switch (msg.key) {
                    case GameMessageKey.MOVE: {
                        const payload = MovementMessageSchema.safeParse(msg.payload);
                        if (payload.success) {
                            const { user, x, y } = payload.data;
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
                        }
                        break;
                    }
                    default:
                        // Ignore other message types for now
                        console.warn('Received unhandled message key:', msg.key);
                        break;
                }
            } catch {
                // Non-JSON; ignore
            }
            setReadyState(ws.readyState);
        };

        const handleClose = (event: CloseEvent) => {
            if (!event.wasClean) {
                console.error(`WebSocket closed unexpectedly: Code ${event.code}, Reason: ${event.reason ?? 'No reason provided'}`);
                setError(`WebSocket closed unexpectedly: Code ${event.code}, Reason: ${event.reason ?? 'No reason provided'}`);
            }

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

    // TODO: Actually implement this
    const pokerPlayers: User[] = useMemo(() => {
        return [];
    }, []);

    // Implementation of the GameServerProvider
    return (
        <GameServerContext.Provider value={{
            isConnecting,
            isClosing,
            isClosed,
            isConnected,
            sendMessage,
            sendMovement,
            receivedMessages,
            players,
            addPlayer,
            setRequest,
            disconnect,
            host: request.host,
            port: request.port,
            error,
            pokerPlayers,
        }}>
            {children}
        </GameServerContext.Provider>
    );
}