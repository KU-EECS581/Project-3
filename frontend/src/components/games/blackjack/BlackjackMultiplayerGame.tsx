/**
 * @file BlackjackMultiplayerGame.tsx
 * @description Multiplayer blackjack game component matching singleplayer layout
 */

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useUserData } from "@/hooks";
import { useGameServer } from "@/api";
import type { Card as CardModel } from "~middleware/cards";
import { getBestHandValue, isBusted, calculateHandValue } from "./utils";
import { Chip } from "@/components";
import { BlackjackHand } from "@/components/BlackjackHand";
import type { Card as CardComponentType } from "@/models";
import { useBlackjackStats } from "@/hooks/useBlackjackStats";

import type { BJSeatId } from "./types";
import { PlayerEntityComponent } from "@/components/PlayerEntityComponent";
import type { PlayerCharacter } from "@/models";

// Convert middleware card format to Card component format
function convertCard(card: CardModel): CardComponentType {
    return {
        suit: card.suit.toLowerCase() as CardComponentType['suit'],
        rank: card.rank.toLowerCase() as CardComponentType['rank']
    };
}

const MIN_BET = 10;
const MAX_BET = 500;
const NUM_SEATS = 5;
// const TURN_TIMER_MS = 30000; // 30 seconds - unused

interface Seat {
    id: BJSeatId;
    occupant?: {
        user: { name: string; balance?: number };
        isSpectating: boolean;
        isSittingOut: boolean;
    };
}

// type SeatWithOccupant = Seat & { occupant: NonNullable<Seat['occupant']> }; // unused

interface PlayerState {
    user: { name: string; balance?: number };
    seatId: number;
    hand?: {
        cards: CardModel[];
        bet: number;
        isStanding: boolean;
        isBusted: boolean;
        isBlackjack: boolean;
        value: number;
    };
    bet: number;
    isActive: boolean;
    isFinished: boolean;
    result?: "win" | "loss" | "push" | "blackjack";
    payout?: number;
}

interface BlackjackMultiplayerGameProps {
    onBackToMap: () => void;
}

export function BlackjackMultiplayerGame({ onBackToMap }: BlackjackMultiplayerGameProps) {
    const userData = useUserData();
    const server = useGameServer();
    const { stats, recordResult } = useBlackjackStats('multiplayer');
    
    // Safety check - ensure userData and server are available
    if (!userData || !server) {
        console.log('[BlackjackMultiplayerGame] userData or server not available');
        return (
            <div style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#031503',
                color: '#fff',
                zIndex: 10000
            }}>
                <div>Loading...</div>
            </div>
        );
    }
    
    // Initialize seats
    const [seats, setSeats] = useState<Seat[]>(() => 
        Array(NUM_SEATS).fill(null).map((_, i) => ({ id: i as BJSeatId }))
    );
    const [_selectedSeat, setSelectedSeat] = useState<number | null>(null);
    const [_isSpectating, _setIsSpectating] = useState(false);
    const [gamePhase, setGamePhase] = useState<"waiting" | "betting" | "dealing" | "player_turn" | "dealer_turn" | "finished">("waiting");
    const [dealerHand, setDealerHand] = useState<CardModel[]>([]);
    const [dealerVisible, setDealerVisible] = useState(false);
    const [players, setPlayers] = useState<PlayerState[]>([]);
    const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
    const [turnTimer, setTurnTimer] = useState<number>(0);
    const [betAmount, setBetAmount] = useState(MIN_BET);
    const [roundNumber, setRoundNumber] = useState(0);
    const [_showSeatSelection, setShowSeatSelection] = useState(true);
    const [processedPayouts, setProcessedPayouts] = useState<Set<number>>(new Set()); // Track processed payouts by round number
    // const [prevDealerHand, setPrevDealerHand] = useState<CardModel[]>([]); // Track previous dealer hand for animations - unused (using ref)
    // const [prevPlayerHands, setPrevPlayerHands] = useState<Map<string, CardModel[]>>(new Map()); // Track previous player hands for animations - unused (using ref)
    const [myGameResult, setMyGameResult] = useState<"win" | "loss" | "push" | "blackjack" | null>(null); // Track current player's game result
    const [animationsComplete, setAnimationsComplete] = useState<Map<string, boolean>>(new Map()); // Track if animations are complete for each player
    const animationTimeoutRefs = useRef<Map<string, number>>(new Map()); // Track animation timeouts
    
    // Sequential dealing state - track which cards should be visible for each player/dealer
    const [visibleDealerCards, setVisibleDealerCards] = useState<CardModel[]>([]); // Cards visible for dealer
    const [visiblePlayerCards, setVisiblePlayerCards] = useState<Map<string, CardModel[]>>(new Map()); // Cards visible for each player
    const dealingTimeoutsRef = useRef<Map<string, number>>(new Map()); // Track dealing timeouts
    
    // Use refs to track previous values for animation detection (avoid stale closures)
    const prevDealerHandRef = useRef<CardModel[]>([]);
    const prevPlayerHandsRef = useRef<Map<string, CardModel[]>>(new Map());
    const lastProcessedStateRef = useRef<string>(''); // Track last processed state to avoid duplicate processing
    const lastSeatsHashRef = useRef<string>(''); // Track last seats hash to avoid duplicate seat updates
    const lastDealingRoundRef = useRef<number>(-1); // Track last dealing round to detect new rounds
    const expectingLeaveSeatRef = useRef<boolean>(false); // Track if we're expecting a leave seat response

    // Sync seats from server
    useEffect(() => {
        if (!server?.blackjackLobbyState) {
            return;
        }
        
        const newSeats = server.blackjackLobbyState.seats.map(s => ({
            id: s.id as BJSeatId,
            occupant: s.occupant ? {
                user: s.occupant.user,
                isSpectating: s.occupant.isSpectating,
                isSittingOut: s.occupant.isSittingOut,
            } : undefined
        }));
        
        // Only update if seats have actually changed (use ref to avoid dependency loop)
        const seatsHash = JSON.stringify(newSeats);
        
        // If we're expecting a leave seat response from server, always process it
        // This ensures the server response is processed even if optimistic update matches
        const shouldProcessLeaveSeat = expectingLeaveSeatRef.current;
        
        // If we're expecting a leave seat response, always process it (even if hash matches)
        // This ensures the server response is processed even if optimistic update matches
        if (shouldProcessLeaveSeat) {
            // This is the server response we're waiting for - always process it
            // Processing leave seat server response - don't reset flag here, let game state useEffect reset it
            lastSeatsHashRef.current = seatsHash;
            
            // When leaving a seat, ensure the seat is completely cleared (no occupant, no isSittingOut flag)
            // This is independent of sit out/sit in status
            const userSeatIndex = newSeats.findIndex(s => s.occupant?.user.name === userData.user?.name);
            if (userSeatIndex !== -1 && newSeats[userSeatIndex].occupant) {
                // User should not be in a seat after leaving - clear it completely
                console.log('[Frontend] Leave seat: User still in seat after leaving, clearing it');
                newSeats[userSeatIndex] = { id: newSeats[userSeatIndex].id, occupant: undefined };
            }
        } else if (lastSeatsHashRef.current !== '' && seatsHash === lastSeatsHashRef.current) {
            // Skip if hash matches and we're not expecting a leave seat response
            // Skipping duplicate seats hash
            return;
        } else {
            lastSeatsHashRef.current = seatsHash;
        }
        
        // Received blackjackLobbyState update
        
        // Always update seats from server response (this is the source of truth)
        setSeats(newSeats);
        
        // Check if user is already seated
        const userSeat = newSeats.find(s => s.occupant?.user.name === userData.user?.name);
        // User seat check
        if (userSeat) {
            setShowSeatSelection(false);
            setSelectedSeat(userSeat.id);
        } else {
            // User is not seated anymore - ensure UI reflects this immediately
            // User not seated - showing seat selection
            setShowSeatSelection(true);
            setSelectedSeat(null);
        }
    }, [server?.blackjackLobbyState, userData.user]);

    // Get current player's seat
    const mySeat = useMemo(() => {
        if (!userData.user) return null;
        return seats.find(s => s.occupant?.user.name === userData.user?.name);
    }, [seats, userData.user]);

    // Sync game state from server
    useEffect(() => {
        if (!server?.blackjackGameState) {
            // If no game state but player is seated, default to betting phase
            if (mySeat) {
                setGamePhase("betting");
            }
            return;
        }
        
        // Only process if we have actual changes to avoid unnecessary re-renders
        const newPhase = server.blackjackGameState.phase;
        const newDealerHand = server.blackjackGameState.dealerHand || [];
        const newPlayers = server.blackjackGameState.players || [];
        
        // Create a hash of the current state to check if we've already processed it
        // Include results in the hash so we detect when game finishes and results are added
        const stateHash = JSON.stringify({
            phase: newPhase,
            dealerHand: newDealerHand,
            players: newPlayers.map(p => ({
                ...p,
                result: (p as any).result,
                payout: (p as any).payout
            })),
            dealerVisible: server.blackjackGameState.dealerVisible,
            currentPlayerId: server.blackjackGameState.currentPlayerId,
            roundNumber: server.blackjackGameState.roundNumber
        });
        
        // If we're expecting a leave seat response, always process game state update (player might be removed)
        const shouldProcessLeaveSeat = expectingLeaveSeatRef.current;
        
        // Skip if we've already processed this exact state (prevent infinite loops)
        // UNLESS we're expecting a leave seat response (player might be removed from game state)
        // OR the game just finished (we need to process payouts and stats)
        // OR the phase changed (we need to update gamePhase state)
        const gameJustFinished = newPhase === 'finished' && gamePhase !== 'finished';
        const phaseChanged = newPhase !== gamePhase;
        if (stateHash === lastProcessedStateRef.current && !shouldProcessLeaveSeat && !gameJustFinished && !phaseChanged) {
            return;
        }
        
        // If processing leave seat, reset the flag after processing game state
        if (shouldProcessLeaveSeat) {
            expectingLeaveSeatRef.current = false;
        }
        
        // Mark this state as processed
        lastProcessedStateRef.current = stateHash;
        
        // Removed console.log to reduce performance overhead
        
        // Update current state - BlackjackHand handles animations automatically
        setGamePhase(newPhase);
        setDealerHand(newDealerHand as CardModel[]);
        setDealerVisible(server.blackjackGameState.dealerVisible || false);
        // Only update players from server if we have server state - merge with local optimistic updates
        // Include result and payout from server state
        const playersWithResults = (newPlayers as any[]).map(p => ({
            ...p,
            result: (p as any).result,
            payout: (p as any).payout
        })) as PlayerState[];
        
        // Merge server state with local optimistic updates (preserve bets that were just placed)
        setPlayers(prev => {
            const serverPlayersMap = new Map<string, PlayerState>();
            playersWithResults.forEach(p => {
                const key = `${p.user.name}-${p.seatId}`;
                serverPlayersMap.set(key, p);
            });
            
            // Merge: use server state if available, otherwise keep local optimistic updates
            const merged: PlayerState[] = [];
            const processedKeys = new Set<string>();
            
            // First, add all server players
            playersWithResults.forEach(p => {
                const key = `${p.user.name}-${p.seatId}`;
                merged.push(p);
                processedKeys.add(key);
            });
            
            // Then, add any local players with bets that aren't in server state yet (optimistic updates)
            prev.forEach(localPlayer => {
                const key = `${localPlayer.user.name}-${localPlayer.seatId}`;
                if (!processedKeys.has(key) && (localPlayer.bet > 0 || (localPlayer.hand?.bet ?? 0) > 0)) {
                    // Only keep local player if they have a bet (optimistic update)
                    merged.push(localPlayer);
                    processedKeys.add(key);
                }
            });
            
            return merged;
        });
        
        // Debug: Log results when game is finished
        if (server.blackjackGameState.phase === 'finished') {
            console.log('[Frontend] Game finished, player results:', playersWithResults.map(p => ({
                name: p.user.name,
                seatId: p.seatId,
                result: (p as any).result,
                payout: (p as any).payout,
                hasHand: !!p.hand,
                handCards: p.hand?.cards?.length || 0,
                bet: p.bet,
                userObject: p.user
            })));
            console.log('[Frontend] Current user:', userData.user?.name, 'My seat ID:', mySeat?.id);
            console.log('[Frontend] Server players:', server.blackjackGameState.players.map(p => ({
                name: p.user.name,
                seatId: p.seatId,
                result: (p as any).result,
                payout: (p as any).payout
            })));
        }
        setCurrentPlayerId(server.blackjackGameState.currentPlayerId || null);
        setRoundNumber(server.blackjackGameState.roundNumber || 0);
        
        // Update refs with new values for next render (after state updates)
        prevDealerHandRef.current = newDealerHand as CardModel[];
        const currentPlayerHandsForRef = new Map<string, CardModel[]>();
        newPlayers.forEach(p => {
            if (p.hand?.cards) {
                currentPlayerHandsForRef.set(`${p.user.name}-${p.seatId}`, p.hand.cards as CardModel[]);
            }
        });
        prevPlayerHandsRef.current = currentPlayerHandsForRef;
        
        // Update timer if turnEndsAt is provided
        if (server.blackjackGameState.turnEndsAt) {
            const remaining = Math.max(0, Math.ceil((server.blackjackGameState.turnEndsAt - Date.now()) / 1000));
            setTurnTimer(remaining);
        }
        
        // Calculate animation completion time for each player when game finishes
        // Animation duration: 800ms + delay (200ms per card index)
        // So for a hand with N cards, last card finishes at: (N-1) * 200 + 800 + 200 (buffer) = N * 200 + 800
        if (server.blackjackGameState.phase === 'finished') {
            // Clear previous animation states
            setAnimationsComplete(new Map());
            animationTimeoutRefs.current.forEach(timeout => clearTimeout(timeout));
            animationTimeoutRefs.current.clear();
            
            // Calculate animation time for each player
            // BlackjackHand uses: delay={index * 200}, duration={800}
            // Last card (index N-1) finishes at: (N-1) * 200 + 800ms
            // Add buffer: (N-1) * 200 + 800 + 200 = N * 200 + 600ms
            newPlayers.forEach((player) => {
                if (player.hand?.cards) {
                    const playerKey = `${player.user.name}-${player.seatId}`;
                    const cardCount = player.hand.cards.length;
                    const animationTime = cardCount * 200 + 600; // (N-1)*200 + 800 + 200 buffer = N*200 + 600
                    
                    // Set timeout to mark animations as complete
                    const timeout = window.setTimeout(() => {
                        setAnimationsComplete(prev => {
                            const updated = new Map(prev);
                            updated.set(playerKey, true);
                            return updated;
                        });
                    }, animationTime);
                    
                    animationTimeoutRefs.current.set(playerKey, timeout);
                }
            });
            
            // For dealer, calculate animation time
            if (newDealerHand.length > 0) {
                const dealerAnimationTime = newDealerHand.length * 200 + 600; // Same calculation as players
                const dealerKey = 'dealer';
                
                const timeout = window.setTimeout(() => {
                    setAnimationsComplete(prev => {
                        const updated = new Map(prev);
                        updated.set(dealerKey, true);
                        return updated;
                    });
                }, dealerAnimationTime);
                
                animationTimeoutRefs.current.set(dealerKey, timeout);
            }
        } else {
            // Clear animation completion state when not finished
            setAnimationsComplete(new Map());
            // Clear all timeouts
            animationTimeoutRefs.current.forEach(timeout => clearTimeout(timeout));
            animationTimeoutRefs.current.clear();
        }
        
        // Handle payouts when game is finished (only once per round)
        // IMPORTANT: Process payouts BEFORE the state is reset to betting phase
        // Check both server state and local players state for results
        if (server.blackjackGameState.phase === 'finished' && userData?.user && !processedPayouts.has(server.blackjackGameState.roundNumber)) {
            console.log(`[Frontend] Processing finished game for ${userData.user.name}, round: ${server.blackjackGameState.roundNumber}`);
            console.log(`[Frontend] My seat ID: ${mySeat?.id}, User name: ${userData.user.name}`);
            
            // Find player by name and seat ID (more reliable than just name)
            // Check playersWithResults first (has results mapped), then server state, then local state
            const myPlayer = playersWithResults.find(
                p => p.user.name === userData.user?.name && p.seatId === mySeat?.id
            ) || playersWithResults.find(
                p => p.user.name === userData.user?.name
            ) || server.blackjackGameState.players.find(
                p => p.user.name === userData.user?.name && p.seatId === mySeat?.id
            ) || server.blackjackGameState.players.find(
                p => p.user.name === userData.user?.name
            ) || players.find(
                p => p.user.name === userData.user?.name && p.seatId === mySeat?.id
            ) || players.find(
                p => p.user.name === userData.user?.name
            );
            
            const result = (myPlayer as any)?.result;
            const payout = (myPlayer as any)?.payout ?? 0;
            
            console.log(`[Frontend] Player lookup result:`, {
                found: !!myPlayer,
                result: result,
                payout: payout,
                bet: myPlayer?.bet,
                seatId: myPlayer?.seatId,
                playerName: myPlayer?.user?.name,
                playersWithResultsCount: playersWithResults.length,
                serverPlayersCount: server.blackjackGameState.players.length,
                localPlayersCount: players.length
            });
            
            if (myPlayer && result) {
                console.log(`[Frontend] Processing payout for ${userData.user.name}: ${result}, payout: ${payout}, bet: ${myPlayer.bet || myPlayer.hand?.bet || 0}, round: ${server.blackjackGameState.roundNumber}`);
                
                // Update balance based on payout
                // Backend payout: blackjack = bet * 2.5, win = bet * 2, push = bet, loss = 0
                // This is the total amount to add (includes bet back + winnings)
                // Note: The bet was already subtracted when placed, so we just add the payout
                if (userData.addFunds) {
                    if (payout > 0) {
                        userData.addFunds(payout);
                        console.log(`[Frontend] Added ${payout} to balance for ${userData.user.name} (${result})`);
                    } else {
                        // Loss: payout is 0, bet was already subtracted when placed
                        console.log(`[Frontend] Loss for ${userData.user.name} - bet of ${myPlayer.bet || myPlayer.hand?.bet || 0} was already subtracted`);
                    }
                } else {
                    console.error(`[Frontend] addFunds not available for ${userData.user.name}`);
                }
                
                // Mark this round as processed
                setProcessedPayouts(prev => new Set([...prev, server.blackjackGameState!.roundNumber]));
                
                // Set game result for display
                setMyGameResult(result as "win" | "loss" | "push" | "blackjack");
                
                // Record stats - always record, even for push (which doesn't count as win/loss)
                // Call recordResult directly - it uses setState which will trigger a re-render
                recordResult(result as "win" | "loss" | "push" | "blackjack");
                console.log(`[Frontend] Recorded ${result} for ${userData.user?.name || 'unknown'}`);
            } else {
                console.log(`[Frontend] No player found or no result for ${userData.user?.name || 'unknown'}`, {
                    myPlayer: !!myPlayer,
                    hasResult: myPlayer ? !!(myPlayer as any).result : false,
                    mySeatId: mySeat?.id,
                    playersWithResults: playersWithResults.map(p => ({ 
                        name: p.user.name, 
                        seatId: p.seatId, 
                        result: (p as any).result,
                        payout: (p as any).payout,
                        bet: p.bet
                    })),
                    serverPlayers: server.blackjackGameState.players.map(p => ({ 
                        name: p.user.name, 
                        seatId: p.seatId, 
                        result: (p as any).result,
                        payout: (p as any).payout,
                        bet: p.bet
                    })),
                    localPlayers: players.map(p => ({ 
                        name: p.user.name, 
                        seatId: p.seatId, 
                        result: (p as any).result,
                        payout: (p as any).payout,
                        bet: p.bet
                    }))
                });
            }
        }
        
        // Clear game result when starting a new round
        if (server.blackjackGameState.phase === 'betting' && myGameResult !== null) {
            setMyGameResult(null);
        }
        
        // Clear processed payouts when starting a new round
        if (server.blackjackGameState.phase === 'betting' && processedPayouts.has(server.blackjackGameState.roundNumber - 1)) {
            setProcessedPayouts(new Set());
        }
        
        // Clear player hands when game resets to betting phase - but keep bets
        if (server.blackjackGameState.phase === 'betting' && processedPayouts.has(server.blackjackGameState.roundNumber - 1)) {
            setPlayers(prev => prev.map(p => ({ 
                ...p, 
                hand: undefined,
                isActive: false,
                isFinished: false,
                result: undefined,
                payout: undefined
            })));
            setDealerHand([]);
            setDealerVisible(false);
            setVisibleDealerCards([]);
            setVisiblePlayerCards(new Map());
            dealingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            dealingTimeoutsRef.current.clear();
            setMyGameResult(null);
        }
        
        // Sequential dealing logic - match singleplayer timing exactly
        const currentRound = server.blackjackGameState.roundNumber || 0;
        const isNewRound = currentRound !== lastDealingRoundRef.current;
        const isDealingPhase = newPhase === 'dealing';
        
        if (isDealingPhase && isNewRound && newDealerHand.length > 0) {
            // New round starting - clear previous dealing state
            lastDealingRoundRef.current = currentRound;
            setVisibleDealerCards([]);
            setVisiblePlayerCards(new Map());
            // Clear all dealing timeouts
            dealingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            dealingTimeoutsRef.current.clear();
            
            // Get players with bets (sorted by seat ID for consistent order)
            const playersWithBets = newPlayers
                .filter(p => (p.bet || 0) > 0)
                .sort((a, b) => a.seatId - b.seatId);
            
            // Deal dealer's first card immediately
            if (newDealerHand.length >= 1) {
                setVisibleDealerCards([newDealerHand[0] as CardModel]);
            }
            
            // Deal cards to each player sequentially (matching singleplayer: 2 seconds per player, 1.5 seconds between cards)
            playersWithBets.forEach((player, playerIndex) => {
                const playerKey = `${player.user.name}-${player.seatId}`;
                const playerCards = (player.hand?.cards || []) as CardModel[];
                
                if (playerCards.length >= 1) {
                    // First card: after delay (2 seconds per player)
                    const firstCardDelay = playerIndex * 2000;
                    const timeout1 = window.setTimeout(() => {
                        setVisiblePlayerCards(prev => {
                            const updated = new Map(prev);
                            updated.set(playerKey, [playerCards[0] as CardModel]);
                            return updated;
                        });
                    }, firstCardDelay);
                    dealingTimeoutsRef.current.set(`${playerKey}-card1`, timeout1);
                    
                    if (playerCards.length >= 2) {
                        // Second card: after first card + 1.5 seconds
                        const secondCardDelay = firstCardDelay + 1500;
                        const timeout2 = window.setTimeout(() => {
                            setVisiblePlayerCards(prev => {
                                const updated = new Map(prev);
                                const current = updated.get(playerKey) || [];
                                if (current.length === 1) {
                                    updated.set(playerKey, [playerCards[0] as CardModel, playerCards[1] as CardModel]);
                                }
                                return updated;
                            });
                        }, secondCardDelay);
                        dealingTimeoutsRef.current.set(`${playerKey}-card2`, timeout2);
                    }
                }
            });
            
            // Deal dealer's second card after all player cards + 1.5 seconds
            if (newDealerHand.length >= 2) {
                const dealerSecondCardDelay = playersWithBets.length * 2000 + 1500;
                const timeout = window.setTimeout(() => {
                    setVisibleDealerCards(prev => {
                        if (prev.length === 1) {
                            return [newDealerHand[0] as CardModel, newDealerHand[1] as CardModel];
                        }
                        return prev;
                    });
                }, dealerSecondCardDelay);
                dealingTimeoutsRef.current.set('dealer-card2', timeout);
            }
        } else {
            // Not in dealing phase OR dealing is complete - show all cards immediately (for hits, dealer draws, etc.)
            // Also handle hits during dealing phase - if a player has more cards than visible, show all
            setVisibleDealerCards(newDealerHand as CardModel[]);
            const allPlayerCards = new Map<string, CardModel[]>();
            newPlayers.forEach((player) => {
                if (player.hand?.cards) {
                    const playerKey = `${player.user.name}-${player.seatId}`;
                    const currentVisible = visiblePlayerCards.get(playerKey) || [];
                    // If player has more cards than visible (hit during dealing), show all cards
                    if (player.hand.cards.length > currentVisible.length || !isDealingPhase) {
                        allPlayerCards.set(playerKey, player.hand.cards as CardModel[]);
                    } else {
                        // Keep current visible cards during dealing
                        allPlayerCards.set(playerKey, currentVisible);
                    }
                }
            });
            setVisiblePlayerCards(allPlayerCards);
        }
    }, [server?.blackjackGameState, mySeat, userData?.user, userData?.addFunds, processedPayouts, players, recordResult]);

    const myPlayerState = useMemo(() => {
        if (!userData.user) return null;
        return players.find(p => p.user.name === userData.user?.name);
    }, [players, userData.user]);

    // Memoize converted cards for each player to ensure stable references for BlackjackHand
    // Use visible cards during dealing phase, full cards otherwise
    const playerCardsMap = useMemo(() => {
        const map = new Map<string, ReturnType<typeof convertCard>[]>();
        players.forEach((player) => {
            if (player.hand?.cards) {
                const playerKey = `${player.user.name}-${player.seatId}`;
                // During dealing phase, use visible cards; otherwise use all cards
                const cardsToUse = (gamePhase === 'dealing' && visiblePlayerCards.has(playerKey))
                    ? visiblePlayerCards.get(playerKey) || []
                    : player.hand.cards;
                map.set(playerKey, cardsToUse.map(convertCard));
            }
        });
        return map;
    }, [players, gamePhase, visiblePlayerCards]);

    // Memoize converted dealer cards - use visible cards during dealing phase
    const dealerCardsConverted = useMemo(() => {
        const cardsToUse = (gamePhase === 'dealing' && visibleDealerCards.length > 0)
            ? visibleDealerCards
            : dealerHand;
        return cardsToUse.map(convertCard);
    }, [dealerHand, gamePhase, visibleDealerCards]);

    const myHand = useMemo(() => {
        return myPlayerState?.hand;
    }, [myPlayerState]);

    // Join blackjack lobby on mount and reset state
    useEffect(() => {
        // Reset local state when entering multiplayer
        setDealerHand([]);
        setDealerVisible(false);
        setPlayers([]);
        setCurrentPlayerId(null);
        setGamePhase('waiting');
        setTurnTimer(0);
        setVisibleDealerCards([]);
        setVisiblePlayerCards(new Map());
        
        if (server?.isConnected && server?.joinBlackjack) {
            server.joinBlackjack();
        }
        return () => {
            if (server?.isConnected && server?.leaveBlackjack) {
                server.leaveBlackjack();
            }
            // Clear all dealing timeouts
            dealingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            dealingTimeoutsRef.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [server?.isConnected]);

    // Handle seat selection - only allow one seat per player
    const handleSelectSeat = useCallback((seatId: number) => {
        if (!userData.user || !server?.joinBlackjack) {
            console.error('Cannot select seat: user or server not available');
            return;
        }
        
        // Check if user already has a seat
        const existingSeat = seats.find(s => s.occupant?.user.name === userData.user?.name);
        if (existingSeat) {
            alert('You already have a seat! Leave your current seat first.');
            return;
        }
        
        if (seats[seatId]?.occupant) {
            alert('This seat is already taken!');
            return;
        }
        
        console.log('Selecting seat:', seatId, 'User:', userData.user.name);
        
        // Optimistic update - immediately update local state
        setSeats(prev => {
            const updated = [...prev];
            updated[seatId] = {
                ...updated[seatId],
                occupant: {
                    user: userData.user!,
                    isSpectating: false,
                    isSittingOut: false,
                }
            };
            return updated;
        });
        setSelectedSeat(seatId);
        setShowSeatSelection(false);
        
        // Send to server
        try {
            server.joinBlackjack(seatId);
        } catch (error) {
            console.error('Error joining blackjack:', error);
            // Revert optimistic update on error
            setSeats(prev => {
                const updated = [...prev];
                updated[seatId] = { id: seatId as BJSeatId };
                return updated;
            });
            setSelectedSeat(null);
            setShowSeatSelection(true);
        }
    }, [userData.user, seats, server]);

    // Handle sit out / sit in toggle - only allowed before/after rounds
    const handleSitOut = useCallback(() => {
        if (!userData.user || !mySeat || !server?.blackjackAction) return;
        
        // Can only sit out during betting, waiting, or finished phases
        if (gamePhase !== "betting" && gamePhase !== "waiting" && gamePhase !== "finished") {
            alert("You can only sit out before or after a round. Your sit out status will take effect next round.");
            return;
        }
        
        const isCurrentlySittingOut = mySeat.occupant?.isSittingOut || false;
        const newSitOutState = !isCurrentlySittingOut;
        
        // Update local state optimistically
        setSeats(prev => {
            const updated = [...prev];
            const seatIndex = updated.findIndex(s => s.id === mySeat.id);
            if (seatIndex !== -1 && updated[seatIndex].occupant) {
                updated[seatIndex] = {
                    ...updated[seatIndex],
                    occupant: {
                        ...updated[seatIndex].occupant!,
                        isSittingOut: newSitOutState
                    }
                };
            }
            return updated;
        });
        
        // Send to server
        server.blackjackAction(newSitOutState ? 'SIT_OUT' : 'SPECTATE', undefined, mySeat.id);
    }, [userData.user, mySeat, server, gamePhase]);

    // Handle player actions - work for single player or multiple players, regardless of seat
    const handleHit = useCallback(() => {
        if (!userData.user || gamePhase !== "player_turn" || !server?.blackjackAction || !mySeat) return;
        // Check if it's the current player's turn
        if (currentPlayerId !== userData.user.name) {
            console.log(`Not your turn. Current player: ${currentPlayerId}`);
            return;
        }
        console.log(`[Frontend] ${userData.user.name} hitting at seat ${mySeat.id}`);
        server.blackjackAction('HIT', undefined, mySeat.id);
    }, [userData.user, gamePhase, currentPlayerId, server, mySeat]);

    const handleStand = useCallback(() => {
        if (!userData.user || gamePhase !== "player_turn" || !server?.blackjackAction || !mySeat) return;
        // Check if it's the current player's turn
        if (currentPlayerId !== userData.user.name) {
            console.log(`Not your turn. Current player: ${currentPlayerId}`);
            return;
        }
        console.log(`[Frontend] ${userData.user.name} standing at seat ${mySeat.id}`);
        server.blackjackAction('STAND', undefined, mySeat.id);
    }, [userData.user, gamePhase, currentPlayerId, server, mySeat]);

    const handleDoubleDown = useCallback(() => {
        if (!userData.user || gamePhase !== "player_turn" || !server?.blackjackAction || !mySeat) return;
        // Check if it's the current player's turn
        if (currentPlayerId !== userData.user.name) {
            console.log(`Not your turn. Current player: ${currentPlayerId}`);
            return;
        }
        // Check if player has exactly 2 cards
        if (myHand && myHand.cards.length !== 2) {
            console.log('Cannot double down - must have exactly 2 cards');
            return;
        }
        console.log(`[Frontend] ${userData.user.name} doubling down at seat ${mySeat.id}`);
        server.blackjackAction('DOUBLE_DOWN', undefined, mySeat.id);
    }, [userData.user, gamePhase, currentPlayerId, server, mySeat, myHand]);


    const handlePlaceBet = useCallback(() => {
        // Allow betting in both "betting" and "waiting" phases
        if (!userData.user || (gamePhase !== "betting" && gamePhase !== "waiting") || !server?.blackjackAction || !mySeat) {
            console.log('Cannot place bet:', { user: !!userData.user, phase: gamePhase, server: !!server?.blackjackAction, seat: !!mySeat });
            return;
        }
        // Check if user is sitting out - cannot bet while sitting out
        if (mySeat.occupant?.isSittingOut) {
            alert('You are sitting out! Click "Sit In" to place bets.');
            return;
        }
        if (betAmount > (userData.user.balance || 0)) {
            alert('Insufficient funds!');
            return;
        }
        
        // Get current bet (like singleplayer - allows adding chips incrementally)
        const existingPlayerState = players.find(p => p.user.name === userData.user?.name && p.seatId === mySeat.id);
        const currentBet = existingPlayerState?.bet || existingPlayerState?.hand?.bet || 0;
        const newTotalBet = currentBet + betAmount;
        
        // Check if total exceeds max bet
        if (newTotalBet > MAX_BET) {
            alert(`Maximum bet is $${MAX_BET}!`);
            return;
        }
        
        console.log('Placing bet:', betAmount, 'Total:', newTotalBet, 'for user:', userData.user.name);
        
        // Optimistically update local state - prevent duplicates and add to existing bet
        setPlayers(prev => {
            const updated = [...prev];
            // Remove any existing duplicates first
            const filtered = updated.filter((p, index, self) => 
                index === self.findIndex(pl => pl.user.name === p.user.name && pl.seatId === p.seatId)
            );
            const playerIndex = filtered.findIndex(p => p.user.name === userData.user?.name && p.seatId === mySeat.id);
            if (playerIndex !== -1) {
                // Update existing player state - add to existing bet
                filtered[playerIndex] = {
                    ...filtered[playerIndex],
                    bet: newTotalBet,
                    isActive: true
                };
                return filtered;
            } else {
                // Create new player state if it doesn't exist
                if (userData.user) {
                    filtered.push({
                        user: userData.user,
                        seatId: mySeat.id,
                        bet: betAmount,
                        isActive: true,
                        isFinished: false
                    });
                }
                return filtered;
            }
        });
        
        // Update user balance optimistically
        if (userData.removeFunds) {
            userData.removeFunds(betAmount);
        }
        
        // Send to server
        try {
            server.blackjackAction('BET', betAmount, mySeat.id);
        } catch (error) {
            console.error('Error placing bet:', error);
            // Revert optimistic update on error
            setPlayers(prev => {
                const updated = [...prev];
                const playerIndex = updated.findIndex(p => p.user.name === userData.user?.name && p.seatId === mySeat.id);
                if (playerIndex !== -1) {
                    updated[playerIndex] = {
                        ...updated[playerIndex],
                        bet: currentBet, // Revert to previous bet
                        isActive: currentBet > 0
                    };
                }
                return updated;
            });
            if (userData.addFunds) {
                userData.addFunds(betAmount);
            }
        }
    }, [userData, gamePhase, betAmount, server, mySeat, players]);

    // Timer countdown - sync with server turnEndsAt
    useEffect(() => {
        if (gamePhase !== "player_turn" || !currentPlayerId || !server?.blackjackGameState?.turnEndsAt) {
            setTurnTimer(0);
            return;
        }

        // Calculate remaining time from server
        const updateTimer = () => {
            if (!server?.blackjackGameState?.turnEndsAt) {
                setTurnTimer(0);
                return;
            }
            const remaining = Math.max(0, Math.ceil((server.blackjackGameState!.turnEndsAt! - Date.now()) / 1000));
            setTurnTimer(remaining);
            
            // Auto-action when timer hits 0
            if (remaining <= 0 && currentPlayerId === userData.user?.name && mySeat) {
                const currentPlayer = players.find(p => p.user.name === currentPlayerId);
                if (currentPlayer?.hand && !currentPlayer.hand.isStanding && !currentPlayer.hand.isBusted) {
                    const value = currentPlayer.hand.value;
                    console.log(`[Frontend] Timer expired for ${currentPlayerId}, hand value: ${value}`);
                    if (value >= 17) {
                        // Auto-stand
                        console.log(`[Frontend] Timer expired - auto-standing for ${currentPlayerId}`);
                        handleStand();
                    } else if (value <= 16) {
                        // Auto-hit
                        console.log(`[Frontend] Timer expired - auto-hitting for ${currentPlayerId}`);
                        handleHit();
                    }
                }
            }
        };

        // Update immediately
        updateTimer();

        // Update every second
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [gamePhase, currentPlayerId, server?.blackjackGameState?.turnEndsAt, players, handleStand, handleHit, userData.user, mySeat]);

    // Calculate positions for betting spaces and cards (same as singleplayer)
    const getBetPosition = useCallback((index: number) => {
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const totalWidth = screenWidth - 300; // Leave space for buttons
        const spacing = totalWidth / (NUM_SEATS + 1);
        return {
            x: 150 + spacing * (index + 1) - 60, // Center of betting space
            y: typeof window !== 'undefined' ? window.innerHeight - 120 : 600 // Bottom area
        };
    }, []);

    const getCardPosition = useCallback((index: number) => {
        const betPos = getBetPosition(index);
        return {
            x: betPos.x,
            y: betPos.y - 280 // Cards positioned higher for better readability
        };
    }, [getBetPosition]);

    // Deck position in bottom right corner
    const deckPosition = useCallback(() => {
        return {
            x: typeof window !== 'undefined' ? window.innerWidth - 180 : 1100,
            y: typeof window !== 'undefined' ? window.innerHeight - 280 : 600
        };
    }, []);

    const dealerValue = useMemo(() => getBestHandValue(dealerHand), [dealerHand]);
    const dealerBusted = useMemo(() => isBusted(dealerHand), [dealerHand]);
    const dealerHasBlackjack = useMemo(() => {
        if (dealerHand.length !== 2) return false;
        return calculateHandValue(dealerHand).isBlackjack;
    }, [dealerHand]);

    // Don't show seat selection overlay - show it at the bottom of the table instead

    // Main game UI (matching singleplayer layout)
    // const mySeatIndex = mySeat?.id ?? 0; // unused

    // Debug logging (commented out to reduce console spam)
    // console.log('[BlackjackMultiplayerGame] Rendering:', {
    //     seats: seats.length,
    //     gamePhase,
    //     mySeat: mySeat?.id,
    //     showSeatSelection,
    //     userData: !!userData.user,
    //     server: !!server,
    //     blackjackLobbyState: !!server?.blackjackLobbyState,
    //     blackjackGameState: !!server?.blackjackGameState
    // });

    // Ensure seats array is always populated (fallback if server hasn't sent state yet)
    const displaySeats = seats.length > 0 ? seats : Array(NUM_SEATS).fill(null).map((_, i) => ({ id: i as BJSeatId }));

    return (
        <div style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            minHeight: '100vh', 
            background: `
                radial-gradient(ellipse 140% 120% at center, #0d5a0d 0%, #084008 40%, #062806 70%, #031503 100%),
                repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0, 0, 0, 0.12) 3px, rgba(0, 0, 0, 0.12) 6px),
                repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px)
            `,
            backgroundBlendMode: 'normal, overlay',
            boxShadow: 'inset 0 0 150px rgba(0, 0, 0, 0.6), inset 0 0 300px rgba(0, 0, 0, 0.4)',
            border: '25px solid #1a1208',
            borderImage: 'linear-gradient(to bottom, #2a1a0e, #1a1208, #2a1a0e) 1',
            boxSizing: 'border-box',
            padding: '20px',
            color: 'var(--color-text)',
            overflow: 'hidden',
            zIndex: 1
        }}>
            {/* Header buttons */}
            <div style={{ 
                position: 'absolute', 
                top: '20px', 
                left: '20px', 
                zIndex: 100,
                display: 'flex',
                gap: '10px'
            }}>
                <button 
                    onClick={onBackToMap}
                    className="btn"
                    style={{
                        backgroundColor: '#a855f7',
                        color: '#fff',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        zIndex: 10001
                    }}
                >
                    Back to Map
                </button>
                {mySeat && (
                    <>
                        <button 
                            onClick={handleSitOut} 
                            className="btn"
                            disabled={gamePhase !== "betting" && gamePhase !== "waiting" && gamePhase !== "finished"}
                            style={{
                                opacity: (gamePhase !== "betting" && gamePhase !== "waiting" && gamePhase !== "finished") ? 0.5 : 1,
                                cursor: (gamePhase !== "betting" && gamePhase !== "waiting" && gamePhase !== "finished") ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {mySeat.occupant?.isSittingOut ? 'Sit In' : 'Sit Out'}
                        </button>
                        {(() => {
                            // Check if player has a bet for confirmation message
                            const playerState = players.find(p => p.user.name === userData.user?.name && p.seatId === mySeat.id);
                            const currentBet = playerState?.bet || playerState?.hand?.bet || 0;
                            const hasBet = currentBet > 0;
                            const confirmMessage = hasBet 
                                ? `Are you sure you want to remove your bet of $${currentBet} and leave your seat?`
                                : 'Are you sure you want to leave your seat?';
                            
                            return (
                                <button 
                                    onClick={() => {
                                        if (window.confirm(confirmMessage)) {
                                            if (!server?.leaveBlackjack || !mySeat) {
                                                return;
                                            }
                                            
                                            // Get bet amount BEFORE any state changes
                                            const betToRefund = currentBet;
                                            
                                            // Check if we can refund (betting, waiting, or early dealing phase)
                                            const canRefundBet = betToRefund > 0 && (
                                                !gamePhase || 
                                                gamePhase === "betting" || 
                                                gamePhase === "waiting" || 
                                                (gamePhase === "dealing" && dealerHand.length === 0 && players.every(p => !p.hand || p.hand.cards.length === 0))
                                            );
                                            
                                            // Set flag to expect leave seat response FIRST - this ensures server response is always processed
                                            expectingLeaveSeatRef.current = true;
                                            lastSeatsHashRef.current = ''; // Clear hash so server response is always processed
                                            
                                            // Refund bet immediately (optimistic update)
                                            if (canRefundBet && betToRefund > 0 && userData.addFunds) {
                                                userData.addFunds(betToRefund);
                                            }
                                            
                                            // Optimistically update local state immediately (for instant UI feedback)
                                            // Clear the seat completely - this is independent of sit out/sit in status
                                            setSeats(prev => {
                                                const updated = [...prev];
                                                const seatIndex = updated.findIndex(s => s.id === mySeat.id);
                                                if (seatIndex !== -1) {
                                                    // Clear seat completely - leave seat is independent of sit out status
                                                    updated[seatIndex] = { id: mySeat.id as BJSeatId };
                                                }
                                                return updated;
                                            });
                                            // Remove player from local players state
                                            setPlayers(prev => prev.filter(p => !(p.user.name === userData.user?.name && p.seatId === mySeat.id)));
                                            setShowSeatSelection(true);
                                            setSelectedSeat(null);
                                            
                                            // Send to server - server will confirm and remove from game state
                                            server.leaveBlackjack();
                                            
                                            // Set a timeout to reset the flag if server response doesn't arrive (safety net)
                                            setTimeout(() => {
                                                if (expectingLeaveSeatRef.current) {
                                                    console.warn('[BlackjackMultiplayerGame] Leave seat response timeout - resetting flag');
                                                    expectingLeaveSeatRef.current = false;
                                                }
                                            }, 5000); // 5 second timeout
                                        }
                                    }} 
                                    className="btn"
                                    disabled={gamePhase !== "betting" && gamePhase !== "waiting" && gamePhase !== "finished" && 
                                             !(gamePhase === "dealing" && dealerHand.length === 0 && players.every(p => !p.hand || p.hand.cards.length === 0))}
                                    style={{ 
                                        backgroundColor: '#a855f7',
                                        borderColor: '#9333ea',
                                        opacity: (gamePhase !== "betting" && gamePhase !== "waiting" && gamePhase !== "finished" && 
                                                 !(gamePhase === "dealing" && dealerHand.length === 0 && players.every(p => !p.hand || p.hand.cards.length === 0))) ? 0.5 : 1,
                                        cursor: (gamePhase !== "betting" && gamePhase !== "waiting" && gamePhase !== "finished" && 
                                                !(gamePhase === "dealing" && dealerHand.length === 0 && players.every(p => !p.hand || p.hand.cards.length === 0))) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Leave Seat
                                </button>
                            );
                        })()}
                    </>
                )}
            </div>

            {/* Balance Display - Only show to current player */}
            {userData.user && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    fontSize: '1.2rem',
                    color: 'var(--color-primary)',
                    fontWeight: 'bold',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    alignItems: 'flex-end'
                }}>
                    <div>
                        Balance: ${userData.user.balance || 0}
                    </div>
                    {/* Stats Tracker */}
                    <div style={{
                        fontSize: '12px',
                        color: '#d1d5db',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-end'
                    }}>
                        <span style={{ color: '#22c55e' }}>Wins: {stats.wins}</span>
                        <span style={{ color: '#ef4444' }}>Losses: {stats.losses}</span>
                        <span style={{ color: '#fbbf24' }}>Win Rate: {stats.winRate}%</span>
                    </div>
                </div>
            )}

            {/* Rules Banner - Center */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                padding: '15px 30px',
                borderRadius: '10px',
                border: '2px solid rgba(255, 215, 0, 0.3)',
                zIndex: 50,
                pointerEvents: 'none',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)'
            }}>
                <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    color: '#ffd700', 
                    marginBottom: '8px',
                    letterSpacing: '1px'
                }}>
                    BLACKJACK PAYS 3 TO 2
                </div>
                <div style={{ fontSize: '12px', color: '#fff', lineHeight: '1.6' }}>
                    DEALER MUST STAND ON 17 AND DRAW TO 16<br/>
                    INSURANCE PAYS 2 TO 1
                </div>
            </div>

            {/* Dealer Hand - under Back to Map button - Only show when not in betting phase */}
            {dealerHand.length > 0 && gamePhase !== "betting" && gamePhase !== "waiting" && (
                <div style={{ 
                    position: 'absolute', 
                    top: '80px', 
                    left: '20px', 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '12px',
                    pointerEvents: 'none',
                    zIndex: 20
                }}>
                    {dealerVisible && (
                        <div style={{ 
                            position: 'absolute',
                            top: '140px',
                            left: '0',
                            fontSize: '1rem', 
                            color: '#fff',
                            background: 'rgba(0, 0, 0, 0.6)',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontWeight: '600',
                            zIndex: 21,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            whiteSpace: 'nowrap'
                        }}>
                            {dealerBusted ? (
                                <span style={{ color: '#ef4444' }}>BUSTED ({dealerValue})</span>
                            ) : (
                                <>
                                    <span>Value: {dealerValue}</span>
                                    {dealerHasBlackjack && (
                                        <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '0.9rem' }}>BLACKJACK!</span>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: '8px',
                        padding: '8px 24px',
                        border: '2px solid #d97706',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                        marginTop: '175px'
                    }}>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>Dealer</div>
                    </div>
                    {dealerHand.length > 0 && (
                        <div style={{ marginTop: '80px' }}>
                            <BlackjackHand
                                key={`dealer-hand-${roundNumber}`}
                                cards={dealerCardsConverted}
                                hideFirstCard={!dealerVisible && dealerHand.length >= 2}
                                position={{ x: 0, y: 0 }}
                                cardWidth={80}
                                cardHeight={112}
                                deckPosition={deckPosition()}
                                keyPrefix={`dealer-${roundNumber}`}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Game Result Message - matching singleplayer style - Only show after animations complete */}
            {gamePhase === "finished" && myGameResult && mySeat && (() => {
                const myPlayerKey = `${userData.user?.name}-${mySeat.id}`;
                return animationsComplete.get(myPlayerKey) ?? false;
            })() && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    zIndex: 100,
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: myGameResult === "win" || myGameResult === "blackjack" ? "#22c55e" :
                               myGameResult === "loss" ? "#ef4444" : "#eab308",
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                        padding: '16px 32px',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        borderRadius: '12px',
                        border: `3px solid ${myGameResult === "win" || myGameResult === "blackjack" ? "#22c55e" :
                                 myGameResult === "loss" ? "#ef4444" : "#eab308"}`
                    }}>
                        {myGameResult === "win" && "You Win!"}
                        {myGameResult === "loss" && "You Lose!"}
                        {myGameResult === "push" && "Push!"}
                        {myGameResult === "blackjack" && "Blackjack!"}
                    </div>
                </div>
            )}

            {/* Player Hand Cards - Show cards during active game phases and finished phase (keep cards visible until new round) */}
            {gamePhase !== "betting" && gamePhase !== "waiting" && players.filter((player, index, self) => 
                // Filter out duplicates - only show first occurrence of each player-seat combination
                index === self.findIndex(p => p.user.name === player.user.name && p.seatId === player.seatId) &&
                // Only show if player has a hand (active in game)
                player.hand && player.hand.cards.length > 0
            ).map((player) => {
                const seat = seats[player.seatId];
                if (!seat || !seat.occupant) return null;
                
                // const isMe = player.user.name === userData.user?.name; // unused
                const isCurrentTurn = currentPlayerId === player.user.name;
                const cardPos = getCardPosition(player.seatId);
                
                return (
                    <div key={`player-cards-${player.user.name}-${player.seatId}`}>
                        {/* Player Hand Cards - matching singleplayer layout exactly - displayed over seat, no name (name is in betting bubble) */}
                        {player.hand && player.hand.cards.length > 0 && (
                            <>
                                <BlackjackHand
                                    key={`player-hand-${player.user.name}-${player.seatId}-${roundNumber}`}
                                    cards={playerCardsMap.get(`${player.user.name}-${player.seatId}`) || []}
                                    hideFirstCard={false}
                                    position={{ x: cardPos.x, y: cardPos.y }}
                                    cardWidth={80}
                                    cardHeight={112}
                                    deckPosition={deckPosition()}
                                    keyPrefix={`player-${player.user.name}-${player.seatId}-${roundNumber}`}
                                />
                                <div style={{ 
                                    position: 'absolute',
                                    left: `${cardPos.x}px`,
                                    top: `${cardPos.y + 120}px`,
                                    transform: 'translateX(-50%)',
                                    fontSize: '1rem', 
                                    color: '#fff',
                                    marginTop: '4px',
                                    pointerEvents: 'none',
                                    zIndex: isCurrentTurn ? 21 : 16,
                                }}>
                                    {player.hand.isBusted ? (
                                        <span style={{ color: '#ef4444' }}>BUSTED ({player.hand.value})</span>
                                    ) : (
                                        <span>Value: {player.hand.value ?? 0}</span>
                                    )}
                                    {player.hand.isBlackjack && (
                                        <div style={{ color: '#22c55e', fontWeight: 'bold', marginTop: '4px', fontSize: '1.1rem' }}>BLACKJACK!</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}

            {/* Win/Lose Announcements for Each Player - Show when game is finished - Matching singleplayer style exactly */}
            {gamePhase === "finished" && (() => {
                const playersWithResults = players.filter((player, index, self) => 
                    
                    // Filter out duplicates - only show first occurrence of each player-seat combination
                    index === self.findIndex(p => p.user.name === player.user.name && p.seatId === player.seatId) &&
                    // Only show if player has a result and a hand
                    player.result && player.hand && player.hand.cards && player.hand.cards.length > 0
                );
                
                return playersWithResults.map((player) => {
                const seat = seats[player.seatId];
                if (!seat || !seat.occupant) return null;
                
                const cardPos = getCardPosition(player.seatId);
                const isMe = player.user.name === userData.user?.name;
                
                // Calculate win amount from payout - matching singleplayer logic
                const bet = player.bet || player.hand?.bet || 0;
                // In singleplayer: blackjack shows total payout (bet * 2.5), wins show bet amount (winnings)
                // Backend payout: blackjack = bet * 2.5, win = bet * 2, push = bet, loss = 0
                let winAmount = 0;
                if (player.result === "blackjack") {
                    winAmount = player.payout || 0; // Total payout for blackjack
                } else if (player.result === "win") {
                    winAmount = bet; // Winnings amount (bet * 2 - bet = bet)
                } else if (player.result === "push") {
                    winAmount = 0; // No winnings, bet returned
                } else if (player.result === "loss") {
                    winAmount = -bet; // Loss amount
                }
                
                // Determine announcement text and colors based on result - matching singleplayer messages
                let message = '';
                let isWin = false;
                let isPush = false;
                let isBlackjack = false;
                
                if (player.hand?.isBusted) {
                    // Player busted
                    message = isMe ? `Bust! Lost $${bet}` : `${player.user.name} - Bust! Lost $${bet}`;
                } else if (player.result === "blackjack") {
                    // Blackjack
                    isBlackjack = true;
                    message = isMe ? `Blackjack! Won $${winAmount}` : `${player.user.name} - Blackjack! Won $${winAmount}`;
                } else if (dealerBusted) {
                    // Dealer busted
                    isWin = true;
                    message = isMe ? `Dealer Bust! Won $${winAmount}` : `${player.user.name} - Dealer Bust! Won $${winAmount}`;
                } else if (player.result === "win") {
                    // Regular win
                    isWin = true;
                    message = isMe ? `You Win! +$${winAmount}` : `${player.user.name} Wins! +$${winAmount}`;
                } else if (player.result === "push") {
                    // Push
                    isPush = true;
                    message = isMe ? `Push - Bet Returned` : `${player.user.name} - Push - Bet Returned`;
                } else if (player.result === "loss") {
                    // Regular loss
                    message = isMe ? `You Lose -$${Math.abs(winAmount)}` : `${player.user.name} Loses -$${Math.abs(winAmount)}`;
                }
                
                // Styling matching singleplayer exactly
                const backgroundColor = isBlackjack 
                    ? 'rgba(255, 215, 0, 0.95)' 
                    : isWin 
                    ? 'rgba(34, 197, 94, 0.95)' 
                    : isPush 
                    ? 'rgba(251, 191, 36, 0.95)' 
                    : 'rgba(239, 68, 68, 0.95)';
                const textColor = isBlackjack ? '#000' : '#fff';
                const borderColor = isBlackjack 
                    ? '#ffd700' 
                    : isWin 
                    ? '#22c55e' 
                    : isPush 
                    ? '#fbbf24' 
                    : '#ef4444';
                
                return (
                    <div
                        key={`player-result-${player.user.name}-${player.seatId}`}
                        style={{
                            position: 'absolute',
                            left: `${cardPos.x - 60}px`,
                            top: `${cardPos.y - 60}px`,
                            transform: 'translateX(-50%)',
                            backgroundColor,
                            color: textColor,
                            padding: '14px 24px',
                            borderRadius: '10px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            zIndex: 1000,
                            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)',
                            border: '3px solid',
                            borderColor,
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            minWidth: '180px',
                            pointerEvents: 'none'
                        }}
                    >
                        {message}
                        <div style={{ 
                            fontSize: '20px', 
                            marginTop: '6px',
                            fontWeight: '900',
                            opacity: 1
                        }}>
                            {isWin && winAmount > 0 && `+$${winAmount}`}
                            {isBlackjack && winAmount > 0 && `+$${winAmount}`}
                            {!isWin && !isPush && !isBlackjack && player.result === "loss" && `-$${Math.abs(winAmount)}`}
                            {isPush && '$0'}
                        </div>
                    </div>
                );
                });
            })()}

            {/* Seat Selection / Player Seats at Bottom - Like singleplayer betting spaces */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '150px',
                right: '300px', // Leave space for buttons
                display: 'flex',
                justifyContent: 'space-around',
                gap: '15px',
                alignItems: 'flex-end'
            }}>
                {displaySeats.map((seat, idx) => {
                    const betPos = getBetPosition(idx);
                    const occupant = ('occupant' in seat && seat.occupant) ? seat.occupant : undefined;
                    const hasUser = occupant && typeof occupant === 'object' && 'user' in occupant && occupant.user && typeof occupant.user === 'object' && 'name' in occupant.user;
                    const isMe = hasUser && (occupant.user as { name: string }).name === userData.user?.name;
                    const playerCharacter: PlayerCharacter | null = hasUser ? {
                        user: occupant.user as any, // Type assertion needed due to User type mismatch
                        x: betPos.x,
                        y: betPos.y - 80
                    } : null;
                    
                    return (
                        <div
                            key={idx}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!occupant) {
                                    handleSelectSeat(idx);
                                } else if (isMe && (gamePhase === "betting" || gamePhase === "waiting")) {
                                    // Check if user is sitting out - cannot bet while sitting out
                                    if (occupant && typeof occupant === 'object' && 'isSittingOut' in occupant && occupant.isSittingOut) {
                                        alert('You are sitting out! Click "Sit In" to place bets.');
                                        return;
                                    }
                                    // Allow clicking to place bet if it's the current player's seat - can add chips incrementally
                                    // This works for any seat the player is in, not just the last one
                                    const hasUser = occupant && typeof occupant === 'object' && 'user' in occupant && occupant.user && typeof occupant.user === 'object' && 'name' in occupant.user;
                                    const playerState = hasUser ? players.find(p => p.user.name === (occupant.user as { name: string }).name && p.seatId === seat.id) : undefined;
                                    const currentBet = playerState?.bet || playerState?.hand?.bet || 0;
                                    // Check if adding more would exceed max bet
                                    if (currentBet + betAmount > MAX_BET) {
                                        alert(`Maximum bet is $${MAX_BET}!`);
                                        return;
                                    }
                                    // Check if user has enough balance
                                    if (betAmount > (userData.user?.balance || 0)) {
                                        alert('Insufficient funds!');
                                        return;
                                    }
                                    console.log('Clicking betting bubble to add bet for seat:', seat.id);
                                    handlePlaceBet();
                                }
                            }}
                            style={{
                                width: '140px',
                                height: '100px',
                                border: '3px solid',
                                borderColor: occupant 
                                    ? (isMe ? '#3b82f6' : '#fbbf24')
                                    : 'rgba(255, 255, 255, 0.3)',
                                borderRadius: '50%',
                                backgroundColor: occupant
                                    ? (isMe ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)')
                                    : 'rgba(0, 0, 0, 0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: !occupant ? 'pointer' : (isMe && gamePhase === "betting") ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                                position: 'relative',
                                boxShadow: occupant 
                                    ? '0 0 20px rgba(255, 215, 0, 0.3), inset 0 0 30px rgba(0, 0, 0, 0.3)' 
                                    : 'inset 0 0 20px rgba(0, 0, 0, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                                if (!occupant) {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                    e.currentTarget.style.borderColor = '#fff';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                } else if (isMe && (gamePhase === "betting" || gamePhase === "waiting")) {
                                    const hasUser = occupant && typeof occupant === 'object' && 'user' in occupant && occupant.user && typeof occupant.user === 'object' && 'name' in occupant.user;
                                    const playerState = hasUser ? players.find(p => p.user.name === (occupant.user as { name: string }).name && p.seatId === seat.id) : undefined;
                                    const hasBet = (playerState?.bet ?? 0) > 0 || (playerState?.hand?.bet ?? 0) > 0;
                                    if (!hasBet) {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                        e.currentTarget.style.borderColor = '#fff';
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                    }
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!occupant) {
                                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                } else if (isMe && (gamePhase === "betting" || gamePhase === "waiting")) {
                                    const hasUser = occupant && typeof occupant === 'object' && 'user' in occupant && occupant.user && typeof occupant.user === 'object' && 'name' in occupant.user;
                                    const playerState = hasUser ? players.find(p => p.user.name === (occupant.user as { name: string }).name && p.seatId === seat.id) : undefined;
                                    const hasBet = (playerState?.bet ?? 0) > 0 || (playerState?.hand?.bet ?? 0) > 0;
                                    if (!hasBet) {
                                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                                        e.currentTarget.style.borderColor = '#3b82f6';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }
                                }
                            }}
                        >
                            {occupant ? (
                                <>
                                    {/* Player Character/Sprite - above the bubble - ALWAYS show when seat is occupied, consistent position */}
                                    {occupant && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-60px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            zIndex: 30,
                                            width: '64px',
                                            height: '64px',
                                            opacity: (occupant && typeof occupant === 'object' && 'isSittingOut' in occupant && occupant.isSittingOut) ? 0.5 : 1,
                                            filter: (occupant && typeof occupant === 'object' && 'isSittingOut' in occupant && occupant.isSittingOut) ? 'grayscale(100%)' : 'none',
                                            transition: 'opacity 0.3s, filter 0.3s'
                                        }}>
                                            {playerCharacter && (
                                                <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                                                    <PlayerEntityComponent
                                                        player={playerCharacter}
                                                        animatedPos={{ x: 0, y: 0 }}
                                                        characterWidth={64}
                                                        characterHeight={64}
                                                    />
                                                </div>
                                            )}
                                            {(occupant && typeof occupant === 'object' && 'isSittingOut' in occupant && (occupant.isSittingOut as boolean)) && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-20px',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                                    color: '#fff',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontSize: '9px',
                                                    fontWeight: 'bold',
                                                    whiteSpace: 'nowrap',
                                                    zIndex: 31
                                                }}>
                                                    SITTING OUT
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Betting bubble content - ALWAYS show chips if bet placed, consistent across all phases */}
                                    {(() => {
                                        // Use seat ID to find the correct player state for this specific seat
                                        const hasUser = occupant && typeof occupant === 'object' && 'user' in occupant && occupant.user && typeof occupant.user === 'object' && 'name' in occupant.user;
                                    const playerState = hasUser ? players.find(p => p.user.name === (occupant.user as { name: string }).name && p.seatId === seat.id) : undefined;
                                        // Always use the bet value - hand.bet during game, bet during betting
                                        const currentBet = playerState?.hand?.bet || playerState?.bet || 0;
                                        const hasBet = currentBet > 0;
                                        
                                        if (isMe && gamePhase === "betting") {
                                            if (!hasBet) {
                                                // Show click to bet for current player - use betAmount state variable
                                                return (
                                                    <div style={{ 
                                                        fontSize: '11px', 
                                                        color: 'rgba(255, 255, 255, 0.6)',
                                                        textAlign: 'center'
                                                    }}>
                                                        Click to bet ${betAmount}
                                                    </div>
                                                );
                                            } else {
                                                // Show chips AND click to add text (like singleplayer - can add chips incrementally)
                                                const getChipStack = (bet: number) => {
                                                    const chips: { value: number; count: number }[] = [];
                                                    let remaining = bet;
                                                    const denominations = [500, 100, 50, 25, 10];
                                                    for (const denom of denominations) {
                                                        const count = Math.floor(remaining / denom);
                                                        if (count > 0) {
                                                            chips.push({ value: denom, count: Math.min(count, 3) });
                                                            remaining -= denom * count;
                                                        }
                                                        if (remaining === 0) break;
                                                    }
                                                    return chips;
                                                };
                                                const chipStack = getChipStack(currentBet);
                                                return (
                                                    <>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginBottom: '4px' }}>
                                                            {chipStack.map((chip, i) => (
                                                                <div key={i} style={{ 
                                                                    display: 'flex', 
                                                                    gap: '2px'
                                                                }}>
                                                                    {Array(Math.min(chip.count, 3)).fill(0).map((_, j) => (
                                                                        <Chip 
                                                                            key={`bubble-chip-${seat.id}-${i}-${j}`} 
                                                                            value={chip.value} 
                                                                            size={30}
                                                                        />
                                                                    ))}
                                                                    {chip.count > 3 && (
                                                                        <span style={{ fontSize: '10px', color: '#fff', alignSelf: 'center' }}>
                                                                            +{chip.count - 3}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div style={{ 
                                                            fontSize: '10px', 
                                                            color: 'rgba(255, 255, 255, 0.6)',
                                                            textAlign: 'center',
                                                            marginTop: '4px'
                                                        }}>
                                                            Click to add ${betAmount}
                                                        </div>
                                                    </>
                                                );
                                            }
                                        } else if (hasBet) {
                                            // Show chips for all players with bets - consistent across all phases
                                            const getChipStack = (bet: number) => {
                                                const chips: { value: number; count: number }[] = [];
                                                let remaining = bet;
                                                const denominations = [500, 100, 50, 25, 10];
                                                for (const denom of denominations) {
                                                    const count = Math.floor(remaining / denom);
                                                    if (count > 0) {
                                                        chips.push({ value: denom, count: Math.min(count, 3) });
                                                        remaining -= denom * count;
                                                    }
                                                    if (remaining === 0) break;
                                                }
                                                return chips;
                                            };
                                            const chipStack = getChipStack(currentBet);
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                    {chipStack.map((chip, i) => (
                                                        <div key={i} style={{ 
                                                            display: 'flex', 
                                                            gap: '2px'
                                                        }}>
                                                            {Array(Math.min(chip.count, 3)).fill(0).map((_, j) => (
                                                                <Chip 
                                                                    key={`bubble-chip-${seat.id}-${i}-${j}`} 
                                                                    value={chip.value} 
                                                                    size={30}
                                                                />
                                                            ))}
                                                            {chip.count > 3 && (
                                                                <span style={{ fontSize: '10px', color: '#fff', alignSelf: 'center' }}>
                                                                    +{chip.count - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        } else {
                                            // Empty bubble for players without bets
                                            return null;
                                        }
                                    })()}
                                </>
                            ) : (
                                <div style={{ 
                                    fontSize: '12px', 
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    textAlign: 'center',
                                    fontWeight: '500',
                                    zIndex: 40,
                                    position: 'relative'
                                }}>
                                    Take a Seat
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Decorative chip tray - bottom left */}
            <div style={{
                position: 'absolute',
                bottom: '140px',
                left: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                pointerEvents: 'none',
                opacity: 0.5,
                zIndex: 5
            }}>
                {Array(5).fill(0).map((_, i) => (
                    <div key={`tray-${i}`} style={{ display: 'flex', gap: '2px' }}>
                        {Array(3).fill(0).map((_, j) => (
                            <Chip key={`tray-chip-${i}-${j}`} value={[500, 100, 50, 25, 10][i]} size={35} />
                        ))}
                    </div>
                ))}
            </div>

            {/* Control Panel - bottom right, above buttons - Only show to current player when seated and not sitting out */}
            {mySeat && (gamePhase === "betting" || gamePhase === "waiting") && !mySeat.occupant?.isSittingOut && (
                <div style={{
                    position: 'absolute',
                    bottom: '340px',
                    right: '40px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    zIndex: 100
                }}>
                    <div style={{ 
                        marginBottom: '15px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        <label htmlFor="bet-input-mp" style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontSize: '0.9rem',
                            color: '#fff',
                            fontWeight: 'bold'
                        }}>
                            Bet Amount (per click)
                        </label>
                        <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            marginBottom: '10px'
                        }}>
                            <button
                                onClick={() => {
                                    const newAmount = Math.max(MIN_BET, betAmount - 10);
                                    setBetAmount(newAmount);
                                }}
                                disabled={betAmount <= MIN_BET}
                                style={{
                                    width: '35px',
                                    height: '35px',
                                    borderRadius: '6px',
                                    border: '2px solid #666',
                                    backgroundColor: betAmount <= MIN_BET ? '#444' : '#3b82f6',
                                    color: '#fff',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: betAmount <= MIN_BET ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                −
                            </button>
                            <div style={{ 
                                fontSize: '1.4rem', 
                                fontWeight: 'bold', 
                                color: '#ffd700',
                                minWidth: '70px',
                                textAlign: 'center'
                            }}>
                                ${betAmount}
                            </div>
                            <button
                                onClick={() => {
                                    const maxBet = userData.user?.balance ? Math.min(MAX_BET, userData.user.balance) : MAX_BET;
                                    const newAmount = Math.min(maxBet, betAmount + 10);
                                    setBetAmount(newAmount);
                                }}
                                disabled={betAmount >= (userData.user?.balance ? Math.min(MAX_BET, userData.user.balance) : MAX_BET)}
                                style={{
                                    width: '35px',
                                    height: '35px',
                                    borderRadius: '6px',
                                    border: '2px solid #666',
                                    backgroundColor: betAmount >= (userData.user?.balance ? Math.min(MAX_BET, userData.user.balance) : MAX_BET) ? '#444' : '#3b82f6',
                                    color: '#fff',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: betAmount >= (userData.user?.balance ? Math.min(MAX_BET, userData.user.balance) : MAX_BET) ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                +
                            </button>
                        </div>
                        <input
                            id="bet-input-mp"
                            type="range"
                            min={MIN_BET}
                            max={userData.user?.balance ? Math.min(MAX_BET, userData.user.balance) : MAX_BET}
                            step={10}
                            value={betAmount}
                            onChange={(e) => setBetAmount(parseInt(e.target.value))}
                            style={{ width: '100%' }}
                        />
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#aaa',
                            marginTop: '5px',
                            textAlign: 'center'
                        }}>
                            Click betting space to add ${betAmount}
                        </div>
                        <div style={{
                            fontSize: '0.7rem',
                            color: '#aaa',
                            marginTop: '8px',
                            textAlign: 'center'
                        }}>
                            MIN ${MIN_BET} | MAX ${MAX_BET}
                        </div>
                    </div>
                    {/* Deal Cards Button */}
                    <button
                        onClick={() => {
                            // Check if at least one player has placed a bet (works for single player or multiple players)
                            // Check both local players state and server game state
                            const localHasBets = players.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0);
                            const serverHasBets = server?.blackjackGameState?.players?.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0) || false;
                            
                            // Also check seats for any bets (in case state hasn't synced yet)
                            const seatsHaveBets = seats.some(seat => {
                                if (!seat.occupant || seat.occupant.isSittingOut) return false;
                                // Check both local and server state for bets
                                const localPlayer = players.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                const serverPlayer = server?.blackjackGameState?.players?.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                const hasLocalBet = localPlayer && (localPlayer.bet > 0 || (localPlayer.hand?.bet ?? 0) > 0);
                                const hasServerBet = serverPlayer && (serverPlayer.bet > 0 || (serverPlayer.hand?.bet ?? 0) > 0);
                                return hasLocalBet || hasServerBet;
                            });
                            
                            const hasBets = localHasBets || serverHasBets || seatsHaveBets;
                            
                            console.log('Deal Cards button clicked:', {
                                localHasBets,
                                serverHasBets,
                                seatsHaveBets,
                                hasBets,
                                players: players.map(p => ({ name: p.user.name, bet: p.bet, seatId: p.seatId })),
                                serverPlayers: server?.blackjackGameState?.players?.map(p => ({ name: p.user.name, bet: p.bet, seatId: p.seatId })),
                                gamePhase,
                                mySeat: mySeat?.id,
                                playerCount: players.length
                            });
                            
                            if (!hasBets) {
                                alert('At least one player must place a bet before dealing cards!');
                                return;
                            }
                            
                            // Send DEAL action to start dealing cards (works for single player from any seat)
                            console.log('Attempting to send DEAL action:', {
                                hasServer: !!server,
                                isConnected: server?.isConnected,
                                hasBlackjackAction: !!server?.blackjackAction,
                                wsReadyState: (server as any)?.ws?.readyState
                            });
                            
                            if (server?.blackjackAction) {
                                console.log('Sending DEAL action to server');
                                try {
                                    server.blackjackAction('DEAL', undefined, undefined);
                                    console.log('DEAL action sent successfully');
                                } catch (error) {
                                    console.error('Error sending DEAL action:', error);
                                }
                            } else {
                                console.error('Cannot send DEAL action - server.blackjackAction is not available');
                                console.error('Server object:', server);
                            }
                        }}
                        className="btn"
                        disabled={(() => {
                            const localHasBets = players.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0);
                            const serverHasBets = server?.blackjackGameState?.players?.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0) || false;
                            const seatsHaveBets = seats.some(seat => {
                                if (!seat.occupant || seat.occupant.isSittingOut) return false;
                                // Check both local and server state for bets
                                const localPlayer = players.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                const serverPlayer = server?.blackjackGameState?.players?.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                const hasLocalBet = localPlayer && (localPlayer.bet > 0 || (localPlayer.hand?.bet ?? 0) > 0);
                                const hasServerBet = serverPlayer && (serverPlayer.bet > 0 || (serverPlayer.hand?.bet ?? 0) > 0);
                                return hasLocalBet || hasServerBet;
                            });
                            return !(localHasBets || serverHasBets || seatsHaveBets);
                        })()}
                        style={{ 
                            padding: '15px 30px', 
                            fontSize: '1.2rem', 
                            backgroundColor: (() => {
                                const localHasBets = players.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0);
                                const serverHasBets = server?.blackjackGameState?.players?.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0) || false;
                                const seatsHaveBets = seats.some(seat => {
                                    if (!seat.occupant || seat.occupant.isSittingOut) return false;
                                    const localPlayer = players.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                    const serverPlayer = server?.blackjackGameState?.players?.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                    return (localPlayer && (localPlayer.bet > 0 || (localPlayer.hand?.bet ?? 0) > 0)) ||
                                           (serverPlayer && (serverPlayer.bet > 0 || (serverPlayer.hand?.bet ?? 0) > 0));
                                });
                                return (localHasBets || serverHasBets || seatsHaveBets) ? '#22c55e' : '#666';
                            })(),
                            fontWeight: 'bold',
                            borderRadius: '8px',
                            border: (() => {
                                const localHasBets = players.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0);
                                const serverHasBets = server?.blackjackGameState?.players?.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0) || false;
                                const seatsHaveBets = seats.some(seat => {
                                    if (!seat.occupant || seat.occupant.isSittingOut) return false;
                                    const localPlayer = players.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                    const serverPlayer = server?.blackjackGameState?.players?.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                    return (localPlayer && (localPlayer.bet > 0 || (localPlayer.hand?.bet ?? 0) > 0)) ||
                                           (serverPlayer && (serverPlayer.bet > 0 || (serverPlayer.hand?.bet ?? 0) > 0));
                                });
                                return (localHasBets || serverHasBets || seatsHaveBets) ? '3px solid #16a34a' : '3px solid #555';
                            })(),
                            boxShadow: (() => {
                                const localHasBets = players.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0);
                                const serverHasBets = server?.blackjackGameState?.players?.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0) || false;
                                const seatsHaveBets = seats.some(seat => {
                                    if (!seat.occupant || seat.occupant.isSittingOut) return false;
                                    const localPlayer = players.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                    const serverPlayer = server?.blackjackGameState?.players?.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                    return (localPlayer && (localPlayer.bet > 0 || (localPlayer.hand?.bet ?? 0) > 0)) ||
                                           (serverPlayer && (serverPlayer.bet > 0 || (serverPlayer.hand?.bet ?? 0) > 0));
                                });
                                return (localHasBets || serverHasBets || seatsHaveBets) ? '0 4px 15px rgba(34, 197, 94, 0.4)' : 'none';
                            })(),
                            color: '#fff'
                        }}
                    >
                        {(() => {
                            const localHasBets = players.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0);
                            const serverHasBets = server?.blackjackGameState?.players?.some(p => (p.bet ?? 0) > 0 || (p.hand?.bet ?? 0) > 0) || false;
                            const seatsHaveBets = seats.some(seat => {
                                if (!seat.occupant || seat.occupant.isSittingOut) return false;
                                // Check both local and server state for bets
                                const localPlayer = players.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                const serverPlayer = server?.blackjackGameState?.players?.find(p => p.user.name === seat.occupant?.user.name && p.seatId === seat.id);
                                const hasLocalBet = localPlayer && (localPlayer.bet > 0 || (localPlayer.hand?.bet ?? 0) > 0);
                                const hasServerBet = serverPlayer && (serverPlayer.bet > 0 || (serverPlayer.hand?.bet ?? 0) > 0);
                                return hasLocalBet || hasServerBet;
                            });
                            return (localHasBets || serverHasBets || seatsHaveBets) ? 'DEAL CARDS' : 'Place Bets First';
                        })()}
                    </button>
                </div>
            )}

            {/* Action Buttons - Right side (only for current player) - works for single or multiple players */}
            {gamePhase === "player_turn" && currentPlayerId === userData.user?.name && mySeat && (
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '40px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    zIndex: 100,
                    width: '120px'
                }}>
                    {/* Timer display - near buttons */}
                    {turnTimer > 0 && (
                        <div style={{
                            padding: '8px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: turnTimer <= 5 ? '#ef4444' : '#fff',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            border: `2px solid ${turnTimer <= 5 ? '#ef4444' : '#3b82f6'}`,
                            minWidth: '100px'
                        }}>
                            {turnTimer}s
                        </div>
                    )}
                    {myHand && myHand.cards.length === 2 && !myHand.isStanding && !myHand.isBusted && (
                        <button
                            onClick={handleDoubleDown}
                            className="btn"
                            style={{ 
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                backgroundColor: '#a855f7',
                                border: '3px solid #9333ea',
                                boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
                                color: '#fff'
                            }}
                        >
                            DOUBLE
                        </button>
                    )}
                    <button
                        onClick={handleHit}
                        className="btn"
                        disabled={!myHand || myHand.isStanding || myHand.isBusted}
                        style={{ 
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            backgroundColor: (!myHand || myHand.isStanding || myHand.isBusted) ? '#666' : '#22c55e',
                            border: `3px solid ${(!myHand || myHand.isStanding || myHand.isBusted) ? '#555' : '#16a34a'}`,
                            boxShadow: (!myHand || myHand.isStanding || myHand.isBusted) ? 'none' : '0 4px 15px rgba(34, 197, 94, 0.4)',
                            color: '#fff'
                        }}
                    >
                        HIT
                    </button>
                    <button
                        onClick={handleStand}
                        className="btn"
                        disabled={!myHand || myHand.isStanding}
                        style={{ 
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            backgroundColor: (!myHand || myHand.isStanding) ? '#666' : '#ef4444',
                            border: `3px solid ${(!myHand || myHand.isStanding) ? '#555' : '#dc2626'}`,
                            boxShadow: (!myHand || myHand.isStanding) ? 'none' : '0 4px 15px rgba(239, 68, 68, 0.4)',
                            color: '#fff'
                        }}
                    >
                        STAND
                    </button>
                </div>
            )}

            {/* New Round Button - shown when game is finished */}
            {gamePhase === "finished" && mySeat && (
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '40px',
                    zIndex: 100
                }}>
                    <button
                        onClick={() => {
                            if (server?.blackjackAction) {
                                // Reset to betting phase - server will handle resetting game state
                                server.blackjackAction('DEAL', undefined, mySeat.id);
                            }
                        }}
                        className="btn"
                        style={{ 
                            padding: '15px 30px',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            backgroundColor: '#22c55e',
                            border: '3px solid #16a34a',
                            boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                            color: '#fff',
                            borderRadius: '8px'
                        }}
                    >
                        NEW ROUND
                    </button>
                </div>
            )}

        </div>
    );
}
