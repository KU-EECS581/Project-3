/**
 * @file deck.ts
 * @description Simple deck utilities for client-side poker UI.
 */

import type { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['♠','♥','♦','♣'];
const RANKS: Rank[] = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];

export function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }
    return deck;
}

export function shuffle(deck: Card[]): Card[] {
    const d = [...deck];
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
}

export function draw(deck: Card[], count: number): [Card[], Card[]] {
    const drawn = deck.slice(0, count);
    const rest = deck.slice(count);
    return [drawn, rest];
}
