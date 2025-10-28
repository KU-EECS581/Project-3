/**
 * @file Card.ts
 * @description Contains card types, suits, ranks, helpers
 * @author Aiden Burke
 * @date 2025-10-27
 */

// Enums for card suits and ranks
export enum Suit {
    HEARTS = "HEARTS",
    DIAMONDS = "DIAMONDS",
    CLUBS = "CLUBS",
    SPADES = "SPADES"
}

export enum Rank {
    TWO = "2",
    THREE = "3",
    FOUR = "4",
    FIVE = "5",
    SIX = "6",
    SEVEN = "7",
    EIGHT = "8",
    NINE = "9",
    TEN = "10",
    JACK = "JACK",
    QUEEN = "QUEEN",
    KING = "KING",
    ACE = "ACE"
}

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