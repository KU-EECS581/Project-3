/**
 * @file BlackjackGamePage.tsx
 * @description Page for the blackjack game.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useCallback } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";

export function BlackjackGamePage() {
    const navigate = useNavigate();

    const handleBackToMap = useCallback(() => {
        navigate(RoutePath.MAP); // Navigate back to the previous page (game world)
    }, [navigate]);

    return (
        <div>
            <h1>Welcome to the Blackjack Game</h1>
            {/* Add blackjack game components here */}
            <button onClick={handleBackToMap}>Back to Map</button>
        </div>
    );
}