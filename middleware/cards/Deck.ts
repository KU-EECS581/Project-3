/**
 * @file Deck.ts
 * @description Contains deck functionality for card games, including shuffling and dealing.
 * @author Aiden Burke
 * @date 2025-10-27
 */

import { Card, Suit, Rank } from "./Card";

// Deck class to manage a collection of cards
export class Deck {
    private cards: Card[];
    private discards: Card[];

    constructor() {
        this.cards = [];
        this.discards = [];
        this.initializeDeck();
    }

    private initializeDeck(): void {
        for (const suit of Object.values(Suit)) {
            for (const rank of Object.values(Rank)) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    // Perform a single riffle shuffle
    private riffleShuffle(): void {
        // Split the deck approximately in half and interleave the cards
        const shuffled: Card[] = [];
        const approxHalf = Math.floor(this.cards.length / 2 + this.randomInt(-4, 4));

        let half1 = this.cards.slice(0, approxHalf);
        let half2 = this.cards.slice(approxHalf);

        while (half1.length > 0 || half2.length > 0) {
            // if either half is empty, append the rest of the other half
            if (half1.length === 0) {
                shuffled.push(...half2);
                break;
            } else if (half2.length === 0) {
                shuffled.push(...half1);
                break;
            }
            
            // Randomly choose from which half to take the next card, with slight bias
            const bias = 0.5 + this.randomInt(-100, 100) / 1000;
            if (Math.random() > bias) {
                shuffled.push(half1.shift()!);
            } else {
                shuffled.push(half2.shift()!);
            }
        }

        this.cards = shuffled;
    }

    // Shuffle the deck using multiple riffle shuffles and a cut (traditional shuffle for poker)
    shuffle(times: number = 7): void {
        this.cards.push(...this.discards);
        this.discards = [];

        for (let i = 0; i < times; i++) {
            this.riffleShuffle();
        }

        const cut = this.randomInt(5, this.cards.length - 5);
        this.cards = this.cards.slice(cut).concat(this.cards.slice(0, cut));
    }

    // Deal a card from the top of the deck
    dealCard(): Card | undefined {
        const card = this.cards.pop();
        if (card) this.discards.push(card);
        return card;
    }

    // Reset the deck to a full, unshuffled state
    reset(): void {
        this.cards = [];
        this.discards = [];
        this.initializeDeck();
    }

    // Helper method to generate a random integer between min and max (inclusive)
    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}