/**
 * @file Card.ts
 * @description Contains card types, suits, ranks, and helper utilities.
 * @class Card
 * @module Cards
 * @inputs Suit, Rank parameters for constructors and helpers
 * @outputs Card instances and card utility functions
 * @external_sources zod (runtime schema validation)
 * @author Aiden Burke
 * @date 2025-10-27
 */
import * as z from 'zod';

// Enums objs for card suits and ranks
export const Suit =  {
    HEARTS: "HEARTS",
    DIAMONDS: "DIAMONDS",
    CLUBS: "CLUBS",
    SPADES: "SPADES"
} as const;

export type Suit = typeof Suit[keyof typeof Suit];

export const Rank = {
    TWO: "2",
    THREE: "3",
    FOUR: "4",
    FIVE: "5",
    SIX: "6",
    SEVEN: "7",
    EIGHT: "8",
    NINE: "9",
    TEN: "10",
    JACK: "JACK",
    QUEEN: "QUEEN",
    KING: "KING",
    ACE: "ACE"
} as const;

export type Rank = typeof Rank[keyof typeof Rank];

// Converters for user view
export function suitToSymbol(suit: Suit): string {
    switch (suit) {
        case Suit.HEARTS: return "♥";
        case Suit.DIAMONDS: return "♦";
        case Suit.CLUBS: return "♣";
        case Suit.SPADES: return "♠";
        default: return "";
    }
}

export function rankToDisplay(rank: Rank): string {
    switch (rank) {
        case Rank.TWO: return "2";
        case Rank.THREE: return "3";
        case Rank.FOUR: return "4";
        case Rank.FIVE: return "5";
        case Rank.SIX: return "6";
        case Rank.SEVEN: return "7";
        case Rank.EIGHT: return "8";
        case Rank.NINE: return "9";
        case Rank.TEN: return "10";
        case Rank.JACK: return "J";
        case Rank.QUEEN: return "Q";
        case Rank.KING: return "K";
        case Rank.ACE: return "A";
        default: return "";
    }
}

// Helper functions for card properties
export function isAce(rank: Rank) {
    return rank === Rank.ACE;
}

export function isFaceCard(rank: Rank) {
    return rank === Rank.JACK || rank === Rank.QUEEN || rank === Rank.KING;
}

export function isBlackSuit(suit: Suit) {
    return suit === Suit.SPADES || suit === Suit.CLUBS;
}

export function isRedSuit(suit: Suit) {
    return suit === Suit.HEARTS || suit === Suit.DIAMONDS;
}

// Zod schema for serialization of Card
export const CardSchema = z.object({
    suit: z.nativeEnum(Suit as unknown as Record<string, string>).or(z.enum(["HEARTS","DIAMONDS","CLUBS","SPADES"])),
    rank: z.enum(["2","3","4","5","6","7","8","9","10","JACK","QUEEN","KING","ACE"]),
});


// Card class with comparative logic based on rank
export class Card {
    suit: Suit;
    rank: Rank;
    constructor(suit: Suit, rank: Rank) {
        this.suit = suit;
        this.rank = rank;
    }

    // Comparison helper methods based on rank
    equals(other: Card): boolean {
        return this.rank === other.rank;
    }
    lessThan(other: Card): boolean {
        return Card.rankValue(this.rank) < Card.rankValue(other.rank);
    }
    greaterThan(other: Card): boolean {
        return Card.rankValue(this.rank) > Card.rankValue(other.rank);
    }
    // Map rank to numerical value for comparison
    private static rankValue(rank: Rank): number {
        const rankOrder: Record<Rank, number> = {
            [Rank.TWO]: 2,
            [Rank.THREE]: 3,
            [Rank.FOUR]: 4,
            [Rank.FIVE]: 5,
            [Rank.SIX]: 6,
            [Rank.SEVEN]: 7,
            [Rank.EIGHT]: 8,
            [Rank.NINE]: 9,
            [Rank.TEN]: 10,
            [Rank.JACK]: 11,
            [Rank.QUEEN]: 12,
            [Rank.KING]: 13,
            [Rank.ACE]: 14
        };
        return rankOrder[rank];
    }
}