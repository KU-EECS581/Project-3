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
import { type TableState } from '~middleware/cards';
import type { User } from '~middleware/models';
import { useGameServer } from '@/api';

interface PokerTableProps {
    users: User[];
    minBet: number;
    maxBet: number;
}

export function PokerTable({ }: PokerTableProps) {
    const { user: me } = useUserData();
    const server = useGameServer();
    const [state, setState] = useState<TableState | null>(null);

    // Listen for poker state updates from backend
    useEffect(() => {
        const handleStateUpdate = (event: Event) => {
            const customEvent = event as CustomEvent;
            setState(customEvent.detail);
        };
        
        window.addEventListener('poker-state-update', handleStateUpdate);
        return () => window.removeEventListener('poker-state-update', handleStateUpdate);
    }, []);

    // Show loading state while waiting for initial state
    if (!state) {
        return <div style={{ padding: 20, color: '#eee' }}>Waiting for game state...</div>;
    }

    const current = state.players[state.currentPlayerIndex];
    const toCall = Math.max(0, state.currentBet - current.currentBet);
    const canCheck = toCall === 0;

    const isMyTurn = me?.name && current.user.name === me.name;

    function onCheck() {
        if (!canCheck || !isMyTurn) return;
        server.sendPokerAction('check');
    }

    function onCall() {
        if (toCall <= 0 || !isMyTurn) return;
        server.sendPokerAction('call');
    }

    function onBetOrRaise(amount: number) {
        if (!isMyTurn || !state) return;
        const actionType = state.currentBet > 0 ? 'raise' : 'bet';
        server.sendPokerAction(actionType, amount);
    }

    function onFold() {
        if (!isMyTurn) return;
        server.sendPokerAction('fold');
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
                        <div style={{ textAlign: 'center', color: '#aaa', marginBottom: 4 }}>{isTurn ? (isMe ? '🎯 Your Turn' : '⏳ Turn') : ' '}</div>
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

            {isMyTurn && (
                <div style={{ marginTop: 8, padding: 8, borderTop: '1px solid #444', color: '#eee' }}>
                    <div style={{ marginBottom: 6, fontWeight: 600 }}>Your Turn</div>
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
                </div>
            )}
        </div>
    );
}
