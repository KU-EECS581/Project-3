/**
 * @file PokerTable.tsx
 * @description Real-time server-synced poker table (community, seats, actions).
 * @class PokerTable
 * @module Components/Poker
 * @inputs GameServer state, user data context
 * @outputs Betting controls, card visibility logic
 * @external_sources React hooks, GameServer context
 * @author Riley Meyerkorth
 * @date 2025-11-20
 */
import { useEffect, useMemo, useState } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { useGameServer } from '@/api';
import { CardBack, CardView } from './CardView';
import { BettingControls } from './BettingControls';
import type { Suit, Rank } from '~middleware/cards';
import { evaluateCommunityAndHole } from './handEval';

export function PokerTable() {
    const { user: me } = useUserData();
    const server = useGameServer();
    const state = server.pokerState;
    const [remaining, setRemaining] = useState<number>(0);
    const [showdownChoice, setShowdownChoice] = useState<'show' | 'muck' | undefined>(undefined);
    const [revealAll, setRevealAll] = useState<boolean>(false);

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

    // Reset local showdown choice when not in showdown; manage revealAll lifecycle
    useEffect(() => {
        if (state?.street === 'showdown') {
            // entering showdown: reset choices and keep cards hidden until user reveals
            setShowdownChoice(undefined);
            setRevealAll(false);
        } else {
            // leaving showdown or other streets: no special reveal gating
            setShowdownChoice(undefined);
            setRevealAll(true);
        }
    }, [state?.street]);

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

    // Determine whether a player's hole cards should be visible on this client
    const isHoleVisible = (isMeSeat: boolean, pHoleLen: number, hasFolded: boolean): boolean => {
        if (pHoleLen === 0 || hasFolded) return false;
        if (!state) return isMeSeat;
        const activePlayers = (state.players ?? []).filter(pl => !pl.hasFolded).length;
        const wentToShowdown = state.street === 'showdown' || (state.gameOver && activePlayers >= 2);
        if (state.gameOver) {
            if (!wentToShowdown) return true; // everyone folded to one; nothing to hide
            // game ended but this was effectively showdown: follow revealAll and local choice
            if (revealAll) return true;
            return isMeSeat && showdownChoice === 'show';
        }
        if (state.street === 'showdown') {
            if (revealAll) return true;
            return isMeSeat && showdownChoice === 'show';
        }
        return isMeSeat;
    };

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
                {seats.map(({ p, isMe, isTurn, key }) => {
                    const visible = isHoleVisible(!!isMe, p.hole.length, p.hasFolded);
                    const activePlayers = (state?.players ?? []).filter(pl => !pl.hasFolded).length;
                    const wentToShowdown = (state?.street === 'showdown') || (!!state?.gameOver && activePlayers >= 2);
                    const canChooseShowdown = !!isMe && wentToShowdown && !p.hasFolded && p.hole.length > 0 && !revealAll;
                    // Only show evaluation when the player's hole cards are actually visible to this client,
                    // and only at showdown or after the hand ends.
                    const showEval = visible && (state?.street === 'showdown' || !!state?.gameOver);
                    const evalLabel = showEval ? evaluateCommunityAndHole((state?.community ?? []) as unknown as {suit: Suit; rank: Rank}[], p.hole as unknown as {suit: Suit; rank: Rank}[]).label : undefined;

                    return (
                        <div key={key}>
                            <div style={{ textAlign: 'center', color: '#aaa', marginBottom: 4 }}>{isTurn ? 'Your Turn' : ' '}</div>
                            <div style={{
                                minWidth: 200,
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
                                        visible ? (
                                            p.hole.map((c, i) => <CardView key={i} card={c as unknown as {suit: Suit; rank: Rank}} size={50} />)
                                        ) : (
                                            p.hole.map((_, i) => <CardBack key={i} size={50} />)
                                        )
                                    ) : (
                                        <span style={{fontStyle:'italic', color:'#aaa'}}>No cards</span>
                                    )}
                                </div>

                                {evalLabel && <div style={{ fontSize: 12, color: '#bbb' }}>{evalLabel}</div>}

                                {canChooseShowdown && (
                                    showdownChoice ? (
                                        <div style={{ fontSize: 12, color: '#bbb' }}>You {showdownChoice === 'show' ? 'showed' : 'mucked'}.</div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                            <button onClick={() => setShowdownChoice('show')}>Show</button>
                                            <button onClick={() => setShowdownChoice('muck')}>Muck</button>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 8, padding: 8, borderTop: '1px solid #444', color: '#eee' }}>
                {!state ? (
                    <div style={{ color: '#eee', padding: 12 }}>Waiting for dealer to start the game…</div>
                ) : state.gameOver ? (
                    <div style={{ textAlign: 'center' }}>
                        <h2>Game Over</h2>
                        <div>Winner: {state.winner?.name ?? 'Unknown'}</div>
                        {/* Allow reveal all after a showdown if not already revealed */}
                        {(() => {
                            const activePlayers = (state.players ?? []).filter(pl => !pl.hasFolded).length;
                            const wentToShowdown = activePlayers >= 2; // if 2+ players still in when game ended, treat as showdown
                            if (wentToShowdown && !revealAll) {
                                return (
                                    <div style={{ marginTop: 8 }}>
                                        <button onClick={() => setRevealAll(true)}>Reveal All Hands</button>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button onClick={() => server.startPoker()}>Play Again</button>
                            <button onClick={() => server.endPoker()}>Back to Lobby</button>
                        </div>
                    </div>
                ) : state.street === 'showdown' ? (
                    <div style={{ marginBottom: 6, fontWeight: 600 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Showdown: choose to Show or Muck your hand.</span>
                            <span style={{ fontWeight: 700, color: remaining <= 10 ? '#ff6' : '#ddd' }}>{remaining > 0 ? `${remaining}s` : ''}</span>
                        </div>
                        {!revealAll && (
                            <div style={{ marginTop: 8 }}>
                                <button onClick={() => setRevealAll(true)}>Reveal All Hands</button>
                            </div>
                        )}
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
