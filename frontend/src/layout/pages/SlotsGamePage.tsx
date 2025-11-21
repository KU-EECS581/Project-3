/**
 * @file SlotsGamePage.tsx
 * @description Page wrapper for standalone slot machine game.
 * @class SlotsGamePage
 * @module Pages/Slots
 * @inputs User data, bet interactions
 * @outputs Balance mutations & win summaries
 * @external_sources React Router, UserData hook
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

// Payout multipliers for different combinations (reduced for difficulty)
const PAYOUTS: Record<string, number> = {
    '7️⃣7️⃣7️⃣': 50, // Triple 7 = jackpot (reduced from 100)
    '💎💎💎': 25, // Reduced from 50
    '⭐⭐⭐': 12, // Reduced from 25
    '🔔🔔🔔': 8, // Reduced from 15
    '🍊🍊🍊': 5, // Reduced from 10
    '🍋🍋🍋': 4, // Reduced from 8
    '🍒🍒🍒': 3, // Reduced from 5
    // Removed two-of-a-kind payouts to make it harder
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
    // Weighted symbol selection - makes rare symbols less common
    // Rarity matches multiplier: lower multiplier = more common
    const getRandomSymbol = useCallback((): string => {
        // Weighted probabilities: common symbols appear more often
        // 🍒 (3x) = 30% - most common, lowest multiplier
        // 🍋 (4x) = 20% - medium common, middle multiplier
        // 🍊 (5x) = 10% - least common of the three, highest multiplier
        // 🔔 = 5%
        // ⭐ = 3%
        // 💎 = 1.5%
        // 7️⃣ = 0.5%
        const rand = Math.random();
        if (rand < 0.30) return '🍒'; // 30% - most common (3x)
        if (rand < 0.50) return '🍋'; // 20% - medium (4x)
        if (rand < 0.60) return '🍊'; // 10% - least common of the three (5x)
        if (rand < 0.65) return '🔔';
        if (rand < 0.68) return '⭐';
        if (rand < 0.695) return '💎';
        return '7️⃣'; // Very rare
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
            
            // Check for exact matches only (removed two-of-a-kind payouts)
            if (PAYOUTS[combo]) {
                totalWin += PAYOUTS[combo];
            }
        }

        // Check columns (vertical lines)
        for (let col = 0; col < COLS; col++) {
            const colSymbols = [grid[0][col], grid[1][col], grid[2][col]];
            const combo = colSymbols.join('');
            
            // Check for exact matches only (removed two-of-a-kind payouts)
            if (PAYOUTS[combo]) {
                totalWin += PAYOUTS[combo];
            }
        }

        // Check diagonals
        // Top-left to bottom-right
        const diag1 = [grid[0][0], grid[1][1], grid[2][2]];
        const combo1 = diag1.join('');
        // Check for exact matches only (removed two-of-a-kind payouts)
        if (PAYOUTS[combo1]) {
            totalWin += PAYOUTS[combo1];
        }

        // Top-right to bottom-left
        const diag2 = [grid[0][2], grid[1][1], grid[2][0]];
        const combo2 = diag2.join('');
        // Check for exact matches only (removed two-of-a-kind payouts)
        if (PAYOUTS[combo2]) {
            totalWin += PAYOUTS[combo2];
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
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            minHeight: '100vh', 
            backgroundColor: 'var(--color-bg)',
            padding: '20px',
            color: 'var(--color-text)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '20px',
            overflow: 'auto'
        }}>
            {/* Inner container for wider layout */}
            <div style={{
                width: '100%',
                maxWidth: '1600px',
                minWidth: '1400px',
                margin: '0 auto',
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                paddingTop: '20px'
            }}>
            {/* Back to Map Button - Top Left Corner */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '40px',
                zIndex: 100
            }}>
                <button 
                    onClick={handleBackToMap}
                    className="btn"
                >
                    Back to Map
                </button>
            </div>

            {/* Left Sidebar - Payout Table */}
            <div style={{
                position: 'absolute',
                left: '40px',
                top: '80px',
                width: '220px',
                zIndex: 10
            }}>
                {/* Payout Table */}
                <div style={{
                    backgroundColor: 'var(--color-card-bg)',
                    borderRadius: '15px',
                    padding: '20px',
                    width: '100%'
                }}>
                    <h3 style={{ 
                        marginBottom: '15px', 
                        color: 'var(--color-primary)',
                        fontSize: 'clamp(1rem, 2vw, 1.3rem)',
                        textAlign: 'center'
                    }}>
                        Payout Table
                    </h3>
                    <div style={{ 
                        fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)', 
                        textAlign: 'left',
                        lineHeight: '1.8'
                    }}>
                        <div style={{ marginBottom: '8px' }}>7️⃣ 7️⃣ 7️⃣ = 50x <span style={{ color: '#ef4444', fontSize: '0.75em' }}>(0.5% rarity)</span></div>
                        <div style={{ marginBottom: '8px' }}>💎 💎 💎 = 25x <span style={{ color: '#f59e0b', fontSize: '0.75em' }}>(1.5% rarity)</span></div>
                        <div style={{ marginBottom: '8px' }}>⭐ ⭐ ⭐ = 12x <span style={{ color: '#eab308', fontSize: '0.75em' }}>(3% rarity)</span></div>
                        <div style={{ marginBottom: '8px' }}>🔔 🔔 🔔 = 8x <span style={{ color: '#a855f7', fontSize: '0.75em' }}>(5% rarity)</span></div>
                        <div style={{ marginBottom: '8px' }}>🍊 🍊 🍊 = 5x <span style={{ color: '#1e40af', fontSize: '0.75em' }}>(10% rarity)</span></div>
                        <div style={{ marginBottom: '8px' }}>🍋 🍋 🍋 = 4x <span style={{ color: '#60a5fa', fontSize: '0.75em' }}>(20% rarity)</span></div>
                        <div>🍒 🍒 🍒 = 3x <span style={{ color: '#10b981', fontSize: '0.75em' }}>(30% rarity)</span></div>
                    </div>
                </div>
            </div>

            {/* Center Content - Slot Machine and Controls */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: '540px',
                margin: '0 auto'
            }}>
                <h1 style={{ 
                    color: 'var(--color-primary)', 
                    fontSize: 'clamp(1.8rem, 4.5vw, 2.7rem)',
                    marginBottom: '20px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    textAlign: 'center'
                }}>
                    🎰 Slot Machine 🎰
                </h1>

                {/* Balance Display */}
                <div style={{
                    fontSize: 'clamp(1.08rem, 2.7vw, 1.35rem)',
                    color: 'var(--color-primary)',
                    fontWeight: 'bold',
                    marginBottom: '25px',
                    textAlign: 'center'
                }}>
                    Balance: ${userData.user?.balance || 0}
                </div>

                {/* Slot Machine Reels - 3x3 Grid */}
                <div style={{
                    backgroundColor: 'var(--color-card-bg)',
                    border: '4px solid var(--color-primary)',
                    borderRadius: '20px',
                    padding: 'clamp(18px, 3.6vw, 36px)',
                    marginBottom: '25px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                    width: '100%',
                    maxWidth: '540px'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                        gap: 'clamp(9px, 1.8vw, 18px)',
                        width: '100%'
                    }}>
                        {reels.map((reel, index) => (
                            <div
                                key={index}
                                style={{
                                    aspectRatio: '1',
                                    width: '100%',
                                    backgroundColor: '#1a1a1a',
                                    border: '3px solid var(--color-accent)',
                                    borderRadius: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 'clamp(1.8rem, 5.4vw, 3.6rem)',
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
                        fontSize: 'clamp(1.08rem, 2.7vw, 1.35rem)',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        minHeight: '40px',
                        textAlign: 'center',
                        width: '100%',
                        maxWidth: '540px'
                    }}>
                        {lastWin > 0 ? (
                            <div style={{ color: '#22c55e' }}>
                                <div>🎉 WIN! ${lastWin} 🎉</div>
                                <div style={{ 
                                    fontSize: 'clamp(0.9rem, 2.25vw, 1.08rem)', 
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
                                    fontSize: 'clamp(0.9rem, 2.25vw, 1.08rem)', 
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
                    padding: 'clamp(18px, 2.7vw, 22.5px)',
                    width: '100%',
                    maxWidth: '540px',
                    textAlign: 'center'
                }}>
                    <label htmlFor="slots-bet-input" style={{ 
                        display: 'block', 
                        marginBottom: '15px', 
                        fontSize: 'clamp(0.9rem, 2.25vw, 1.08rem)' 
                    }}>
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
                    <div style={{ 
                        display: 'flex', 
                        gap: '10px', 
                        justifyContent: 'center', 
                        marginBottom: '20px',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={() => setBetAmount(MIN_BET)}
                            className="btn"
                            disabled={isSpinning}
                            style={{ 
                                padding: 'clamp(5.4px, 1.35vw, 7.2px) clamp(10.8px, 2.7vw, 14.4px)', 
                                fontSize: 'clamp(0.72rem, 1.8vw, 0.81rem)' 
                            }}
                        >
                            Min (${MIN_BET})
                        </button>
                        <button
                            onClick={handleMaxBet}
                            className="btn"
                            disabled={isSpinning}
                            style={{ 
                                padding: 'clamp(5.4px, 1.35vw, 7.2px) clamp(10.8px, 2.7vw, 14.4px)', 
                                fontSize: 'clamp(0.72rem, 1.8vw, 0.81rem)' 
                            }}
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
                            fontSize: 'clamp(1.08rem, 2.7vw, 1.35rem)',
                            padding: 'clamp(13.5px, 2.7vw, 18px) clamp(36px, 7.2vw, 45px)',
                            width: '100%',
                            fontWeight: 'bold',
                            backgroundColor: isSpinning ? '#666' : 'var(--color-accent)',
                            cursor: isSpinning ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isSpinning ? 'SPINNING...' : '🎰 SPIN 🎰'}
                    </button>
                </div>
            </div>
            </div>
        </div>
    );
}

