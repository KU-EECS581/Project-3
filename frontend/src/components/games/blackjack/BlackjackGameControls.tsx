/**
 * @file BlackjackGameControls.tsx
 * @description Singleplayer blackjack control surface (betting & actions).
 * @class BlackjackGameControls
 * @module Components/Blackjack
 * @inputs onGameStateUpdate, onGameEnd
 * @outputs Table state object + game result callbacks
 * @external_sources React hooks, UserDataContext, Deck from middleware
 * @author Riley Meyerkorth
 * @date 2025-11-20
 */

import { useCallback, useEffect, useMemo, useState, useContext } from "react";
import type { Card } from "~middleware/cards";
import { Deck } from "~middleware/cards";
import { UserDataContext } from "@/contexts/UserDataContext";
import type { GamePhase, TableGameState } from "./types";
import { calculateHandValue, getBestHandValue, isBusted, shouldDealerHit } from "./utils";
import { useBlackjackStats } from "@/hooks/useBlackjackStats";

interface BlackjackGameControlsProps {
  onGameStateUpdate: (state: TableGameState) => void;
  onGameEnd?: (winnings: number, result: "win" | "loss" | "push" | "blackjack") => void;
}

const MIN_BET = 5;
const MAX_BET = 500;

export function BlackjackGameControls({ 
  onGameStateUpdate, 
  onGameEnd 
}: BlackjackGameControlsProps) {
  const userCtx = useContext(UserDataContext);
  const { stats, recordResult } = useBlackjackStats('singleplayer');
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [dealerVisible, setDealerVisible] = useState(false);
  const [bet, setBet] = useState(MIN_BET);
  const [canDoubleDown, setCanDoubleDown] = useState(false);
  const [playerStood, setPlayerStood] = useState(false);
  const [gameResult, setGameResult] = useState<"win" | "loss" | "push" | "blackjack" | null>(null);

  // Initialize deck when component mounts
  useEffect(() => {
    const newDeck = new Deck();
    newDeck.shuffle();
    setDeck(newDeck);
  }, []);
  
  // Reset game state when component first mounts
  useEffect(() => {
    // Ensure we start in betting phase
    setPhase("betting");
    setPlayerHand([]);
    setDealerHand([]);
    setDealerVisible(false);
    setBet(MIN_BET);
    setCanDoubleDown(false);
    setPlayerStood(false);
    setGameResult(null);
  }, []);

  // Update table game state whenever hands change
  useEffect(() => {
    onGameStateUpdate({
      playerHand,
      dealerHand,
      dealerVisible,
      phase,
      bet,
    });
  }, [playerHand, dealerHand, dealerVisible, phase, bet, onGameStateUpdate]);

  const playerValue = useMemo(() => getBestHandValue(playerHand), [playerHand]);
  const dealerValue = useMemo(() => getBestHandValue(dealerHand), [dealerHand]);
  const playerBusted = useMemo(() => isBusted(playerHand), [playerHand]);
  const dealerBusted = useMemo(() => isBusted(dealerHand), [dealerHand]);

  // Check for blackjack
  const playerBlackjack = useMemo(() => {
    if (playerHand.length !== 2) return false;
    const { isBlackjack } = calculateHandValue(playerHand);
    return isBlackjack;
  }, [playerHand]);


  // Deal initial cards
  const dealInitialCards = useCallback(() => {
    const newDeck = new Deck();
    newDeck.shuffle();
    
    // Store cards as we deal them
    let playerCard1: Card | undefined;
    let playerCard2: Card | undefined;
    let dealerCard1: Card | undefined;
    let dealerCard2: Card | undefined;
    
    // Deal first card to player
    playerCard1 = newDeck.dealCard();
    if (playerCard1) {
      setPlayerHand([playerCard1]);
    }
    
    // Deal first card to dealer (after 400ms)
    setTimeout(() => {
      dealerCard1 = newDeck.dealCard();
      if (dealerCard1) {
        setDealerHand([dealerCard1]);
      }
    }, 400);
    
    // Deal second card to player (after 800ms)
    setTimeout(() => {
      playerCard2 = newDeck.dealCard();
      if (playerCard2 && playerCard1) {
        setPlayerHand([playerCard1, playerCard2]);
      }
    }, 800);
    
    // Deal second card to dealer face down (after 1200ms)
    setTimeout(() => {
      dealerCard2 = newDeck.dealCard();
      if (dealerCard2 && dealerCard1) {
        setDeck(newDeck);
        setDealerHand([dealerCard1, dealerCard2]);
        setDealerVisible(false);
        setPhase("player_turn");
        setCanDoubleDown(true);
        setPlayerStood(false);

        // Check for natural blackjack after a brief delay
        setTimeout(() => {
          if (playerCard1 && playerCard2 && dealerCard1 && dealerCard2) {
            const finalPlayerHand = [playerCard1, playerCard2];
            const finalDealerHand = [dealerCard1, dealerCard2];
            
            const playerBJ = calculateHandValue(finalPlayerHand).isBlackjack;
            const dealerBJ = calculateHandValue(finalDealerHand).isBlackjack;

            if (playerBJ || dealerBJ) {
              setDealerVisible(true);
              setPhase("finished");
                    if (playerBJ && dealerBJ) {
                      setGameResult("push");
                      recordResult("push");
                      onGameEnd?.(0, "push");
                    } else if (playerBJ) {
                      setGameResult("blackjack");
                      recordResult("blackjack");
                      onGameEnd?.(Math.floor(bet * 2.5), "blackjack");
                    } else {
                      setGameResult("loss");
                      recordResult("loss");
                      onGameEnd?.(0, "loss");
                    }
            }
          }
        }, 200);
      }
    }, 1200);
  }, [deck, bet, onGameEnd]);

  // Place bet and deal
  const handlePlaceBet = useCallback(() => {
    if (!userCtx?.user || bet < MIN_BET || bet > MAX_BET) return;
    if (bet > userCtx.user.balance) return;
    if (!deck) return;

    userCtx.removeFunds(bet);
    
    // Small delay before dealing to show bet was placed
    setTimeout(() => {
      dealInitialCards();
    }, 300);
  }, [bet, userCtx, deck, dealInitialCards]);

  // Player hits
  const handleHit = useCallback(() => {
    if (!deck || phase !== "player_turn" || playerStood || playerBusted) return;

    const card = deck.dealCard();
    if (!card) return;

    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setCanDoubleDown(false);

    if (isBusted(newHand)) {
      setDealerVisible(true);
      setPhase("finished");
      setGameResult("loss");
      recordResult("loss");
      onGameEnd?.(0, "loss");
    }
  }, [deck, phase, playerHand, playerStood, playerBusted, onGameEnd, recordResult]);

  // Player stands
  const handleStand = useCallback(() => {
    if (phase !== "player_turn" || playerStood) return;

    setPlayerStood(true);
    setDealerVisible(true);
    setPhase("dealer_turn");
    startDealerTurn();
  }, [phase, playerStood]);

  // Double down
  const handleDoubleDown = useCallback(() => {
    if (!canDoubleDown || !deck || !userCtx?.user || bet > userCtx.user.balance) return;

    userCtx.removeFunds(bet);
    setBet(prev => prev * 2);

    const card = deck.dealCard();
    if (!card) return;

    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setCanDoubleDown(false);
    setPlayerStood(true);
    setDealerVisible(true);
    setPhase("dealer_turn");

    if (isBusted(newHand)) {
      setPhase("finished");
      setGameResult("loss");
      recordResult("loss");
      onGameEnd?.(0, "loss");
    } else {
      startDealerTurn();
    }
  }, [canDoubleDown, deck, playerHand, userCtx, bet, onGameEnd, recordResult]);

  // Dealer turn
  const startDealerTurn = useCallback(() => {
    const dealerPlay = () => {
      setDeck(currentDeck => {
        if (!currentDeck) return currentDeck;

        setDealerHand(currentDealerHand => {
          if (shouldDealerHit(currentDealerHand)) {
            const card = currentDeck.dealCard();
            if (!card) {
              setTimeout(() => {
                setPhase("finished");
                setPlayerHand(currentPlayerHand => {
                  setDealerHand(dealerH => {
                    const playerVal = getBestHandValue(currentPlayerHand);
                    const dealerVal = getBestHandValue(dealerH);
                    
                    if (playerVal > dealerVal) {
                      setGameResult("win");
                      recordResult("win");
                      onGameEnd?.(bet * 2, "win");
                    } else if (playerVal < dealerVal) {
                      setGameResult("loss");
                      recordResult("loss");
                      onGameEnd?.(0, "loss");
                    } else {
                      setGameResult("push");
                      recordResult("push");
                      onGameEnd?.(bet, "push");
                    }
                    return dealerH;
                  });
                  return currentPlayerHand;
                });
              }, 500);
              return currentDealerHand;
            }

            const newDealerHand = [...currentDealerHand, card];

            if (isBusted(newDealerHand)) {
              setTimeout(() => {
                setPhase("finished");
                setGameResult("win");
                recordResult("win");
                onGameEnd?.(bet * 2, "win");
              }, 500);
              return newDealerHand;
            } else {
              setTimeout(dealerPlay, 800);
              return newDealerHand;
            }
          } else {
            setTimeout(() => {
              setPhase("finished");
              setPlayerHand(currentPlayerHand => {
                const playerVal = getBestHandValue(currentPlayerHand);
                const dealerVal = getBestHandValue(currentDealerHand);
                
                if (playerVal > dealerVal) {
                  setGameResult("win");
                  recordResult("win");
                  onGameEnd?.(bet * 2, "win");
                } else if (playerVal < dealerVal) {
                  setGameResult("loss");
                  recordResult("loss");
                  onGameEnd?.(0, "loss");
                } else {
                  setGameResult("push");
                  recordResult("push");
                  onGameEnd?.(bet, "push");
                }
                return currentPlayerHand;
              });
            }, 500);
            return currentDealerHand;
          }
        });

        return currentDeck;
      });
    };

    setTimeout(dealerPlay, 500);
  }, [bet, onGameEnd, recordResult]);

  // New game
  const handleNewGame = useCallback(() => {
    const newDeck = new Deck();
    newDeck.shuffle();
    setDeck(newDeck);
    setPlayerHand([]);
    setDealerHand([]);
    setDealerVisible(false);
    setPhase("betting");
    setPlayerStood(false);
    setCanDoubleDown(false);
    setGameResult(null);
    setBet(MIN_BET);
    onGameStateUpdate({});
  }, [onGameStateUpdate]);

  // Adjust bet
  const adjustBet = useCallback((delta: number) => {
    setBet(prev => {
      const newBet = Math.max(MIN_BET, Math.min(MAX_BET, prev + delta));
      return newBet;
    });
  }, []);

  // Calculate balance and derived values
  const balance = userCtx?.user?.balance ?? 0;
  const maxBetAllowed = Math.min(MAX_BET, balance);
  const canBet = phase === "betting" && bet <= balance && bet >= MIN_BET;
  const canPlay = phase === "player_turn" && !playerStood && !playerBusted;

  // Set bet directly (from input or slider)
  const setBetDirect = useCallback((value: number) => {
    const clamped = Math.max(MIN_BET, Math.min(MAX_BET, Math.min(value, balance)));
    setBet(Math.floor(clamped));
  }, [balance]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 30,
      background: 'linear-gradient(to bottom, rgba(17, 24, 39, 0.95), rgba(0, 0, 0, 0.95))',
      borderRadius: '12px',
      padding: '24px',
      border: '2px solid #d97706',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      maxWidth: '512px',
      width: '100%',
      marginLeft: '16px',
      marginRight: '16px',
      backdropFilter: 'blur(4px)'
    }}>
      {/* Hand Value Display */}
      {playerHand.length > 0 && (
        <div style={{
          textAlign: 'center',
          marginBottom: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid #374151'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
            Your Hand: {playerBusted ? (
              <span style={{ color: '#ef4444' }}>BUSTED ({playerValue})</span>
            ) : (
              <span>Value: {playerValue}</span>
            )}
          </div>
          {playerBlackjack && (
            <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '20px', marginTop: '8px' }}>BLACKJACK!</div>
          )}
          {dealerVisible && dealerHand.length > 0 && (
            <div style={{ fontSize: '14px', marginTop: '8px', color: 'white' }}>
              Dealer: {dealerBusted ? (
                <span style={{ color: '#ef4444' }}>BUSTED ({dealerValue})</span>
              ) : (
                <span>Value: {dealerValue}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Betting Phase */}
      {phase === "betting" && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* Balance Display */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#4ade80'
            }}>
              Balance: ${balance.toFixed(2)}
            </div>
            {/* Stats Tracker */}
            <div style={{
              fontSize: '12px',
              color: '#d1d5db',
              display: 'flex',
              gap: '12px'
            }}>
              <span style={{ color: '#22c55e' }}>Wins: {stats.wins}</span>
              <span style={{ color: '#ef4444' }}>Losses: {stats.losses}</span>
              <span style={{ color: '#fbbf24' }}>Win Rate: {stats.winRate}%</span>
            </div>
          </div>

          {/* Bet Amount Input */}
          <div style={{ width: '100%' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#d1d5db',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              Bet Amount
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="number"
                min={MIN_BET}
                max={maxBetAllowed}
                step="5"
                value={bet}
                onChange={(e) => setBetDirect(parseFloat(e.target.value) || MIN_BET)}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  background: '#1f2937',
                  border: '2px solid #4b5563',
                  borderRadius: '8px',
                  color: 'white',
                  textAlign: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#d97706'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#4b5563'}
              />
              <span style={{ color: '#9ca3af', fontWeight: '600' }}>$</span>
            </div>
          </div>

          {/* Bet Slider */}
          <div style={{ width: '100%' }}>
            <input
              type="range"
              min={MIN_BET}
              max={maxBetAllowed}
              step="5"
              value={bet}
              onChange={(e) => setBetDirect(parseFloat(e.target.value))}
              className="slider"
              style={{
                width: '100%',
                height: '8px',
                background: `linear-gradient(to right, #d97706 0%, #d97706 ${((bet - MIN_BET) / (maxBetAllowed - MIN_BET)) * 100}%, #374151 ${((bet - MIN_BET) / (maxBetAllowed - MIN_BET)) * 100}%, #374151 100%)`,
                borderRadius: '4px',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#9ca3af',
              marginTop: '4px'
            }}>
              <span>${MIN_BET}</span>
              <span>${maxBetAllowed}</span>
            </div>
          </div>

          {/* Quick Bet Buttons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            width: '100%'
          }}>
            {[25, 50, 100, maxBetAllowed].map(amount => {
              const isSelected = bet === amount;
              const isDisabled = amount > balance;
              return (
                <button
                  key={amount}
                  onClick={() => setBetDirect(amount)}
                  disabled={isDisabled}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    background: isSelected ? '#d97706' : isDisabled ? '#374151' : '#374151',
                    color: isDisabled ? '#6b7280' : 'white',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s',
                    opacity: isDisabled ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.background = '#4b5563';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.background = '#374151';
                    }
                  }}
                >
                  ${amount === maxBetAllowed ? "MAX" : amount}
                </button>
              );
            })}
          </div>

          {/* Fine Adjust Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <button
              onClick={() => adjustBet(-10)}
              disabled={bet <= MIN_BET}
              style={{
                padding: '8px 16px',
                background: '#374151',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: bet <= MIN_BET ? 'not-allowed' : 'pointer',
                opacity: bet <= MIN_BET ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (bet > MIN_BET) e.currentTarget.style.background = '#4b5563';
              }}
              onMouseLeave={(e) => {
                if (bet > MIN_BET) e.currentTarget.style.background = '#374151';
              }}
            >
              -$10
            </button>
            <button
              onClick={() => adjustBet(-5)}
              disabled={bet <= MIN_BET}
              style={{
                padding: '8px 16px',
                background: '#374151',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: bet <= MIN_BET ? 'not-allowed' : 'pointer',
                opacity: bet <= MIN_BET ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (bet > MIN_BET) e.currentTarget.style.background = '#4b5563';
              }}
              onMouseLeave={(e) => {
                if (bet > MIN_BET) e.currentTarget.style.background = '#374151';
              }}
            >
              -$5
            </button>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              minWidth: '100px',
              textAlign: 'center',
              color: '#fbbf24'
            }}>
              ${bet.toFixed(2)}
            </div>
            <button
              onClick={() => adjustBet(5)}
              disabled={bet >= maxBetAllowed || bet + 5 > balance}
              style={{
                padding: '8px 16px',
                background: '#374151',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: (bet >= maxBetAllowed || bet + 5 > balance) ? 'not-allowed' : 'pointer',
                opacity: (bet >= maxBetAllowed || bet + 5 > balance) ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!(bet >= maxBetAllowed || bet + 5 > balance)) {
                  e.currentTarget.style.background = '#4b5563';
                }
              }}
              onMouseLeave={(e) => {
                if (!(bet >= maxBetAllowed || bet + 5 > balance)) {
                  e.currentTarget.style.background = '#374151';
                }
              }}
            >
              +$5
            </button>
            <button
              onClick={() => adjustBet(10)}
              disabled={bet >= maxBetAllowed || bet + 10 > balance}
              style={{
                padding: '8px 16px',
                background: '#374151',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: (bet >= maxBetAllowed || bet + 10 > balance) ? 'not-allowed' : 'pointer',
                opacity: (bet >= maxBetAllowed || bet + 10 > balance) ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!(bet >= maxBetAllowed || bet + 10 > balance)) {
                  e.currentTarget.style.background = '#4b5563';
                }
              }}
              onMouseLeave={(e) => {
                if (!(bet >= maxBetAllowed || bet + 10 > balance)) {
                  e.currentTarget.style.background = '#374151';
                }
              }}
            >
              +$10
            </button>
          </div>

          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={!canBet}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: canBet ? 'linear-gradient(to right, #16a34a, #15803d)' : '#374151',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '20px',
              cursor: canBet ? 'pointer' : 'not-allowed',
              opacity: canBet ? 1 : 0.5,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s',
              transform: canBet ? 'scale(1)' : 'scale(1)'
            }}
            onMouseEnter={(e) => {
              if (canBet) {
                e.currentTarget.style.background = 'linear-gradient(to right, #15803d, #166534)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (canBet) {
                e.currentTarget.style.background = 'linear-gradient(to right, #16a34a, #15803d)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            Place Bet
          </button>

          {bet > balance && (
            <div style={{
              color: '#f87171',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              Insufficient funds
            </div>
          )}
        </div>
      )}

      {/* Player Turn Controls */}
      {canPlay && (
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleHit}
            style={{
              padding: '12px 24px',
              background: '#2563eb',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
          >
            Hit
          </button>
          <button
            onClick={handleStand}
            style={{
              padding: '12px 24px',
              background: '#d97706',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#b45309'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#d97706'}
          >
            Stand
          </button>
          {canDoubleDown && balance >= bet && (
            <button
              onClick={handleDoubleDown}
              style={{
                padding: '12px 24px',
                background: '#9333ea',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#7e22ce'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#9333ea'}
            >
              Double Down
            </button>
          )}
        </div>
      )}

      {/* Game Result */}
      {phase === "finished" && gameResult && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: gameResult === "win" || gameResult === "blackjack" ? "#22c55e" :
                   gameResult === "loss" ? "#ef4444" : "#eab308"
          }}>
            {gameResult === "win" && "You Win!"}
            {gameResult === "loss" && "You Lose!"}
            {gameResult === "push" && "Push!"}
            {gameResult === "blackjack" && "Blackjack!"}
          </div>
          <button
            onClick={handleNewGame}
            style={{
              padding: '12px 24px',
              background: '#16a34a',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#15803d'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#16a34a'}
          >
            New Game
          </button>
        </div>
      )}

      {/* Dealer Turn Indicator */}
      {phase === "dealer_turn" && (
        <div style={{
          textAlign: 'center',
          fontSize: '18px',
          color: '#fbbf24'
        }}>
          Dealer's turn...
        </div>
      )}
    </div>
  );
}

