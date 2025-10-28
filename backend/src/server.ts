/**
 * @file server.ts
 * @description Simple WebSocket server for the backend.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import WebSocket, { WebSocketServer } from 'ws';
import { DEFAULT_HOST, DEFAULT_PORT } from './constants';
import {
    AnyGameMessageSchema,
    GameMessageKey,
    MESSAGE_VERSION,
    MovementMessageSchema,
    type MovementMessage,
    type User,
    JoinPokerGameMessageSchema,
    type JoinPokerMessage,
    LeavePokerGameMessageSchema,
    StartPokerGameMessageSchema,
    type PokerLobbyState,
} from '../../middleware';

export class GameServer {
    private host: string = DEFAULT_HOST;
    private port: number = DEFAULT_PORT;
    private wss: WebSocketServer;
    private clients: Set<WebSocket> = new Set();
    private lobbies: Map<string, WebSocket[]> = new Map();

    // Track last known position per user to sync state to newly connected clients
    private lastKnownPositions: Map<string, MovementMessage> = new Map();

    // Map a connected socket to its associated user (set on first message containing a user)
    private userBySocket: Map<WebSocket, User> = new Map();

    // Simple poker lobby state (single lobby for now)
    private pokerLobbyId = 'poker';
    private pokerLobbyState: PokerLobbyState = {
        players: [],
        settings: { minBet: 10, maxBet: 1000 },
        inGame: false,
    };

    constructor(host?: string, port?: number) {
        if (host) this.host = host;
        if (port) this.port = port;
        this.wss = new WebSocketServer({ port: this.port, host: this.host });
        this.start();
    }

    public start() {
        this.wss.on('connection', (ws: WebSocket) => {
            this.onClientConnect(ws);
        });

        console.log(`WebSocket server is running on ws://${this.host}:${this.port}`);
    }

    public stop() {
        this.wss.close(() => {
            console.log('WebSocket server has been stopped.');
        });
    }

    private onClientConnect(ws: WebSocket) {
        console.log('Client connected');
        this.clients.add(ws);

        ws.on('message', (data) => {
            this.processMessage(data.toString(), ws);
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            this.clients.delete(ws);
            this.lobbies.forEach((clients, lobbyId) => {
                this.lobbies.set(lobbyId, clients.filter(client => client !== ws));
            });

            // Remove from poker lobby if present
            const user = this.userBySocket.get(ws);
            if (user) {
                const before = this.pokerLobbyState.players.length;
                this.pokerLobbyState.players = this.pokerLobbyState.players.filter(p => p.name !== user.name);
                this.userBySocket.delete(ws);
                if (before !== this.pokerLobbyState.players.length) {
                    this.broadcastPokerLobbyState();
                }
            }

            // Send message to all clients that this user has disconnected
            // (Could be expanded to track users more formally)
            const disconnectMessage = JSON.stringify({
                key: GameMessageKey.DISCONNECT,
                v: MESSAGE_VERSION,
                payload: {},
                ts: Date.now(),
            });
            this.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(disconnectMessage);
                }
            });
        });

        ws.send('Welcome to the WebSocket server!');

        // Immediately sync existing player positions to the newcomer
        try {
            this.lastKnownPositions.forEach((movement) => {
                if (ws.readyState === WebSocket.OPEN) {
                    const envelope = {
                        key: GameMessageKey.MOVE,
                        v: MESSAGE_VERSION,
                        payload: movement,
                        ts: Date.now(),
                    } as const;
                    ws.send(JSON.stringify(envelope));
                }
            });
        } catch (e) {
            console.error('Failed to sync existing players to new client:', e);
        }
    }

    private processMessage(message: string, ws: WebSocket) {
        // Try to parse the message
        let parsed: unknown;
        try {
            parsed = JSON.parse(message);
        } catch (e) {
            console.error('Received non-JSON message:', message);
            return;
        }

        // Prefer new envelope format; warn and ignore legacy raw movement
        let movement: MovementMessage | undefined;
        const maybeEnvelope = AnyGameMessageSchema.safeParse(parsed);
        if (!maybeEnvelope.success) {
            const legacy = MovementMessageSchema.safeParse(parsed);
            if (!legacy.success) {
                console.error('Invalid message format (neither envelope nor legacy movement):', legacy.error);
                return;
            }
            movement = legacy.data;
            // Bind user if provided
            this.tryBindUser(ws, movement.user);
        }

        // Process envelope message
        const envelope = maybeEnvelope.data;
        switch (envelope?.key) {
            case GameMessageKey.MOVE:
                {
                    const payloadResult = MovementMessageSchema.safeParse(envelope.payload);
                    if (!payloadResult.success) {
                        console.error('Invalid MOVE payload:', payloadResult.error);
                        return;
                    }
                    movement = payloadResult.data;
                    // Bind user
                    this.tryBindUser(ws, movement.user);
                    break;
                }
            case GameMessageKey.JOIN_POKER:
                {
                    const joinResult = JoinPokerGameMessageSchema.safeParse(envelope);
                    if (!joinResult.success) {
                        console.error('Invalid JOIN_POKER message:', joinResult.error);
                        return;
                    }
                    const payload: JoinPokerMessage = joinResult.data.payload;
                    this.tryBindUser(ws, payload.user);
                    this.handleJoinPoker(ws, payload);
                    return;
                }
            case GameMessageKey.LEAVE_POKER:
                {
                    const leaveResult = LeavePokerGameMessageSchema.safeParse(envelope);
                    if (!leaveResult.success) {
                        console.error('Invalid LEAVE_POKER message:', leaveResult.error);
                        return;
                    }
                    const payload: JoinPokerMessage = leaveResult.data.payload;
                    this.tryBindUser(ws, payload.user);
                    this.handleLeavePoker(ws, payload);
                    return;
                }
            case GameMessageKey.START_POKER:
                {
                    const startResult = StartPokerGameMessageSchema.safeParse(envelope);
                    if (!startResult.success) {
                        console.error('Invalid START_POKER message:', startResult.error);
                        return;
                    }
                    this.handleStartPoker(ws);
                    return;
                }
            default:
                // Ignore other message types for now
                return;
        }

        if (!movement) return;
        // Remember last known position for this user
        this.lastKnownPositions.set(movement.user.name, movement);
        
        // Broadcast movement to all connected clients (including sender)
        const payload = JSON.stringify({
            key: GameMessageKey.MOVE,
            v: MESSAGE_VERSION,
            payload: movement,
            ts: Date.now(),
        });
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }

    private tryBindUser(ws: WebSocket, user: User | undefined) {
        if (!user) return;
        const existing = this.userBySocket.get(ws);
        if (!existing || existing.name !== user.name) {
            this.userBySocket.set(ws, user);
        }
    }

    private handleJoinPoker(ws: WebSocket, payload: JoinPokerMessage) {
        // Add player if not already present
        const exists = this.pokerLobbyState.players.some(p => p.name === payload.user.name);
        if (!exists) {
            this.pokerLobbyState.players.push(payload.user);
        }
        // Track socket in lobby list
        const current = this.lobbies.get(this.pokerLobbyId) ?? [];
        if (!current.includes(ws)) {
            this.lobbies.set(this.pokerLobbyId, [...current, ws]);
        }
        this.broadcastPokerLobbyState();
    }

    private handleLeavePoker(ws: WebSocket, payload: JoinPokerMessage) {
        // Remove by user name
        const before = this.pokerLobbyState.players.length;
        this.pokerLobbyState.players = this.pokerLobbyState.players.filter(p => p.name !== payload.user.name);
        // Remove socket from lobby
        const current = this.lobbies.get(this.pokerLobbyId) ?? [];
        this.lobbies.set(this.pokerLobbyId, current.filter(s => s !== ws));
        if (before !== this.pokerLobbyState.players.length) {
            this.broadcastPokerLobbyState();
        }
    }

    private handleStartPoker(ws: WebSocket) {
        // Only allow start if at least 2 players and not already running
        if (this.pokerLobbyState.inGame) return;
        if (this.pokerLobbyState.players.length < 2) {
            console.warn('Not enough players to start poker');
            return;
        }
        this.pokerLobbyState.inGame = true;
        this.broadcastPokerLobbyState();
        // NOTE: Full poker game flow is out of scope here; this establishes lobby/start scaffolding.
    }

    private broadcastPokerLobbyState() {
        const envelope = {
            key: GameMessageKey.POKER_LOBBY_STATE,
            v: MESSAGE_VERSION,
            payload: this.pokerLobbyState,
            ts: Date.now(),
        } as const;
        const message = JSON.stringify(envelope);
        const sockets = this.lobbies.get(this.pokerLobbyId) ?? [];
        sockets.forEach(s => {
            if (s.readyState === WebSocket.OPEN) {
                s.send(message);
            }
        });
    }
}
