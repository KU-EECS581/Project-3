/**
 * @file GameServerProvider.tsx
 * @description Context for game server connection.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { MAX_PORT, MIN_PORT, type ServerConnectionRequest } from "@/api";
import { GameServerContext } from "./GameServerContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserData } from "@/hooks/useUserData";
import { DEFAULT_CHARACTER_X, DEFAULT_CHARACTER_Y, DEFAULT_HOST, DEFAULT_PORT, DEFAULT_USER } from "@/constants";
import type { PlayerCharacter } from "@/models";
import { AnyGameMessageSchema, MESSAGE_VERSION, type MovementMessage, MovementMessageSchema, type User, UserSchema, PokerLobbyStateSchema, TableStateSchema, BlackjackLobbyStateSchema, BlackjackGameStateSchema } from "~middleware/models";
import { z } from "zod";
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
    const [pokerPlayers, setPokerPlayers] = useState<User[]>([]);
    const [pokerInGame, setPokerInGame] = useState(false);
    const [pokerState, setPokerState] = useState<ReturnType<typeof TableStateSchema.parse> | undefined>(undefined);
    const [blackjackLobbyState, setBlackjackLobbyState] = useState<ReturnType<typeof BlackjackLobbyStateSchema.parse> | undefined>(undefined);
    const [blackjackGameState, setBlackjackGameState] = useState<ReturnType<typeof BlackjackGameStateSchema.parse> | undefined>(undefined);
    
    // Track connection attempt to prevent rapid reconnection loops
    const connectionAttemptRef = useRef<string | null>(null);
    const shouldAttemptConnectionRef = useRef(true);
    // Track request changes to allow manual retry (using state so useMemo can depend on it)
    const [connectionRetryKey, setConnectionRetryKey] = useState(0);
    
    // Keep a ref to the latest user without retriggering socket effect
    useEffect(() => {
        userRef.current = request.user;
    }, [request.user]);

    // Keep WebSocket user aligned with app user profile
    const { user: profileUser } = useUserData();
    useEffect(() => {
        if (profileUser && (!request.user || profileUser.name !== request.user.name)) {
            setRequest((prev) => ({ ...prev, user: profileUser }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileUser?.name]);

    /**
     * Checks each part of the ServerConnectionRequest for validity.
     * @returns True if the request is valid, false otherwise.
     */
    const isRequestValid = useCallback(() => {
        // Validate host
        if (!request.host || request.host.trim() === '') {
            console.error(`Invalid host: ${request.host}`);
            setError('Invalid host');
            return false;
        }

        // Validate port - parse as number and check range
        const parsedPort = Number(request.port);
        if (!Number.isFinite(parsedPort) || parsedPort <= 0 || parsedPort > MAX_PORT) {
            // If port is -1 or NaN, it's the initial invalid state - don't error, just return false
            // The actual port will be set when user submits the form
            if (parsedPort === -1 || isNaN(parsedPort)) {
                // Silently return false - this is expected on initial load
                return false;
            }
            console.error(`Invalid port: ${parsedPort} (must be between ${MIN_PORT} and ${MAX_PORT})`);
            setError(`Invalid port: ${parsedPort}`);
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

    // Wrapper for setRequest that allows manual retry by resetting connection attempt
    const setRequestWithRetry = useCallback((updater: React.SetStateAction<ServerConnectionRequest>) => {
        setRequest((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            // If host or port changed, increment counter to force WebSocket recreation
            if (next.host !== prev.host || next.port !== prev.port) {
                setConnectionRetryKey(prev => prev + 1);
            }
            return next;
        });
    }, []);

    // Create the WebSocket instance when host/port changes (not when user changes)
    // Only create if we should attempt connection and the connection target has actually changed
    const ws = useMemo(() => {
        if (!isRequestValid()) {
            return undefined;
        }

        // Create a unique key for this connection attempt (only based on host:port, not user)
        const connectionKey = `${request.host}:${request.port}`;
        
        // If connection key changed, reset the attempt flag to allow new connection
        if (connectionAttemptRef.current !== connectionKey) {
            shouldAttemptConnectionRef.current = true;
        }
        
        // If we're already attempting this connection, don't create a new WebSocket
        if (connectionAttemptRef.current === connectionKey && !shouldAttemptConnectionRef.current) {
            return undefined;
        }

        // Mark that we're attempting this connection
        connectionAttemptRef.current = connectionKey;
        shouldAttemptConnectionRef.current = false;

        try {
            // Debug: log raw values to check for hidden characters
            console.log(`[WebSocket] Host raw:`, JSON.stringify(request.host), `Port raw:`, JSON.stringify(request.port));
            
            // Ensure port is a valid number
            const parsedPort = Number(request.port);
            if (!Number.isFinite(parsedPort) || parsedPort <= 0 || parsedPort > MAX_PORT) {
                console.error(`[WebSocket] Invalid port after parsing: ${parsedPort}`);
                setError(`Invalid port: ${parsedPort}`);
                return undefined;
            }
            
            // Trim host to remove any whitespace
            const cleanHost = request.host.trim();
            const url = `ws://${cleanHost}:${parsedPort}`;
            console.log(`[WebSocket] Creating WebSocket connection to ${url}`);
            return new WebSocket(url);
        } catch (err) {
            setError(`Failed to create WebSocket: ${err}`);
            console.error('Failed to create WebSocket:', err);
            connectionAttemptRef.current = null;
            shouldAttemptConnectionRef.current = true;
            return undefined;
        }
        // Include connectionRetryKey to allow manual retry by calling setRequest again
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request.host, request.port, connectionRetryKey, isRequestValid]);

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

    // Disconnect from server when user data is cleared
    useEffect(() => {
        if (!profileUser && isConnected) {
            console.log('[GameServer] User data cleared, disconnecting from server...');
            // Get the current user from request before disconnecting (for backend identification)
            const currentUser = request.user;
            if (currentUser) {
                console.log(`[GameServer] Disconnecting user: ${currentUser.name}`);
            }
            disconnect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileUser, isConnected, disconnect, request.user]);

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
            setError(undefined); // Clear any previous errors on successful connection

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
                    case GameMessageKey.DISCONNECT: {
                        // Remove player from the map when they disconnect
                        console.log('[Frontend] Received DISCONNECT message:', msg.payload);
                        const payload = z.object({ user: UserSchema }).safeParse(msg.payload);
                        if (payload.success) {
                            const { user } = payload.data;
                            console.log(`[Frontend] Player ${user.name} disconnected, removing from map`);
                            setPlayers((prev) => {
                                const filtered = prev.filter(p => p.user.name !== user.name);
                                console.log(`[Frontend] Removed ${user.name}, ${prev.length} -> ${filtered.length} players`);
                                return filtered;
                            });
                        } else {
                            console.error('[Frontend] Failed to parse DISCONNECT payload:', payload.error);
                        }
                        break;
                    }
                    case GameMessageKey.POKER_LOBBY_STATE: {
                        const state = PokerLobbyStateSchema.safeParse(msg.payload);
                        if (state.success) {
                            setPokerPlayers(state.data.players);
                            setPokerInGame(state.data.inGame);
                        }
                        break;
                    }
                    case GameMessageKey.POKER_GAME_STATE: {
                        const gs = TableStateSchema.safeParse(msg.payload);
                        if (gs.success) {
                            setPokerState(gs.data);
                        }
                        break;
                    }
                    case GameMessageKey.BLACKJACK_LOBBY_STATE: {
                        console.log('[Frontend] Received BLACKJACK_LOBBY_STATE:', msg.payload);
                        const state = BlackjackLobbyStateSchema.safeParse(msg.payload);
                        if (state.success) {
                            console.log('[Frontend] Parsed lobby state successfully:', state.data);
                            console.log('[Frontend] Seats with occupants:', state.data.seats.filter(s => s.occupant).length);
                            setBlackjackLobbyState(state.data);
                        } else {
                            console.error('[Frontend] Failed to parse BLACKJACK_LOBBY_STATE:', state.error);
                        }
                        break;
                    }
                    case GameMessageKey.BLACKJACK_GAME_STATE: {
                        console.log('[Frontend] Received BLACKJACK_GAME_STATE:', msg.payload);
                        const gs = BlackjackGameStateSchema.safeParse(msg.payload);
                        if (gs.success) {
                            console.log('[Frontend] Parsed game state successfully:', gs.data);
                            console.log('[Frontend] Players with bets:', gs.data.players.filter(p => p.bet > 0).length);
                            setBlackjackGameState(gs.data);
                        } else {
                            console.error('[Frontend] Failed to parse BLACKJACK_GAME_STATE:', gs.error);
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
            } else {
                // Clear error on clean close
                setError(undefined);
            }

            console.log('WebSocket connection closed');
            setReadyState(ws.readyState);
            
            // Reset connection attempt tracking on close
            connectionAttemptRef.current = null;
            shouldAttemptConnectionRef.current = true;
        };

        const handleError = (error: Event) => {
            console.error('WebSocket error:', error);
            // readyState may be CLOSING/CLOSED after errors
            setReadyState(ws.readyState);
            
            // Set error but don't spam connection attempts
            const connectionKey = `${request.host}:${request.port}`;
            if (connectionAttemptRef.current === connectionKey) {
                setError(`Failed to connect to ${request.host}:${request.port}. Check that the server is running and accessible.`);
            }
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

    // Poker lobby helpers
    const joinPoker = useCallback(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN || !userRef.current) return;
        const envelope = {
            key: GameMessageKey.JOIN_POKER,
            v: MESSAGE_VERSION,
            payload: { user: userRef.current },
            ts: Date.now(),
        } as const;
        ws.send(JSON.stringify(envelope));
    }, [ws]);

    const leavePoker = useCallback(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN || !userRef.current) return;
        const envelope = {
            key: GameMessageKey.LEAVE_POKER,
            v: MESSAGE_VERSION,
            payload: { user: userRef.current },
            ts: Date.now(),
        } as const;
        ws.send(JSON.stringify(envelope));
    }, [ws]);

    const startPoker = useCallback(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN || !userRef.current) return;
        const envelope = {
            key: GameMessageKey.START_POKER,
            v: MESSAGE_VERSION,
            payload: { user: userRef.current },
            ts: Date.now(),
        } as const;
        ws.send(JSON.stringify(envelope));
    }, [ws]);

    const endPoker = useCallback(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN || !userRef.current) return;
        const envelope = {
            key: GameMessageKey.END_POKER,
            v: MESSAGE_VERSION,
            payload: { user: userRef.current },
            ts: Date.now(),
        } as const;
        ws.send(JSON.stringify(envelope));
    }, [ws]);

    // Poker actions
    const pokerAction = useCallback((action: string, amount?: number) => {
        if (!ws || ws.readyState !== WebSocket.OPEN || !userRef.current) return;
        const envelope = {
            key: GameMessageKey.POKER_ACTION,
            v: MESSAGE_VERSION,
            payload: { user: userRef.current, action, amount },
            ts: Date.now(),
        } as const;
        ws.send(JSON.stringify(envelope));
    }, [ws]);

    const pokerCheck = useCallback(() => pokerAction('CHECK'), [pokerAction]);
    const pokerCall = useCallback(() => pokerAction('CALL'), [pokerAction]);
    const pokerBet = useCallback((amount: number) => pokerAction('BET', amount), [pokerAction]);
    const pokerRaise = useCallback((amount: number) => pokerAction('RAISE', amount), [pokerAction]);
    const pokerFold = useCallback(() => pokerAction('FOLD'), [pokerAction]);

    // Blackjack multiplayer helpers
    const joinBlackjack = useCallback((seatId?: number) => {
        if (!ws || ws.readyState !== WebSocket.OPEN || !userRef.current) return;
        const envelope = {
            key: GameMessageKey.JOIN_BLACKJACK,
            v: MESSAGE_VERSION,
            payload: { user: userRef.current, seatId },
            ts: Date.now(),
        } as const;
        ws.send(JSON.stringify(envelope));
    }, [ws]);

    const leaveBlackjack = useCallback(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN || !userRef.current) return;
        const envelope = {
            key: GameMessageKey.LEAVE_BLACKJACK,
            v: MESSAGE_VERSION,
            payload: { user: userRef.current },
            ts: Date.now(),
        } as const;
        ws.send(JSON.stringify(envelope));
    }, [ws]);

    const blackjackAction = useCallback((action: string, amount?: number, seatId?: number) => {
        // Use isConnected boolean instead of checking ws.readyState directly
        // This is more reliable as it uses the tracked readyState state
        if (!isConnected || !ws) {
            console.error('[Frontend] Cannot send blackjack action - WebSocket not ready');
            console.error('[Frontend] isConnected:', isConnected, 'ws:', !!ws, 'readyState:', readyState, 'OPEN =', WebSocket.OPEN);
            return;
        }
        const currentUser = userRef.current;
        if (!currentUser) {
            console.error('[Frontend] Cannot send blackjack action - user not set');
            console.error('[Frontend] userRef.current:', currentUser);
            console.error('[Frontend] request.user:', request.user);
            return;
        }
        // Ensure user object has required fields
        if (!currentUser.name) {
            console.error('[Frontend] Cannot send blackjack action - user.name is missing');
            console.error('[Frontend] currentUser:', currentUser);
            return;
        }
        // Build user object with required fields for UserSchema
        const userPayload: any = {
            name: currentUser.name,
            balance: currentUser.balance ?? 0,
        };
        
        // Add date fields if they exist, otherwise use current date
        if (currentUser.dateCreated) {
            userPayload.dateCreated = currentUser.dateCreated instanceof Date 
                ? currentUser.dateCreated.toISOString() 
                : currentUser.dateCreated;
        } else {
            userPayload.dateCreated = new Date().toISOString();
        }
        
        if (currentUser.dateUpdated) {
            userPayload.dateUpdated = currentUser.dateUpdated instanceof Date 
                ? currentUser.dateUpdated.toISOString() 
                : currentUser.dateUpdated;
        } else {
            userPayload.dateUpdated = new Date().toISOString();
        }
        
        // Build payload, only including defined values
        const payload: any = {
            user: userPayload,
            action,
        };
        
        if (amount !== undefined && amount !== null) {
            payload.amount = amount;
        }
        
        if (seatId !== undefined && seatId !== null) {
            payload.seatId = seatId;
        }
        
        const envelope = {
            key: GameMessageKey.BLACKJACK_ACTION,
            v: MESSAGE_VERSION,
            payload,
            ts: Date.now(),
        };
        
        console.log('[Frontend] Sending blackjack action:', JSON.stringify(envelope, null, 2));
        // Double-check ws is available before sending
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(envelope));
        } else {
            console.error('[Frontend] WebSocket not ready when trying to send blackjack action');
        }
    }, [ws, request.user, isConnected, readyState]);

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
            setRequest: setRequestWithRetry,
            disconnect,
            host: request.host,
            port: request.port,
            error,
            pokerPlayers,
            pokerInGame,
            pokerState,
            joinPoker,
            leavePoker,
            startPoker,
            endPoker,
            pokerCheck,
            pokerCall,
            pokerBet,
            pokerRaise,
            pokerFold,
            blackjackLobbyState,
            blackjackGameState,
            joinBlackjack,
            leaveBlackjack,
            blackjackAction,
        }}>
            {children}
        </GameServerContext.Provider>
    );
}