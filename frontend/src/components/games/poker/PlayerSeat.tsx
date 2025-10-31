/**
 * @file PlayerSeat.tsx
 * @description Component representing a player's seat in a poker game.
 * @author Riley Meyerkorth
 * @date 2025-10-28
 */

import { CardBack, CardView } from './CardView';
import type { PlayerState } from '~middleware/cards';

// TODO: move out magic values to config/separate file
export function PlayerSeat({
    player,
    isMe,
    isTurn,
}: {
    player: PlayerState;
    isMe: boolean;
    isTurn: boolean;
}) {
    return (
        <div style={{
            minWidth: 180,
            border: isTurn ? '2px solid #ffd54f' : '1px solid #555',
            borderRadius: 8,
            padding: 8,
            background: player.hasFolded ? '#333' : '#222',
            color: '#ddd',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            alignItems: 'center',
        }}>
            <div style={{ fontWeight: 700 }}>{player.user.name} {player.hasFolded ? '(Folded)' : ''}</div>
            <div>Chips: {player.chips}</div>
            <div style={{ display: 'flex', gap: 6 }}>
                {player.hole.map((c, i) => (
                    isMe ? <CardView key={i} card={c} size={50}/> : <CardBack key={i} size={50} />
                ))}
                {player.hole.length === 0 && <span style={{fontStyle:'italic', color:'#aaa'}}>No cards</span>}
            </div>
        </div>
    );
}
