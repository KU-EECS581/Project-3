import { useState, useEffect, useCallback } from 'react';

export interface BlackjackStats {
    wins: number;
    losses: number;
    winRate: number; // percentage
}

const STORAGE_KEY_SINGLEPLAYER = 'blackjack_stats_singleplayer';
const STORAGE_KEY_MULTIPLAYER = 'blackjack_stats_multiplayer';

export function useBlackjackStats(mode: 'singleplayer' | 'multiplayer') {
    const storageKey = mode === 'singleplayer' ? STORAGE_KEY_SINGLEPLAYER : STORAGE_KEY_MULTIPLAYER;
    
    const [stats, setStats] = useState<BlackjackStats>(() => {
        // Load from localStorage on init
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                return {
                    wins: parsed.wins || 0,
                    losses: parsed.losses || 0,
                    winRate: parsed.winRate || 0
                };
            }
        } catch (e) {
            console.error('Error loading blackjack stats:', e);
        }
        return { wins: 0, losses: 0, winRate: 0 };
    });

    // Save to localStorage whenever stats change
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(stats));
        } catch (e) {
            console.error('Error saving blackjack stats:', e);
        }
    }, [stats, storageKey]);

    const recordResult = useCallback((result: 'win' | 'loss' | 'push' | 'blackjack') => {
        setStats(prev => {
            let newWins = prev.wins;
            let newLosses = prev.losses;
            
            // Only count wins and losses (not pushes)
            if (result === 'win' || result === 'blackjack') {
                newWins = prev.wins + 1;
            } else if (result === 'loss') {
                newLosses = prev.losses + 1;
            }
            
            // Calculate win rate
            const totalGames = newWins + newLosses;
            const winRate = totalGames > 0 ? (newWins / totalGames) * 100 : 0;
            
            return {
                wins: newWins,
                losses: newLosses,
                winRate: Math.round(winRate * 100) / 100 // Round to 2 decimal places
            };
        });
    }, []);

    const resetStats = useCallback(() => {
        setStats({ wins: 0, losses: 0, winRate: 0 });
    }, []);

    return { stats, recordResult, resetStats };
}

