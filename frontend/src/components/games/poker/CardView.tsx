/**
 * @file CardView.tsx
 * @description Lightweight poker card & back presentation components.
 * @class CardView / CardBack
 * @module Components/Poker
 * @inputs card suit/rank, size
 * @outputs Styled card/back JSX
 * @external_sources Middleware card utilities
 * @author Riley Meyerkorth
 * @date 2025-11-20
 */
import { type Rank, type Suit, isRedSuit, rankToDisplay, suitToSymbol } from '~middleware/cards';

type SimpleCard = { suit: Suit; rank: Rank };

export function CardBack({ size = 60 }: { size?: number }) {
    return (
        <div style={{
            width: size,
            height: Math.round(size*1.4),
            border: '1px solid #333',
            borderRadius: 8,
            background: 'repeating-linear-gradient(45deg, #b00, #b00 6px, #d22 6px, #d22 12px)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
        }} />
    );
}

export function CardView({ card, size = 60 }: { card: SimpleCard; size?: number }) {
    const color = isRedSuit(card.suit) ? '#c22' : '#111';
    return (
        <div style={{
            width: size,
            height: Math.round(size*1.4),
            border: '1px solid #999',
            borderRadius: 8,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 6,
            color,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}>
            <div style={{fontWeight: 700}}>{rankToDisplay(card.rank)}</div>
            <div style={{fontSize: Math.round(size*0.5), textAlign: 'center'}}>{suitToSymbol(card.suit)}</div>
            {/* <div style={{alignSelf: 'flex-end', transform: 'rotate(180deg)', fontWeight: 700}}>{rankToDisplay(card.rank)}</div> */}
        </div>
    );
}
