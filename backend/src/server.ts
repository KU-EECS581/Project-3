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
    PokerActionMessageSchema,
    TableStateSchema,
    JoinBlackjackGameMessageSchema,
    type JoinBlackjackMessage,
    LeaveBlackjackGameMessageSchema,
    type BlackjackLobbyState,
    BlackjackActionMessageSchema,
    type BlackjackActionMessage,
    type BlackjackGameStateMessage,
} from '../../middleware';
import { Deck, Street, type TableState, type PlayerState, Suit, Rank, type Card } from '../../middleware/cards';
// @ts-ignore - pokersolver has no types in ESM, require style import
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import pkg from 'pokersolver';
const { Hand } = pkg as { Hand: any };

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
    
    // Reverse map: user name to socket (for easier lookup when disconnecting)
    private socketByUser: Map<string, WebSocket> = new Map();

    // Simple poker lobby state (single lobby for now)
    private pokerLobbyId = 'poker';
    private pokerLobbyState: PokerLobbyState = {
        players: [],
        settings: { minBet: 10, maxBet: 1000 },
        inGame: false,
    };

    // Live poker game state (single table for now)
    private pokerGameState: TableState | undefined;
    private pokerDeck: Deck | undefined;
    private pokerTurnTimer: NodeJS.Timeout | undefined;
    private readonly TURN_MS = 30_000; // 30 seconds per turn

    // Blackjack multiplayer state
    private blackjackLobbyId = 'blackjack';
    private blackjackLobbyState: BlackjackLobbyState = {
        seats: Array(5).fill(null).map((_, i) => ({ id: i })),
        inGame: false,
    };
    private blackjackGameState: BlackjackGameStateMessage | undefined;
    private blackjackDeck: Deck | undefined;
    private blackjackTurnTimer: NodeJS.Timeout | undefined;
    private readonly BLACKJACK_TURN_MS = 30_000; // 30 seconds per turn

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
            console.log(`[Backend] Total clients before removal: ${this.clients.size}`);
            console.log(`[Backend] Total users in userBySocket: ${this.userBySocket.size}`);
            console.log(`[Backend] Total users in lastKnownPositions: ${this.lastKnownPositions.size}`);
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
                this.socketByUser.delete(user.name);
                if (before !== this.pokerLobbyState.players.length) {
                    this.broadcastPokerLobbyState();
                }
                // If a poker game is running, mark as folded and evaluate end condition
                if (this.pokerGameState) {
                    const idx = this.pokerGameState.players.findIndex(p => p.user.name === user.name);
                    if (idx >= 0) {
                        this.pokerGameState.players[idx].hasFolded = true;
                        const remaining = this.pokerGameState.players.filter(p => !p.hasFolded);
                        if (remaining.length === 1) {
                            remaining[0].chips += this.pokerGameState.pot;
                            this.pokerGameState.pot = 0;
                            this.pokerGameState.street = Street.Showdown;
                            (this.pokerGameState as unknown as { winner?: User; gameOver?: boolean }).winner = remaining[0].user;
                            (this.pokerGameState as unknown as { gameOver?: boolean }).gameOver = true;
                            this.stopTurnTimer();
                        }
                        this.broadcastPokerGameState();
                    }
                }
            }

            // Remove player from lastKnownPositions and send DISCONNECT message
            if (user) {
                // Remove from lastKnownPositions
                this.lastKnownPositions.delete(user.name);
                console.log(`[Backend] Removed ${user.name} from lastKnownPositions`);

                // Send DISCONNECT message to all clients (excluding the disconnected one)
                const disconnectMessage = JSON.stringify({
                    key: GameMessageKey.DISCONNECT,
                    v: MESSAGE_VERSION,
                    payload: { user },
                    ts: Date.now(),
                });
                console.log(`[Backend] Broadcasting DISCONNECT for ${user.name} to ${this.clients.size - 1} remaining clients`);
                let sentCount = 0;
                this.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN && client !== ws) {
                        client.send(disconnectMessage);
                        sentCount++;
                    }
                });
                console.log(`[Backend] Sent DISCONNECT for ${user.name} to ${sentCount} clients`);
            } else {
                // Fallback: Check if any user in lastKnownPositions might be associated with this socket
                // This is a best-effort attempt to identify the user
                console.warn(`[Backend] No user found in userBySocket for disconnected client`);
                console.warn(`[Backend] Attempting to find user from lastKnownPositions...`);
                
                // Find users that might be on this socket by checking if their socket matches
                // This is not perfect but better than nothing
                for (const [userName, movement] of this.lastKnownPositions.entries()) {
                    const userSocket = this.socketByUser.get(userName);
                    if (userSocket === ws) {
                        console.log(`[Backend] Found user ${userName} associated with disconnected socket via fallback`);
                        // Remove from tracking
                        this.lastKnownPositions.delete(userName);
                        this.socketByUser.delete(userName);
                        
                        // Send DISCONNECT message
                        const disconnectMessage = JSON.stringify({
                            key: GameMessageKey.DISCONNECT,
                            v: MESSAGE_VERSION,
                            payload: { user: movement.user },
                            ts: Date.now(),
                        });
                        let sentCount = 0;
                        this.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN && client !== ws) {
                                client.send(disconnectMessage);
                                sentCount++;
                            }
                        });
                        console.log(`[Backend] Sent DISCONNECT for ${userName} to ${sentCount} clients (via fallback)`);
                        break; // Only handle one user per socket
                    }
                }
            }
        });

        ws.send('Welcome to the WebSocket server!');

        // Immediately sync existing player positions to the newcomer
        try {
            console.log(`[Backend] Syncing ${this.lastKnownPositions.size} existing player positions to new client`);
            this.lastKnownPositions.forEach((movement) => {
                if (ws.readyState === WebSocket.OPEN) {
                    const envelope = {
                        key: GameMessageKey.MOVE,
                        v: MESSAGE_VERSION,
                        payload: movement,
                        ts: Date.now(),
                    } as const;
                    ws.send(JSON.stringify(envelope));
                    console.log(`[Backend] Sent position for ${movement.user.name} to new client`);
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
        
        // Log the parsed message for debugging
        console.log('[Server] Received message:', JSON.stringify(parsed, null, 2));

        // Prefer new envelope format; warn and ignore legacy raw movement
        let movement: MovementMessage | undefined;
        const maybeEnvelope = AnyGameMessageSchema.safeParse(parsed);
        if (!maybeEnvelope.success) {
            console.log('[Server] Envelope parsing failed:', maybeEnvelope.error);
            // Only try legacy movement if it looks like a movement message (has x, y fields)
            if (typeof parsed === 'object' && parsed !== null && 'x' in parsed && 'y' in parsed) {
                const legacy = MovementMessageSchema.safeParse(parsed);
                if (!legacy.success) {
                    console.error('Invalid message format (neither envelope nor legacy movement):', legacy.error);
                    console.error('Received message:', JSON.stringify(parsed, null, 2));
                    return;
                }
            } else {
                // Not a movement message, so envelope parsing should have worked
                console.error('[Server] Invalid envelope format:', maybeEnvelope.error);
                console.error('[Server] Received message:', JSON.stringify(parsed, null, 2));
                return;
            }
            movement = legacy.data;
            // Bind user if provided
            this.tryBindUser(ws, movement.user);
            // Handle legacy movement message
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
            this.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(payload);
                }
            });
            return;
        }

        // Process envelope message
        const envelope = maybeEnvelope.data;
        if (!envelope) {
            console.error('Envelope is null or undefined');
            return;
        }
        
        switch (envelope.key) {
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
            case GameMessageKey.END_POKER:
                {
                    // Anyone can request returning to lobby after a game ends
                    this.stopTurnTimer();
                    this.pokerGameState && ((this.pokerGameState as unknown as { gameOver?: boolean }).gameOver = true);
                    this.broadcastPokerGameState();
                    this.pokerLobbyState.inGame = false;
                    this.broadcastPokerLobbyState();
                    return;
                }
            case GameMessageKey.POKER_ACTION:
                {
                    const actionResult = PokerActionMessageSchema.safeParse(envelope.payload);
                    if (!actionResult.success) {
                        console.error('Invalid POKER_ACTION payload:', actionResult.error);
                        return;
                    }
                    console.log('POKER_ACTION received:', actionResult.data.user.name, actionResult.data.action, actionResult.data.amount ?? '');
                    this.handlePokerAction(actionResult.data);
                    return;
                }
            case GameMessageKey.JOIN_BLACKJACK:
                {
                    const joinResult = JoinBlackjackGameMessageSchema.safeParse(envelope);
                    if (!joinResult.success) {
                        console.error('Invalid JOIN_BLACKJACK message:', joinResult.error);
                        return;
                    }
                    const payload: JoinBlackjackMessage = joinResult.data.payload;
                    this.tryBindUser(ws, payload.user);
                    this.handleJoinBlackjack(ws, payload);
                    return;
                }
            case GameMessageKey.LEAVE_BLACKJACK:
                {
                    const leaveResult = LeaveBlackjackGameMessageSchema.safeParse(envelope);
                    if (!leaveResult.success) {
                        console.error('Invalid LEAVE_BLACKJACK message:', leaveResult.error);
                        return;
                    }
                    const payload: JoinBlackjackMessage = leaveResult.data.payload;
                    this.tryBindUser(ws, payload.user);
                    this.handleLeaveBlackjack(ws, payload);
                    return;
                }
            case GameMessageKey.BLACKJACK_ACTION:
                {
                    console.log('[Backend] Received BLACKJACK_ACTION message');
                    const actionResult = BlackjackActionMessageSchema.safeParse(envelope.payload);
                    if (!actionResult.success) {
                        console.error('[Backend] Invalid BLACKJACK_ACTION payload:', actionResult.error);
                        console.error('[Backend] Payload was:', JSON.stringify(envelope.payload, null, 2));
                        return;
                    }
                    console.log('[Backend] BLACKJACK_ACTION received:', actionResult.data.user.name, actionResult.data.action, actionResult.data.amount ?? '');
                    this.handleBlackjackAction(actionResult.data);
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
            // Remove old socket mapping if user changed
            if (existing && existing.name !== user.name) {
                this.socketByUser.delete(existing.name);
            }
            // Set new mappings
            this.userBySocket.set(ws, user);
            this.socketByUser.set(user.name, ws);
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
        // If a game is running, sync current state to the new lobby member
        if (this.pokerLobbyState.inGame && this.pokerGameState) {
            const envelope = {
                key: GameMessageKey.POKER_GAME_STATE,
                v: MESSAGE_VERSION,
                payload: { ...this.pokerGameState, turnEndsAt: this.currentTurnEndsAt() },
                ts: Date.now(),
            } as const;
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(envelope));
        }
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
        // Allow start if at least 2 players and not already running, or previous game is over
        if (this.pokerLobbyState.inGame && !(this.pokerGameState as unknown as { gameOver?: boolean } | undefined)?.gameOver) {
            return;
        }
        // Reset any previous game state
        this.stopTurnTimer();
        this.pokerGameState = undefined;
        this.pokerDeck = undefined;
        if (this.pokerLobbyState.players.length < 2) {
            console.warn('Not enough players to start poker');
            return;
        }
        this.pokerLobbyState.inGame = true;
        this.broadcastPokerLobbyState();

        // Initialize game state
        this.pokerDeck = new Deck();
        this.pokerDeck.shuffle();

        const players: PlayerState[] = this.pokerLobbyState.players.map((u) => ({
            user: u,
            chips: u.balance ?? this.pokerLobbyState.settings.maxBet,
            hole: [],
            hasFolded: false,
            isAllIn: false,
            currentBet: 0,
        }));

        const state: TableState = {
            players,
            community: [],
            pot: 0,
            street: Street.Preflop,
            dealerIndex: 0,
            currentPlayerIndex: players.length > 1 ? 1 : 0,
            streetStartIndex: players.length > 1 ? 1 : 0,
            lastAggressorIndex: undefined,
            currentBet: 0,
            minBet: this.pokerLobbyState.settings.minBet,
            maxBet: this.pokerLobbyState.settings.maxBet,
        };

        // Deal hole cards 2 each
        this.dealHoleCards(state);
        this.pokerGameState = state;
        this.startTurnTimer();
        this.broadcastPokerGameState();
    }

    private broadcastPokerGameState() {
        if (!this.pokerGameState) return;
        const sockets = this.lobbies.get(this.pokerLobbyId) ?? [];
        const envelope = {
            key: GameMessageKey.POKER_GAME_STATE,
            v: MESSAGE_VERSION,
            payload: {
                ...this.pokerGameState,
                turnEndsAt: this.currentTurnEndsAt(),
            },
            ts: Date.now(),
        } as const;
        const msg = JSON.stringify(envelope);
        sockets.forEach(s => {
            if (s.readyState === WebSocket.OPEN) s.send(msg);
        });
    }

    private currentTurnEndsAt(): number | undefined {
        // We compute endsAt as now + remaining if a timer exists; for simplicity, just set now+TURN_MS when broadcast after (re)start
        // In a more robust impl we'd track a timestamp
        // Here, we store a timestamp on start
        return this._turnEndsAt;
    }
    private _turnEndsAt: number | undefined;

    private startTurnTimer() {
        if (!this.pokerGameState) return;
        if (this.pokerTurnTimer) clearTimeout(this.pokerTurnTimer);
        this._turnEndsAt = Date.now() + this.TURN_MS;
        this.pokerTurnTimer = setTimeout(() => {
            try {
                if (!this.pokerGameState) return;
                // Auto-fold current player on timeout
                const currentIdx = this.pokerGameState.currentPlayerIndex;
                const current = this.pokerGameState.players[currentIdx];
                if (!current.hasFolded && !current.isAllIn) {
                    console.log('Turn timer expired, auto-folding:', current.user.name);
                    this.applyFold();
                } else {
                    // If current is already ineligible, advance to next eligible and restart timer
                    this.pokerGameState.currentPlayerIndex = this.nextPlayerIndex(currentIdx);
                    console.log('Turn timer expired but player ineligible; advancing to:', this.pokerGameState.players[this.pokerGameState.currentPlayerIndex].user.name);
                    this.startTurnTimer();
                    this.broadcastPokerGameState();
                }
            } catch (e) {
                console.error('Turn timer error:', e);
            }
        }, this.TURN_MS);
    }

    private stopTurnTimer() {
        if (this.pokerTurnTimer) clearTimeout(this.pokerTurnTimer);
        this.pokerTurnTimer = undefined;
        this._turnEndsAt = undefined;
    }

    private nextPlayerIndex(from: number): number {
        if (!this.pokerGameState) return from;
        const n = this.pokerGameState.players.length;
        for (let k = 1; k <= n; k++) {
            const idx = (from + k) % n;
            const p = this.pokerGameState.players[idx];
            if (!p.hasFolded && !p.isAllIn) return idx;
        }
        return from;
    }

    private isBettingRoundComplete(): boolean {
        if (!this.pokerGameState) return false;
        const s = this.pokerGameState;
        const active = s.players.filter(p => !p.hasFolded && !p.isAllIn);
        if (active.length <= 1) return true;
        // No bets this street: complete when action returns to streetStartIndex
        if (s.currentBet === 0) {
            return s.currentPlayerIndex === s.streetStartIndex;
        }
        // Bets occurred: complete when action returns to player after last aggressor and all active have matched currentBet
        const afterAggressor = this.nextPlayerIndex(s.lastAggressorIndex ?? s.streetStartIndex) % s.players.length;
        const everyoneMatched = active.every(p => p.currentBet === s.currentBet || p.chips === 0);
        return everyoneMatched && s.currentPlayerIndex === afterAggressor;
    }

    private advanceStreet() {
        if (!this.pokerGameState || !this.pokerDeck) return;
        const s = this.pokerGameState;
        switch (s.street) {
            case Street.Preflop: {
                const flop = this.pokerDeck.dealCards(3);
                s.community.push(...flop);
                s.street = Street.Flop;
                break;
            }
            case Street.Flop: {
                const c = this.pokerDeck.dealCard();
                if (c) s.community.push(c);
                s.street = Street.Turn;
                break;
            }
            case Street.Turn: {
                const c = this.pokerDeck.dealCard();
                if (c) s.community.push(c);
                s.street = Street.River;
                break;
            }
            case Street.River: {
                s.street = Street.Showdown;
                this.handleShowdown();
                return; // showdown handles broadcasting
            }
        }
        // Reset per-street
        s.currentBet = 0;
        s.players = s.players.map(p => ({ ...p, currentBet: 0 }));
        s.currentPlayerIndex = this.nextPlayerIndex(s.dealerIndex);
        s.streetStartIndex = s.currentPlayerIndex;
        s.lastAggressorIndex = undefined;
        this.startTurnTimer();
        this.broadcastPokerGameState();
    }

    private handleShowdown() {
        if (!this.pokerGameState) return;
        const s = this.pokerGameState;
        const actives = s.players
            .map((p, idx) => ({ p, idx }))
            .filter(({ p }) => !p.hasFolded);

        // If only one active, they take the pot
        if (actives.length === 1) {
            actives[0].p.chips += s.pot;
            s.pot = 0;
            (s as unknown as { winner?: User }).winner = actives[0].p.user;
            (s as unknown as { gameOver?: boolean }).gameOver = true;
            this.stopTurnTimer();
            this.broadcastPokerGameState();
            return;
        }

        // Evaluate best hands using pokersolver
        try {
            const board = s.community.map(this.cardToSolverString);
            const solved = actives.map(({ p, idx }) => ({
                idx,
                hand: Hand.solve([...p.hole.map(this.cardToSolverString), ...board])
            }));
            const winners = Hand.winners(solved.map(x => x.hand)) as any[];
            // Map winners back to player indices
            const winnerIndices: number[] = [];
            winners.forEach(w => {
                const match = solved.find(x => x.hand === w);
                if (match) winnerIndices.push(match.idx);
            });
            if (winnerIndices.length === 0) {
                // Fallback: first active
                actives[0].p.chips += s.pot;
                (s as unknown as { winner?: User }).winner = actives[0].p.user;
                s.pot = 0;
            } else if (winnerIndices.length === 1) {
                const wi = winnerIndices[0];
                s.players[wi].chips += s.pot;
                (s as unknown as { winner?: User }).winner = s.players[wi].user;
                s.pot = 0;
            } else {
                // Split pot evenly among winners; distribute remainder by table order
                const share = Math.floor(s.pot / winnerIndices.length);
                let remainder = s.pot % winnerIndices.length;
                winnerIndices.sort((a, b) => a - b).forEach((wi) => {
                    s.players[wi].chips += share + (remainder > 0 ? 1 : 0);
                    if (remainder > 0) remainder--;
                });
                // For UI, mark the first winner
                (s as unknown as { winner?: User }).winner = s.players[winnerIndices[0]].user;
                s.pot = 0;
            }
        } catch (e) {
            console.error('Error during showdown evaluation:', e);
            const fallback = actives[0].p;
            fallback.chips += s.pot;
            (s as unknown as { winner?: User }).winner = fallback.user;
            s.pot = 0;
        }

        (s as unknown as { gameOver?: boolean }).gameOver = true;
        this.stopTurnTimer();
        this.broadcastPokerGameState();
        // Do NOT immediately flip lobby to inGame=false; allow players to see showdown and choose next step.
    }

    private cardToSolverString = (c: { suit: Suit; rank: Rank }): string => {
        const rankChar = (() => {
            switch (c.rank) {
                case Rank.ACE: return 'A';
                case Rank.KING: return 'K';
                case Rank.QUEEN: return 'Q';
                case Rank.JACK: return 'J';
                case Rank.TEN: return 'T';
                case Rank.NINE: return '9';
                case Rank.EIGHT: return '8';
                case Rank.SEVEN: return '7';
                case Rank.SIX: return '6';
                case Rank.FIVE: return '5';
                case Rank.FOUR: return '4';
                case Rank.THREE: return '3';
                case Rank.TWO: return '2';
                default: return '2';
            }
        })();
        const suitChar = (() => {
            switch (c.suit) {
                case Suit.SPADES: return 's';
                case Suit.HEARTS: return 'h';
                case Suit.DIAMONDS: return 'd';
                case Suit.CLUBS: return 'c';
                default: return 's';
            }
        })();
        return `${rankChar}${suitChar}`;
    };

    private dealHoleCards(state: TableState) {
        if (!this.pokerDeck) return;
        for (let r = 0; r < 2; r++) {
            for (let i = 0; i < state.players.length; i++) {
                const c = this.pokerDeck.dealCard();
                if (c) state.players[i].hole.push(c);
            }
        }
    }

    private handlePokerAction(action: { user: User; action: string; amount?: number }) {
        if (!this.pokerGameState) return;
        const s = this.pokerGameState;
        const idx = s.players.findIndex(p => p.user.name === action.user.name);
        if (idx < 0) return;
        if (idx !== s.currentPlayerIndex) return; // not your turn

        switch (action.action) {
            case 'CHECK':
                this.applyCheck();
                break;
            case 'CALL':
                this.applyCall();
                break;
            case 'BET':
            case 'RAISE':
                this.applyBetOrRaise(action.amount ?? 0);
                break;
            case 'FOLD':
                this.applyFold();
                break;
        }
    }

    private applyCheck() {
        if (!this.pokerGameState) return;
        const s = this.pokerGameState;
        const current = s.players[s.currentPlayerIndex];
        const toCall = Math.max(0, s.currentBet - current.currentBet);
        if (toCall > 0) return; // cannot check
        s.currentPlayerIndex = this.nextPlayerIndex(s.currentPlayerIndex);
        if (this.isBettingRoundComplete()) {
            this.advanceStreet();
        } else {
            this.startTurnTimer();
            this.broadcastPokerGameState();
        }
    }

    private applyCall() {
        if (!this.pokerGameState) return;
        const s = this.pokerGameState;
        const i = s.currentPlayerIndex;
        const p = s.players[i];
        const toCall = Math.max(0, s.currentBet - p.currentBet);
        if (toCall <= 0) return; // nothing to call
        const pay = Math.min(toCall, p.chips);
        p.chips -= pay;
        p.currentBet += pay;
        if (p.chips === 0) p.isAllIn = true;
        s.pot += pay;
        s.currentPlayerIndex = this.nextPlayerIndex(i);
        if (this.isBettingRoundComplete()) {
            this.advanceStreet();
        } else {
            this.startTurnTimer();
            this.broadcastPokerGameState();
        }
    }

    private applyBetOrRaise(amount: number) {
        if (!this.pokerGameState) return;
        const s = this.pokerGameState;
        const i = s.currentPlayerIndex;
        const p = s.players[i];
        const amt = Math.max(s.minBet, Math.min(amount, p.chips));
        if (amt <= 0) return;
        p.chips -= amt;
        p.currentBet += amt;
        s.pot += amt;
        s.currentBet = Math.max(s.currentBet, p.currentBet);
        if (p.chips === 0) p.isAllIn = true;
        s.lastAggressorIndex = i;
        s.currentPlayerIndex = this.nextPlayerIndex(i);
        if (this.isBettingRoundComplete()) {
            this.advanceStreet();
        } else {
            this.startTurnTimer();
            this.broadcastPokerGameState();
        }
    }

    private applyFold() {
        if (!this.pokerGameState) return;
        const s = this.pokerGameState;
        const i = s.currentPlayerIndex;
        s.players[i].hasFolded = true;
        // If only one left, they win
        const remaining = s.players.filter(p => !p.hasFolded);
        if (remaining.length === 1) {
            remaining[0].chips += s.pot;
            s.pot = 0;
            s.street = Street.Showdown;
            (s as unknown as { winner?: User; gameOver?: boolean }).winner = remaining[0].user;
            (s as unknown as { gameOver?: boolean }).gameOver = true;
            this.stopTurnTimer();
            this.broadcastPokerGameState();
            return;
        }
        s.currentPlayerIndex = this.nextPlayerIndex(i);
        if (this.isBettingRoundComplete()) {
            this.advanceStreet();
        } else {
            this.startTurnTimer();
            this.broadcastPokerGameState();
        }
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

    // Blackjack handlers
    private handleJoinBlackjack(ws: WebSocket, payload: JoinBlackjackMessage) {
        console.log(`[Backend] handleJoinBlackjack called for ${payload.user.name}, seatId: ${payload.seatId ?? 'none'}`);
        
        // Track socket in lobby list FIRST (so they receive broadcasts even if no seat yet)
        const current = this.lobbies.get(this.blackjackLobbyId) ?? [];
        if (!current.includes(ws)) {
            this.lobbies.set(this.blackjackLobbyId, [...current, ws]);
            console.log(`[Backend] Added ${payload.user.name} to blackjack lobby. Total sockets: ${this.lobbies.get(this.blackjackLobbyId)?.length ?? 0}`);
        }

        // If no seatId provided, just add them to lobby without assigning a seat
        if (payload.seatId === undefined || payload.seatId === null) {
            console.log(`[Backend] No seatId provided for ${payload.user.name}, just adding to lobby`);
            // Send current lobby state to the new player
            const lobbyEnvelope = {
                key: GameMessageKey.BLACKJACK_LOBBY_STATE,
                v: MESSAGE_VERSION,
                payload: this.blackjackLobbyState,
                ts: Date.now(),
            } as const;
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(lobbyEnvelope));
                console.log(`[Backend] Sent current lobby state to ${payload.user.name}`);
            }
            
            // If a game is running, sync current state to the new player
            if (this.blackjackLobbyState.inGame && this.blackjackGameState) {
                const envelope = {
                    key: GameMessageKey.BLACKJACK_GAME_STATE,
                    v: MESSAGE_VERSION,
                    payload: { ...this.blackjackGameState, turnEndsAt: this.currentBlackjackTurnEndsAt() },
                    ts: Date.now(),
                } as const;
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(envelope));
            }
            return;
        }

        // If seatId is provided, assign or update seat
        const seatId = payload.seatId;
        
        // Check if user already has a seat
        const existingSeatIndex = this.blackjackLobbyState.seats.findIndex(
            s => s.occupant?.user.name === payload.user.name
        );
        
        if (existingSeatIndex !== -1) {
            // User already has a seat - check if they're trying to change seats
            if (existingSeatIndex === seatId) {
                console.log(`[Backend] ${payload.user.name} already in seat ${seatId}`);
                // Already in this seat, just broadcast current state
                this.broadcastBlackjackLobbyState();
                return;
            } else {
                // User wants to change seats - remove from old seat first
                console.log(`[Backend] ${payload.user.name} moving from seat ${existingSeatIndex} to seat ${seatId}`);
                this.blackjackLobbyState.seats[existingSeatIndex] = { id: existingSeatIndex };
            }
        }

        // Check if requested seat is already taken by someone else
        if (this.blackjackLobbyState.seats[seatId].occupant && 
            this.blackjackLobbyState.seats[seatId].occupant!.user.name !== payload.user.name) {
            console.warn(`[Backend] Seat ${seatId} is already taken by ${this.blackjackLobbyState.seats[seatId].occupant!.user.name}`);
            return;
        }

        // Assign seat
        this.blackjackLobbyState.seats[seatId] = {
            id: seatId,
            occupant: {
                user: payload.user,
                isSpectating: false,
                isSittingOut: false,
            }
        };

        console.log(`[Backend] Assigned ${payload.user.name} to seat ${seatId}`);
        console.log(`[Backend] Current lobby state:`, JSON.stringify(this.blackjackLobbyState, null, 2));

        // Broadcast to ALL players in lobby (this is the key - all players should see the update)
        this.broadcastBlackjackLobbyState();
        
        // If a game is running, sync current state to the new player
        if (this.blackjackLobbyState.inGame && this.blackjackGameState) {
            const envelope = {
                key: GameMessageKey.BLACKJACK_GAME_STATE,
                v: MESSAGE_VERSION,
                payload: { ...this.blackjackGameState, turnEndsAt: this.currentBlackjackTurnEndsAt() },
                ts: Date.now(),
            } as const;
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(envelope));
        }
    }

    private handleLeaveBlackjack(ws: WebSocket, payload: JoinBlackjackMessage) {
        // Find the seat index first
        const seatIndex = this.blackjackLobbyState.seats.findIndex(
            s => s.occupant?.user.name === payload.user.name
        );
        
        // Get player state BEFORE removing from seat (so we can refund bet)
        let betToRefund = 0;
        if (this.blackjackGameState && seatIndex !== -1) {
            const playerState = this.blackjackGameState.players.find(
                p => p.user.name === payload.user.name && p.seatId === seatIndex
            );
            if (playerState) {
                betToRefund = playerState.bet || playerState.hand?.bet || 0;
            }
        }
        
        // Refund bet if game hasn't started or is in early dealing phase (before cards are fully dealt)
        // Allow leaving during "betting", "waiting", or early "dealing" phase (new round just started)
        const canRefundBet = betToRefund > 0 && this.blackjackGameState && 
            (this.blackjackGameState.phase === 'betting' || 
             this.blackjackGameState.phase === 'waiting' ||
             (this.blackjackGameState.phase === 'dealing' && 
              (!this.blackjackGameState.dealerHand || this.blackjackGameState.dealerHand.length === 0) &&
              this.blackjackGameState.players.every(p => !p.hand || !p.hand.cards || p.hand.cards.length === 0)));
        
        // Remove from seat FIRST (atomic operation)
        // Clear the seat completely - this is independent of sit out/sit in status
        if (seatIndex !== -1) {
            this.blackjackLobbyState.seats[seatIndex] = { id: seatIndex };
            console.log(`[Backend] Cleared seat ${seatIndex} for ${payload.user.name} (leave seat is independent of sit out status)`);
        }
        
        // Remove player from game state (this removes the bet)
        if (this.blackjackGameState && seatIndex !== -1) {
            this.blackjackGameState.players = this.blackjackGameState.players.filter(
                p => !(p.user.name === payload.user.name && p.seatId === seatIndex)
            );
            
            // If this was the current player's turn, move to next player or dealer
            if (this.blackjackGameState.currentPlayerId === payload.user.name) {
                this.moveToNextPlayer();
            }
        }
        
        // Remove socket from lobby
        const current = this.lobbies.get(this.blackjackLobbyId) ?? [];
        this.lobbies.set(this.blackjackLobbyId, current.filter(s => s !== ws));

        // Check if only one player left - reset table if game is in progress
        const remainingSeated = this.blackjackLobbyState.seats.filter(s => s.occupant && !s.occupant.isSittingOut);
        if (remainingSeated.length === 1 && this.blackjackGameState && 
            (this.blackjackGameState.phase === 'player_turn' || this.blackjackGameState.phase === 'dealer_turn' || 
             this.blackjackGameState.phase === 'finished')) {
            console.log('[Backend] Only one player left, resetting game state');
            // Reset game state
            this.blackjackGameState = {
                phase: 'betting',
                dealerHand: [],
                dealerVisible: false,
                players: [],
                currentPlayerId: null,
                roundNumber: 0
            };
            this.blackjackLobbyState.inGame = false;
            this.stopBlackjackTurnTimer();
            this.broadcastBlackjackGameState();
        }

        // Broadcast both states - game state first (with bet removed), then lobby state (with seat cleared)
        if (this.blackjackGameState) {
            this.broadcastBlackjackGameState();
        }
        this.broadcastBlackjackLobbyState();
        
        // Log refund info for frontend
        if (canRefundBet && betToRefund > 0) {
            console.log(`[Backend] Leave seat: Refunding bet of ${betToRefund} to ${payload.user.name} (frontend should update balance)`);
        }
    }

    private handleBlackjackAction(action: BlackjackActionMessage) {
        console.log('Blackjack action:', action.action, action.user.name);
        
        if (action.action === 'DEAL') {
            this.handleDealCards();
        } else if (action.action === 'BET') {
            this.handlePlaceBet(action);
        } else if (action.action === 'HIT') {
            this.handleHit(action);
        } else if (action.action === 'STAND') {
            this.handleStand(action);
        } else if (action.action === 'DOUBLE_DOWN') {
            this.handleDoubleDown(action);
        } else if (action.action === 'SIT_OUT') {
            this.handleSitOut(action);
        } else {
            console.log('Unhandled blackjack action:', action.action);
        }
    }

    private handleDealCards() {
        console.log('[Blackjack] ========== handleDealCards called ==========');
        console.log('[Blackjack] Game state exists:', !!this.blackjackGameState);
        console.log('[Blackjack] Game state phase:', this.blackjackGameState?.phase);
        console.log('[Blackjack] Game state players count:', this.blackjackGameState?.players?.length || 0);
        console.log('[Blackjack] Game state players:', JSON.stringify(this.blackjackGameState?.players?.map(p => ({ name: p.user.name, bet: p.bet, seatId: p.seatId })), null, 2));
        
        // If game is finished, reset to betting phase first
        // IMPORTANT: Always wait for players to click "Deal Cards" again - don't auto-deal
        if (this.blackjackGameState && this.blackjackGameState.phase === 'finished') {
            console.log('[Blackjack] Game finished, resetting to betting phase for new round');
            console.log('[Blackjack] DEAL action received while game is finished - resetting to betting phase only');
            // Reset game state but keep players with their bets
            this.blackjackGameState.phase = 'betting';
            this.blackjackGameState.dealerHand = [];
            this.blackjackGameState.dealerVisible = false;
            this.blackjackGameState.currentPlayerId = null;
            // Clear hands but keep bets
            this.blackjackGameState.players = this.blackjackGameState.players.map(p => ({
                ...p,
                hand: undefined,
                bet: 0,
                isActive: false,
                isFinished: false,
                result: undefined,
                payout: undefined
            }));
            this.broadcastBlackjackGameState();
            // Always wait for players to click "Deal Cards" again - don't auto-deal
            // This allows players to change bets before starting the next round
            console.log('[Blackjack] Reset to betting phase - waiting for players to place bets and click "Deal Cards"');
            console.log('[Blackjack] NOT dealing cards - players must click "Deal Cards" again after placing bets');
            return; // CRITICAL: Return early - do NOT proceed to deal cards
        }
        
        // Check if we're in betting phase or no game state exists yet
        // This check happens AFTER the finished phase check, so we know we're not in finished phase
        // IMPORTANT: Only allow dealing when explicitly in betting phase
        // If phase is anything else (dealing, player_turn, dealer_turn, finished), don't deal
        if (this.blackjackGameState && this.blackjackGameState.phase !== 'betting') {
            console.log('[Blackjack] Cannot deal cards - not in betting phase. Current phase:', this.blackjackGameState.phase);
            console.log('[Blackjack] ========== Exiting handleDealCards - wrong phase ==========');
            return;
        }
        
        // Double-check: If we just reset from finished to betting, we should NOT deal cards
        // This is a safety check to prevent auto-dealing after reset
        // The phase should be 'betting' at this point, but we need to ensure we're not auto-dealing
        console.log('[Blackjack] Phase is betting - proceeding to deal cards');
        console.log('[Blackjack] Players with bets:', this.blackjackGameState?.players?.filter(p => p.bet > 0).length || 0);

        // Get players with bets (should work with just one player, regardless of seat)
        // First, ensure game state exists - if not, initialize it
        if (!this.blackjackGameState) {
            console.log('[Blackjack] Game state does not exist, initializing...');
            this.blackjackGameState = {
                phase: 'betting',
                dealerHand: [],
                dealerVisible: false,
                players: [],
                currentPlayerId: null,
                roundNumber: 0
            };
        }

        // Get players with bets from game state (this is the source of truth)
        // Filter out sitting out players - they should not be dealt cards
        // Also ensure players are still seated and not sitting out
        const playersWithBets = this.blackjackGameState.players.filter(p => {
            if (p.bet <= 0) return false;
            // Check if player is sitting out
            const seat = this.blackjackLobbyState.seats[p.seatId];
            if (seat?.occupant?.isSittingOut) {
                console.log(`[Blackjack] Excluding ${p.user.name} from deal - sitting out`);
                return false;
            }
            // Ensure player is still seated (not left)
            if (!seat?.occupant || seat.occupant.user.name !== p.user.name) {
                console.log(`[Blackjack] Excluding ${p.user.name} from deal - not seated`);
                return false;
            }
            return true;
        });
        console.log('[Blackjack] Players with bets (count):', playersWithBets.length);
        console.log('[Blackjack] Players with bets (details):', JSON.stringify(playersWithBets.map(p => ({ name: p.user.name, bet: p.bet, seatId: p.seatId })), null, 2));

        // Also check seats to ensure we're not missing anyone
        const seatedPlayers = this.blackjackLobbyState.seats
            .map((seat, index) => ({ seat, index }))
            .filter(({ seat }) => seat.occupant && !seat.occupant.isSittingOut);
        console.log('[Blackjack] Seated players (count):', seatedPlayers.length);
        console.log('[Blackjack] Seated players (details):', JSON.stringify(seatedPlayers.map(({ seat, index }) => ({ name: seat.occupant!.user.name, seatId: index })), null, 2));

        // If we have seated players but no game state players with bets, check if we need to initialize
        // This can happen if a player sat out and sat back in, then placed a bet but the game state wasn't updated
        // In this case, we should check if any seated players have bets that need to be added to game state
        if (playersWithBets.length === 0 && seatedPlayers.length > 0) {
            console.log('[Blackjack] WARNING: No players with bets in game state, but players are seated.');
            console.log('[Blackjack] All game state players:', JSON.stringify(this.blackjackGameState.players, null, 2));
            console.log('[Blackjack] Seated players:', JSON.stringify(seatedPlayers.map(({ seat, index }) => ({ name: seat.occupant!.user.name, seatId: index })), null, 2));
            
            // Check if any seated players have bets that should be in game state
            // This can happen if a player sat back in and placed a bet, but the game state wasn't synced
            // For now, we'll return early and let the player place a bet first
            // The bet placement should add them to the game state
            console.log('[Blackjack] Players need to place bets first before dealing cards');
            return;
        }

        // Require at least one player with a bet (works for single player or multiple players)
        if (playersWithBets.length === 0) {
            console.log('[Blackjack] ERROR: Cannot deal cards - no players with bets');
            console.log('[Blackjack] All game state players:', JSON.stringify(this.blackjackGameState.players, null, 2));
            return;
        }

        // Deal cards - works with single player or multiple players from any seat
        console.log(`[Blackjack] Dealing cards to ${playersWithBets.length} player(s) with bets`);

        // Initialize deck if needed
        if (!this.blackjackDeck) {
            this.blackjackDeck = new Deck();
            this.blackjackDeck.shuffle();
        } else {
            // Reset and shuffle deck for new round
            this.blackjackDeck.reset();
            this.blackjackDeck.shuffle();
        }

        // Reset game state for new round (game state should already exist from betting)
        this.blackjackGameState.phase = 'dealing';
        this.blackjackGameState.dealerHand = [];
        this.blackjackGameState.dealerVisible = false;
        this.blackjackGameState.currentPlayerId = null;
        this.blackjackGameState.roundNumber = (this.blackjackGameState.roundNumber || 0) + 1;

        // Deal initial cards to players - use the players from game state
        const playerStates = playersWithBets.map((playerState) => {
            const seat = this.blackjackLobbyState.seats[playerState.seatId];
            const seatId = playerState.seatId;
            const bet = playerState.bet;
            const card1 = this.blackjackDeck!.dealCard();
            const card2 = this.blackjackDeck!.dealCard();
            const cards = card1 && card2 ? [card1, card2] : [];
            const handValue = this.calculateBlackjackHandValue(cards);
            const isBlackjack = cards.length === 2 && handValue === 21;

            return {
                user: seat.occupant!.user,
                seatId,
                bet,
                hand: {
                    cards,
                    bet,
                    isStanding: false,
                    isBusted: handValue > 21,
                    isBlackjack,
                    value: handValue
                },
                isActive: !isBlackjack,
                isFinished: isBlackjack
            };
        });

        // Deal dealer's first card (face up)
        const dealerCard1 = this.blackjackDeck!.dealCard();
        const dealerHand = dealerCard1 ? [dealerCard1] : [];

        // Deal dealer's second card (face down)
        const dealerCard2 = this.blackjackDeck!.dealCard();
        if (dealerCard2) {
            dealerHand.push(dealerCard2);
        }

        // Update game state
        this.blackjackGameState.players = playerStates;
        this.blackjackGameState.dealerHand = dealerHand;
        this.blackjackGameState.dealerVisible = false; // Second card is face down

        console.log('[Blackjack] Cards dealt. Player states:', playerStates.map(p => ({ 
            name: p.user.name, 
            cards: p.hand.cards.map(c => `${c.rank}${c.suit}`), 
            value: p.hand.value,
            isBlackjack: p.hand.isBlackjack 
        })));
        console.log('[Blackjack] Dealer cards:', dealerHand.map(c => `${c.rank}${c.suit}`));

        // Check if any player has blackjack - if all players have blackjack or bust, move to dealer turn
        // Sort players right-to-left by seat ID (descending: 4, 3, 2, 1, 0)
        const activePlayers = playerStates
            .filter(p => !p.isFinished && !p.hand.isBusted)
            .sort((a, b) => b.seatId - a.seatId); // Right-to-left: higher seat ID first
        
        if (activePlayers.length === 0) {
            // All players finished (blackjack or bust) - move to dealer turn
            console.log('[Blackjack] All players finished, moving to dealer turn');
            this.blackjackGameState.phase = 'dealer_turn';
            this.blackjackGameState.dealerVisible = true;
            this.playDealerHand();
        } else {
            // Move to player turn - set first active player (rightmost) as current
            console.log('[Blackjack] Moving to player turn. Active players (right-to-left):', activePlayers.map(p => `${p.user.name} (seat ${p.seatId})`));
            this.blackjackGameState.phase = 'player_turn';
            this.blackjackGameState.currentPlayerId = activePlayers[0].user.name;
            this.startBlackjackTurnTimer();
        }

        // Mark game as in progress
        this.blackjackLobbyState.inGame = true;
        this.broadcastBlackjackLobbyState();
        console.log('[Blackjack] Broadcasting game state after dealing cards');
        this.broadcastBlackjackGameState();
    }

    private calculateBlackjackHandValue(cards: Card[]): number {
        if (!cards || cards.length === 0) return 0;
        
        let value = 0;
        let aces = 0;

        for (const card of cards) {
            if (card.rank === Rank.ACE) {
                aces++;
                value += 11;
            } else if ([Rank.JACK, Rank.QUEEN, Rank.KING].includes(card.rank)) {
                value += 10;
            } else {
                // Number cards 2-10
                value += parseInt(card.rank as string, 10);
            }
        }

        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    private handlePlaceBet(action: BlackjackActionMessage) {
        console.log('[Backend] handlePlaceBet called with action:', JSON.stringify(action, null, 2));
        // Find the seat for this user (works from any seat position - seat 0, 1, 2, 3, or 4)
        const seatIndex = this.blackjackLobbyState.seats.findIndex(
            s => s.occupant?.user.name === action.user.name
        );
        if (seatIndex === -1) {
            console.log('[Backend] Cannot place bet - user not seated');
            console.log('[Backend] Available seats:', this.blackjackLobbyState.seats.map((s, i) => ({ id: i, occupant: s.occupant?.user.name })));
            return;
        }

        // Check if player is sitting out - they can't place bets
        const seat = this.blackjackLobbyState.seats[seatIndex];
        if (seat?.occupant?.isSittingOut) {
            console.log(`[Backend] Cannot place bet - ${action.user.name} is sitting out`);
            return;
        }

        const amount = action.amount || 0;
        if (amount === 0) {
            console.log('[Backend] Invalid bet amount: 0');
            return;
        }
        
        // Allow negative amounts to remove bets
        const isRemovingBet = amount < 0;

        console.log(`[Backend] ========== Placing bet: ${amount} for user ${action.user.name} at seat ${seatIndex} ==========`);

        // Initialize game state if needed
        if (!this.blackjackGameState) {
            console.log('[Backend] Initializing blackjack game state');
            this.blackjackGameState = {
                phase: 'betting',
                dealerHand: [],
                dealerVisible: false,
                players: [],
                currentPlayerId: null,
                roundNumber: 0
            };
        }

        // Ensure phase is betting
        if (this.blackjackGameState.phase !== 'betting') {
            console.log('[Backend] Resetting game phase to betting');
            this.blackjackGameState.phase = 'betting';
        }

        // Find or create player state
        let playerState = this.blackjackGameState.players.find(
            p => p.user.name === action.user.name && p.seatId === seatIndex
        );

        if (playerState) {
            if (isRemovingBet) {
                // Remove bet (negative amount)
                const removeAmount = Math.abs(amount);
                playerState.bet = Math.max(0, playerState.bet - removeAmount);
                if (playerState.hand) {
                    playerState.hand.bet = playerState.bet;
                }
                console.log(`[Backend] Removed bet for ${action.user.name}: ${removeAmount}, new bet: ${playerState.bet}`);
                
                // If bet is now 0, remove player from game state
                if (playerState.bet === 0) {
                    this.blackjackGameState.players = this.blackjackGameState.players.filter(
                        p => !(p.user.name === action.user.name && p.seatId === seatIndex)
                    );
                    console.log(`[Backend] Removed ${action.user.name} from game state (bet is 0)`);
                }
            } else {
                // Add to existing bet
                playerState.bet += amount;
                if (playerState.hand) {
                    playerState.hand.bet = playerState.bet;
                }
                console.log(`[Backend] Updated bet for ${action.user.name}: ${playerState.bet} (added ${amount})`);
            }
        } else {
            if (isRemovingBet) {
                // Can't remove bet if player doesn't have one
                console.log(`[Backend] Cannot remove bet - ${action.user.name} has no bet`);
                return;
            }
            // Create new player state
            // This happens when a player sits back in and places a bet - they're added to game state
            playerState = {
                user: action.user,
                seatId: seatIndex,
                bet: amount,
                isActive: false,
                isFinished: false
            };
            this.blackjackGameState.players.push(playerState);
            console.log(`[Backend] Created new player state for ${action.user.name} with bet: ${amount} (seat ${seatIndex})`);
            console.log(`[Backend] Total players in game state: ${this.blackjackGameState.players.length}`);
        }

        console.log(`[Backend] Game state players count: ${this.blackjackGameState.players.length}`);
        console.log(`[Backend] Game state players with bets: ${this.blackjackGameState.players.filter(p => p.bet > 0).length}`);
        console.log(`[Backend] All players in game state:`, JSON.stringify(this.blackjackGameState.players.map(p => ({ name: p.user.name, bet: p.bet, seatId: p.seatId })), null, 2));
        console.log(`[Backend] Broadcasting game state after bet placement...`);
        this.broadcastBlackjackGameState();
        console.log(`[Backend] Game state broadcast complete`);
    }

    private handleHit(action: BlackjackActionMessage) {
        if (!this.blackjackGameState || !this.blackjackDeck || this.blackjackGameState.phase !== 'player_turn') {
            console.log('[Backend] Cannot hit - invalid game state or phase');
            return;
        }

        // Verify it's the current player's turn
        if (this.blackjackGameState.currentPlayerId !== action.user.name) {
            console.log(`[Backend] Not ${action.user.name}'s turn. Current player: ${this.blackjackGameState.currentPlayerId}`);
            return;
        }

        // Find the player
        const player = this.blackjackGameState.players.find(
            p => p.user.name === action.user.name && p.seatId === action.seatId
        );
        if (!player || !player.hand || player.isFinished) {
            console.log('[Backend] Player not found or already finished');
            return;
        }

        // Deal a card
        const card = this.blackjackDeck.dealCard();
        if (!card) {
            console.log('[Backend] No cards left in deck');
            return;
        }

        player.hand.cards.push(card);
        const newValue = this.calculateBlackjackHandValue(player.hand.cards);
        player.hand.value = newValue;
        player.hand.isBusted = newValue > 21;

        console.log(`[Backend] ${action.user.name} hit. New hand value: ${newValue}, Busted: ${player.hand.isBusted}`);

        // If busted, mark as finished
        if (player.hand.isBusted) {
            player.isFinished = true;
            player.isActive = false;
        }

        // Move to next player or dealer
        this.moveToNextPlayer();
    }

    private handleStand(action: BlackjackActionMessage) {
        if (!this.blackjackGameState || this.blackjackGameState.phase !== 'player_turn') {
            console.log('[Backend] Cannot stand - invalid game state or phase');
            return;
        }

        // Verify it's the current player's turn
        if (this.blackjackGameState.currentPlayerId !== action.user.name) {
            console.log(`[Backend] Not ${action.user.name}'s turn. Current player: ${this.blackjackGameState.currentPlayerId}`);
            return;
        }

        // Find the player
        const player = this.blackjackGameState.players.find(
            p => p.user.name === action.user.name && p.seatId === action.seatId
        );
        if (!player || !player.hand || player.isFinished) {
            console.log('[Backend] Player not found or already finished');
            return;
        }

        // Mark as standing
        player.hand.isStanding = true;
        player.isFinished = true;
        player.isActive = false;

        console.log(`[Backend] ${action.user.name} stood with value: ${player.hand.value}`);

        // Move to next player or dealer
        this.moveToNextPlayer();
    }

    private handleDoubleDown(action: BlackjackActionMessage) {
        if (!this.blackjackGameState || !this.blackjackDeck || this.blackjackGameState.phase !== 'player_turn') {
            console.log('[Backend] Cannot double down - invalid game state or phase');
            return;
        }

        // Verify it's the current player's turn
        if (this.blackjackGameState.currentPlayerId !== action.user.name) {
            console.log(`[Backend] Not ${action.user.name}'s turn. Current player: ${this.blackjackGameState.currentPlayerId}`);
            return;
        }

        // Find the player - if there are multiple hands (split), find the active one
        // For split hands, we need to find the first active hand for this player
        let player = this.blackjackGameState.players.find(
            p => p.user.name === action.user.name && p.seatId === action.seatId && !p.isFinished && p.hand && !p.hand.isStanding && !p.hand.isBusted
        );
        // If no active hand found, try to find any hand for this player (might be finished)
        if (!player) {
            player = this.blackjackGameState.players.find(
                p => p.user.name === action.user.name && p.seatId === action.seatId
            );
        }
        if (!player || !player.hand || player.isFinished || player.hand.cards.length !== 2) {
            console.log('[Backend] Cannot double down - player not found, already finished, or not initial hand');
            return;
        }

        // Double the bet
        player.bet *= 2;
        player.hand.bet = player.bet;

        // Deal one card
        const card = this.blackjackDeck.dealCard();
        if (!card) {
            console.log('[Backend] No cards left in deck');
            return;
        }

        player.hand.cards.push(card);
        const newValue = this.calculateBlackjackHandValue(player.hand.cards);
        player.hand.value = newValue;
        player.hand.isBusted = newValue > 21;
        player.hand.isStanding = true; // Double down automatically stands
        player.isFinished = true;
        player.isActive = false;

        console.log(`[Backend] ${action.user.name} doubled down. New bet: ${player.bet}, New hand value: ${newValue}, Busted: ${player.hand.isBusted}`);
        
        // Move to next player or dealer
        this.moveToNextPlayer();
    }

    private moveToNextPlayer() {
        if (!this.blackjackGameState) return;

        // Find next active player - sort right-to-left by seat ID (descending: 4, 3, 2, 1, 0)
        const activePlayers = this.blackjackGameState.players
            .filter(p => !p.isFinished && !p.hand?.isBusted && p.hand)
            .sort((a, b) => b.seatId - a.seatId); // Right-to-left: higher seat ID first

        if (activePlayers.length === 0) {
            // All players finished - move to dealer turn
            console.log('[Backend] All players finished, moving to dealer turn');
            this.blackjackGameState.phase = 'dealer_turn';
            this.blackjackGameState.currentPlayerId = null;
            this.stopBlackjackTurnTimer();
            this.blackjackGameState.dealerVisible = true;
            this.playDealerHand();
        } else {
            // Move to next active player (right-to-left)
            const currentIndex = activePlayers.findIndex(
                p => p.user.name === this.blackjackGameState!.currentPlayerId
            );
            const nextIndex = (currentIndex + 1) % activePlayers.length;
            const nextPlayer = activePlayers[nextIndex];

            this.blackjackGameState.currentPlayerId = nextPlayer.user.name;
            this.startBlackjackTurnTimer();
            console.log(`[Backend] Moving to next player (right-to-left): ${nextPlayer.user.name} (seat ${nextPlayer.seatId})`);
        }

        this.broadcastBlackjackGameState();
    }

    private handleSitOut(action: BlackjackActionMessage) {
        // Find the seat for this user
        const seatIndex = this.blackjackLobbyState.seats.findIndex(
            s => s.occupant?.user.name === action.user.name
        );
        if (seatIndex === -1) return;

        const seat = this.blackjackLobbyState.seats[seatIndex];
        if (!seat.occupant) return;

        // Can only sit out during betting, waiting, or finished phases
        if (this.blackjackGameState && 
            this.blackjackGameState.phase !== 'betting' && 
            this.blackjackGameState.phase !== 'waiting' && 
            this.blackjackGameState.phase !== 'finished') {
            console.log(`[Blackjack] Cannot sit out during active round. Current phase: ${this.blackjackGameState.phase}`);
            return;
        }

        const newSitOutState = !seat.occupant.isSittingOut;
        seat.occupant.isSittingOut = newSitOutState;

        // If sitting out, remove player from game state only during active rounds
        // During betting/waiting/finished phases, sitting out means you forfeit your chance to play until next round
        // But if you sit back in before the round starts (betting phase), you can participate
        if (newSitOutState && this.blackjackGameState) {
            // Only remove from game state during active rounds (dealing, player_turn, dealer_turn)
            // During betting/waiting/finished, keep them in game state but mark as sitting out
            // This way, if they sit back in before round starts, they can still participate
            if (this.blackjackGameState.phase !== 'betting' && 
                this.blackjackGameState.phase !== 'waiting' && 
                this.blackjackGameState.phase !== 'finished') {
                // Remove player from game state - they'll be excluded from current round
                this.blackjackGameState.players = this.blackjackGameState.players.filter(
                    p => p.user.name !== action.user.name
                );
                console.log(`[Blackjack] Removed ${action.user.name} from game state (sitting out during active round)`);
                this.broadcastBlackjackGameState();
            } else {
                // During betting/waiting/finished phases, just mark as sitting out
                // They'll be excluded from next round when dealing starts
                console.log(`[Blackjack] ${action.user.name} sitting out during ${this.blackjackGameState.phase} phase - will be excluded from next round`);
            }
        }

        // If sitting back in (was sitting out, now not), ensure they can participate in next round
        // If you sit back in before the round starts (betting phase), you can participate
        // This cancels the "forfeit until next round" logic
        if (!newSitOutState && this.blackjackGameState) {
            // If game is in betting or waiting phase, player can place bets and start new round
            // If game is finished, player can place bets for the next round
            if (this.blackjackGameState.phase === 'betting' || 
                this.blackjackGameState.phase === 'waiting' || 
                this.blackjackGameState.phase === 'finished') {
                console.log(`[Blackjack] ${action.user.name} sat back in during ${this.blackjackGameState.phase} phase - can now place bets and start new round`);
                // Player can now place bets and participate - they'll be added to game state when they place a bet
                // If they already have a bet in game state, keep it (they sat back in before round started)
                const existingPlayer = this.blackjackGameState.players.find(
                    p => p.user.name === action.user.name && p.seatId === seatIndex
                );
                if (existingPlayer && existingPlayer.bet > 0) {
                    console.log(`[Blackjack] ${action.user.name} already has bet of ${existingPlayer.bet} in game state - keeping it (sat back in before round started)`);
                } else {
                    console.log(`[Blackjack] ${action.user.name} needs to place a bet to participate in next round`);
                }
            }
        }

        this.broadcastBlackjackLobbyState();
    }

    private playDealerHand() {
        if (!this.blackjackGameState || !this.blackjackDeck) return;

        // Reveal dealer's second card
        this.blackjackGameState.dealerVisible = true;

        // Dealer must hit until 17 or higher
        let dealerValue = this.calculateBlackjackHandValue(this.blackjackGameState.dealerHand);
        while (dealerValue < 17) {
            const card = this.blackjackDeck.dealCard();
            if (!card) break;
            this.blackjackGameState.dealerHand.push(card);
            dealerValue = this.calculateBlackjackHandValue(this.blackjackGameState.dealerHand);
        }

        const dealerBusted = dealerValue > 21;
        const dealerBlackjack = this.blackjackGameState.dealerHand.length === 2 && dealerValue === 21;

        // Evaluate winners and update player balances
        this.blackjackGameState.players.forEach(player => {
            if (!player.hand) return;

            const playerValue = player.hand.value;
            const playerBusted = player.hand.isBusted;
            const playerBlackjack = player.hand.isBlackjack;

            let result: 'win' | 'loss' | 'push' | 'blackjack' = 'loss';
            let payout = 0;

            if (playerBlackjack && !dealerBlackjack) {
                result = 'blackjack';
                payout = Math.floor(player.bet * 2.5); // Blackjack pays 3:2
            } else if (playerBusted) {
                result = 'loss';
                payout = 0;
            } else if (dealerBusted) {
                result = 'win';
                payout = player.bet * 2;
            } else if (playerValue > dealerValue) {
                result = 'win';
                payout = player.bet * 2;
            } else if (playerValue < dealerValue) {
                result = 'loss';
                payout = 0;
            } else {
                result = 'push';
                payout = player.bet; // Return bet
            }

            // Store result in player state (we'll need to extend the schema for this)
            (player as any).result = result;
            (player as any).payout = payout;

            console.log(`[Backend] ${player.user.name}: ${result}, payout: ${payout}, bet: ${player.bet}, playerValue: ${playerValue}, dealerValue: ${dealerValue}`);
        });

        this.blackjackGameState.phase = 'finished';
        this.broadcastBlackjackGameState();
    }

    private startBlackjackTurnTimer() {
        this.stopBlackjackTurnTimer();
        if (!this.blackjackGameState || !this.blackjackGameState.currentPlayerId) return;
        
        // Set turn end time
        const turnEndsAt = Date.now() + this.BLACKJACK_TURN_MS;
        (this.blackjackGameState as any).turnEndsAt = turnEndsAt;
        this.broadcastBlackjackGameState();
        
        this.blackjackTurnTimer = setTimeout(() => {
            // Auto-stand if 17+, auto-hit if 16 or below
            if (this.blackjackGameState?.currentPlayerId) {
                const player = this.blackjackGameState.players.find(
                    p => p.user.name === this.blackjackGameState!.currentPlayerId
                );
                if (player?.hand && !player.hand.isStanding && !player.hand.isBusted) {
                    const value = player.hand.value;
                    if (value >= 17) {
                        // Auto-stand
                        console.log(`[Backend] Timer expired - auto-standing for ${player.user.name}`);
                        this.handleStand({ user: player.user, action: 'STAND', seatId: player.seatId } as BlackjackActionMessage);
                    } else if (value <= 16) {
                        // Auto-hit
                        console.log(`[Backend] Timer expired - auto-hitting for ${player.user.name}`);
                        this.handleHit({ user: player.user, action: 'HIT', seatId: player.seatId } as BlackjackActionMessage);
                    }
                }
            }
        }, this.BLACKJACK_TURN_MS);
    }

    private stopBlackjackTurnTimer() {
        if (this.blackjackTurnTimer) {
            clearTimeout(this.blackjackTurnTimer);
            this.blackjackTurnTimer = undefined;
        }
    }

    private broadcastBlackjackGameState() {
        if (!this.blackjackGameState) {
            console.log('[Backend] Cannot broadcast - no game state');
            return;
        }
        
        const envelope = {
            key: GameMessageKey.BLACKJACK_GAME_STATE,
            v: MESSAGE_VERSION,
            payload: {
                ...this.blackjackGameState,
                turnEndsAt: this.currentBlackjackTurnEndsAt()
            },
            ts: Date.now(),
        } as const;
        const message = JSON.stringify(envelope);
        const sockets = this.lobbies.get(this.blackjackLobbyId) ?? [];
        console.log(`[Backend] Broadcasting game state to ${sockets.length} sockets`);
        console.log(`[Backend] Game state players: ${this.blackjackGameState.players.length}, with bets: ${this.blackjackGameState.players.filter(p => p.bet > 0).length}`);
        sockets.forEach(s => {
            if (s.readyState === WebSocket.OPEN) {
                s.send(message);
                console.log('[Backend] Sent game state to socket');
            } else {
                console.log(`[Backend] Socket not open (readyState: ${s.readyState})`);
            }
        });
    }

    private findAvailableSeat(): number {
        for (let i = 0; i < this.blackjackLobbyState.seats.length; i++) {
            if (!this.blackjackLobbyState.seats[i].occupant) {
                return i;
            }
        }
        return -1;
    }

    private broadcastBlackjackLobbyState() {
        const envelope = {
            key: GameMessageKey.BLACKJACK_LOBBY_STATE,
            v: MESSAGE_VERSION,
            payload: this.blackjackLobbyState,
            ts: Date.now(),
        } as const;
        const message = JSON.stringify(envelope);
        const sockets = this.lobbies.get(this.blackjackLobbyId) ?? [];
        console.log(`[Backend] Broadcasting blackjack lobby state to ${sockets.length} socket(s)`);
        console.log(`[Backend] Lobby state:`, JSON.stringify(this.blackjackLobbyState, null, 2));
        sockets.forEach(s => {
            if (s.readyState === WebSocket.OPEN) {
                s.send(message);
                console.log(`[Backend] Sent lobby state to socket`);
            } else {
                console.log(`[Backend] Socket not open (readyState: ${s.readyState})`);
            }
        });
    }

    private currentBlackjackTurnEndsAt(): number | undefined {
        // Return turnEndsAt from game state if set
        if (this.blackjackGameState && (this.blackjackGameState as any).turnEndsAt) {
            return (this.blackjackGameState as any).turnEndsAt;
        }
        // Fallback: calculate from timer
        if (!this.blackjackTurnTimer) return undefined;
        return Date.now() + this.BLACKJACK_TURN_MS;
    }
}
