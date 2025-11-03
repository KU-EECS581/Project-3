import { useMemo, useState } from 'react';

interface BettingControlsProps {
    toCall: number;
    minBet: number;
    maxBet: number; // player's remaining chips
    canCheck: boolean;
    disabled?: boolean;
    onCheck: () => void;
    onCall: () => void;
    onBetOrRaise: (amount: number) => void;
    onFold: () => void;
}

export function BettingControls({ toCall, minBet, maxBet, canCheck, disabled = false, onCheck, onCall, onBetOrRaise, onFold }: BettingControlsProps) {
    const [amount, setAmount] = useState<number>(minBet);

    const clampedMax = useMemo(() => Math.max(0, Math.floor(maxBet)), [maxBet]);
    const canBet = clampedMax >= minBet;

    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {canCheck && (
                <button onClick={onCheck} disabled={disabled}>Check</button>
            )}
            {!canCheck && toCall > 0 && (
                <button onClick={onCall} disabled={disabled || toCall > maxBet}>Call {toCall}</button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label>Bet/Raise:</label>
                <input
                    type="range"
                    min={minBet}
                    max={clampedMax || minBet}
                    step={minBet}
                    value={Math.min(amount, clampedMax || minBet)}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    style={{ width: 160 }}
                disabled={disabled}
                />
                <input
                    type="number"
                    min={minBet}
                    max={clampedMax}
                    step={minBet}
                    value={Math.min(amount, clampedMax)}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    disabled={disabled}
                    style={{ width: 80 }}
                />
                <button onClick={() => onBetOrRaise(Math.min(amount, clampedMax))} disabled={disabled || !canBet}>
                    {toCall > 0 ? 'Raise' : 'Bet'} {Math.min(amount, clampedMax)}
                </button>
            </div>

            <button onClick={onFold} disabled={disabled}>Fold</button>
        </div>
    );
}
