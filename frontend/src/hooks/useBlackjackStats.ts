import { useState, useEffect, useCallback } from 'react';

export interface BlackjackStats {
    wins: number;
    losses: number;
    winRate: number; // percentage
}

const STORAGE_KEY_SINGLEPLAYER = 'blackjack_stats_singleplayer';
const STORAGE_KEY_MULTIPLAYER = 'blackjack_stats_multiplayer';

const loadStatsFromStorage = (storageKey: string): BlackjackStats => {
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
};

const statsAreEqual = (a: BlackjackStats, b: BlackjackStats) =>
    a.wins === b.wins && a.losses === b.losses && a.winRate === b.winRate;

const buildStorageKey = (mode: 'singleplayer' | 'multiplayer', identifier?: string | null) => {
    const baseKey = mode === 'singleplayer' ? STORAGE_KEY_SINGLEPLAYER : STORAGE_KEY_MULTIPLAYER;
    if (identifier && identifier.trim().length > 0) {
        return `${baseKey}_${identifier.trim().toLowerCase()}`;
    }
    return baseKey;
};

export function useBlackjackStats(mode: 'singleplayer' | 'multiplayer', identifier?: string | null) {
    const storageKey = buildStorageKey(mode, identifier);

    const [stats, setStats] = useState<BlackjackStats>(() => loadStatsFromStorage(storageKey));

    // When the identifier or mode changes, reload stats from the correct storage key
    useEffect(() => {
        const loadedStats = loadStatsFromStorage(storageKey);
        setStats(prev => (statsAreEqual(prev, loadedStats) ? prev : loadedStats));
    }, [storageKey]);

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

