/**
 * @file DeckProvider.tsx
 * @description Provider for managing a shared deck of cards.
 * @date 2025-01-XX
 */

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { DeckContext } from "./DeckContext";
import { createShuffledDeck, shuffleDeck, dealCard as dealCardUtil } from "@/utils/deck";
import type { Card } from "@/models";

export function DeckProvider({ children }: { children: React.ReactNode }) {
    const [deck, setDeck] = useState<Card[]>(() => createShuffledDeck());
    const [dealtCards, setDealtCards] = useState<Card[]>([]);
    const deckRef = useRef<Card[]>(deck); // Keep ref in sync with state

    // Sync ref with state
    useEffect(() => {
        deckRef.current = deck;
    }, [deck]);

    const dealCard = useCallback((): Card | null => {
        const currentDeck = deckRef.current;
        
        if (currentDeck.length === 0) {
            return null;
        }

        const result = dealCardUtil(currentDeck);
        deckRef.current = result.remainingDeck; // Update ref immediately
        setDeck(result.remainingDeck); // Update state
        setDealtCards((prev) => [...prev, result.card]);
        return result.card;
    }, []); // No dependencies - uses ref for current state

    const dealCards = useCallback((count: number): Card[] => {
        const currentDeck = deckRef.current;
        const cards: Card[] = [];
        let workingDeck = [...currentDeck];
        
        for (let i = 0; i < count && workingDeck.length > 0; i++) {
            const result = dealCardUtil(workingDeck);
            cards.push(result.card);
            workingDeck = result.remainingDeck;
        }

        deckRef.current = workingDeck; // Update ref immediately
        setDeck(workingDeck); // Update state
        setDealtCards((prev) => [...prev, ...cards]);
        return cards;
    }, []); // No dependencies - uses ref for current state

    const shuffleDeckHandler = useCallback(() => {
        const shuffled = shuffleDeck([...deckRef.current]);
        deckRef.current = shuffled;
        setDeck(shuffled);
    }, []);

    const resetDeck = useCallback(() => {
        const newDeck = createShuffledDeck();
        deckRef.current = newDeck;
        setDeck(newDeck);
        setDealtCards([]);
    }, []);

    const isDeckEmpty = useMemo(() => deck.length === 0, [deck]);

    return (
        <DeckContext.Provider
            value={{
                deck,
                dealtCards,
                dealCard,
                dealCards,
                shuffleDeck: shuffleDeckHandler,
                resetDeck,
                isDeckEmpty,
            }}
        >
            {children}
        </DeckContext.Provider>
    );
}

