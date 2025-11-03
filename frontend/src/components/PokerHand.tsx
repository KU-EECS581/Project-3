/**
 * @file PokerHand.tsx
 * @description Component for displaying a poker hand with animated cards.
 * @date 2025-01-XX
 */

import { useState, useEffect, useRef } from "react";
import { AnimatedCard } from "./AnimatedCard";
import type { Card } from "@/models";

interface PokerHandProps {
    cards: Card[];
    position: { x: number; y: number };
    cardWidth?: number;
    cardHeight?: number;
    label?: string;
    isVisible?: boolean; // For hiding opponent cards
}

/**
 * Calculates the position for a card in a hand based on its index
 * Cards are spread horizontally for better visibility
 */
function getCardPosition(
    index: number,
    baseX: number,
    baseY: number,
    cardWidth: number,
    spacing: number = 25
): { x: number; y: number } {
    return {
        x: baseX + index * spacing,
        y: baseY,
    };
}

export function PokerHand({
    cards,
    position,
    cardWidth = 100,
    cardHeight = 140,
    label,
    isVisible = true,
}: PokerHandProps) {
    const [renderedCards, setRenderedCards] = useState<Array<{ card: Card; id: string; completed: boolean }>>([]);
    const deckPosition = { x: window.innerWidth / 2 - cardWidth / 2, y: 100 };
    const animationCompleteCount = useRef(0);

    useEffect(() => {
        // When cards change, add new ones that need animation
        if (cards.length > renderedCards.length) {
            const newCards = cards.slice(renderedCards.length).map((card, idx) => ({
                card,
                id: `${card.suit}-${card.rank}-${Date.now()}-${idx}`,
                completed: false,
            }));
            setRenderedCards((prev) => [...prev, ...newCards]);
        } else if (cards.length < renderedCards.length) {
            // Cards removed, reset
            setRenderedCards([]);
        }
    }, [cards, renderedCards.length]);

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
                        fontSize: '16px',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {label}
                </div>
            )}
            {renderedCards.map((item, index) => {
                const endPos = getCardPosition(index, 0, 0, cardWidth); // Relative to parent now
                const relativeDeckPos = {
                    x: deckPosition.x - position.x,
                    y: deckPosition.y - position.y
                };
                const showFaceDown = !isVisible;

                return (
                    <AnimatedCard
                        key={item.id}
                        card={showFaceDown ? undefined : item.card}
                        faceDown={showFaceDown}
                        width={cardWidth}
                        height={cardHeight}
                        startX={relativeDeckPos.x}
                        startY={relativeDeckPos.y}
                        endX={endPos.x}
                        endY={endPos.y}
                        delay={index * 120} // Stagger animations slightly faster than blackjack
                        duration={600}
                        onAnimationComplete={() => handleCardAnimationComplete(item.id)}
                    />
                );
            })}
        </div>
    );
}

