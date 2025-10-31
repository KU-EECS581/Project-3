/**
 * @file PokerTable.tsx
 * @description Server-synced Poker table UI.
 */
import { useEffect, useMemo, useState } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { useGameServer } from '@/api';
import { CardBack, CardView } from './CardView';
import { BettingControls } from './BettingControls';
import type { Suit, Rank } from '~middleware/cards';

export function PokerTable() {
    const { user: me } = useUserData();
    const server = useGameServer();
    const state = server.pokerState;
    const [remaining, setRemaining] = useState<number>(0);

    // Ensure we are subscribed to the poker lobby's broadcast channel
    useEffect(() => {
        server.joinPoker();
        return () => {
            server.leavePoker();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!state?.turnEndsAt) {
            setRemaining(0);
            return;
        }
        const update = () => setRemaining(Math.max(0, Math.ceil((state.turnEndsAt! - Date.now()) / 1000)));
        update();
        const id = setInterval(update, 250);
        return () => clearInterval(id);
    }, [state?.turnEndsAt]);

    const current = state ? state.players[state.currentPlayerIndex] : undefined;
    const toCall = state && current ? Math.max(0, state.currentBet - current.currentBet) : 0;
    const canCheck = toCall === 0;

    const onCheck = () => server.pokerCheck();
    const onCall = () => server.pokerCall();
    const onBetOrRaise = (amount: number) => server.pokerBet(amount);
    const onFold = () => server.pokerFold();

    const seats = useMemo(() => (state?.players ?? []).map((p, i) => {
        const isMe = me?.name && p.user.name === me.name;
        const isTurn = state ? i === state.currentPlayerIndex : false;
        return { p, isMe, isTurn, key: p.user.name };
    }), [state, me?.name]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#eee' }}>
                <div>Street: {state?.street ?? '-'}</div>
                <div>Pot: {state?.pot ?? 0}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {(state?.community ?? []).map((c, i) => <CardView key={i} card={c as unknown as {suit: Suit; rank: Rank}} size={70} />)}
                {((state?.community?.length ?? 0) < 5) && Array.from({ length: 5 - (state?.community?.length ?? 0) }).map((_, i) => <CardBack key={`b${i}`} size={70} />)}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {seats.map(({ p, isMe, isTurn, key }) => (
                    <div key={key}>
                        <div style={{ textAlign: 'center', color: '#aaa', marginBottom: 4 }}>{isTurn ? 'Your Turn' : ' '}</div>
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
                                    (isMe || state?.street === 'showdown' || state?.gameOver) ? (
                                        p.hole.map((c, i) => <CardView key={i} card={c as unknown as {suit: Suit; rank: Rank}} size={50} />)
                                    ) : (
                                        p.hole.map((_, i) => <CardBack key={i} size={50} />)
                                    )
                                ) : (
                                    <span style={{fontStyle:'italic', color:'#aaa'}}>No cards</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 8, padding: 8, borderTop: '1px solid #444', color: '#eee' }}>
                {!state ? (
                    <div style={{ color: '#eee', padding: 12 }}>Waiting for dealer to start the game…</div>
                ) : state.gameOver ? (
                    <div style={{ textAlign: 'center' }}>
                        <h2>Game Over</h2>
                        <div>Winner: {state.winner?.name ?? 'Unknown'}</div>
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button onClick={() => server.startPoker()}>Play Again</button>
                            <button onClick={() => server.endPoker()}>Back to Lobby</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: 6, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{current && me?.name === current.user.name ? 'Your Turn' : `Waiting for ${current?.user.name ?? '...' }...`}</span>
                            <span style={{ fontWeight: 700, color: remaining <= 10 ? '#ff6' : '#ddd' }}>{remaining > 0 ? `${remaining}s` : ''}</span>
                        </div>
                        <BettingControls
                            toCall={toCall}
                            minBet={state.minBet}
                            maxBet={current?.chips ?? 0}
                            canCheck={canCheck}
                            disabled={!current || me?.name !== current.user.name}
                            onCheck={onCheck}
                            onCall={onCall}
                            onBetOrRaise={onBetOrRaise}
                            onFold={onFold}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
