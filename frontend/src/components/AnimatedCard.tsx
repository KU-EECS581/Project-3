/**
 * @file AnimatedCard.tsx
 * @description Imperative animation wrapper moving a playing card from deck to target.
 * @class AnimatedCard
 * @module Components/Cards
 * @inputs card model, start/end coords, timing (duration/delay), faceDown
 * @outputs Animated positioned Card component
 * @external_sources React (hooks)
 * @author Riley Meyerkorth
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
 * Optimized for performance using direct DOM manipulation during animation
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
    duration = 400,
    delay = 0,
    cardId,
}: AnimatedCardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>();
    const timeoutRef = useRef<number>();
    const hasAnimatedRef = useRef<string | null>(null);
    const finalPositionRef = useRef<{ x: number; y: number } | null>(null);
    const isAnimatingRef = useRef(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // CRITICAL: If this card has already animated, stay at final position
        if (hasAnimatedRef.current === cardId && finalPositionRef.current) {
            const pos = finalPositionRef.current;
            container.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
            container.style.willChange = 'auto';
            container.style.zIndex = '1';
            return;
        }

        // If cardId is null/undefined but we have a final position, use it
        if (!cardId && finalPositionRef.current) {
            const pos = finalPositionRef.current;
            container.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
            return;
        }

        // If no start position, just render at end position
        if (startX === undefined && startY === undefined) {
            container.style.transform = `translate(${endX}px, ${endY}px)`;
            finalPositionRef.current = { x: endX, y: endY };
            hasAnimatedRef.current = cardId || null;
            return;
        }

        // Set initial position
        const startPosX = startX ?? endX;
        const startPosY = startY ?? endY;
        container.style.transform = `translate(${startPosX}px, ${startPosY}px)`;
        container.style.willChange = 'transform';
        container.style.zIndex = '1000';

        // Delay before animation starts
        timeoutRef.current = window.setTimeout(() => {
            isAnimatingRef.current = true;
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                if (!container) return;
                
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function (ease-out cubic)
                const eased = 1 - Math.pow(1 - progress, 3);

                const newX = startPosX + (endX - startPosX) * eased;
                const newY = startPosY + (endY - startPosY) * eased;

                // Direct DOM manipulation - no React re-renders!
                container.style.transform = `translate(${newX}px, ${newY}px)`;

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    // Animation complete
                    isAnimatingRef.current = false;
                    finalPositionRef.current = { x: endX, y: endY };
                    hasAnimatedRef.current = cardId || null;
                    container.style.transform = `translate(${endX}px, ${endY}px)`;
                    container.style.willChange = 'auto';
                    container.style.zIndex = '1';
                    
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
            isAnimatingRef.current = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardId]); // ONLY re-animate if cardId changes

    // Initial position for first render
    const initialX = startX ?? endX;
    const initialY = startY ?? endY;

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${initialX}px, ${initialY}px)`,
                willChange: 'transform',
                zIndex: 1000,
            }}
        >
            <Card card={card} faceDown={faceDown} width={width} height={height} />
        </div>
    );
}

