/**
 * @file SlotsGamePage.tsx
 * @description Page for the slots game with complete gameplay loop.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";
import { useUserData } from "@/hooks";

const SYMBOLS = ['🍒', '🍋', '🍊', '🔔', '⭐', '💎', '7️⃣'];
const REEL_COUNT = 9; // 3x3 grid
const ROWS = 3;
const COLS = 3;
const SPIN_DURATION = 2000; // ms
const MIN_BET = 10;
const MAX_BET = 100;

// Payout multipliers for different combinations
const PAYOUTS: Record<string, number> = {
    '7️⃣7️⃣7️⃣': 100, // Triple 7 = jackpot
    '💎💎💎': 50,
    '⭐⭐⭐': 25,
    '🔔🔔🔔': 15,
    '🍊🍊🍊': 10,
    '🍋🍋🍋': 8,
    '🍒🍒🍒': 5,
    '7️⃣7️⃣': 10, // Two 7s
    '💎💎': 5, // Two diamonds
    '⭐⭐': 3, // Two stars
};

interface ReelState {
    spinning: boolean;
    currentSymbol: string;
}

export function SlotsGamePage() {
    const navigate = useNavigate();
    const userData = useUserData();
    const [reels, setReels] = useState<ReelState[]>(
        Array(REEL_COUNT).fill(0).map((_, i) => ({
            spinning: false,
            currentSymbol: SYMBOLS[i % SYMBOLS.length]
        }))
    );
    const [betAmount, setBetAmount] = useState(MIN_BET);
    const [isSpinning, setIsSpinning] = useState(false);
    const [lastWin, setLastWin] = useState<number | null>(null);
    const [lastCombination, setLastCombination] = useState<string>('');

    const handleBackToMap = useCallback(() => {
        navigate(RoutePath.MAP);
    }, [navigate]);
    const getRandomSymbol = useCallback((): string => {
        return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    }, []);

    const calculateWin = useCallback((symbols: string[]): number => {
        // Convert flat array to 3x3 grid
        const grid: string[][] = [];
        for (let row = 0; row < ROWS; row++) {
            grid[row] = [];
            for (let col = 0; col < COLS; col++) {
                grid[row][col] = symbols[row * COLS + col];
            }
        }

        let totalWin = 0;

        // Check rows (horizontal lines)
        for (let row = 0; row < ROWS; row++) {
            const rowSymbols = grid[row];
            const combo = rowSymbols.join('');
            
            // Check for exact matches
            if (PAYOUTS[combo]) {
                totalWin += PAYOUTS[combo];
                continue;
            }

            // Check for two of a kind in row
            const symbolCounts = new Map<string, number>();
            rowSymbols.forEach(symbol => {
                symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
            });

            for (const [symbol, count] of symbolCounts.entries()) {
                if (count === 2) {
                    const twoKind = `${symbol}${symbol}`;
                    if (PAYOUTS[twoKind]) {
                        totalWin += PAYOUTS[twoKind];
                        break;
                    }
                }
            }
        }

        // Check columns (vertical lines)
        for (let col = 0; col < COLS; col++) {
            const colSymbols = [grid[0][col], grid[1][col], grid[2][col]];
            const combo = colSymbols.join('');
            
            if (PAYOUTS[combo]) {
                totalWin += PAYOUTS[combo];
                continue;
            }

            const symbolCounts = new Map<string, number>();
            colSymbols.forEach(symbol => {
                symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
            });

            for (const [symbol, count] of symbolCounts.entries()) {
                if (count === 2) {
                    const twoKind = `${symbol}${symbol}`;
                    if (PAYOUTS[twoKind]) {
                        totalWin += PAYOUTS[twoKind];
                        break;
                    }
                }
            }
        }

        // Check diagonals
        // Top-left to bottom-right
        const diag1 = [grid[0][0], grid[1][1], grid[2][2]];
        const combo1 = diag1.join('');
        if (PAYOUTS[combo1]) {
            totalWin += PAYOUTS[combo1];
        } else {
            const symbolCounts = new Map<string, number>();
            diag1.forEach(symbol => {
                symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
            });
            for (const [symbol, count] of symbolCounts.entries()) {
                if (count === 2) {
                    const twoKind = `${symbol}${symbol}`;
                    if (PAYOUTS[twoKind]) {
                        totalWin += PAYOUTS[twoKind];
                        break;
                    }
                }
            }
        }

        // Top-right to bottom-left
        const diag2 = [grid[0][2], grid[1][1], grid[2][0]];
        const combo2 = diag2.join('');
        if (PAYOUTS[combo2]) {
            totalWin += PAYOUTS[combo2];
        } else {
            const symbolCounts = new Map<string, number>();
            diag2.forEach(symbol => {
                symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
            });
            for (const [symbol, count] of symbolCounts.entries()) {
                if (count === 2) {
                    const twoKind = `${symbol}${symbol}`;
                    if (PAYOUTS[twoKind]) {
                        totalWin += PAYOUTS[twoKind];
                        break;
                    }
                }
            }
        }

        return totalWin;
    }, []);

    const handleSpin = useCallback(() => {
        if (isSpinning || !userData.user) return;
        
        if (userData.user.balance < betAmount) {
            alert('Insufficient funds!');
            return;
        }

        // Deduct bet
        userData.removeFunds(betAmount);
        setIsSpinning(true);
        setLastWin(null);
        setLastCombination('');

        // Start spinning animation
        setReels(reels.map(() => ({ spinning: true, currentSymbol: getRandomSymbol() })));

        // Animate reels
        const spinInterval = setInterval(() => {
            setReels(prev => prev.map(reel => ({
                ...reel,
                currentSymbol: getRandomSymbol()
            })));
        }, 100);

        // Stop after duration
        setTimeout(() => {
            clearInterval(spinInterval);
            
            // Final symbols
            const finalSymbols = Array(REEL_COUNT).fill(0).map(() => getRandomSymbol());
            setReels(finalSymbols.map(symbol => ({ spinning: false, currentSymbol: symbol })));
            
            // Calculate win
            const winMultiplier = calculateWin(finalSymbols);
            const winAmount = winMultiplier > 0 ? betAmount * winMultiplier : 0;
            
            // Format combination as 3x3 grid for display
            let comboDisplay = '';
            for (let row = 0; row < ROWS; row++) {
                for (let col = 0; col < COLS; col++) {
                    comboDisplay += finalSymbols[row * COLS + col] + ' ';
                }
                comboDisplay += '\n';
            }
            setLastCombination(comboDisplay.trim());
            
            if (winAmount > 0) {
                setLastWin(winAmount);
                userData.addFunds(winAmount);
            } else {
                setLastWin(0);
            }
            
            setIsSpinning(false);
        }, SPIN_DURATION);
    }, [isSpinning, userData, betAmount, getRandomSymbol, calculateWin, reels]);

    const handleMaxBet = useCallback(() => {
        const max = userData.user?.balance ? Math.min(MAX_BET, userData.user.balance) : MAX_BET;
        setBetAmount(max);
    }, [userData.user]);

    return (
        <div style={{ 
            minHeight: '100vh', 
            backgroundColor: 'var(--color-bg)',
            padding: '20px',
            color: 'var(--color-text)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
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
>>>>>>> 0e85934 (Enhance poker game with complete No-Limit Texas Hold'em implementation - Fixed minimum raise logic (uses lastRaiseAmount) - Added community card safeguards (max 5 cards) - Removed auto-check for big blind (BB can now check/raise) - Improved betting round completion logic - Enhanced dealer/blind rotation - Fixed showdown and pot distribution)
                >
                    Back to Map
                </button>
            </div>
<<<<<<< HEAD
=======

            <h1 style={{ 
                color: 'var(--color-primary)', 
                fontSize: '3rem',
                marginBottom: '20px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}>
                🎰 Slot Machine 🎰
            </h1>

            {/* Balance Display */}
            <div style={{
                fontSize: '1.5rem',
                color: 'var(--color-primary)',
                fontWeight: 'bold',
                marginBottom: '30px'
            }}>
                Balance: ${userData.user?.balance || 0}
            </div>

            {/* Slot Machine Reels - 3x3 Grid */}
            <div style={{
                backgroundColor: 'var(--color-card-bg)',
                border: '4px solid var(--color-primary)',
                borderRadius: '20px',
                padding: '40px',
                marginBottom: '30px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                    gap: '20px',
                    maxWidth: `${COLS * 140 + (COLS - 1) * 20}px`
                }}>
                    {reels.map((reel, index) => (
                            <div
                                key={index}
                                style={{
                                    width: '120px',
                                    height: '120px',
                                    backgroundColor: '#1a1a1a',
                                    border: '3px solid var(--color-accent)',
                                    borderRadius: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '4rem',
                                    transition: reel.spinning ? 'none' : 'transform 0.3s ease',
                                    transform: reel.spinning ? 'rotateY(360deg)' : 'rotateY(0deg)',
                                }}
                            >
                                {reel.currentSymbol}
                            </div>
                    ))}
                </div>
            </div>

            {/* Last Result */}
            {lastWin !== null && (
                <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    minHeight: '40px'
                }}>
                    {lastWin > 0 ? (
                        <div style={{ color: '#22c55e' }}>
                            <div>🎉 WIN! ${lastWin} 🎉</div>
                            <div style={{ 
                                fontSize: '1.2rem', 
                                marginTop: '10px',
                                whiteSpace: 'pre-line',
                                fontFamily: 'monospace'
                            }}>
                                {lastCombination}
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: '#ef4444' }}>
                            <div>No win</div>
                            <div style={{ 
                                fontSize: '1.2rem', 
                                marginTop: '10px',
                                whiteSpace: 'pre-line',
                                fontFamily: 'monospace'
                            }}>
                                {lastCombination}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Betting Controls */}
            <div style={{
                backgroundColor: 'var(--color-card-bg)',
                borderRadius: '15px',
                padding: '25px',
                minWidth: '400px',
                textAlign: 'center'
            }}>
                <label htmlFor="slots-bet-input" style={{ display: 'block', marginBottom: '15px', fontSize: '1.2rem' }}>
                    Bet Amount: ${betAmount}
                </label>
                <input
                    id="slots-bet-input"
                    type="range"
                    min={MIN_BET}
                    max={userData.user?.balance ? Math.min(MAX_BET, userData.user.balance) : MAX_BET}
                    step={10}
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseInt(e.target.value))}
                    disabled={isSpinning}
                    style={{ width: '100%', marginBottom: '10px' }}
                    aria-label="Bet amount slider"
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                    <button
                        onClick={() => setBetAmount(MIN_BET)}
                        className="btn"
                        disabled={isSpinning}
                        style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                        Min (${MIN_BET})
                    </button>
                    <button
                        onClick={handleMaxBet}
                        className="btn"
                        disabled={isSpinning}
                        style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                        Max
                    </button>
                </div>

                {/* Spin Button */}
                <button
                    onClick={handleSpin}
                    disabled={isSpinning || !userData.user || userData.user.balance < betAmount}
                    className="btn"
                    style={{
                        fontSize: '1.5rem',
                        padding: '20px 50px',
                        width: '100%',
                        fontWeight: 'bold',
                        backgroundColor: isSpinning ? '#666' : 'var(--color-accent)',
                        cursor: isSpinning ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isSpinning ? 'SPINNING...' : '🎰 SPIN 🎰'}
                </button>
            </div>

            {/* Payout Table */}
            <div style={{
                marginTop: '30px',
                backgroundColor: 'var(--color-card-bg)',
                borderRadius: '15px',
                padding: '20px',
                maxWidth: '500px'
            }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--color-primary)' }}>Payout Table</h3>
                <div style={{ fontSize: '0.9rem', textAlign: 'left' }}>
                    <div style={{ marginBottom: '5px' }}>7️⃣ 7️⃣ 7️⃣ = 100x</div>
                    <div style={{ marginBottom: '5px' }}>💎 💎 💎 = 50x</div>
                    <div style={{ marginBottom: '5px' }}>⭐ ⭐ ⭐ = 25x</div>
                    <div style={{ marginBottom: '5px' }}>🔔 🔔 🔔 = 15x</div>
                    <div style={{ marginBottom: '5px' }}>🍊 🍊 🍊 = 10x</div>
                    <div style={{ marginBottom: '5px' }}>🍋 🍋 🍋 = 8x</div>
                    <div style={{ marginBottom: '5px' }}>🍒 🍒 🍒 = 5x</div>
                    <div style={{ marginBottom: '5px' }}>7️⃣ 7️⃣ = 10x</div>
                    <div style={{ marginBottom: '5px' }}>💎 💎 = 5x</div>
                    <div>⭐ ⭐ = 3x</div>
                </div>
            </div>
        </div>
    );
}

