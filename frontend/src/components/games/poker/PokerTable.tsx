/**
 * @file PokerTable.tsx
 * @description Component representing the poker table and managing game state.
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import { useEffect, useMemo, useState } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { CardBack, CardView } from './CardView';
import { BettingControls } from './BettingControls';
import { Deck, Street, type PlayerState, type TableState } from '~middleware/cards';
import type { User } from '~middleware/models';

interface PokerTableProps {
    users: User[];
    minBet: number;
    maxBet: number;
}

// TODO: move out magic values to config/separate file
export function PokerTable({ users, minBet, maxBet }: PokerTableProps) {
    const { user: me } = useUserData();
    const [deck, setDeck] = useState(new Deck());
    const [state, setState] = useState<TableState>(() => initialState(users, minBet, maxBet));

    // Re-initialize when users change (e.g., someone joins while in lobby)
    useEffect(() => {
        deck.shuffle();
        setState(initialState(users, minBet, maxBet));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [users.map(u => u.name).join('|')]);

    const current = state.players[state.currentPlayerIndex];
    const toCall = Math.max(0, state.currentBet - current.currentBet);
    const canCheck = toCall === 0;

    function dealHoleCards(next: TableState, d: Deck): [TableState, Deck] {
        const updatedPlayers: PlayerState[] = next.players.map(p => ({ ...p, hole: [] }));
        for (let r = 0; r < 2; r++) {
            for (let i = 0; i < updatedPlayers.length; i++) {
                const c  = d.dealCard();
                if (!c) continue; // deck exhausted?
                updatedPlayers[i].hole.push(c);
            }
        }
        return [{ ...next, players: updatedPlayers }, d];
    }

    useEffect(() => {
        // If no hole cards yet, deal them
        if (state.players.every(p => p.hole.length === 0)) {
            const [dealt, rest] = dealHoleCards(state, deck);
            setDeck(rest);
            setState(dealt);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function advanceStreet() {
        setState(prev => {
            const next = { ...prev, community: [...prev.community] };
            switch (prev.street) {
                case Street.Preflop: {
                    const cards = deck.dealCards(3);
                    next.community.push(...cards);
                    next.street = Street.Flop;
                    break;
                }
                case Street.Flop: {
                    const card = deck.dealCard();
                    if (!card) throw new Error('Failed to draw card');
                    next.community.push(card);
                    next.street = Street.Turn;
                    break;
                }
                case Street.Turn: {
                    const card = deck.dealCard();
                    if (!card) throw new Error('Failed to draw card');
                    next.community.push(card);
                    next.street = Street.River;
                    break;
                }
                case Street.River: {
                    const card = deck.dealCard();
                    if (!card) throw new Error('Failed to draw card');
                    next.community.push(card);
                    next.street = Street.Showdown;
                    break;
                }
            }

            // Reset per-street bets
            next.currentBet = 0;
            next.players = next.players.map(p => ({ ...p, currentBet: 0 }));
            // First to act = left of dealer (simplified)
            next.currentPlayerIndex = (next.dealerIndex + 1) % next.players.length;
            return next;
        });
    }

    function nextPlayerIndex(from: number): number {
        const n = state.players.length;
        for (let k = 1; k <= n; k++) {
            const idx = (from + k) % n;
            const p = state.players[idx];
            if (!p.hasFolded && !p.isAllIn) return idx;
        }
        return from;
    }

    function onCheck() {
        if (!canCheck) return;
        setState(prev => ({ ...prev, currentPlayerIndex: nextPlayerIndex(prev.currentPlayerIndex) }));
    }

    function onCall() {
        if (toCall <= 0) return;
        setState(prev => {
            const players = prev.players.map((p, idx) => {
                if (idx !== prev.currentPlayerIndex) return p;
                const pay = Math.min(toCall, p.chips);
                return {
                    ...p,
                    chips: p.chips - pay,
                    currentBet: p.currentBet + pay,
                    isAllIn: p.chips - pay === 0,
                };
            });
            const nextPot = prev.pot + Math.min(toCall, current.chips);
            return {
                ...prev,
                players,
                pot: nextPot,
                currentPlayerIndex: nextPlayerIndex(prev.currentPlayerIndex)
            };
        });
    }

    function onBetOrRaise(amount: number) {
        const amt = Math.max(state.minBet, Math.min(amount, current.chips));
        if (amt <= 0) return;
        setState(prev => {
            const players = prev.players.map((p, idx) => {
                if (idx !== prev.currentPlayerIndex) return p;
                return {
                    ...p,
                    chips: p.chips - amt,
                    currentBet: p.currentBet + amt,
                    isAllIn: p.chips - amt === 0,
                };
            });
            const actor = players[prev.currentPlayerIndex];
            const newCurrentBet = Math.max(prev.currentBet, actor.currentBet);
            return {
                ...prev,
                players,
                pot: prev.pot + amt,
                currentBet: newCurrentBet,
                currentPlayerIndex: nextPlayerIndex(prev.currentPlayerIndex)
            };
        });
    }

    function onFold() {
        setState(prev => {
            const players = prev.players.map((p, idx) => idx === prev.currentPlayerIndex ? { ...p, hasFolded: true } : p);
            return {
                ...prev,
                players,
                currentPlayerIndex: nextPlayerIndex(prev.currentPlayerIndex)
            };
        });
    }

    const seats = useMemo(() => state.players.map((p, i) => {
        const isMe = me?.name && p.user.name === me.name;
        const isTurn = i === state.currentPlayerIndex;
        return { p, isMe, isTurn, key: p.user.name };
    }), [state.players, state.currentPlayerIndex, me?.name]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#eee' }}>
                <div>Street: {state.street}</div>
                <div>Pot: {state.pot}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {state.community.map((c, i) => <CardView key={i} card={c} size={70} />)}
                {state.community.length < 5 && Array.from({ length: 5 - state.community.length }).map((_, i) => <CardBack key={`b${i}`} size={70} />)}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {seats.map(({ p, isMe, isTurn, key }) => (
                    <div key={key}>
                        <div style={{ textAlign: 'center', color: '#aaa', marginBottom: 4 }}>{isTurn ? 'Your Turn' : ' '}</div>
                        <div>
                            {/* Reuse PlayerSeat-like inline to avoid extra imports */}
                            <div style={{
                                minWidth: 180,
                                border: isTurn ? '2px solid #ffd54f' : '1px solid #555',
                                borderRadius: 8,
                                padding: 8,
                                background: p.hasFolded ? '#333' : '#222',
                                color: '#ddd',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                alignItems: 'center',
                            }}>
                                <div style={{ fontWeight: 700 }}>{p.user.name} {p.hasFolded ? '(Folded)' : ''}</div>
                                <div>Chips: {p.chips}</div>
                                <div>Bet: {p.currentBet}</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {p.hole.length > 0 ? (
                                        isMe ? (
                                            p.hole.map((c, i) => <CardView key={i} card={c} size={50} />)
                                        ) : (
                                            p.hole.map((_, i) => <CardBack key={i} size={50} />)
                                        )
                                    ) : (
                                        <span style={{fontStyle:'italic', color:'#aaa'}}>No cards</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 8, padding: 8, borderTop: '1px solid #444', color: '#eee' }}>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Actions ({current.user.name})</div>
                <BettingControls
                    toCall={toCall}
                    minBet={state.minBet}
                    maxBet={current.chips}
                    canCheck={canCheck}
                    onCheck={onCheck}
                    onCall={onCall}
                    onBetOrRaise={onBetOrRaise}
                    onFold={onFold}
                />
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button onClick={advanceStreet}>Next Street (debug)</button>
                </div>
            </div>
        </div>
    );
}

function initialState(users: User[], minBet: number, maxBet: number): TableState {
    const players: PlayerState[] = users.map((u) => ({
        user: u,
        chips: u.balance ?? maxBet,
        hole: [],
        hasFolded: false,
        isAllIn: false,
        currentBet: 0,
    }));

    return {
        players,
        community: [],
        pot: 0,
        street: 'preflop',
        dealerIndex: 0,
        currentPlayerIndex: players.length > 1 ? 1 : 0, // left of dealer starts
        currentBet: 0,
        minBet,
        maxBet,
    };
}
