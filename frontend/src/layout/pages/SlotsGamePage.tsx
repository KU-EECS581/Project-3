/**
 * @file SlotsGamePage.tsx
 * @description Page for the slots game.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useCallback } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";
import { SlotMachine } from "@/components/games/slots/SlotMachine";

export function SlotsGamePage() {
    const navigate = useNavigate();

    const handleBackToMap = useCallback(() => {
        navigate(RoutePath.MAP);
    }, [navigate]);

    const handleSpinComplete = useCallback((winnings: number) => {
        // Winnings are already handled in SlotMachine component
        console.log(`Spin complete! Winnings: $${winnings}`);
    }, []);

    return (
        <div className="relative min-h-screen w-full bg-[#0c0c15] text-white">
            {/* Title */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                <h1 className="text-5xl font-extrabold tracking-tight">Slots</h1>
            </div>

            {/* Slot Machine */}
            <div className="pt-24">
                <SlotMachine onSpinComplete={handleSpinComplete} />
            </div>

            {/* Back Button */}
            <div className="fixed bottom-4 right-4 z-10">
                <button
                    onClick={handleBackToMap}
                    className="rounded-xl px-4 py-2 bg-zinc-700 text-white shadow hover:bg-zinc-800 transition-colors"
                >
                    Back to Map
                </button>
            </div>
        </div>
    );
}