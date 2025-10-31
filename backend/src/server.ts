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
} from '../../middleware';
import { Deck, Street, type TableState, type PlayerState, Suit, Rank } from '../../middleware/cards';
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
        // Mark lobby available for a new game
        this.pokerLobbyState.inGame = false;
        this.broadcastPokerLobbyState();
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
}
