/**
 * @file deck.ts
 * @description Utilities for creating and managing decks of cards.
 * @date 2025-01-XX
 */

import type { Card } from "@/models";
import { CardSuit, CardRank } from "@/enums";

/**
 * Creates a standard 52-card deck
 */
export function createDeck(): Card[] {
    const deck: Card[] = [];
    
    for (const suit of Object.values(CardSuit)) {
        for (const rank of Object.values(CardRank)) {
            deck.push({ suit, rank });
        }
    }
    
    return deck;
}

/**
 * Shuffles a deck using Fisher-Yates algorithm
 */
export function shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
}

/**
 * Creates and returns a shuffled deck
 */
export function createShuffledDeck(): Card[] {
    return shuffleDeck(createDeck());
}

/**
 * Deals a card from the top of the deck (removes and returns it)
 */
export function dealCard(deck: Card[]): { card: Card; remainingDeck: Card[] } {
    if (deck.length === 0) {
        throw new Error("Cannot deal from an empty deck");
    }
    
    const card = deck[0];
    const remainingDeck = deck.slice(1);
    
    return { card, remainingDeck };
}

/**
 * Deals multiple cards from the deck
 */
export function dealCards(deck: Card[], count: number): { cards: Card[]; remainingDeck: Card[] } {
    if (deck.length < count) {
        throw new Error(`Cannot deal ${count} cards from a deck with only ${deck.length} cards`);
    }
    
    const cards = deck.slice(0, count);
    const remainingDeck = deck.slice(count);
    
    return { cards, remainingDeck };
}

