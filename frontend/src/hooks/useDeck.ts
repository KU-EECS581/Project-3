/**
 * @file useDeck.ts
 * @description Hook for accessing the deck context.
 * @class useDeck
 * @module Hooks/Deck
 * @inputs React context (DeckContext)
 * @outputs Deck state & helpers from provider
 * @external_sources React
 * @author Riley Meyerkorth
 * @date 2025-01-XX
 */

import { useContext } from "react";
import { DeckContext } from "@/contexts";

export function useDeck() {
    const context = useContext(DeckContext);
    if (context === undefined) {
        throw new Error("useDeck must be used within a DeckProvider");
    }
    return context;
}

