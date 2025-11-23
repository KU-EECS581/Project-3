/**
 * @file SlotMachine.tsx
 * @description Single-slot game component with weighted reels & payouts.
 * @class SlotMachine
 * @module Components/Slots
 * @inputs bet amount, spin trigger, onSpinComplete
 * @outputs Balance mutations, win state display
 * @external_sources React (hooks), UserDataContext
 * @author Riley Meyerkorth
 * @date 2025-11-20
 */

import { useCallback, useMemo, useState, useContext } from "react";
import { UserDataContext } from "@/contexts/UserDataContext";
import { Symbol, type SlotReel } from "./types";
import { generateReelSymbols, calculateWin, getWinDescription } from "./utils";

interface SlotMachineProps {
  onSpinComplete?: (winnings: number) => void;
}

const MIN_BET = 1;
const MAX_BET = 100;
const SPIN_DURATION = 2000; // 2 seconds
const REEL_STOP_DELAY = 300; // Delay between reels stopping

export function SlotMachine({ onSpinComplete }: SlotMachineProps) {
  const userCtx = useContext(UserDataContext);
  const [bet, setBet] = useState(MIN_BET);
  const [reels, setReels] = useState<SlotReel[]>(() => [
    { symbols: generateReelSymbols(30), currentIndex: 0, isSpinning: false },
    { symbols: generateReelSymbols(30), currentIndex: 0, isSpinning: false },
    { symbols: generateReelSymbols(30), currentIndex: 0, isSpinning: false },
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [showWin, setShowWin] = useState(false);

  const balance = userCtx?.user?.balance ?? 0;
  const canSpin = !isSpinning && bet <= balance && bet >= MIN_BET;

  // Get current visible symbols
  const visibleSymbols = useMemo(() => {
    return reels.map(reel => {
      const index = reel.currentIndex % reel.symbols.length;
      return reel.symbols[index];
    });
  }, [reels]);

  // Spin the machine
  const handleSpin = useCallback(() => {
    if (!canSpin || !userCtx) return;

    // Deduct bet
    userCtx.removeFunds(bet);
    setIsSpinning(true);
    setShowWin(false);
    setWinAmount(0);
    setLastWin(0);

    // Generate new symbols for each reel
    const newReels = reels.map((reel, reelIndex) => ({
      ...reel,
      symbols: generateReelSymbols(30),
      isSpinning: true,
    }));
    setReels(newReels);

    // Animate spinning for each reel with staggered stops
    newReels.forEach((reel, reelIndex) => {
      const stopDelay = SPIN_DURATION + (reelIndex * REEL_STOP_DELAY);
      
      // Animate spinning
      const spinInterval = setInterval(() => {
        setReels(prev => prev.map((r, idx) => 
          idx === reelIndex 
            ? { ...r, currentIndex: (r.currentIndex + 1) % r.symbols.length }
            : r
        ));
      }, 50);

      // Stop this reel after delay
      setTimeout(() => {
        clearInterval(spinInterval);
        
        // Finalize this reel's position
        setReels(prev => prev.map((r, idx) => 
          idx === reelIndex 
            ? { ...r, isSpinning: false }
            : r
        ));

        // If this is the last reel, calculate win
        if (reelIndex === newReels.length - 1) {
          setTimeout(() => {
            setReels(prev => {
              const finalSymbols = prev.map(r => {
                const idx = r.currentIndex % r.symbols.length;
                return r.symbols[idx];
              });
              
              const winnings = calculateWin(finalSymbols, bet);
              setWinAmount(winnings);
              setLastWin(winnings);
              
              if (winnings > 0) {
                setShowWin(true);
                if (userCtx) {
                  userCtx.addFunds(winnings);
                }
                onSpinComplete?.(winnings);
              }
              
              setIsSpinning(false);
              return prev;
            });
          }, 100);
        }
      }, stopDelay);
    });
  }, [bet, canSpin, userCtx, reels, onSpinComplete]);

  // Adjust bet
  const adjustBet = useCallback((delta: number) => {
    setBet(prev => {
      const newBet = Math.max(MIN_BET, Math.min(MAX_BET, prev + delta));
      return newBet;
    });
  }, []);

  // Get display symbols (show current and neighbors for visual effect)
  const getDisplaySymbols = useCallback((reelIndex: number) => {
    const reel = reels[reelIndex];
    const symbols: Symbol[] = [];
    const centerIdx = reel.currentIndex % reel.symbols.length;
    
    // Show 5 symbols total (2 above, center, 2 below)
    for (let i = -2; i <= 2; i++) {
      const idx = (centerIdx + i + reel.symbols.length) % reel.symbols.length;
      symbols.push(reel.symbols[idx]);
    }
    
    return symbols;
  }, [reels]);

  const winDescription = useMemo(() => getWinDescription(visibleSymbols), [visibleSymbols]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '24px',
      padding: '32px 0'
    }}>
      {/* Balance Display */}
      <div style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'white'
      }}>
        Balance: ${balance.toFixed(2)}
      </div>

      {/* Slot Machine */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(to bottom, #27272a, #18181b)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        border: '4px solid #ca8a04'
      }}>
        {/* Machine Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '800',
            color: '#facc15',
            marginBottom: '8px'
          }}>SLOTS</h2>
          {showWin && winAmount > 0 && (
            <div style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#4ade80',
              animation: 'pulse 1s infinite'
            }}>
              WIN: ${winAmount.toFixed(2)}!
            </div>
          )}
          {lastWin === 0 && !isSpinning && !showWin && (
            <div style={{ fontSize: '20px', color: '#9ca3af' }}>Try your luck!</div>
          )}
        </div>

        {/* Reels Container */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          justifyContent: 'center'
        }}>
          {reels.map((reel, reelIndex) => (
            <div
              key={reelIndex}
              style={{
                position: 'relative',
                background: 'black',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '4px solid #3f3f46',
                width: '120px',
                height: '360px'
              }}
            >
              {/* Reel Window */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                {getDisplaySymbols(reelIndex).map((symbol, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '48px',
                      height: '72px',
                      background: idx === 2 ? 'rgba(113, 63, 18, 0.3)' : 'transparent',
                      opacity: idx === 2 ? 1 : 0.6,
                      transform: idx === 2 ? 'scale(1.1)' : 'scale(1)',
                      animation: reel.isSpinning ? 'spin-slow 0.1s linear infinite' : 'none',
                      transition: 'all 0.075s'
                    }}
                  >
                    {symbol}
                  </div>
                ))}
              </div>

              {/* Center indicator line */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: '2px',
                background: '#eab308',
                transform: 'translateY(-50%)',
                zIndex: 10
              }} />
            </div>
          ))}
        </div>

        {/* Betting Controls */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <button
              onClick={() => adjustBet(-1)}
              disabled={bet <= MIN_BET || isSpinning}
              style={{
                padding: '8px 16px',
                background: '#52525b',
                color: 'white',
                borderRadius: '4px',
                border: 'none',
                cursor: bet <= MIN_BET || isSpinning ? 'not-allowed' : 'pointer',
                opacity: bet <= MIN_BET || isSpinning ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!(bet <= MIN_BET || isSpinning)) {
                  e.currentTarget.style.background = '#3f3f46';
                }
              }}
              onMouseLeave={(e) => {
                if (!(bet <= MIN_BET || isSpinning)) {
                  e.currentTarget.style.background = '#52525b';
                }
              }}
            >
              -$1
            </button>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              minWidth: '100px',
              textAlign: 'center',
              color: 'white'
            }}>
              ${bet.toFixed(2)}
            </div>
            <button
              onClick={() => adjustBet(1)}
              disabled={bet >= MAX_BET || bet + 1 > balance || isSpinning}
              style={{
                padding: '8px 16px',
                background: '#52525b',
                color: 'white',
                borderRadius: '4px',
                border: 'none',
                cursor: (bet >= MAX_BET || bet + 1 > balance || isSpinning) ? 'not-allowed' : 'pointer',
                opacity: (bet >= MAX_BET || bet + 1 > balance || isSpinning) ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!(bet >= MAX_BET || bet + 1 > balance || isSpinning)) {
                  e.currentTarget.style.background = '#3f3f46';
                }
              }}
              onMouseLeave={(e) => {
                if (!(bet >= MAX_BET || bet + 1 > balance || isSpinning)) {
                  e.currentTarget.style.background = '#52525b';
                }
              }}
            >
              +$1
            </button>
          </div>

          {/* Spin Button */}
          <button
            onClick={handleSpin}
            disabled={!canSpin}
            style={{
              padding: '16px 48px',
              fontSize: '24px',
              fontWeight: '800',
              borderRadius: '12px',
              border: 'none',
              cursor: canSpin ? 'pointer' : 'not-allowed',
              background: canSpin ? '#16a34a' : '#4b5563',
              color: 'white',
              opacity: canSpin ? 1 : 0.5,
              boxShadow: canSpin ? '0 4px 12px rgba(0, 0, 0, 0.3)' : 'none',
              transition: 'all 0.2s',
              transform: canSpin && isSpinning ? 'scale(1.05)' : 'scale(1)',
              animation: isSpinning ? 'pulse 1s infinite' : 'none'
            }}
            onMouseEnter={(e) => {
              if (canSpin) {
                e.currentTarget.style.background = '#15803d';
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (canSpin) {
                e.currentTarget.style.background = '#16a34a';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {isSpinning ? "SPINNING..." : "SPIN"}
          </button>

          {/* Quick bet buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 5, 10, 25].map(amount => (
              <button
                key={amount}
                onClick={() => setBet(Math.min(amount, MAX_BET))}
                disabled={amount > balance || isSpinning}
                style={{
                  padding: '4px 12px',
                  background: '#3f3f46',
                  color: 'white',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '14px',
                  cursor: (amount > balance || isSpinning) ? 'not-allowed' : 'pointer',
                  opacity: (amount > balance || isSpinning) ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!(amount > balance || isSpinning)) {
                    e.currentTarget.style.background = '#27272a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(amount > balance || isSpinning)) {
                    e.currentTarget.style.background = '#3f3f46';
                  }
                }}
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        {/* Payout Table */}
        <div style={{
          marginTop: '24px',
          fontSize: '14px',
          color: '#9ca3af',
          maxWidth: '384px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Payouts (per $1 bet)</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            <div>💎💎💎: ${100}</div>
            <div>777: ${50}</div>
            <div>▮▮▮: ${30}</div>
            <div>🔔🔔🔔: ${20}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
