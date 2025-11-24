/**
 * @file useSfx.ts
 * @description Hook for using sound effects in components.
 * @class useSfx
 * @module Hooks/Sfx
 * @inputs N/A
 * @outputs N/A
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-11-24
 */

import { useCallback } from 'react';

const SFX_FOLDER = 'sfx';
const SFX_EXTENSION = 'mp3';

export function useSfx() {
    const playSfx = useCallback((sfxName: string) => {
        console.debug("Playing SFX:", sfxName);
        const audio = new Audio(`/${SFX_FOLDER}/${sfxName}.${SFX_EXTENSION}`);
        audio.play().catch(err => {
            console.error(`Error playing sound effect "${sfxName}":`, err);
        });
    }, []);

    const playCardDeal = useCallback(() => {
        playSfx('card_deal');
    }, [playSfx]);

    const playCardFlip = useCallback(() => {
        playSfx('card_flip');
    }, [playSfx]);

    const playBet = useCallback(() => {
        playSfx('bet');
    }, [playSfx]);

    const playWin = useCallback(() => {
        playSfx('win');
    }, [playSfx]);

    const playLose = useCallback(() => {
        playSfx('lose');
    }, [playSfx]);

    const playShuffle = useCallback(() => {
        playSfx('shuffle');
    }, [playSfx]);

    const playSlotsSpin = useCallback(() => {
        playSfx('slots_spin');
    }, [playSfx]);

    return { playSfx, playCardDeal, playCardFlip, playBet, playWin, playLose, playShuffle, playSlotsSpin };
}