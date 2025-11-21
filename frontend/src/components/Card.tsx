/**
 * @file Card.tsx
 * @description Component that renders a playing card as an SVG.
 * @class Card (React Component)
 * @module Components/Cards
 * @inputs Card props (card, faceDown, width, height, className)
 * @outputs SVG-rendered playing card element
 * @external_sources React
 * @author Riley Meyerkorth
 * @date 2025-01-XX
 */

import React from "react";
import type { Card as CardModel } from "@/models";
import { CardSuit, CardRank } from "@/enums";
import type { CardSuitType, CardRankType } from "@/enums";

interface CardProps {
    card?: CardModel;
    faceDown?: boolean;
    width?: number;
    height?: number;
    className?: string;
}

/**
 * Gets the symbol for a card suit (Unicode character)
 */
function getSuitSymbol(suit: CardSuitType): string {
    switch (suit) {
        case CardSuit.SPADES:
            return '♠';
        case CardSuit.HEARTS:
            return '♥';
        case CardSuit.DIAMONDS:
            return '♦';
        case CardSuit.CLUBS:
            return '♣';
    }
}

/**
 * Gets the color for a card suit
 * Spades and Clubs are black, Hearts and Diamonds are red
 */
function getSuitColor(suit: CardSuitType): string {
    return suit === CardSuit.HEARTS || suit === CardSuit.DIAMONDS ? '#dc2626' : '#000000';
}

/**
 * Gets the display text for a card rank
 */
function getRankText(rank: CardRankType): string {
    switch (rank) {
        case CardRank.ACE:
            return 'A';
        case CardRank.JACK:
            return 'J';
        case CardRank.QUEEN:
            return 'Q';
        case CardRank.KING:
            return 'K';
        default:
            return rank;
    }
}

/**
 * Renders a card face-down (back of card)
 */
function renderCardBack(width: number, height: number): React.ReactElement {
    const cornerRadius = width * 0.08;
    const viewBoxPadding = 2; // Add small padding to prevent clipping
    
    return (
        <svg width={width} height={height} viewBox={`-${viewBoxPadding} -${viewBoxPadding} ${width + viewBoxPadding * 2} ${height + viewBoxPadding * 2}`} style={{ display: 'block' }}>
            <defs>
                <linearGradient id="cardBackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1a237e" />
                    <stop offset="50%" stopColor="#283593" />
                    <stop offset="100%" stopColor="#1a237e" />
                </linearGradient>
                <pattern id="cardBackPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="1" fill="#ffffff" opacity="0.1" />
                </pattern>
            </defs>
            <rect
                x="0"
                y="0"
                width={width}
                height={height}
                rx={cornerRadius}
                fill="url(#cardBackGradient)"
                stroke="#0d47a1"
                strokeWidth={width * 0.02}
            />
            <rect
                x={width * 0.05}
                y={width * 0.05}
                width={width * 0.9}
                height={height * 0.9}
                rx={cornerRadius * 0.7}
                fill="url(#cardBackPattern)"
            />
            {/* Casino logo/text in center */}
            <text
                x={width / 2}
                y={height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={width * 0.15}
                fill="#ffffff"
                opacity="0.3"
                fontFamily="serif"
                fontWeight="bold"
            >
                CC
            </text>
        </svg>
    );
}

/**
 * Renders a card face-up
 */
function renderCardFace(card: CardModel, width: number, height: number): React.ReactElement {
    const cornerRadius = width * 0.08;
    const padding = width * 0.1;
    const suitSize = width * 0.12;
    const rankSize = width * 0.18;
    const viewBoxPadding = 2; // Add small padding to prevent clipping
    
    const suitSymbol = getSuitSymbol(card.suit);
    const suitColor = getSuitColor(card.suit);
    const rankText = getRankText(card.rank);
    
    return (
        <svg width={width} height={height} viewBox={`-${viewBoxPadding} -${viewBoxPadding} ${width + viewBoxPadding * 2} ${height + viewBoxPadding * 2}`} style={{ display: 'block' }}>
            <defs>
                <linearGradient id="cardFrontGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f5f5f5" />
                </linearGradient>
            </defs>
            
            {/* Card background */}
            <rect
                x="0"
                y="0"
                width={width}
                height={height}
                rx={cornerRadius}
                fill="url(#cardFrontGradient)"
                stroke="#cccccc"
                strokeWidth={width * 0.01}
            />
            
            {/* Top-left rank */}
            <text
                x={padding}
                y={padding + rankSize}
                fontSize={rankSize}
                fill={suitColor}
                fontFamily="Arial, sans-serif"
                fontWeight="bold"
            >
                {rankText}
            </text>
            
            {/* Top-left suit */}
            <text
                x={padding}
                y={padding + rankSize + suitSize + width * 0.02}
                fontSize={suitSize}
                fill={suitColor}
                fontFamily="serif"
            >
                {suitSymbol}
            </text>
            
            {/* Bottom-right rank (upside down) - match top-left padding visually */}
            <text
                x={width - padding - 4}
                y={height - padding - suitSize}
                fontSize={rankSize}
                fill={suitColor}
                fontFamily="Arial, sans-serif"
                fontWeight="bold"
                textAnchor="end"
                dominantBaseline="hanging"
                transform={`rotate(180 ${width - padding - 4} ${height - padding - suitSize})`}
            >
                {rankText}
            </text>
            
            {/* Bottom-right suit (upside down) - match top-left padding visually */}
            <text
                x={width - padding - 4}
                y={height - padding}
                fontSize={suitSize}
                fill={suitColor}
                fontFamily="serif"
                textAnchor="end"
                dominantBaseline="hanging"
                transform={`rotate(180 ${width - padding - 4} ${height - padding})`}
            >
                {suitSymbol}
            </text>
            
            {/* Center suit symbol (larger) */}
            <text
                x={width / 2}
                y={height / 2}
                fontSize={suitSize * 2.5}
                fill={suitColor}
                fontFamily="serif"
                textAnchor="middle"
                dominantBaseline="middle"
                opacity={0.2}
            >
                {suitSymbol}
            </text>
            
            {/* Pattern for face cards */}
            {(card.rank === CardRank.JACK || card.rank === CardRank.QUEEN || card.rank === CardRank.KING) && (
                <g opacity={0.15}>
                    {/* Decorative pattern for face cards */}
                    <circle cx={width * 0.3} cy={height * 0.4} r={width * 0.04} fill={suitColor} />
                    <circle cx={width * 0.7} cy={height * 0.4} r={width * 0.04} fill={suitColor} />
                    <circle cx={width * 0.3} cy={height * 0.6} r={width * 0.04} fill={suitColor} />
                    <circle cx={width * 0.7} cy={height * 0.6} r={width * 0.04} fill={suitColor} />
                    <circle cx={width * 0.5} cy={height * 0.5} r={width * 0.06} fill={suitColor} />
                </g>
            )}
        </svg>
    );
}

export function Card({ card, faceDown = false, width = 100, height = 140, className }: CardProps) {
    return (
        <span 
            className={className} 
            style={{ 
                display: 'inline-block', 
                lineHeight: 0,
                verticalAlign: 'middle',
                textAlign: 'center',
                overflow: 'visible'
            }}
        >
            {faceDown || !card
                ? renderCardBack(width, height)
                : renderCardFace(card, width, height)
            }
        </span>
    );
}

