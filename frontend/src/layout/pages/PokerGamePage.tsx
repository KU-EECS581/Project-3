/**
 * @file PokerGamePage.tsx
 * @description Page for the poker game with complete gameplay loop.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useCallback, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";
import { useDeck } from "@/hooks";
import { useUserData } from "@/hooks";
import { useConnectionCheck } from "@/hooks";
import { PokerHand } from "@/components";
import { Card } from "@/components";
import { Chip } from "@/components";
import { evaluatePokerHand, compareHands, type EvaluatedHand } from "@/utils/poker";
import type { Card as CardModel } from "@/models";

interface Player {
    id: string;
    name: string;
    hand: CardModel[];
    isVisible: boolean;
    bet: number;
    evaluatedHand?: EvaluatedHand;
    isBot: boolean;
    seatIndex: number; // Which seat (0-8) the player is in
    isReady: boolean; // Whether player is ready to play
    isFolded?: boolean;
    totalChips?: number; // Total chips for this player (balance)
    hasActed?: boolean; // Whether player has acted this betting round
}

type GamePhase = 'lobby' | 'betting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';

const BET_AMOUNT = 50;
const ANTE = 25;
const NUM_SEATS = 9;

export function PokerGamePage() {
    const navigate = useNavigate();
    const { dealCard, dealCards, resetDeck, isDeckEmpty } = useDeck();
    const userData = useUserData();
    const [seats, setSeats] = useState<(Player | null)[]>(Array(NUM_SEATS).fill(null));
    const [playerSeatIndex, setPlayerSeatIndex] = useState<number | null>(null); // Which seat the user is in
    const [communityCards, setCommunityCards] = useState<CardModel[]>([]);
    const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
    const [pot, setPot] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    const [winner, setWinner] = useState<Player | null>(null);
    const [playerBetInput, setPlayerBetInput] = useState(BET_AMOUNT);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0); // Which player's turn it is (index in activePlayers array)
    const [dealerPosition, setDealerPosition] = useState(0); // Which seat is the dealer (rotates)
    const [smallBlindSeat, setSmallBlindSeat] = useState<number | null>(null); // Seat index for small blind
    const [bigBlindSeat, setBigBlindSeat] = useState<number | null>(null); // Seat index for big blind
    const [currentBet, setCurrentBet] = useState(0); // Highest bet in current round
    const [lastRaiseAmount, setLastRaiseAmount] = useState(0); // Size of the last raise (for minimum raise calculation)
    const [playerActions, setPlayerActions] = useState<Map<number, 'check' | 'call' | 'fold' | 'bet' | null>>(new Map()); // Track who has acted this round
    const [betAmount, setBetAmount] = useState(50); // Amount player wants to bet/raise
    const [roundBettingComplete, setRoundBettingComplete] = useState(false);
    const [actionNotifications, setActionNotifications] = useState<Array<{id: string; playerName: string; action: string; seatIndex: number}>>([]);
    const [dealingCards, setDealingCards] = useState(false); // Whether community cards are being dealt/shown
    const [winnerNotification, setWinnerNotification] = useState<{playerName: string; amount: number; handName?: string} | null>(null); // Winner popup
    const handleNewHandRef = useRef<(() => void) | null>(null); // Ref to store handleNewHand to avoid circular dependencies
    const SMALL_BLIND = 10;
    const BIG_BLIND = 20;
    const botNames = useState<string[]>([
        'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'
    ])[0];
    const [usedBotNames, setUsedBotNames] = useState<Set<string>>(new Set());

    // Check connection status and redirect if disconnected
    useConnectionCheck();

    // Get active players (non-null seats)
    const activePlayers = seats.filter(p => p !== null) as Player[];

    const handleBackToMap = useCallback(() => {
        navigate(RoutePath.JOIN_GAME);
    }, [navigate]);

    // Select a seat for the player
    const handleSelectSeat = useCallback((seatIndex: number) => {
        if (playerSeatIndex !== null) {
            // Already seated, cannot change seats during game
            if (gameStarted) {
                alert('Cannot change seats during a game!');
                return;
            }
            // Leave current seat
            setSeats((prev) => {
                const updated = [...prev];
                updated[playerSeatIndex] = null;
                return updated;
            });
        }

        if (seats[seatIndex] !== null) {
            alert('This seat is already taken!');
            return;
        }

        // Take the seat
        const playerName = userData.user?.name || 'You';
        setSeats((prev) => {
            const updated = [...prev];
            updated[seatIndex] = {
                id: 'player',
                name: playerName,
                hand: [],
                isVisible: true,
                bet: 0,
                isBot: false,
                seatIndex,
                isReady: false
            };
            return updated;
        });
        setPlayerSeatIndex(seatIndex);
    }, [playerSeatIndex, seats, gameStarted, userData.user]);

    // Leave seat
    const handleLeaveSeat = useCallback(() => {
        if (playerSeatIndex === null) return;
        if (gameStarted) {
            alert('Cannot leave seat during a game!');
            return;
        }
        setSeats((prev) => {
            const updated = [...prev];
            updated[playerSeatIndex] = null;
            return updated;
        });
        setPlayerSeatIndex(null);
    }, [playerSeatIndex, gameStarted]);

    // Add a bot to an empty seat
    const handleAddBot = useCallback(() => {
        const emptySeatIndex = seats.findIndex(s => s === null);
        if (emptySeatIndex === -1) {
            alert('No empty seats available!');
            return;
        }

        // Find an unused bot name
        let botName = botNames.find(name => !usedBotNames.has(name));
        if (!botName) {
            // All names used, generate one
            botName = `Bot ${usedBotNames.size + 1}`;
        }
        setUsedBotNames(prev => new Set([...prev, botName!]));

        setSeats((prev) => {
            const updated = [...prev];
            updated[emptySeatIndex] = {
                id: `bot-${Date.now()}`,
                name: botName!,
                hand: [],
                isVisible: false,
                bet: 0,
                isBot: true,
                seatIndex: emptySeatIndex,
                isReady: false
            };
            return updated;
        });
    }, [seats, botNames, usedBotNames]);

    // Remove a bot from a seat
    const handleRemoveBot = useCallback((seatIndex: number) => {
        const player = seats[seatIndex];
        if (!player || !player.isBot) {
            alert('Can only remove bots!');
            return;
        }
        if (gameStarted) {
            alert('Cannot remove players during a game!');
            return;
        }

        setUsedBotNames(prev => {
            const updated = new Set(prev);
            updated.delete(player.name);
            return updated;
        });

        setSeats((prev) => {
            const updated = [...prev];
            updated[seatIndex] = null;
            return updated;
        });
    }, [seats, gameStarted]);

    // Simple bot decision logic - made easy/loose for players
    const botMakeDecision = useCallback((bot: Player, currentBet: number, amountToCall: number): 'check' | 'call' | 'fold' | 'bet' => {
        // Very simple strategy - bots are easy to play against
        // Evaluate hand strength (simplified - just check if we have any pair or high cards)
        const hasPair = bot.hand.length === 2 && bot.hand[0]?.rank === bot.hand[1]?.rank;
        const hasHighCard = bot.hand.some(card => {
            const rank = card?.rank;
            return rank === 'ace' || rank === 'king' || rank === 'queen' || rank === 'jack';
        });

        // If no bet to call, always check
        if (amountToCall === 0) {
            return 'check';
        }

        // Simple logic: fold if bet is too high and we have nothing
        // Bots are loose - they'll call more often than they should
        if (!hasPair && !hasHighCard && amountToCall > 30) {
            // Only fold if bet is really high and we have nothing
            return 'fold';
        }

        // If we have a pair or high card, usually call (easy bots)
        if (hasPair || hasHighCard) {
            // 20% chance to bet if we have something good
            return Math.random() > 0.8 ? 'bet' : 'call';
        }

        // Default: call most of the time (loose play)
        return Math.random() > 0.3 ? 'call' : 'fold';
    }, []);

    // Handle showdown - evaluate hands and determine winner
    const handleShowdown = useCallback(() => {
        // Ensure we have exactly 5 community cards and we're on river phase
        if (communityCards.length !== 5 || gamePhase !== 'river') return;

        // Evaluate all hands (only non-folded players)
        const activePlayersForShowdown = seats.filter(p => p !== null && !p.isFolded) as Player[];
        if (activePlayersForShowdown.length === 0) return;
        
        // If only one player, they already won (handled by checkForSingleWinner)
        if (activePlayersForShowdown.length === 1) {
            return;
        }
        
        const evaluatedPlayers = activePlayersForShowdown.map(player => {
            const evaluated = evaluatePokerHand(player.hand, communityCards);
            return { ...player, evaluatedHand: evaluated };
        });

        // Find winner(s) - handle ties
        let bestPlayers = [evaluatedPlayers[0]];
        for (let i = 1; i < evaluatedPlayers.length; i++) {
            if (!bestPlayers[0].evaluatedHand || !evaluatedPlayers[i].evaluatedHand) continue;
            const comparison = compareHands(bestPlayers[0].evaluatedHand, evaluatedPlayers[i].evaluatedHand);
            if (comparison > 0) {
                // New best player
                bestPlayers = [evaluatedPlayers[i]];
            } else if (comparison === 0) {
                // Tie - add to winners
                bestPlayers.push(evaluatedPlayers[i]);
            }
        }

        // Handle ties - split pot
        const winner = bestPlayers[0];
        const winAmount = Math.floor(pot / bestPlayers.length);
        const remainder = pot % bestPlayers.length; // Extra chips go to first winner

        // Update seats with evaluated hands (show all hands at showdown)
        setSeats((prev) => prev.map((player) => {
            if (!player) return null;
            const evaluated = evaluatedPlayers.find(p => p.seatIndex === player.seatIndex)?.evaluatedHand;
            return {
                ...player,
                evaluatedHand: evaluated,
                isVisible: true // Show all hands at showdown
            };
        }));

        setWinner(winner);
        setGamePhase('showdown');
        setDealingCards(true); // Prevent further actions

        // Pay winners
        bestPlayers.forEach((winningPlayer, index) => {
            const amountToPay = winAmount + (index === 0 ? remainder : 0); // First winner gets remainder
            
            if (!winningPlayer.isBot && playerSeatIndex === winningPlayer.seatIndex) {
                userData.addFunds(amountToPay);
            } else if (winningPlayer.isBot) {
                // Update bot's chip count
                setSeats((prev) => prev.map((p) => {
                    if (p && p.seatIndex === winningPlayer.seatIndex) {
                        return { ...p, totalChips: (p.totalChips || 0) + amountToPay };
                    }
                    return p;
                }));
            }
        });

        // Show winner notification
        setWinnerNotification({
            playerName: bestPlayers.length > 1 ? `${bestPlayers.length} players` : winner.name,
            amount: bestPlayers.length > 1 ? pot : winAmount,
            handName: winner.evaluatedHand?.name
        });

        // After showing winner, prepare for next hand
        setTimeout(() => {
            setWinnerNotification(null);
            if (handleNewHandRef.current) {
                handleNewHandRef.current();
            }
        }, 5000); // Show winner for 5 seconds
    }, [gamePhase, communityCards, seats, pot, userData, playerSeatIndex]);

    // Advance to next game phase (deal community cards with smooth transitions)
    const advanceToNextPhase = useCallback(() => {
        setDealingCards(true); // Prevent actions while dealing
        
        // Reset betting round first
        setCurrentBet(0);
        setLastRaiseAmount(0); // Reset raise amount for new betting round
        setPlayerActions(new Map());
        setRoundBettingComplete(false);
        setSeats((prev) => {
            const updated = prev.map((p) => {
                if (!p || p.isFolded) return p;
                return { ...p, hasActed: false, bet: 0 };
            });
            return updated;
        });

        // Reset bet amount to minimum for next round
        setBetAmount(BIG_BLIND);
        
        if (gamePhase === 'preflop') {
            // Deal flop with delay - pause after betting round
            // Ensure we start with empty community cards (never exceed 5)
            if (communityCards.length > 0) {
                setCommunityCards([]);
            }
            setTimeout(() => {
                const flop = dealCards(3).filter(Boolean) as CardModel[];
                if (flop.length !== 3) return; // Safety check
                // Deal cards one by one for smooth effect
                setCommunityCards([flop[0]]);
                setTimeout(() => {
                    setCommunityCards([flop[0], flop[1]]);
                    setTimeout(() => {
                        setCommunityCards(flop); // Should be exactly 3 cards
                        setGamePhase('flop');
                        // Wait for cards to be shown before allowing actions
                        setTimeout(() => {
                            setDealingCards(false);
                            const currentActivePlayers = seats.filter(p => p !== null && !p.isFolded) as Player[];
                            if (currentActivePlayers.length > 0) {
                                setCurrentPlayerIndex(0);
                            }
                        }, 500);
                    }, 400);
                }, 400);
            }, 1500); // Pause after betting round completes
        } else if (gamePhase === 'flop') {
            // Deal turn with delay - ensure we have exactly 3 cards from flop
            if (communityCards.length !== 3) {
                console.error('Expected 3 community cards at flop, got:', communityCards.length);
                return;
            }
            setTimeout(() => {
                const turn = dealCard();
                if (turn) {
                    // Update community cards to include turn - should now be exactly 4
                    setCommunityCards((prev) => {
                        if (prev.length !== 3) {
                            console.error('Flop phase should have 3 cards, got:', prev.length);
                            return prev;
                        }
                        const updated = [...prev, turn];
                        return updated; // Should be exactly 4 cards
                    });
                    // Set phase after cards are updated
                    setTimeout(() => {
                        setGamePhase('turn');
                        setTimeout(() => {
                            setDealingCards(false);
                            setSeats((currentSeats) => {
                                const currentActivePlayers = currentSeats.filter(p => p !== null && !p.isFolded) as Player[];
                                if (currentActivePlayers.length > 0) {
                                    setCurrentPlayerIndex(0);
                                }
                                return currentSeats; // No change
                            });
                        }, 500);
                    }, 100); // Small delay to ensure card state is set
                }
            }, 1500);
        } else if (gamePhase === 'turn') {
            // Deal river with delay - ensure we have exactly 4 cards from turn
            if (communityCards.length !== 4) {
                console.error('Expected 4 community cards at turn, got:', communityCards.length);
                return;
            }
            setTimeout(() => {
                const river = dealCard();
                if (river) {
                    // Update community cards to include river - should now be exactly 5 (maximum)
                    setCommunityCards((prev) => {
                        if (prev.length !== 4) {
                            console.error('Turn phase should have 4 cards, got:', prev.length);
                            return prev;
                        }
                        const updated = [...prev, river];
                        if (updated.length > 5) {
                            console.error('Too many community cards! Max is 5, got:', updated.length);
                            return prev; // Don't add if already at max
                        }
                        return updated; // Should be exactly 5 cards (maximum)
                    });
                    // Set phase after cards are updated
                    setTimeout(() => {
                        setGamePhase('river');
                        setTimeout(() => {
                            setDealingCards(false);
                            setSeats((currentSeats) => {
                                const currentActivePlayers = currentSeats.filter(p => p !== null && !p.isFolded) as Player[];
                                if (currentActivePlayers.length > 0) {
                                    setCurrentPlayerIndex(0);
                                }
                                return currentSeats; // No change
                            });
                        }, 500);
                    }, 100); // Small delay to ensure card state is set
                }
            }, 1500);
        } else if (gamePhase === 'river') {
            // After river, we don't call showdown here - it's handled when betting completes in advanceToNextPlayer
            // This function should not be called when on river phase (betting should complete and trigger showdown)
            return;
        }
    }, [gamePhase, dealCards, dealCard, handleShowdown, seats, BIG_BLIND]);

    // Check if only one player remains (all others folded) - they win automatically
    const checkForSingleWinner = useCallback(() => {
        const activePlayers = seats.filter(p => p !== null && !p.isFolded) as Player[];
        
        if (activePlayers.length === 1 && gamePhase !== 'lobby' && gamePhase !== 'showdown' && gameStarted) {
            // Only one player left - they win!
            const winner = activePlayers[0];
            setWinner(winner);
            
            // Show winner notification
            setWinnerNotification({
                playerName: winner.name,
                amount: pot,
                handName: undefined // No hand shown since everyone else folded
            });
            
            // Pay winner
            if (!winner.isBot && playerSeatIndex === winner.seatIndex) {
                userData.addFunds(pot);
            } else if (winner.isBot) {
                // Bot wins - update their chip count
                setSeats((prev) => prev.map((p) => {
                    if (p && p.seatIndex === winner.seatIndex) {
                        return { ...p, totalChips: (p.totalChips || 0) + pot };
                    }
                    return p;
                }));
            }
            
            // Move to showdown phase to display results
            setGamePhase('showdown');
            setDealingCards(true); // Prevent further actions
            
            // After showing winner, prepare for next hand
            setTimeout(() => {
                setWinnerNotification(null);
                if (handleNewHandRef.current) {
                    handleNewHandRef.current();
                }
            }, 4000); // Show winner for 4 seconds
        }
    }, [seats, gamePhase, gameStarted, pot, playerSeatIndex, userData]);

    // Add action notification
    const addActionNotification = useCallback((playerName: string, action: string, seatIndex: number) => {
        const notificationId = `action-${Date.now()}-${Math.random()}`;
        setActionNotifications((prev) => [...prev, { id: notificationId, playerName, action, seatIndex }]);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            setActionNotifications((prev) => prev.filter(n => n.id !== notificationId));
        }, 3000);
    }, []);

    // Advance to next active player
    const advanceToNextPlayer = useCallback(() => {
        // First check if only one player remains
        checkForSingleWinner();
        
        // Get updated active players
        const currentActivePlayers = seats.filter(p => p !== null && !p.isFolded) as Player[];
        
        if (currentActivePlayers.length === 0) return; // Safety check
        
        // If only one player, don't advance (winner check above handles it)
        if (currentActivePlayers.length === 1) {
            return;
        }
        
        setCurrentPlayerIndex((prev) => {
            const nextIndex = (prev + 1) % currentActivePlayers.length;
            const nextPlayer = currentActivePlayers[nextIndex];
            
            // Check if all players have acted AND all active players have matched the current bet
            const allActed = currentActivePlayers.every(p => {
                if (p.isFolded) return true;
                // Player must have acted AND their bet must match the current bet (or currentBet is 0)
                return p.hasActed && (p.bet === currentBet || currentBet === 0);
            });
            
            if (allActed && !roundBettingComplete) {
                // All players have acted and betting is complete, advance to next phase
                setRoundBettingComplete(true);
                
                // If we're on the river, go directly to showdown after betting completes
                if (gamePhase === 'river') {
                    setTimeout(() => {
                        handleShowdown();
                    }, 1500);
                    return prev; // Keep current index while transitioning
                } else {
                    // For other phases (preflop -> flop, flop -> turn, turn -> river), advance to next phase
                    setTimeout(() => {
                        advanceToNextPhase();
                    }, 1000);
                    return prev; // Keep current index while transitioning
                }
            }
            
            return nextIndex;
        });
    }, [seats, roundBettingComplete, advanceToNextPhase, checkForSingleWinner, currentBet, addActionNotification, gamePhase, handleShowdown]);

    // Helper function to get chip stack for a bet amount
    const getChipStack = useCallback((amount: number) => {
        const denominations = [100, 50, 25, 10, 5];
        const chips: Array<{ value: number; count: number }> = [];
        let remaining = amount;
        
        for (const denom of denominations) {
            const count = Math.floor(remaining / denom);
            if (count > 0) {
                chips.push({ value: denom, count: Math.min(count, 5) }); // Max 5 of each type visible
                remaining -= denom * count;
            }
            if (remaining === 0) break;
        }
        
        return chips;
    }, []);

    // Handle bot action (same logic as player but for bots)
    const handleBotAction = useCallback((botSeatIndex: number, action: 'check' | 'call' | 'fold' | 'bet', betAmountValue?: number) => {
        if (gamePhase === 'lobby' || !gameStarted) return;

        const bot = seats[botSeatIndex];
        if (!bot || !bot.isBot || bot.isFolded) return;

        const amountToCall = currentBet - bot.bet;
        
        // Ensure bot raise amount meets minimum raise requirement
        if (action === 'bet' && betAmountValue !== undefined) {
            const minRaiseAmount = lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND;
            if (betAmountValue < minRaiseAmount) {
                // Adjust bot's raise to meet minimum
                betAmountValue = minRaiseAmount;
            }
        }

        if (action === 'fold') {
            addActionNotification(bot.name, 'folds', botSeatIndex);
            setSeats((prev) => {
                const updated = [...prev];
                if (updated[botSeatIndex]) {
                    updated[botSeatIndex] = {
                        ...updated[botSeatIndex]!,
                        isFolded: true,
                        hasActed: true
                    };
                }
                return updated;
            });
            
            // Check if only one player remains after fold
            setTimeout(() => {
                checkForSingleWinner();
            }, 500);
        } else if (action === 'check') {
            if (amountToCall !== 0) return; // Can't check if there's a bet
            addActionNotification(bot.name, 'checks', botSeatIndex);
            setSeats((prev) => {
                const updated = [...prev];
                if (updated[botSeatIndex]) {
                    updated[botSeatIndex] = {
                        ...updated[botSeatIndex]!,
                        hasActed: true
                    };
                }
                return updated;
            });
        } else if (action === 'call') {
            // Bot calls - match the current bet
            const callAmount = amountToCall;
            if (callAmount > 0) {
                addActionNotification(bot.name, `calls $${callAmount}`, botSeatIndex);
                setPot((prev) => prev + callAmount);
                setSeats((prev) => {
                    const updated = [...prev];
                    if (updated[botSeatIndex]) {
                        updated[botSeatIndex] = {
                            ...updated[botSeatIndex]!,
                            bet: currentBet,
                            hasActed: true
                        };
                    }
                    return updated;
                });
            } else {
                // No bet to call, just check
                addActionNotification(bot.name, 'checks', botSeatIndex);
                setSeats((prev) => {
                    const updated = [...prev];
                    if (updated[botSeatIndex]) {
                        updated[botSeatIndex] = {
                            ...updated[botSeatIndex]!,
                            hasActed: true
                        };
                    }
                    return updated;
                });
            }
        } else if (action === 'bet' && betAmountValue !== undefined) {
            // Bot bets/raises
            const totalBetNeeded = amountToCall + betAmountValue;
            const newBet = currentBet + betAmountValue;
            
            addActionNotification(bot.name, `raises $${betAmountValue}`, botSeatIndex);
            setCurrentBet(newBet);
            setLastRaiseAmount(betAmountValue); // Track this raise amount
            setPot((prev) => prev + totalBetNeeded);
            
            // Reset hasActed for all players when a raise occurs (they need to act again)
            setSeats((prev) => {
                const updated = prev.map((p) => {
                    if (!p || p.isFolded || p.seatIndex === botSeatIndex) return p;
                    return { ...p, hasActed: false }; // Everyone else needs to act again
                });
                if (updated[botSeatIndex]) {
                    updated[botSeatIndex] = {
                        ...updated[botSeatIndex]!,
                        bet: newBet,
                        hasActed: true
                    };
                }
                return updated;
            });
        }

        // Move to next player after a short delay
        setTimeout(() => {
            advanceToNextPlayer();
        }, 1000);
    }, [gamePhase, gameStarted, seats, currentBet, advanceToNextPlayer, addActionNotification, lastRaiseAmount, BIG_BLIND, checkForSingleWinner]);

    // Handle player action (Check, Bet, Fold)
    const handlePlayerAction = useCallback((action: 'check' | 'bet' | 'fold', betAmountValue?: number) => {
        if (playerSeatIndex === null || gamePhase === 'lobby' || !gameStarted || dealingCards) return;

        const currentPlayer = seats[playerSeatIndex];
        if (!currentPlayer || currentPlayer.isBot) return;

        const amountToCall = currentBet - currentPlayer.bet;
        const canCheck = amountToCall === 0;
        const playerName = currentPlayer.name;

        if (action === 'fold') {
            addActionNotification(playerName, 'folds', playerSeatIndex);
            setSeats((prev) => {
                const updated = [...prev];
                if (updated[playerSeatIndex]) {
                    updated[playerSeatIndex] = {
                        ...updated[playerSeatIndex]!,
                        isFolded: true,
                        hasActed: true
                    };
                }
                return updated;
            });
            
            // Check if only one player remains after fold
            setTimeout(() => {
                checkForSingleWinner();
            }, 500);
        } else if (action === 'check') {
            if (!canCheck) return; // Can't check if there's a bet
            addActionNotification(playerName, 'checks', playerSeatIndex);
            setSeats((prev) => {
                const updated = [...prev];
                if (updated[playerSeatIndex]) {
                    updated[playerSeatIndex] = {
                        ...updated[playerSeatIndex]!,
                        hasActed: true
                    };
                }
                return updated;
            });
        } else if (action === 'bet' && betAmountValue !== undefined) {
            // Determine if this is a call or a raise
            const isCall = (betAmountValue === amountToCall);
            
            if (isCall) {
                // CALL: Just match the current bet (e.g., small blind calls $10 to match $20 big blind)
                const totalBetNeeded = amountToCall; // This is what they need to add to their current bet
                
                if (!userData.user || userData.user.balance < totalBetNeeded) {
                    alert('Insufficient funds!');
                    return;
                }

                // Notification is handled by button click handler, but add here as fallback
                if (!actionNotifications.find(n => n.seatIndex === playerSeatIndex && n.action.includes('calls'))) {
                    addActionNotification(playerName, `calls $${amountToCall}`, playerSeatIndex);
                }

                userData.removeFunds(totalBetNeeded);
                setPot((prev) => prev + totalBetNeeded);
                
                setSeats((prev) => {
                    const updated = [...prev];
                    if (updated[playerSeatIndex]) {
                        updated[playerSeatIndex] = {
                            ...updated[playerSeatIndex]!,
                            bet: currentBet, // Their bet now matches the current bet
                            hasActed: true
                        };
                    }
                    return updated;
                });
            } else {
                // RAISE: Minimum raise = size of previous bet/raise (or BIG_BLIND if no previous raise)
                // If currentBet is $20 and last raise was $20, minimum raise is $20 more (total $40)
                const minRaiseAmount = lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND;
                
                if (betAmountValue < minRaiseAmount) {
                    alert(`Minimum raise is $${minRaiseAmount} (must raise by at least the size of the previous bet/raise)`);
                    return;
                }

                const totalBetNeeded = amountToCall + betAmountValue; // Amount to call + raise amount
                
                if (!userData.user || userData.user.balance < totalBetNeeded) {
                    alert('Insufficient funds!');
                    return;
                }

                const newBet = currentBet + betAmountValue; // New highest bet
                
                // Show notification
                addActionNotification(playerName, `raises $${betAmountValue}`, playerSeatIndex);

                userData.removeFunds(totalBetNeeded);
                setCurrentBet(newBet);
                setLastRaiseAmount(betAmountValue); // Track this raise amount for minimum raise calculation
                setPot((prev) => prev + totalBetNeeded);
                
                // Reset hasActed for all players when a raise occurs (they need to act again)
                setSeats((prev) => {
                    const updated = prev.map((p) => {
                        if (!p || p.isFolded || p.seatIndex === playerSeatIndex) return p;
                        return { ...p, hasActed: false }; // Everyone else needs to act again
                    });
                    if (updated[playerSeatIndex]) {
                        updated[playerSeatIndex] = {
                            ...updated[playerSeatIndex]!,
                            bet: newBet,
                            hasActed: true
                        };
                    }
                    return updated;
                });
            }
        }

        // Move to next player (unless winner was determined)
        setTimeout(() => {
            advanceToNextPlayer();
        }, 300);
    }, [playerSeatIndex, gamePhase, gameStarted, seats, currentBet, userData, advanceToNextPlayer, addActionNotification, actionNotifications, dealingCards, checkForSingleWinner]);

    // Start game when ready
    const handleStartGame = useCallback(() => {
        if (activePlayers.length < 2) {
            alert('Need at least 2 players to start!');
            return;
        }

        if (playerSeatIndex === null) {
            alert('Please select a seat first!');
            return;
        }

        // Reset deck and deal
        resetDeck();
        setGameStarted(true);
        setGamePhase('preflop');

        // Set up dealer and blinds
        // Dealer is at first active seat, small blind is next, big blind is after that
        const firstActiveSeat = seats.findIndex(p => p !== null);
        const activeSeatIndices = seats.map((p, idx) => p !== null ? idx : -1).filter(idx => idx !== -1);
        
        const sbIndex = activeSeatIndices.length > 1 ? activeSeatIndices[1] : activeSeatIndices[0];
        const bbIndex = activeSeatIndices.length > 2 ? activeSeatIndices[2] : activeSeatIndices[0];
        
        setDealerPosition(firstActiveSeat);
        setSmallBlindSeat(sbIndex);
        setBigBlindSeat(bbIndex);

        // Deal hands and set up blinds
        let totalPot = 0;
        const updatedSeats = seats.map((player, idx) => {
            if (!player) return null;
            
            const playerBet = idx === sbIndex ? SMALL_BLIND : (idx === bbIndex ? BIG_BLIND : 0);
            if (!player.isBot && playerBet > 0) {
                userData.removeFunds(playerBet);
            }
            totalPot += playerBet;
            
            return {
                ...player,
                hand: dealCards(2).filter(Boolean) as CardModel[],
                bet: playerBet,
                isReady: true,
                totalChips: player.isBot ? 1000 : (userData.user?.balance || 0),
                hasActed: false, // All players start with hasActed: false (including BB - they still need to act if raised)
                isFolded: false
            };
        });

        setSeats(updatedSeats);
        setPot(totalPot);
        setCurrentBet(BIG_BLIND); // Big blind sets the initial bet
        setLastRaiseAmount(0); // No raise yet, just blinds
        setPlayerActions(new Map()); // Reset actions

        // Start betting round - first player after big blind
        const bbPlayerIndex = activePlayers.findIndex(p => p.seatIndex === bbIndex);
        const nextPlayerIndex = (bbPlayerIndex + 1) % activePlayers.length;
        setCurrentPlayerIndex(nextPlayerIndex);
    }, [activePlayers, playerSeatIndex, userData, resetDeck, dealCards, seats, SMALL_BLIND, BIG_BLIND]);

    // Old handlePlaceBet - keeping for game phase betting if needed
    const handlePlaceBet = useCallback(() => {
        // This can be used for in-game betting
        if (!userData.user || userData.user.balance < playerBetInput) {
            alert('Insufficient funds!');
            return;
        }

        userData.removeFunds(playerBetInput);
        setPot((prev) => prev + playerBetInput);
        
        setSeats((prev) => {
            return prev.map((player) => {
                if (player && player.seatIndex === playerSeatIndex) {
                    return { ...player, bet: player.bet + playerBetInput };
                }
                return player;
            });
        });
    }, [userData, playerBetInput, playerSeatIndex]);

    const handleDealFlop = useCallback(() => {
        if (gamePhase !== 'preflop') return;
        const flop = dealCards(3).filter(Boolean) as CardModel[];
        setCommunityCards(flop);
        setGamePhase('flop');
    }, [gamePhase, dealCards]);

    const handleDealTurn = useCallback(() => {
        if (gamePhase !== 'flop') return;
        const turn = dealCard();
        if (turn) {
            setCommunityCards((prev) => [...prev, turn]);
            setGamePhase('turn');
        }
    }, [gamePhase, dealCard]);

    const handleDealRiver = useCallback(() => {
        if (gamePhase !== 'turn') return;
        const river = dealCard();
        if (river) {
            setCommunityCards((prev) => [...prev, river]);
            setGamePhase('river');
        }
    }, [gamePhase, dealCard]);

    // Start a new hand (after previous hand ends)
    const handleNewHand = useCallback(() => {
        resetDeck();
        
        // Calculate new positions first
        setSeats((currentSeats) => {
            const activeSeatIndices = currentSeats.map((p, idx) => p !== null ? idx : -1).filter(idx => idx !== -1);
            
            let newDealerPos = dealerPosition;
            let newSBPos = smallBlindSeat;
            let newBBPos = bigBlindSeat;
            
            if (activeSeatIndices.length > 0) {
                const currentDealerIdx = activeSeatIndices.findIndex(idx => idx === dealerPosition);
                if (currentDealerIdx !== -1 && activeSeatIndices.length >= 2) {
                    const nextDealerIdx = (currentDealerIdx + 1) % activeSeatIndices.length;
                    newDealerPos = activeSeatIndices[nextDealerIdx];
                    newSBPos = activeSeatIndices[(nextDealerIdx + 1) % activeSeatIndices.length];
                    newBBPos = activeSeatIndices[(nextDealerIdx + 2) % activeSeatIndices.length];
                } else {
                    newDealerPos = activeSeatIndices[0];
                    newSBPos = activeSeatIndices.length > 1 ? activeSeatIndices[1] : activeSeatIndices[0];
                    newBBPos = activeSeatIndices.length > 2 ? activeSeatIndices[2] : activeSeatIndices[0];
                }
            }
            
            // Deal new hands and collect blinds
            let totalPot = 0;
            const updatedSeats = currentSeats.map((player, idx) => {
                if (!player) return null;
                
                const playerBet = idx === newSBPos ? SMALL_BLIND : (idx === newBBPos ? BIG_BLIND : 0);
                
                if (!player.isBot && playerBet > 0) {
                    const currentBalance = userData.user?.balance || 0;
                    if (currentBalance < playerBet) {
                        totalPot += 0;
                        return {
                            ...player,
                            hand: dealCards(2).filter(Boolean) as CardModel[],
                            bet: 0,
                            totalChips: currentBalance,
                            hasActed: false,
                            isFolded: false,
                            isVisible: !player.isBot
                        };
                    }
                    userData.removeFunds(playerBet);
                }
                
                totalPot += playerBet;
                const newHand = dealCards(2).filter(Boolean) as CardModel[];
                
                return {
                    ...player,
                    hand: newHand,
                    bet: playerBet,
                    totalChips: player.isBot ? Math.max(0, (player.totalChips || 1000) - playerBet) : (userData.user?.balance || 0),
                    hasActed: idx === newBBPos,
                    isFolded: false,
                    isVisible: !player.isBot,
                    evaluatedHand: undefined
                };
            }).filter(Boolean) as (Player | null)[];

            // Update other state outside setSeats
            const activePlayers = updatedSeats.filter(p => p !== null && !p.isFolded) as Player[];
            let nextPlayerIdx = 0;
            if (activePlayers.length > 0) {
                const bbPlayerIndex = activePlayers.findIndex(p => p.seatIndex === newBBPos);
                if (bbPlayerIndex !== -1) {
                    nextPlayerIdx = (bbPlayerIndex + 1) % activePlayers.length;
                }
            }
            
            // Update all state in a batch
            setTimeout(() => {
                setDealerPosition(newDealerPos);
                setSmallBlindSeat(newSBPos);
                setBigBlindSeat(newBBPos);
                setCommunityCards([]);
                setPot(totalPot);
                setWinner(null);
                setCurrentBet(BIG_BLIND);
                setLastRaiseAmount(0); // Reset raise amount for new hand
                setRoundBettingComplete(false);
                setBetAmount(BIG_BLIND);
                setGamePhase('preflop');
                setCurrentPlayerIndex(nextPlayerIdx);
                setDealingCards(false);
            }, 0);
            
            return updatedSeats;
        });
    }, [resetDeck, dealerPosition, smallBlindSeat, bigBlindSeat, SMALL_BLIND, BIG_BLIND, userData, dealCards]);
    
    // Store handleNewHand in ref so it can be called from other callbacks without circular dependencies
    useEffect(() => {
        handleNewHandRef.current = handleNewHand;
    }, [handleNewHand]);

    const handleNewGame = useCallback(() => {
        resetDeck();
        setSeats((prev) => prev.map((player) => {
            if (!player) return null;
            return {
                ...player,
                hand: [],
                isVisible: !player.isBot,
                bet: 0,
                evaluatedHand: undefined,
                isFolded: false,
                isReady: false,
                hasActed: false
            };
        }));
        setCommunityCards([]);
        setGameStarted(false);
        setGamePhase('lobby');
        setPot(0);
        setWinner(null);
        setPlayerBetInput(BET_AMOUNT);
        setCurrentPlayerIndex(0);
        setCurrentBet(0);
        setRoundBettingComplete(false);
        setDealingCards(false);
        setBetAmount(BIG_BLIND); // Reset to minimum
        setWinnerNotification(null);
    }, [resetDeck, BIG_BLIND]);

    // Auto-play bots when it's their turn
    useEffect(() => {
        if (!gameStarted || gamePhase === 'lobby' || gamePhase === 'showdown' || dealingCards) return;

        const currentActivePlayers = seats.filter(p => p !== null && !p.isFolded) as Player[];
        if (currentActivePlayers.length === 0) return;

        const currentPlayer = currentActivePlayers[currentPlayerIndex];
        if (!currentPlayer) return;

        // If it's a bot's turn and they haven't acted yet
        if (currentPlayer.isBot && !currentPlayer.hasActed && !currentPlayer.isFolded) {
            const amountToCall = currentBet - currentPlayer.bet;
            const decision = botMakeDecision(currentPlayer, currentBet, amountToCall);
            
            // Determine bet amount if betting (minimum raise = lastRaiseAmount or BIG_BLIND)
            let betAmountForBot: number | undefined = undefined;
            if (decision === 'bet') {
                // Need to get lastRaiseAmount from seats state or track it
                // For now, use a reasonable minimum: lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND
                // Since we don't have lastRaiseAmount in this scope, we'll calculate minRaise correctly in handleBotAction
                // But we need at least BIG_BLIND for the first bet/raise
                const minRaise = BIG_BLIND; // Minimum first bet/raise is BIG_BLIND
                betAmountForBot = minRaise + Math.floor(Math.random() * 20);
            }
            
            // Execute bot action after a short delay (1-2 seconds for realism)
            const delay = 1000 + Math.random() * 1000;
            setTimeout(() => {
                handleBotAction(currentPlayer.seatIndex, decision, betAmountForBot);
            }, delay);
        }
    }, [gameStarted, gamePhase, currentPlayerIndex, seats, currentBet, botMakeDecision, handleBotAction, BIG_BLIND, dealingCards]);

    // Update bet amount slider minimum when lastRaiseAmount or currentBet changes
    useEffect(() => {
        if (gameStarted && !dealingCards) {
            const minBet = lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND;
            if (betAmount < minBet) {
                setBetAmount(minBet);
            }
        }
    }, [lastRaiseAmount, currentBet, gameStarted, dealingCards, BIG_BLIND, betAmount]);

    // Calculate positions for seats around the table (oval/elongated table)
    const getSeatPosition = (seatIndex: number): { x: number; y: number } => {
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        
        // Oval table - wider than tall
        const tableWidth = screenWidth * 0.6;
        const tableHeight = screenHeight * 0.4;
        const radiusX = tableWidth / 2;
        const radiusY = tableHeight / 2;
        
        // Distribute 9 seats around the oval
        // 4 on top, 1 on each side, 4 on bottom
        // Top: seats 0-3, Right: seat 4, Bottom: seats 5-8, Left: seat 5 would be shared with bottom
        // Better: distribute evenly around the oval
        const angle = (seatIndex / NUM_SEATS) * 2 * Math.PI - Math.PI / 2;
        
        return {
            x: centerX + radiusX * Math.cos(angle),
            y: centerY + radiusY * Math.sin(angle),
        };
    };

    // Calculate positions for player hands (slightly outside the seat position)
    const getHandPosition = (seatIndex: number): { x: number; y: number } => {
        const seatPos = getSeatPosition(seatIndex);
        const angle = (seatIndex / NUM_SEATS) * 2 * Math.PI - Math.PI / 2;
        
        // Position cards closer to center (towards the table)
        const offset = 60;
        
        return {
            x: seatPos.x - offset * Math.cos(angle) - 90,
            y: seatPos.y - offset * Math.sin(angle) - 63,
        };
    };

    // Community cards position (center of table)
    const communityCardsPosition = {
        x: (typeof window !== 'undefined' ? window.innerWidth : 1920) / 2 - (communityCards.length * 25) / 2,
        y: (typeof window !== 'undefined' ? window.innerHeight : 1080) / 2 - 70,
    };

    return (
        <div style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'var(--color-bg)',
            padding: '20px',
            color: 'var(--color-text)',
            overflow: 'hidden'
        }}>
            <div style={{ 
                position: 'absolute', 
                top: '20px', 
                left: '20px', 
                zIndex: 100 
            }}>
                <button 
                    onClick={handleBackToMap}
                    className="btn"
                    style={{ marginRight: '10px' }}
                >
                    Back to Map
                </button>
            </div>

            {/* Balance Display */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                fontSize: '1.2rem',
                color: 'var(--color-primary)',
                fontWeight: 'bold'
            }}>
                Balance: ${userData.user?.balance || 0}
            </div>

            {/* Poker Table Background */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: typeof window !== 'undefined' ? window.innerWidth * 0.6 : 1152,
                height: typeof window !== 'undefined' ? window.innerHeight * 0.4 : 432,
                backgroundColor: '#0d5a0d',
                borderRadius: '50%',
                border: '20px solid #1a1208',
                boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.5), 0 10px 40px rgba(0, 0, 0, 0.8)',
                zIndex: 1
            }}>
                {/* Table felt texture */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `
                        repeating-linear-gradient(
                            45deg,
                            transparent,
                            transparent 4px,
                            rgba(0, 0, 0, 0.1) 4px,
                            rgba(0, 0, 0, 0.1) 8px
                        )
                    `,
                    borderRadius: '50%'
                }} />
            </div>

            <div style={{ 
                textAlign: 'center', 
                marginTop: '60px',
                position: 'relative',
                zIndex: 10
            }}>
                <h1 style={{ 
                    color: 'var(--color-primary)', 
                    fontSize: '2.5rem',
                    marginBottom: '20px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}>
                    Poker Table
                </h1>

                {gamePhase === 'lobby' && (
                    <>
                        {/* Lobby View - Seats around table */}
                        <div style={{
                            fontSize: '1.2rem',
                            color: 'var(--color-text-muted)',
                            marginBottom: '30px'
                        }}>
                            Players: {activePlayers.length} / {NUM_SEATS} | Need {2 - activePlayers.length} more to start
                        </div>

                        {/* Seat visualization */}
                        {Array(NUM_SEATS).fill(0).map((_, seatIndex) => {
                            const player = seats[seatIndex];
                            const seatPos = getSeatPosition(seatIndex);
                            const isYourSeat = playerSeatIndex === seatIndex;
                            
                            return (
                                <div
                                    key={seatIndex}
                                    style={{
                                        position: 'absolute',
                                        left: `${seatPos.x - 80}px`,
                                        top: `${seatPos.y - 60}px`,
                                        width: '160px',
                                        height: '120px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 20
                                    }}
                                >
                                    <div
                                        onClick={() => !player && !gameStarted && handleSelectSeat(seatIndex)}
                                        style={{
                                            width: '140px',
                                            height: '100px',
                                            backgroundColor: player 
                                                ? (player.isBot ? '#4b5563' : isYourSeat ? '#3b82f6' : '#22c55e')
                                                : 'rgba(255, 255, 255, 0.2)',
                                            border: `3px solid ${player 
                                                ? (isYourSeat ? '#2563eb' : '#16a34a')
                                                : 'rgba(255, 255, 255, 0.4)'}`,
                                            borderRadius: '15px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: !player && !gameStarted ? 'pointer' : 'default',
                                            transition: 'all 0.2s',
                                            boxShadow: player ? '0 4px 15px rgba(0,0,0,0.5)' : 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!player && !gameStarted) {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                                                e.currentTarget.style.borderColor = '#fff';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!player && !gameStarted) {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                                            }
                                        }}
                                    >
                                        {player ? (
                                            <>
                                                <div style={{ 
                                                    fontSize: '1rem', 
                                                    fontWeight: 'bold',
                                                    color: '#fff',
                                                    marginBottom: '8px',
                                                    textAlign: 'center'
                                                }}>
                                                    {player.name}
                                                </div>
                                                {player.isBot && !gameStarted && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveBot(seatIndex);
                                                        }}
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            padding: '4px 8px',
                                                            backgroundColor: '#ef4444',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '5px',
                                                            cursor: 'pointer',
                                                            marginTop: '5px'
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                                {isYourSeat && !gameStarted && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleLeaveSeat();
                                                        }}
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            padding: '4px 8px',
                                                            backgroundColor: '#ef4444',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '5px',
                                                            cursor: 'pointer',
                                                            marginTop: '5px'
                                                        }}
                                                    >
                                                        Leave
                                                    </button>
                                                )}
                                                {player.isBot && (
                                                    <Chip value={0} size={30} />
                                                )}
                                            </>
                                        ) : (
                                            <div style={{ 
                                                fontSize: '0.9rem', 
                                                color: 'rgba(255, 255, 255, 0.6)',
                                                textAlign: 'center'
                                            }}>
                                                Seat {seatIndex + 1}<br/>
                                                {!gameStarted && 'Click to sit'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Bot Management - Moved to Right Side */}
                        <div style={{
                            position: 'absolute',
                            top: '80px',
                            right: '40px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            zIndex: 100
                        }}>
                            <button
                                onClick={handleAddBot}
                                className="btn"
                                disabled={gameStarted || activePlayers.length >= NUM_SEATS}
                                style={{
                                    padding: '12px 24px',
                                    fontSize: '1rem',
                                    backgroundColor: activePlayers.length >= NUM_SEATS ? '#666' : '#22c55e',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Add Bot
                            </button>
                            {activePlayers.length >= 2 && (
                                <button
                                    onClick={handleStartGame}
                                    className="btn"
                                    disabled={gameStarted || playerSeatIndex === null}
                                    style={{
                                        padding: '12px 24px',
                                        fontSize: '1.2rem',
                                        backgroundColor: '#3b82f6',
                                        whiteSpace: 'nowrap',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Start Game
                                </button>
                            )}
                        </div>
                    </>
                )}

                {/* Game Phase Display - Moved higher */}
                {gameStarted && gamePhase !== 'lobby' && (
                    <div style={{
                        position: 'absolute',
                        top: '12%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '1.1rem',
                        color: '#fff',
                        fontWeight: 'bold',
                        zIndex: 100,
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                    }}>
                        {gamePhase.charAt(0).toUpperCase() + gamePhase.slice(1)}
                    </div>
                )}

                {/* Pot Display - Moved lower */}
                {gameStarted && (
                    <div style={{
                        position: 'absolute',
                        top: '70%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '2rem',
                        color: '#ffd700',
                        fontWeight: 'bold',
                        zIndex: 100,
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: '2px solid #ffd700'
                    }}>
                        Pot: ${pot}
                    </div>
                )}

                {gameStarted && (
                    <>
                        {/* Blind Tokens */}
                        {smallBlindSeat !== null && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${getSeatPosition(smallBlindSeat).x - 30}px`,
                                    top: `${getSeatPosition(smallBlindSeat).y - 100}px`,
                                    zIndex: 30,
                                    backgroundColor: '#ffd700',
                                    color: '#000',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    border: '3px solid #fff',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                                }}
                            >
                                SB
                            </div>
                        )}
                        {bigBlindSeat !== null && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${getSeatPosition(bigBlindSeat).x - 30}px`,
                                    top: `${getSeatPosition(bigBlindSeat).y - 100}px`,
                                    zIndex: 30,
                                    backgroundColor: '#ff6b35',
                                    color: '#fff',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    border: '3px solid #fff',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                                }}
                            >
                                BB
                            </div>
                        )}

                        {/* Player Hands */}
                        {seats.map((player, seatIndex) => {
                            if (!player) return null;
                            const handPos = getHandPosition(seatIndex);
                            const isCurrentPlayer = activePlayers[currentPlayerIndex]?.seatIndex === seatIndex;
                            const seatPos = getSeatPosition(seatIndex);
                            
                            return (
                                <div 
                                    key={player.id} 
                                    style={{ 
                                        position: 'absolute',
                                        left: `${handPos.x}px`,
                                        top: `${handPos.y}px`,
                                        zIndex: isCurrentPlayer ? 25 : 15
                                    }}
                                >
                                    {/* Current Player Highlight Ring */}
                                    {isCurrentPlayer && (
                                        <div style={{
                                            position: 'absolute',
                                            left: `${seatPos.x - handPos.x - 90}px`,
                                            top: `${seatPos.y - handPos.y - 90}px`,
                                            width: '180px',
                                            height: '180px',
                                            borderRadius: '50%',
                                            border: '4px solid #3b82f6',
                                            boxShadow: '0 0 20px #3b82f6',
                                            pointerEvents: 'none',
                                            animation: 'pulse 1.5s ease-in-out infinite'
                                        }} />
                                    )}
                                    {isCurrentPlayer && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-45px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            padding: '8px 15px',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.6)',
                                            zIndex: 30
                                        }}>
                                            {player.isBot ? `${player.name}'s Turn` : 'Your Turn!'}
                                        </div>
                                    )}
                                    <PokerHand
                                        cards={player.hand}
                                        position={{ x: 0, y: 0 }}
                                        label={`${player.name}${player.evaluatedHand ? ` - ${player.evaluatedHand.name}` : ''}${winner?.seatIndex === seatIndex ? ' 👑' : ''}${player.isFolded ? ' (Folded)' : ''}`}
                                        isVisible={player.isVisible}
                                        cardWidth={70}
                                        cardHeight={98}
                                    />
                                    {/* Chip stack for player's bet */}
                                    {player.bet > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            top: '-80px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '-5px',
                                            zIndex: 20
                                        }}>
                                            {getChipStack(player.bet).map((chipGroup, chipIdx) => (
                                                <div key={chipIdx} style={{
                                                    display: 'flex',
                                                    gap: '2px',
                                                    marginBottom: chipIdx < getChipStack(player.bet).length - 1 ? '-8px' : '0',
                                                    zIndex: getChipStack(player.bet).length - chipIdx
                                                }}>
                                                    {Array(Math.min(chipGroup.count, 4)).fill(0).map((_, chipNum) => (
                                                        <Chip 
                                                            key={`chip-${chipIdx}-${chipNum}`} 
                                                            value={chipGroup.value} 
                                                            size={28} 
                                                        />
                                                    ))}
                                                    {chipGroup.count > 4 && (
                                                        <span style={{ 
                                                            fontSize: '9px', 
                                                            color: '#fff',
                                                            alignSelf: 'center',
                                                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                                                        }}>
                                                            +{chipGroup.count - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                            <span style={{ 
                                                fontSize: '0.85rem', 
                                                color: '#ffd700',
                                                fontWeight: 'bold',
                                                marginTop: '5px',
                                                textShadow: '1px 1px 3px rgba(0,0,0,0.9)'
                                            }}>
                                                ${player.bet}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Action notification for this player */}
                                    {actionNotifications
                                        .filter(notif => notif.seatIndex === seatIndex)
                                        .map(notif => {
                                            const seatPos = getSeatPosition(seatIndex);
                                            return (
                                                <div
                                                    key={notif.id}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${seatPos.x - handPos.x - 100}px`,
                                                        top: `${seatPos.y - handPos.y - 130}px`,
                                                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                                        color: '#fff',
                                                        padding: '8px 15px',
                                                        borderRadius: '10px',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 'bold',
                                                        whiteSpace: 'nowrap',
                                                        border: '2px solid #3b82f6',
                                                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                                        zIndex: 100,
                                                        animation: 'slideUp 0.3s ease-out'
                                                    }}
                                                >
                                                    {notif.playerName} {notif.action}
                                                </div>
                                            );
                                        })}
                                </div>
                            );
                        })}

                        {/* Winner Notification Popup */}
                        {winnerNotification && (
                            <div style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                                color: '#fff',
                                padding: '30px 50px',
                                borderRadius: '20px',
                                border: '4px solid #ffd700',
                                zIndex: 200,
                                textAlign: 'center',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                                animation: 'slideUp 0.5s ease-out'
                            }}>
                                <div style={{
                                    fontSize: '2rem',
                                    fontWeight: 'bold',
                                    color: '#ffd700',
                                    marginBottom: '15px',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                                }}>
                                    🎉 Winner! 🎉
                                </div>
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    marginBottom: '10px'
                                }}>
                                    {winnerNotification.playerName}
                                </div>
                                {winnerNotification.handName && (
                                    <div style={{
                                        fontSize: '1.1rem',
                                        color: '#aaa',
                                        marginBottom: '15px'
                                    }}>
                                        {winnerNotification.handName}
                                    </div>
                                )}
                                <div style={{
                                    fontSize: '1.8rem',
                                    fontWeight: 'bold',
                                    color: '#22c55e',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                                }}>
                                    ${winnerNotification.amount}
                                </div>
                            </div>
                        )}

                        {/* Community Cards */}
                        {communityCards.length > 0 && (
                            <div style={{ 
                                position: 'absolute', 
                                left: `${communityCardsPosition.x}px`, 
                                top: `${communityCardsPosition.y}px`,
                                zIndex: 100
                            }}>
                                <div style={{ 
                                    fontSize: '1rem', 
                                    color: '#fff',
                                    marginBottom: '10px',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                                }}>
                                    Community Cards
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {communityCards.map((card, idx) => (
                                        <Card
                                            key={`community-${idx}`}
                                            card={card}
                                            width={90}
                                            height={126}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Betting Controls - Only show for current player - MOVED TO BOTTOM BAR */}
                        {gamePhase !== 'lobby' && gamePhase !== 'showdown' && gameStarted && 
                         playerSeatIndex !== null && 
                         activePlayers[currentPlayerIndex]?.seatIndex === playerSeatIndex &&
                         !seats[playerSeatIndex]?.isBot &&
                         !seats[playerSeatIndex]?.isFolded &&
                         !dealingCards && (
                            <div style={{ 
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '15px',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                                padding: '16px 24px',
                                borderTop: '3px solid #3b82f6',
                                zIndex: 100,
                                boxShadow: '0 -4px 20px rgba(0,0,0,0.8)'
                            }}>
                                {/* To Call Amount */}
                                <div style={{
                                    fontSize: '1rem',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    padding: '0 15px',
                                    borderRight: '1px solid rgba(255,255,255,0.2)'
                                }}>
                                    To Call: ${Math.max(0, currentBet - (seats[playerSeatIndex]?.bet || 0))}
                                </div>
                                
                                {/* Bet Amount Input */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '0 15px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                                    <label htmlFor="bet-amount" style={{ 
                                        fontSize: '0.85rem',
                                        color: '#aaa',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {currentBet === 0 ? 'Bet' : 'Raise'}
                                        {currentBet > 0 && (
                                            <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '5px' }}>
                                                (Min: ${lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND})
                                            </span>
                                        )}
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            onClick={() => {
                                                const minBet = lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND;
                                                setBetAmount(Math.max(minBet, betAmount - 10));
                                            }}
                                            disabled={betAmount <= (lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND)}
                                            style={{
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '6px',
                                                border: '2px solid #666',
                                                backgroundColor: betAmount <= (currentBet > 0 ? currentBet : BIG_BLIND) ? '#444' : '#3b82f6',
                                                color: '#fff',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                cursor: betAmount <= (lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND) ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            −
                                        </button>
                                        <div style={{ minWidth: '80px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>
                                            ${betAmount}
                                        </div>
                                        <input
                                            id="bet-amount"
                                            type="range"
                                            min={lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND}
                                            max={userData.user?.balance ? Math.min(500, userData.user.balance) : 500}
                                            step={10}
                                            value={betAmount}
                                            onChange={(e) => {
                                                const minBet = lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND;
                                                const newValue = parseInt(e.target.value);
                                                setBetAmount(Math.max(minBet, newValue));
                                            }}
                                            style={{ width: '150px' }}
                                        />
                                        <button
                                            onClick={() => {
                                                const maxBet = userData.user?.balance ? Math.min(500, userData.user.balance) : 500;
                                                setBetAmount(Math.min(maxBet, betAmount + 10));
                                            }}
                                            disabled={betAmount >= (userData.user?.balance ? Math.min(500, userData.user.balance) : 500)}
                                            style={{
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '6px',
                                                border: '2px solid #666',
                                                backgroundColor: betAmount >= (userData.user?.balance ? Math.min(500, userData.user.balance) : 500) ? '#444' : '#3b82f6',
                                                color: '#fff',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                cursor: betAmount >= (userData.user?.balance ? Math.min(500, userData.user.balance) : 500) ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {(currentBet - (seats[playerSeatIndex]?.bet || 0)) === 0 ? (
                                        <button
                                            onClick={() => handlePlayerAction('check')}
                                            className="btn"
                                            style={{
                                                fontSize: '1rem',
                                                padding: '12px 24px',
                                                backgroundColor: '#22c55e',
                                                fontWeight: 'bold',
                                                minWidth: '120px'
                                            }}
                                        >
                                            Check
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                const callAmount = currentBet - (seats[playerSeatIndex]?.bet || 0);
                                                // Add notification first
                                                const playerName = seats[playerSeatIndex]?.name || 'You';
                                                addActionNotification(playerName, `calls $${callAmount}`, playerSeatIndex!);
                                                // Then execute the call - pass the exact call amount
                                                handlePlayerAction('bet', callAmount);
                                            }}
                                            className="btn"
                                            style={{
                                                fontSize: '1rem',
                                                padding: '12px 24px',
                                                backgroundColor: '#3b82f6',
                                                fontWeight: 'bold',
                                                minWidth: '140px'
                                            }}
                                        >
                                            Call ${currentBet - (seats[playerSeatIndex]?.bet || 0)}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            // Calculate raise amount - minimum is lastRaiseAmount (or BIG_BLIND if no previous raise)
                                            const minRaiseAmount = lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND;
                                            const raiseAmount = Math.max(minRaiseAmount, betAmount);
                                            handlePlayerAction('bet', raiseAmount);
                                        }}
                                        className="btn"
                                        disabled={betAmount < (lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND)}
                                        style={{
                                            fontSize: '1rem',
                                            padding: '12px 24px',
                                            backgroundColor: betAmount < (lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND) ? '#666' : '#f59e0b',
                                            fontWeight: 'bold',
                                            cursor: betAmount < (lastRaiseAmount > 0 ? lastRaiseAmount : BIG_BLIND) ? 'not-allowed' : 'pointer',
                                            minWidth: '140px'
                                        }}
                                    >
                                        {currentBet === 0 ? `Bet $${betAmount}` : `Raise $${betAmount}`}
                                    </button>
                                    <button
                                        onClick={() => handlePlayerAction('fold')}
                                        className="btn"
                                        style={{
                                            fontSize: '1rem',
                                            padding: '12px 24px',
                                            backgroundColor: '#ef4444',
                                            fontWeight: 'bold',
                                            minWidth: '120px'
                                        }}
                                    >
                                        Fold
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Game Controls */}
                        <div style={{ 
                            position: 'absolute',
                            bottom: '40px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '15px',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            zIndex: 90
                        }}>
                            {gamePhase === 'showdown' && winner && (
                                <div style={{ 
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    color: (!winner.isBot && playerSeatIndex === winner.seatIndex) ? '#22c55e' : '#ef4444',
                                    marginBottom: '20px',
                                    textAlign: 'center',
                                    width: '100%',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                                }}>
                                    {(!winner.isBot && playerSeatIndex === winner.seatIndex)
                                        ? `You Win! ${winner.evaluatedHand?.name || ''} - +$${pot}`
                                        : `${winner.name} Wins with ${winner.evaluatedHand?.name || ''}`}
                                </div>
                            )}
                            {(gamePhase === 'showdown' || gamePhase === 'finished') && (
                                <button 
                                    onClick={handleNewGame} 
                                    className="btn"
                                    style={{ fontSize: '1rem', padding: '10px 20px', backgroundColor: '#666' }}
                                >
                                    New Game
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
