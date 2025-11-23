/**
 * @file DeckContext.tsx
 * @description React context for shared deck state & operations.
 * @class DeckContext
 * @module Contexts/Deck
 * @inputs N/A
 * @outputs DeckContext object
 * @external_sources React
 * @author Riley Meyerkorth
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

