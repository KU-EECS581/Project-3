/**
 * @file Chip.tsx
 * @description Casino chip SVG component with value-based coloring.
 * @class Chip
 * @module Components/Casino
 * @inputs value (number), size, color override, style/className
 * @outputs <Chip/> visual SVG element
 * @external_sources React
 * @author Riley Meyerkorth
 * @date 2025-01-XX
 */

import React from "react";

interface ChipProps {
    value?: number;
    size?: number;
    color?: string;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Gets chip color based on value
 */
function getChipColor(value: number): string {
    if (value >= 1000) return '#8B0000'; // Dark red for high value
    if (value >= 500) return '#FFD700'; // Gold
    if (value >= 100) return '#0000FF'; // Blue
    if (value >= 50) return '#FF00FF'; // Magenta
    if (value >= 25) return '#00FF00'; // Green
    return '#FF0000'; // Red for lowest
}

/**
 * Renders a casino chip SVG
 */
export function Chip({ value = 0, size = 60, color, className, style }: ChipProps) {
    const chipColor = color || getChipColor(value);
    const radius = size / 2;
    const edgeWidth = size * 0.08;
    // Generate unique ID for each chip instance
    const uniqueId = React.useMemo(() => `${value}-${Math.random().toString(36).substr(2, 9)}`, []);

    return (
        <span className={className} style={{ display: 'inline-block', lineHeight: 0, ...style }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    <radialGradient id={`chipGradient-${uniqueId}`} cx="50%" cy="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                        <stop offset="50%" stopColor={chipColor} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={chipColor} stopOpacity="1" />
                    </radialGradient>
                    <filter id={`chipShadow-${uniqueId}`}>
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                        <feOffset dx="0" dy="2" result="offsetblur" />
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.3" />
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                
                {/* Outer edge/rim */}
                <circle
                    cx={radius}
                    cy={radius}
                    r={radius - edgeWidth / 2}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={edgeWidth}
                    opacity="0.3"
                />
                
                {/* Main chip body */}
                <circle
                    cx={radius}
                    cy={radius}
                    r={radius - edgeWidth}
                    fill={`url(#chipGradient-${uniqueId})`}
                    stroke="#000000"
                    strokeWidth="1"
                    filter={`url(#chipShadow-${uniqueId})`}
                />
                
                {/* Decorative edge lines */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                    const angle = (i * Math.PI * 2) / 8;
                    const x1 = radius + (radius - edgeWidth * 1.5) * Math.cos(angle);
                    const y1 = radius + (radius - edgeWidth * 1.5) * Math.sin(angle);
                    const x2 = radius + (radius - edgeWidth * 0.5) * Math.cos(angle);
                    const y2 = radius + (radius - edgeWidth * 0.5) * Math.sin(angle);
                    
                    return (
                        <line
                            key={i}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#ffffff"
                            strokeWidth="1"
                            opacity="0.6"
                        />
                    );
                })}
                
                {/* Value text */}
                {value > 0 && (
                    <text
                        x={radius}
                        y={radius}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={size * 0.25}
                        fill="#ffffff"
                        fontFamily="Arial, sans-serif"
                        fontWeight="bold"
                        stroke="#000000"
                        strokeWidth={size * 0.01}
                    >
                        ${value}
                    </text>
                )}
            </svg>
        </span>
    );
}

