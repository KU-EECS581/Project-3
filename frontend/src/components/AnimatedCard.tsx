/**
 * @file AnimatedCard.tsx
 * @description Component that animates a card from one position to another.
 * @date 2025-01-XX
 */

import { useEffect, useState, useRef } from "react";
import { Card } from "./Card";
import type { Card as CardModel } from "@/models";

interface AnimatedCardProps {
    card?: CardModel;
    faceDown?: boolean;
    width?: number;
    height?: number;
    className?: string;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    onAnimationComplete?: () => void;
    duration?: number; // Animation duration in ms
    delay?: number; // Delay before animation starts in ms
    cardId?: string; // Unique ID to track if this card has animated
}

/**
 * AnimatedCard component that smoothly moves a card from start to end position
 */
export function AnimatedCard({
    card,
    faceDown = false,
    width = 100,
    height = 140,
    className,
    startX,
    startY,
    endX = 0,
    endY = 0,
    onAnimationComplete,
    duration = 800,
    delay = 0,
    cardId,
}: AnimatedCardProps) {
    const [position, setPosition] = useState({ x: startX ?? endX, y: startY ?? endY });
    const [isAnimating, setIsAnimating] = useState(false);
    const animationRef = useRef<number>();
    const timeoutRef = useRef<number>();
    const hasAnimatedRef = useRef<string | null>(null); // Track which cardId has animated
    const finalPositionRef = useRef<{ x: number; y: number } | null>(null); // Lock final position

    useEffect(() => {
        // CRITICAL: If this card has already animated, stay at final position and ignore all prop changes
        if (hasAnimatedRef.current === cardId && finalPositionRef.current) {
            setPosition(finalPositionRef.current);
            return; // Don't re-animate, ever
        }

        // If cardId is null/undefined but we have a final position, use it
        if (!cardId && finalPositionRef.current) {
            setPosition(finalPositionRef.current);
            return;
        }

        // If no start position, just render at end position (already placed card)
        if (startX === undefined && startY === undefined) {
            setPosition({ x: endX, y: endY });
            finalPositionRef.current = { x: endX, y: endY };
            hasAnimatedRef.current = cardId || null;
            return;
        }

        // Set initial position
        const startPosX = startX ?? endX;
        const startPosY = startY ?? endY;
        setPosition({ 
            x: startPosX, 
            y: startPosY 
        });

        // Delay before animation starts
        timeoutRef.current = window.setTimeout(() => {
            setIsAnimating(true);
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function (ease-out cubic)
                const eased = 1 - Math.pow(1 - progress, 3);

                const newPos = {
                    x: startPosX + (endX - startPosX) * eased,
                    y: startPosY + (endY - startPosY) * eased,
                };

                setPosition(newPos);

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    // Animation complete - lock position
                    setIsAnimating(false);
                    finalPositionRef.current = { x: endX, y: endY };
                    hasAnimatedRef.current = cardId || null;
                    setPosition({ x: endX, y: endY }); // Ensure exact final position
                    if (onAnimationComplete) {
                        onAnimationComplete();
                    }
                }
            };

            animationRef.current = requestAnimationFrame(animate);
        }, delay);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardId]); // ONLY re-animate if cardId changes (new card). Ignore position changes for already-animated cards.

    return (
        <div
            className={className}
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                transition: isAnimating ? 'none' : 'transform 0.2s ease-out',
                zIndex: isAnimating ? 1000 : 1,
            }}
        >
            <Card card={card} faceDown={faceDown} width={width} height={height} />
        </div>
    );
}

