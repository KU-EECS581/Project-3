/**
 * @file DeckContext.tsx
 * @description Context for managing a shared deck of cards.
 * @date 2025-01-XX
 */

import { createContext } from "react";
import type { Card } from "@/models";

export interface DeckContextProps {
    deck: Card[];
    dealtCards: Card[];
    dealCard: () => Card | null;
    dealCards: (count: number) => Card[];
    shuffleDeck: () => void;
    resetDeck: () => void;
    isDeckEmpty: boolean;
}

export const DeckContext = createContext<DeckContextProps | undefined>(undefined);

