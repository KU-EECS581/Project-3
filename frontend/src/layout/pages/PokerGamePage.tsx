/**
 * @file PokerGamePage.tsx
 * @description Page for the poker game.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useCallback } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";
import { PokerGame } from "@/components/games/PokerGame";
import { useConnectionCheck } from "@/hooks";

export function PokerGamePage() {
    const navigate = useNavigate();

    // Check connection status and redirect if disconnected
    useConnectionCheck();

    const handleBackToMap = useCallback(() => {
        navigate(RoutePath.MAP); // Navigate back to the previous page (game world)
    }, [navigate]);

    return (
        <div>
            <h1>Poker</h1>
            <PokerGame />
            <button onClick={handleBackToMap}>Back to Map</button>
        </div>
    );
}