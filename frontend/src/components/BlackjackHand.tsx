/**
 * @file BlackjackHand.tsx
 * @description Component for displaying a blackjack hand with animated cards.
 * @date 2025-01-XX
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { AnimatedCard } from "./AnimatedCard";
import type { Card } from "@/models";

interface BlackjackHandProps {
    cards: Card[];
    hideFirstCard?: boolean; // For dealer's hidden card
    position: { x: number; y: number };
    cardWidth?: number;
    cardHeight?: number;
    label?: string;
    deckPosition?: { x: number; y: number }; // Optional deck position for animations
    keyPrefix?: string; // Optional prefix for unique keys (e.g., player name or seat ID)
}

/**
 * Calculates the position for a card in a hand based on its index
 */
function getCardPosition(
    index: number,
    baseX: number,
    baseY: number,
    cardWidth: number,
    spacing?: number
): { x: number; y: number } {
    // Responsive spacing based on card width (about 25% of card width, minimum 20px)
    const cardSpacing = spacing ?? Math.max(20, cardWidth * 0.25);
    return {
        x: baseX + index * cardSpacing,
        y: baseY,
    };
}

export function BlackjackHand({
    cards,
    hideFirstCard = false,
    position,
    cardWidth = 120,
    cardHeight = 168,
    label,
    deckPosition,
    keyPrefix = '',
}: BlackjackHandProps) {
    const [renderedCards, setRenderedCards] = useState<Array<{ card: Card; id: string; completed: boolean }>>([]);
    const defaultDeckPosition = deckPosition || { 
        x: typeof window !== 'undefined' ? window.innerWidth - 200 : 0, 
        y: typeof window !== 'undefined' ? window.innerHeight - 250 : 100 
    };
    const animationCompleteCount = useRef(0);
    const lastCardsSignatureRef = useRef<string>('');
    
    // Create a stable signature for the cards array
    const cardsSignature = useMemo(() => 
        cards.map(c => `${c.suit}-${c.rank}`).join(','), 
        [cards]
    );

    useEffect(() => {
        
        // If cards have changed significantly (different cards, not just more), reset
        if (cards.length === 0) {
            setRenderedCards([]);
            lastCardsSignatureRef.current = '';
            return;
        }
        
        // Check if this is a completely new hand (different cards, not just more cards added)
        const currentSignature = cardsSignature;
        const isNewHand = currentSignature !== lastCardsSignatureRef.current && 
            (cards.length < renderedCards.length || 
             cards.length === renderedCards.length ||
             lastCardsSignatureRef.current === '');
        
        if (isNewHand) {
            setRenderedCards([]);
            lastCardsSignatureRef.current = '';
        }
        
        // Add new cards that need animation
        // Only add cards that are new (not already rendered)
        if (cards.length > renderedCards.length) {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 9);
            const uniqueId = `${keyPrefix ? keyPrefix + '-' : ''}${timestamp}-${random}`;
            const newCards = cards.slice(renderedCards.length).map((card, idx) => ({
                card,
                id: `${uniqueId}-${card.suit}-${card.rank}-${renderedCards.length + idx}`,
                completed: false,
            }));
            setRenderedCards((prev) => {
                const updated = [...prev, ...newCards];
                lastCardsSignatureRef.current = updated.map(c => `${c.card.suit}-${c.card.rank}`).join(',');
                return updated;
            });
        }
    }, [cards, cardsSignature, keyPrefix, renderedCards.length]);

    const handleCardAnimationComplete = (cardId: string) => {
        setRenderedCards((prev) =>
            prev.map((item) => (item.id === cardId ? { ...item, completed: true } : item))
        );
        animationCompleteCount.current += 1;
    };

    return (
        <div style={{ 
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
            minHeight: `${cardHeight + 40}px`,
            zIndex: 10
        }}>
            {label && (
                <div
                    style={{
                        position: 'absolute',
                        left: '0px',
                        top: '-30px',
                        color: '#f5f5f5',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {label}
                </div>
            )}
            {renderedCards.map((item, index) => {
                const isHidden = hideFirstCard && index === 0;
                const endPos = getCardPosition(index, 0, 0, cardWidth); // Relative to parent now
                const relativeDeckPos = {
                    x: defaultDeckPosition.x - position.x,
                    y: defaultDeckPosition.y - position.y
                };

                return (
                    <AnimatedCard
                        key={item.id}
                        cardId={item.id}
                        card={isHidden ? undefined : item.card}
                        faceDown={isHidden}
                        width={cardWidth}
                        height={cardHeight}
                        startX={relativeDeckPos.x}
                        startY={relativeDeckPos.y}
                        endX={endPos.x}
                        endY={endPos.y}
                        delay={index * 200} // Stagger animations
                        duration={800} // Faster animation
                        onAnimationComplete={() => handleCardAnimationComplete(item.id)}
                    />
                );
            })}
        </div>
    );
}

