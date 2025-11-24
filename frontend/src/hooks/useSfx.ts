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
import useSound from 'use-sound';
import sfxCardDealUrl from "@/assets/sfx/card_deal.mp3";
import sfxCardFlipUrl from "@/assets/sfx/card_flip.mp3";
import sfxBetUrl from "@/assets/sfx/bet.mp3";
import sfxWinUrl from "@/assets/sfx/win_1.mp3";
import sfxLoseUrl from "@/assets/sfx/lose_1.mp3";
import sfxShuffleUrl from "@/assets/sfx/shuffle.mp3";
import sfxSlotsSpinUrl from "@/assets/sfx/slots_spin.mp3";

export function useSfx() {
    const [sfxCardDeal] = useSound(sfxCardDealUrl);
    const [sfxCardFlip] = useSound(sfxCardFlipUrl);
    const [sfxBet] = useSound(sfxBetUrl);
    const [sfxWin] = useSound(sfxWinUrl);
    const [sfxLose] = useSound(sfxLoseUrl);
    const [sfxShuffle] = useSound(sfxShuffleUrl);
    const [sfxSlotsSpin] = useSound(sfxSlotsSpinUrl); 

    const playCardDeal = useCallback(() => {
        console.debug("Playing card deal SFX");
        sfxCardDeal();
    }, [sfxCardDeal]);

    const playCardFlip = useCallback(() => {
        console.debug("Playing card flip SFX");
        sfxCardFlip();
    }, [sfxCardFlip]);

    const playBet = useCallback(() => {
        console.debug("Playing bet SFX");
        sfxBet();
    }, [sfxBet]);

    const playWin = useCallback(() => {
        console.debug("Playing win SFX");
        sfxWin();
    }, [sfxWin]);

    const playLose = useCallback(() => {
        console.debug("Playing lose SFX");
        sfxLose();
    }, [sfxLose]);
    const playShuffle = useCallback(() => {
        console.debug("Playing shuffle SFX");
        sfxShuffle();
    }, [sfxShuffle]);

    const playSlotsSpin = useCallback(() => {
        console.debug("Playing slots spin SFX");
        sfxSlotsSpin();
    }, [sfxSlotsSpin]);
    return { playCardDeal, playCardFlip, playBet, playWin, playLose, playShuffle, playSlotsSpin };
}