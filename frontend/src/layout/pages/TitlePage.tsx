/**
 * @file TitlePage.tsx
 * @description Page for the title screen.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useUserData } from "@/hooks";
import { useCallback } from "react";
import { useNavigate } from "react-router"
import { RoutePath } from "../enums";

export function TitlePage() {
    const userData = useUserData();
    const navigate = useNavigate();

    const handleStartGame = useCallback(() => {
        // Check if user data exists
        const nextPage = userData.exists ? RoutePath.JOIN_GAME : RoutePath.CREATE_PLAYER;
        navigate(nextPage);
    }, [userData, navigate]);

    const handleResetPlayerData = useCallback(() => {
        // Add confirmation message
        if (!confirm("Are you sure you want to reset your player data?")) {
            return;
        }

        userData.clearUser();
    }, [userData]);

    return (
        <>
            <h1>EECS 581 - Casino</h1>
            <p>User: {userData.user?.name ?? "Guest"}</p>
            <button onClick={handleStartGame}>Start Game</button>
            <button disabled={!userData.exists} onClick={handleResetPlayerData}>Reset Player Data</button>
        </>
    )
}