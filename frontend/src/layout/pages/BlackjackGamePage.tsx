/**
 * @file BlackjackGamePage.tsx
 * @description Versatile blackjack page (singleplayer multi-hand & multiplayer).
 * @class BlackjackGamePage
 * @module Pages/Blackjack
 * @inputs Mode selection, deck & user contexts, hand actions
 * @outputs Balance changes, hand result notifications
 * @external_sources React hooks, custom deck/user/stat hooks
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */
import { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";
import { useDeck } from "@/hooks";
import { useUserData } from "@/hooks";
import { BlackjackHand, Chip } from "@/components";
import { getCardValue, isAce, type Card } from "@/models";
import { BlackjackModeSelection } from "@/components/games/blackjack/BlackjackModeSelection";
import { BlackjackMultiplayerGame } from "@/components/games/blackjack/BlackjackMultiplayerGame";
import { useBlackjackStats } from "@/hooks/useBlackjackStats";

const MIN_BET = 10;
const MAX_BET = 500;
const NUM_HAND_POSITIONS = 5;

interface PlayerHand {
    cards: Card[];
    bet: number;
    isActive: boolean; // Has bet placed and cards dealt
    isFinished: boolean; // Player has finished playing this hand
    value: number;
    winAmount?: number; // Amount won/lost this hand
    result?: 'win' | 'loss' | 'push' | 'blackjack'; // Result of this hand
    isDoubled?: boolean; // Whether this hand was doubled down
    isSplit?: boolean; // Whether this hand was split
}

interface WinNotification {
    handIndex: number;
    amount: number;
    message: string;
    id: string;
}

export function BlackjackGamePage() {
    const navigate = useNavigate();
    const { dealCard, resetDeck, isDeckEmpty } = useDeck();
    const userData = useUserData();
    const { stats, recordResult } = useBlackjackStats('singleplayer');
    const [gameMode, setGameMode] = useState<"singleplayer" | "multiplayer" | null>(null);
    const [betAmount, setBetAmount] = useState(MIN_BET);
    const [playerHands, setPlayerHands] = useState<PlayerHand[]>(
        Array(NUM_HAND_POSITIONS).fill(null).map(() => ({
            cards: [],
            bet: 0,
            isActive: false,
            isFinished: false,
            value: 0
        }))
    );
    const [dealerHand, setDealerHand] = useState<Card[]>([]);
    const [activeHandIndex, setActiveHandIndex] = useState<number | null>(null); // Which hand the player is currently acting on
    const [dealerRevealed, setDealerRevealed] = useState(false);
    const [roundInProgress, setRoundInProgress] = useState(false);
    const [betsPlaced, setBetsPlaced] = useState(false); // True when bets are placed but cards not dealt yet
    const [cardsDealt, setCardsDealt] = useState(false); // True when cards have been dealt
    const [winNotifications, setWinNotifications] = useState<WinNotification[]>([]);

    const handleBackToMap = useCallback(() => {
        navigate(RoutePath.JOIN_GAME);
    }, [navigate]);

    const calculateHandValue = useCallback((hand: Card[]): number => {
        if (!hand || hand.length === 0) return 0;
        
        let value = 0;
        let aces = 0;

        for (const card of hand) {
            if (isAce(card.rank)) {
                aces++;
                value += 11;
            } else {
                value += getCardValue(card.rank);
            }
        }

        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }, []);

    const isBlackjack = useCallback((hand: Card[]): boolean => {
        if (hand.length !== 2) return false;
        return calculateHandValue(hand) === 21;
    }, [calculateHandValue]);

    // Place bet on a position (adds to existing bet, doesn't deal yet)
    const handlePlaceBetAtPosition = useCallback((positionIndex: number) => {
        if (!userData.user || userData.user.balance < betAmount) {
            alert('Insufficient funds!');
            return;
        }

        if (roundInProgress || cardsDealt) {
            return; // Can't change bets during round
        }

        // Get current bet on this position
        const currentBet = playerHands[positionIndex].bet;
        const newTotalBet = currentBet + betAmount;

        // Check if total exceeds max bet
        if (newTotalBet > MAX_BET) {
            alert(`Maximum bet is $${MAX_BET}!`);
            return;
        }

        // Deduct additional bet amount
        userData.removeFunds(betAmount);

        setPlayerHands((prev) => {
            const updated = [...prev];
            updated[positionIndex] = {
                ...updated[positionIndex],
                bet: newTotalBet,
            };
            return updated;
        });

        setBetsPlaced(true);
    }, [userData, betAmount, playerHands, roundInProgress, cardsDealt]);

    // Start the hand - deal cards in succession
    const handleStartHand = useCallback(() => {
        // Get indices of hands with bets
        const positionIndices = playerHands
            .map((hand, index) => hand.bet > 0 ? index : -1)
            .filter(idx => idx !== -1);
            
        if (positionIndices.length === 0) {
            alert('Please place at least one bet first!');
            return;
        }

        // Reset deck and start dealing
        resetDeck();
        setCardsDealt(true);
        setRoundInProgress(true);
        setBetsPlaced(false);

        // Deal dealer's first card
        const dealerCard1 = dealCard();
        if (dealerCard1) {
            setDealerHand([dealerCard1]);
        }

        // Deal cards in succession with delays for each hand
        positionIndices.forEach((positionIndex, betIndex) => {
            setTimeout(() => {
                // Deal first player card - exactly ONE card
                const card1 = dealCard();
                if (card1) {
                    setPlayerHands((prev) => {
                        const hand = prev[positionIndex];
                        // Ensure we're not duplicating - cards should be empty
                        if (hand.cards.length > 0) {
                            console.warn('Hand already has cards, skipping duplicate');
                            return prev;
                        }
                        const updated = [...prev];
                        updated[positionIndex] = {
                            ...hand,
                            cards: [card1], // Exactly one card
                            isActive: true,
                            value: calculateHandValue([card1])
                        };
                        return updated;
                    });
                }

                // Deal second player card - exactly ONE more card
                setTimeout(() => {
                    const card2 = dealCard();
                    if (card2) {
                        setPlayerHands((prev) => {
                            const hand = prev[positionIndex];
                            // Ensure we have exactly one card before adding the second
                            if (hand.cards.length !== 1) {
                                console.warn(`Expected 1 card, found ${hand.cards.length}, skipping duplicate`);
                                return prev;
                            }
                            const updated = [...prev];
                            const newCards = [...hand.cards, card2]; // Add exactly one more card
                            updated[positionIndex] = {
                                ...hand,
                                cards: newCards,
                                value: calculateHandValue(newCards)
                            };
                            
                            // Set first active hand (only if no active hand is already set)
                            if (betIndex === 0) {
                                setActiveHandIndex((current) => {
                                    // Only set if no active hand yet
                                    if (current === null) {
                                        return positionIndex;
                                    }
                                    return current;
                                });
                            }

                            // Check for instant blackjack
                            if (isBlackjack(newCards)) {
                                setTimeout(() => {
                                    setPlayerHands((current) => {
                                        const updated2 = [...current];
                                        updated2[positionIndex].isFinished = true;
                                        return updated2;
                                    });
                                    
                                    // Move to next available hand after marking this one finished
                                    // This will be handled by the useEffect that watches for finished hands
                                }, 1000);
                            }

                            return updated;
                        });
                    }
                }, 1500); // Delay between cards
            }, betIndex * 2000); // Delay between hands (2 seconds per hand)
        });

        // Deal dealer's second card (face down) after all player cards
        setTimeout(() => {
            const dealerCard2 = dealCard();
            if (dealerCard2) {
                setDealerHand((prev) => [...prev, dealerCard2]);
            }
        }, (positionIndices.length * 2000) + 1500);
    }, [playerHands, resetDeck, dealCard, calculateHandValue, isBlackjack]);

    const handleHit = useCallback((handIndex: number) => {
        if (activeHandIndex !== handIndex) {
            return; // Wrong hand is active
        }

        // Use functional update to prevent race conditions
        setPlayerHands((prev) => {
            const hand = prev[handIndex];
            
            // Double-check hand is still active and not finished
            if (!hand.isActive || hand.isFinished) {
                return prev; // No change
            }

            // Deal exactly ONE card
            const newCard = dealCard();
            if (!newCard) {
                return prev; // No card available
            }

            // Add the single card
            const updated = [...prev];
            updated[handIndex] = {
                ...hand,
                cards: [...hand.cards, newCard], // Add only this one card
                value: calculateHandValue([...hand.cards, newCard])
            };
            
            const newValue = updated[handIndex].value;
            
            // Auto-finish if bust
            if (newValue > 21) {
                updated[handIndex].isFinished = true;
                
                // Move to next active hand or finish round
                setTimeout(() => {
                    setPlayerHands((current) => {
                        const nextActiveIndex = current.findIndex((h, idx) => 
                            idx > handIndex && h.isActive && !h.isFinished
                        );
                        
                        if (nextActiveIndex !== -1) {
                            setActiveHandIndex(nextActiveIndex);
                        } else {
                            // Check if all hands are finished
                            const allFinished = current.every((h) => 
                                !h.isActive || h.isFinished
                            );
                            if (allFinished) {
                                // Trigger dealer play
                                setActiveHandIndex(null);
                            }
                        }
                        return current;
                    });
                }, 500);
            }
            
            return updated;
        });
    }, [activeHandIndex, dealCard, calculateHandValue]);

    const handleFinishAllHands = useCallback(() => {
        setRoundInProgress(false);
        // Dealer plays
        let dealerValue = calculateHandValue(dealerHand);
        const newDealerCards: Card[] = [];
        
        while (dealerValue < 17 && !isDeckEmpty) {
            const card = dealCard();
            if (card) {
                newDealerCards.push(card);
                dealerValue = calculateHandValue([...dealerHand, ...newDealerCards]);
            } else {
                break;
            }
        }

        setDealerHand((prev) => [...prev, ...newDealerCards]);
        setDealerRevealed(true);

        // Calculate winnings for each hand and show notifications
        playerHands.forEach((hand, index) => {
            if (!hand.isActive) return;

            const playerValue = hand.value;
            let winAmount = 0;
            let result: 'win' | 'loss' | 'push' | 'blackjack' = 'loss';
            let message = '';

            if (playerValue > 21) {
                winAmount = -hand.bet; // Bust, lose bet
                result = 'loss';
                message = `Bust! Lost $${hand.bet}`;
            } else if (isBlackjack(hand.cards) && !isBlackjack(dealerHand)) {
                winAmount = Math.floor(hand.bet * 2.5); // Blackjack pays 3:2
                result = 'blackjack';
                message = `Blackjack! Won $${winAmount}`;
                userData.addFunds(hand.bet + winAmount);
            } else if (dealerValue > 21) {
                winAmount = hand.bet; // Dealer busts
                result = 'win';
                message = `Dealer Bust! Won $${winAmount}`;
                userData.addFunds(hand.bet + hand.bet);
            } else if (playerValue > dealerValue) {
                winAmount = hand.bet; // Win
                result = 'win';
                message = `You Win! +$${winAmount}`;
                userData.addFunds(hand.bet + hand.bet);
            } else if (playerValue === dealerValue) {
                winAmount = 0; // Push, return bet
                result = 'push';
                message = `Push - Bet Returned`;
                userData.addFunds(hand.bet);
            } else {
                winAmount = -hand.bet; // Lose
                result = 'loss';
                message = `You Lose -$${Math.abs(winAmount)}`;
            }

            // Update hand with result
            setPlayerHands((prev) => {
                const updated = [...prev];
                updated[index] = {
                    ...updated[index],
                    winAmount,
                    result
                };
                return updated;
            });
            
            // Record stats for this hand
            recordResult(result);

            // Show notification for this hand
            const notificationId = `win-${index}-${Date.now()}`;
            setWinNotifications((prev) => [...prev, {
                handIndex: index,
                amount: winAmount,
                message,
                id: notificationId
            }]);

            // Remove notification after 3 seconds
            setTimeout(() => {
                setWinNotifications((prev) => prev.filter(n => n.id !== notificationId));
            }, 3000);
        });

        setActiveHandIndex(null);
    }, [dealerHand, playerHands, calculateHandValue, isBlackjack, isDeckEmpty, dealCard, userData, recordResult]);

    const handleStand = useCallback((handIndex: number) => {
        if (activeHandIndex !== handIndex || !playerHands[handIndex].isActive || playerHands[handIndex].isFinished) {
            return;
        }

        setPlayerHands((prev) => {
            const updated = [...prev];
            updated[handIndex].isFinished = true;
            return updated;
        });

        // Move to next active hand or finish round
        const nextActiveIndex = playerHands.findIndex((hand, idx) => 
            idx > handIndex && hand.isActive && !hand.isFinished
        );
        
        if (nextActiveIndex !== -1) {
            setActiveHandIndex(nextActiveIndex);
        } else {
            handleFinishAllHands();
        }
    }, [activeHandIndex, playerHands, handleFinishAllHands]);

    // Double down: double bet, get one card, then stand
    const handleDoubleDown = useCallback((handIndex: number) => {
        if (activeHandIndex !== handIndex || !playerHands[handIndex].isActive || playerHands[handIndex].isFinished) {
            return;
        }

        const hand = playerHands[handIndex];
        
        // Can only double on first two cards
        if (hand.cards.length !== 2) {
            return;
        }

        // Check if player has enough funds
        if (!userData.user || userData.user.balance < hand.bet) {
            alert('Insufficient funds to double down!');
            return;
        }

        // Deduct additional bet
        userData.removeFunds(hand.bet);

        // Deal one card
        const newCard = dealCard();
        if (!newCard) {
            // Refund if no card available
            userData.addFunds(hand.bet);
            return;
        }

        // Double the bet and add the card, then stand
        setPlayerHands((prev) => {
            const updated = [...prev];
            const newCards = [...hand.cards, newCard];
            updated[handIndex] = {
                ...hand,
                cards: newCards,
                bet: hand.bet * 2,
                value: calculateHandValue(newCards),
                isFinished: true, // Auto-stand after double
                isDoubled: true
            };
            return updated;
        });

        // Move to next active hand or finish round
        setTimeout(() => {
            const nextActiveIndex = playerHands.findIndex((h, idx) => 
                idx > handIndex && h.isActive && !h.isFinished
            );
            
            if (nextActiveIndex !== -1) {
                setActiveHandIndex(nextActiveIndex);
            } else {
                handleFinishAllHands();
            }
        }, 500);
    }, [activeHandIndex, playerHands, userData, dealCard, calculateHandValue, handleFinishAllHands]);

    // Split: split a pair into two separate hands
    const handleSplit = useCallback((handIndex: number) => {
        if (activeHandIndex !== handIndex || !playerHands[handIndex].isActive || playerHands[handIndex].isFinished) {
            return;
        }

        const hand = playerHands[handIndex];
        
        // Can only split on first two cards of same rank
        if (hand.cards.length !== 2 || hand.cards[0].rank !== hand.cards[1].rank) {
            return;
        }

        // Check if player has enough funds and if there's space for another hand
        if (!userData.user || userData.user.balance < hand.bet) {
            alert('Insufficient funds to split!');
            return;
        }

        // Find next available hand position
        const nextHandIndex = playerHands.findIndex((h, idx) => idx > handIndex && !h.isActive);
        if (nextHandIndex === -1) {
            alert('No available hand positions for split!');
            return;
        }

        // Deduct bet for second hand
        userData.removeFunds(hand.bet);

        // Deal one card to original hand and one to new hand
        const card1 = dealCard();
        const card2 = dealCard();
        
        if (!card1 || !card2) {
            userData.addFunds(hand.bet); // Refund
            return;
        }

        setPlayerHands((prev) => {
            const updated = [...prev];
            
            // Original hand: keep first card, add new card
            updated[handIndex] = {
                ...hand,
                cards: [hand.cards[0], card1],
                value: calculateHandValue([hand.cards[0], card1]),
                isSplit: true
            };

            // New hand: second card + new card
            updated[nextHandIndex] = {
                cards: [hand.cards[1], card2],
                bet: hand.bet,
                isActive: true,
                isFinished: false,
                value: calculateHandValue([hand.cards[1], card2]),
                isSplit: true
            };

            return updated;
        });

        // Check for blackjack on either split hand
        setTimeout(() => {
            setPlayerHands((current) => {
                const updated = [...current];
                [handIndex, nextHandIndex].forEach(idx => {
                    const splitHand = updated[idx];
                    if (isBlackjack(splitHand.cards)) {
                        updated[idx].isFinished = true;
                    }
                });
                return updated;
            });
        }, 1000);
    }, [activeHandIndex, playerHands, userData, dealCard, calculateHandValue, isBlackjack]);

    // Helper to check if hand can be split
    const canSplit = useCallback((handIndex: number): boolean => {
        const hand = playerHands[handIndex];
        if (!hand.isActive || hand.isFinished || hand.cards.length !== 2) {
            return false;
        }
        // Check if same rank
        if (hand.cards[0].rank !== hand.cards[1].rank) {
            return false;
        }
        // Check funds and available position
        if (!userData.user || userData.user.balance < hand.bet) {
            return false;
        }
        const hasAvailablePosition = playerHands.some((h, idx) => idx > handIndex && !h.isActive);
        return hasAvailablePosition;
    }, [playerHands, userData]);

    // Helper to check if hand can be doubled
    const canDoubleDown = useCallback((handIndex: number): boolean => {
        const hand = playerHands[handIndex];
        if (!hand.isActive || hand.isFinished || hand.cards.length !== 2 || hand.isDoubled) {
            return false;
        }
        return userData.user ? userData.user.balance >= hand.bet : false;
    }, [playerHands, userData]);

    // Auto-set active hand when cards are dealt and no active hand is set
    useEffect(() => {
        if (cardsDealt && roundInProgress && activeHandIndex === null && !dealerRevealed) {
            // Find first active hand that isn't finished
            const firstActiveHand = playerHands.findIndex((hand, idx) => 
                hand.isActive && !hand.isFinished
            );
            if (firstActiveHand !== -1) {
                setActiveHandIndex(firstActiveHand);
            }
        }
    }, [cardsDealt, roundInProgress, activeHandIndex, dealerRevealed, playerHands]);

    // Auto-advance to next hand when current hand finishes (blackjack, bust, etc)
    useEffect(() => {
        if (activeHandIndex !== null && roundInProgress && !dealerRevealed) {
            const currentHand = playerHands[activeHandIndex];
            
            // If current active hand is finished, move to next
            if (currentHand && currentHand.isFinished) {
                const nextActiveIndex = playerHands.findIndex((hand, idx) => 
                    idx > activeHandIndex && hand.isActive && !hand.isFinished
                );
                
                if (nextActiveIndex !== -1) {
                    setActiveHandIndex(nextActiveIndex);
                } else {
                    // Check if all hands are finished
                    const allFinished = playerHands.every((hand) => 
                        !hand.isActive || hand.isFinished
                    );
                    if (allFinished) {
                        setActiveHandIndex(null);
                    }
                }
            }
        }
    }, [activeHandIndex, roundInProgress, dealerRevealed, playerHands]);

    // Auto-finish round when all hands are done
    useEffect(() => {
        if (activeHandIndex === null && roundInProgress && !dealerRevealed) {
            const allFinished = playerHands.every((hand) => !hand.isActive || hand.isFinished);
            const hasActiveHands = playerHands.some(h => h.isActive);
            if (allFinished && hasActiveHands) {
                handleFinishAllHands();
            }
        }
    }, [activeHandIndex, roundInProgress, dealerRevealed, playerHands, handleFinishAllHands]);

    const handleNewGame = useCallback(() => {
        resetDeck();
        setPlayerHands(Array(NUM_HAND_POSITIONS).fill(null).map(() => ({
            cards: [],
            bet: 0,
            isActive: false,
            isFinished: false,
            value: 0
        })));
        setDealerHand([]);
        setActiveHandIndex(null);
        setDealerRevealed(false);
        setRoundInProgress(false);
        setBetsPlaced(false);
        setCardsDealt(false);
        setWinNotifications([]); // Clear notifications
    }, [resetDeck]);

    // Calculate positions for betting spaces and cards
    const getBetPosition = useCallback((index: number) => {
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const totalWidth = screenWidth - 300; // Leave space for buttons
        const spacing = totalWidth / (NUM_HAND_POSITIONS + 1);
        return {
            x: 150 + spacing * (index + 1) - 60, // Center of betting space
            y: typeof window !== 'undefined' ? window.innerHeight - 120 : 600 // Bottom area
        };
    }, []);

    const getCardPosition = useCallback((index: number) => {
        const betPos = getBetPosition(index);
        return {
            x: betPos.x - 100,
            y: betPos.y - 200 // Cards above betting space
        };
    }, [getBetPosition]);

    // Deck position in bottom right corner
    const deckPosition = useCallback(() => {
        return {
            x: typeof window !== 'undefined' ? window.innerWidth - 180 : 1100,
            y: typeof window !== 'undefined' ? window.innerHeight - 280 : 600
        };
    }, []);

    const dealerValue = calculateHandValue(dealerHand);
    const dealerHasBlackjack = isBlackjack(dealerHand);

    // Show mode selection if not selected
    if (gameMode === null) {
        return <BlackjackModeSelection onSelectMode={setGameMode} />;
    }

    // Show multiplayer game if multiplayer mode selected
    if (gameMode === "multiplayer") {
        return <BlackjackMultiplayerGame onBackToMap={handleBackToMap} />;
    }

    // Singleplayer game (existing code)
    return (
        <div style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            minHeight: '100vh', 
            background: `
                /* Table felt - darker green with texture */
                radial-gradient(ellipse 140% 120% at center, #0d5a0d 0%, #084008 40%, #062806 70%, #031503 100%),
                repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 3px,
                    rgba(0, 0, 0, 0.12) 3px,
                    rgba(0, 0, 0, 0.12) 6px
                ),
                repeating-linear-gradient(
                    -45deg,
                    transparent,
                    transparent 2px,
                    rgba(255, 255, 255, 0.03) 2px,
                    rgba(255, 255, 255, 0.03) 4px
                )
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
                fontWeight: 'bold',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                alignItems: 'flex-end'
            }}>
                <div>
                    Balance: ${userData.user?.balance || 0}
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

            {/* Card Shoe - Top Right */}
            <div style={{
                position: 'absolute',
                top: '15%',
                right: '40px',
                width: '80px',
                height: '120px',
                backgroundColor: 'rgba(139, 69, 19, 0.9)',
                border: '3px solid #654321',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.3)',
                zIndex: 10
            }}>
                {/* Card stack visualization */}
                <div style={{ position: 'relative', width: '50px', height: '90px' }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                top: `${i * 2}px`,
                                left: `${i * 2}px`,
                                width: '50px',
                                height: '90px',
                                backgroundColor: '#1a237e',
                                border: '1px solid #283593',
                                borderRadius: '4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Min/Max Bet Display - Near Card Shoe */}
            <div style={{
                position: 'absolute',
                top: '25%',
                right: '40px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#fff',
                zIndex: 10,
                border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
                <div>MIN ${MIN_BET}</div>
                <div>MAX ${MAX_BET}</div>
            </div>

            {/* Dealer Hand - top center - moved down to avoid button overlap */}
            {dealerHand.length > 0 && (
                <div style={{ 
                    position: 'absolute', 
                    top: '12%', 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    width: 'calc(100% - 40px)',
                    display: 'flex',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 20
                }}>
                    <BlackjackHand
                        cards={dealerHand}
                        hideFirstCard={!dealerRevealed}
                        position={{ x: 0, y: 0 }}
                        label={`Dealer${dealerRevealed ? ` (${dealerValue})${dealerHasBlackjack ? ' - Blackjack!' : ''}` : ''}`}
                        cardWidth={Math.min(100, Math.max(70, (typeof window !== 'undefined' ? window.innerWidth : 1280) * 0.08))}
                        cardHeight={Math.min(140, Math.max(98, (typeof window !== 'undefined' ? window.innerWidth : 1280) * 0.11))}
                        deckPosition={deckPosition()}
                    />
                </div>
            )}

            {/* Player Hands - positioned above betting spaces */}
            {playerHands.map((hand, index) => {
                if (!hand.isActive) return null;
                const cardPos = getCardPosition(index);
                const isBlackjackResult = hand.result === 'blackjack';
                const isBust = hand.value > 21;
                
                const isActiveHand = activeHandIndex === index;
                
                return (
                    <div key={index} style={{ 
                        position: 'absolute', 
                        left: `${cardPos.x}px`, 
                        top: `${cardPos.y}px`,
                        pointerEvents: 'none',
                        zIndex: isActiveHand ? 20 : 15,
                        outline: isActiveHand ? '3px solid #3b82f6' : 'none',
                        outlineOffset: '5px',
                        borderRadius: '10px',
                        transition: 'outline 0.2s ease'
                    }}>
                        {/* Blackjack Banner */}
                        {isBlackjackResult && (
                            <div style={{
                                position: 'absolute',
                                top: '-45px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#ffd700',
                                color: '#000',
                                padding: '6px 15px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                zIndex: 1001,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                                whiteSpace: 'nowrap',
                                border: '2px solid #000'
                            }}>
                                BLACK JACK
                            </div>
                        )}
                        <BlackjackHand
                            cards={hand.cards}
                            position={{ x: 0, y: 0 }}
                            label={`${hand.value}${isBust ? ' - Bust!' : hand.isFinished && !isBlackjackResult ? ' - Stand' : ''}`}
                            cardWidth={Math.min(80, Math.max(60, (typeof window !== 'undefined' ? window.innerWidth : 1280) * 0.08))}
                            cardHeight={Math.min(112, Math.max(84, (typeof window !== 'undefined' ? window.innerWidth : 1280) * 0.11))}
                            deckPosition={deckPosition()}
                        />
                    </div>
                );
            })}

            {/* Win/Loss Notifications - positioned above each betting space */}
            {winNotifications.map((notification) => {
                const betPos = getBetPosition(notification.handIndex);
                const isWin = notification.amount > 0;
                const isPush = notification.amount === 0;
                const isBlackjack = notification.message.includes('Blackjack');
                
                return (
                    <div
                        key={notification.id}
                        style={{
                            position: 'absolute',
                            left: `${betPos.x - 60}px`,
                            bottom: `${typeof window !== 'undefined' ? window.innerHeight - betPos.y + 130 : 730}px`,
                            backgroundColor: isBlackjack 
                                ? 'rgba(255, 215, 0, 0.95)' 
                                : isWin 
                                ? 'rgba(34, 197, 94, 0.95)' 
                                : isPush 
                                ? 'rgba(251, 191, 36, 0.95)' 
                                : 'rgba(239, 68, 68, 0.95)',
                            color: isBlackjack ? '#000' : '#fff',
                            padding: '14px 24px',
                            borderRadius: '10px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            zIndex: 1000,
                            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)',
                            border: '3px solid',
                            borderColor: isBlackjack 
                                ? '#ffd700' 
                                : isWin 
                                ? '#22c55e' 
                                : isPush 
                                ? '#fbbf24' 
                                : '#ef4444',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            animation: 'slideUp 0.4s ease-out',
                            minWidth: '180px',
                            pointerEvents: 'none'
                        }}
                    >
                        {notification.message}
                        <div style={{ 
                            fontSize: '20px', 
                            marginTop: '6px',
                            fontWeight: '900',
                            opacity: 1
                        }}>
                            {isWin && notification.amount > 0 && `+$${notification.amount}`}
                            {!isWin && !isPush && `-$${Math.abs(notification.amount)}`}
                            {isPush && '$0'}
                        </div>
                    </div>
                );
            })}

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

            {/* Betting Spaces - bottom area */}
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
                            {Array(NUM_HAND_POSITIONS).fill(0).map((_, index) => {
                                const hand = playerHands[index];
                                const hasBet = hand.bet > 0;
                    const canEdit = !roundInProgress && !cardsDealt;
                    
                    // Calculate number of chips to stack based on bet amount
                    const getChipStack = (bet: number) => {
                        const chips: { value: number; count: number }[] = [];
                        let remaining = bet;
                        
                        // Use standard chip denominations
                        const denominations = [500, 100, 50, 25, 10];
                        for (const denom of denominations) {
                            const count = Math.floor(remaining / denom);
                            if (count > 0) {
                                chips.push({ value: denom, count: Math.min(count, 5) }); // Max 5 of each type visible
                                remaining -= denom * count;
                            }
                            if (remaining === 0) break;
                        }
                        
                        return chips;
                    };
                    
                    const chipStack = hasBet ? getChipStack(hand.bet) : [];
                    
                    return (
                        <div
                            key={index}
                            onClick={() => canEdit && handlePlaceBetAtPosition(index)}
                            style={{
                                width: '140px',
                                height: '100px',
                                border: '3px solid',
                                borderColor: hand.isActive && activeHandIndex === index
                                    ? '#3b82f6' // Blue for active hand
                                    : hand.isActive
                                    ? '#fbbf24'
                                    : hasBet
                                    ? '#ffd700'
                                    : 'rgba(255, 255, 255, 0.3)',
                                borderRadius: '50%', // Circular betting circle
                                backgroundColor: hand.isActive && activeHandIndex === index
                                    ? 'rgba(59, 130, 246, 0.2)' // Blue tint for active
                                    : hand.isActive 
                                    ? 'rgba(255, 255, 255, 0.08)' 
                                    : hasBet
                                    ? 'rgba(255, 215, 0, 0.15)'
                                    : 'rgba(0, 0, 0, 0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: canEdit ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                                position: 'relative',
                                boxShadow: hasBet 
                                    ? '0 0 20px rgba(255, 215, 0, 0.3), inset 0 0 30px rgba(0, 0, 0, 0.3)' 
                                    : 'inset 0 0 20px rgba(0, 0, 0, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                                if (canEdit) {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                    e.currentTarget.style.borderColor = '#fff';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (canEdit) {
                                    e.currentTarget.style.backgroundColor = hasBet 
                                        ? 'rgba(255, 215, 0, 0.15)' 
                                        : 'rgba(0, 0, 0, 0.2)';
                                    e.currentTarget.style.borderColor = hasBet ? '#ffd700' : 'rgba(255, 255, 255, 0.3)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }
                            }}
                        >
                            {hand.isActive ? (
                                <>
                                    {/* Show chips for active hand */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                        {chipStack.map((chip, i) => (
                                            <div key={i} style={{ display: 'flex', gap: '2px' }}>
                                                {Array(Math.min(chip.count, 3)).fill(0).map((_, j) => (
                                                    <Chip key={`chip-${i}-${j}`} value={chip.value} size={30} />
                                                ))}
                                                {chip.count > 3 && (
                                                    <span style={{ fontSize: '10px', color: '#fff', alignSelf: 'center' }}>
                                                        +{chip.count - 3}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: '11px', marginTop: '5px', color: '#fbbf24', fontWeight: 'bold' }}>
                                        {hand.value > 21 ? 'Bust!' : hand.isFinished ? 'Stand' : 'Playing'}
                                    </div>
                                </>
                            ) : hasBet ? (
                                <>
                                    {/* Stack of chips showing the bet */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '-5px' }}>
                                        {chipStack.map((chip, i) => (
                                            <div key={i} style={{ 
                                                display: 'flex', 
                                                gap: '2px',
                                                marginBottom: i < chipStack.length - 1 ? '-8px' : '0',
                                                zIndex: chipStack.length - i
                                            }}>
                                                {Array(Math.min(chip.count, 4)).fill(0).map((_, j) => (
                                                    <Chip 
                                                        key={`chip-${i}-${j}`} 
                                                        value={chip.value} 
                                                        size={35}
                                                        style={{ 
                                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                                                        }}
                                                    />
                                                ))}
                                                {chip.count > 4 && (
                                                    <span style={{ fontSize: '9px', color: '#fff', alignSelf: 'center', textShadow: '1px 1px 2px black' }}>
                                                        +{chip.count - 4}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                               <div style={{ fontSize: '10px', color: '#aaa', marginTop: '8px', textAlign: 'center' }}>
                                                   {canEdit ? 'Click to add bet' : 'Ready'}
                                               </div>
                                </>
                            ) : (
                                <>
                                               <div style={{ 
                                                   fontSize: '11px', 
                                                   marginBottom: '8px',
                                                   color: 'rgba(255, 255, 255, 0.6)',
                                                   textAlign: 'center'
                                               }}>
                                                   Add ${betAmount}
                                               </div>
                                               <Chip value={betAmount} size={45} />
                                               <div style={{ fontSize: '9px', color: '#aaa', marginTop: '5px' }}>Click to add bet</div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Visible Deck - Bottom Right */}
            <div style={{
                position: 'absolute',
                right: '40px',
                bottom: '180px',
                width: '90px',
                height: '130px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100
            }}>
                {/* Stack of card backs */}
                <div style={{ position: 'relative', width: '70px', height: '110px' }}>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                top: `${i * 2}px`,
                                left: `${i * 2}px`,
                                width: '70px',
                                height: '110px',
                                backgroundColor: '#1a237e',
                                border: '2px solid #283593',
                                borderRadius: '6px',
                                boxShadow: '0 3px 6px rgba(0,0,0,0.4)'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Action Buttons - Right side */}
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
                {roundInProgress && activeHandIndex !== null && !dealerRevealed && (
                    <>
                        {canSplit(activeHandIndex) && (
                            <button
                                onClick={() => handleSplit(activeHandIndex)}
                                className="btn"
                                style={{ 
                                    padding: '12px',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    backgroundColor: '#3b82f6',
                                    border: '3px solid #2563eb',
                                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                                    color: '#fff'
                                }}
                            >
                                SPLIT
                            </button>
                        )}
                        {canDoubleDown(activeHandIndex) && (
                            <button
                                onClick={() => handleDoubleDown(activeHandIndex)}
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
                            onClick={() => handleHit(activeHandIndex)}
                            className="btn"
                            disabled={playerHands[activeHandIndex].isFinished || playerHands[activeHandIndex].isDoubled}
                            style={{ 
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                backgroundColor: playerHands[activeHandIndex].isFinished || playerHands[activeHandIndex].isDoubled ? '#666' : '#22c55e',
                                border: `3px solid ${playerHands[activeHandIndex].isFinished || playerHands[activeHandIndex].isDoubled ? '#555' : '#16a34a'}`,
                                boxShadow: playerHands[activeHandIndex].isFinished || playerHands[activeHandIndex].isDoubled ? 'none' : '0 4px 15px rgba(34, 197, 94, 0.4)',
                                color: '#fff'
                            }}
                        >
                            HIT
                        </button>
                        <button
                            onClick={() => handleStand(activeHandIndex)}
                            className="btn"
                            disabled={playerHands[activeHandIndex].isFinished}
                            style={{ 
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                backgroundColor: playerHands[activeHandIndex].isFinished ? '#666' : '#ef4444',
                                border: `3px solid ${playerHands[activeHandIndex].isFinished ? '#555' : '#dc2626'}`,
                                boxShadow: playerHands[activeHandIndex].isFinished ? 'none' : '0 4px 15px rgba(239, 68, 68, 0.4)',
                                color: '#fff'
                            }}
                        >
                            STAND
                        </button>
                    </>
                )}
            </div>

            {/* Control Panel - bottom right, above buttons */}
            <div style={{
                position: 'absolute',
                bottom: '340px',
                right: '40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 100
            }}>
                {!cardsDealt && (
                    <>
                        <div style={{ 
                            marginBottom: '15px',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            <label htmlFor="bet-input" style={{ 
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
                                    disabled={roundInProgress || betAmount <= MIN_BET}
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
                                    disabled={roundInProgress || betAmount >= (userData.user?.balance ? Math.min(MAX_BET, userData.user.balance) : MAX_BET)}
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
                                id="bet-input"
                                type="range"
                                min={MIN_BET}
                                max={userData.user?.balance ? Math.min(MAX_BET, userData.user.balance) : MAX_BET}
                                step={10}
                                value={betAmount}
                                onChange={(e) => setBetAmount(parseInt(e.target.value))}
                                style={{ width: '100%' }}
                                disabled={roundInProgress}
                            />
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#aaa',
                                marginTop: '5px',
                                textAlign: 'center'
                            }}>
                                Click betting space to add ${betAmount}
                            </div>
                        </div>
                        <button
                            onClick={handleStartHand}
                            className="btn"
                            disabled={!betsPlaced || roundInProgress}
                            style={{ 
                                padding: '15px 30px', 
                                fontSize: '1.2rem', 
                                backgroundColor: betsPlaced ? '#22c55e' : '#666',
                                fontWeight: 'bold',
                                borderRadius: '8px',
                                border: betsPlaced ? '3px solid #16a34a' : '3px solid #555',
                                boxShadow: betsPlaced ? '0 4px 15px rgba(34, 197, 94, 0.4)' : 'none'
                            }}
                        >
                            {betsPlaced ? 'DEAL CARDS' : 'Place Bets First'}
                        </button>
                    </>
                )}

                {dealerRevealed && (
                    <button
                        onClick={handleNewGame}
                        className="btn"
                        style={{ 
                            padding: '12px 24px', 
                            fontSize: '1rem', 
                            backgroundColor: '#666',
                            borderRadius: '8px',
                            border: '2px solid #555'
                        }}
                    >
                        New Round
                    </button>
                )}
            </div>
        </div>
    );
}
