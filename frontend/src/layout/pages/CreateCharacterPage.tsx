/**
 * @file CreateCharacterPage.tsx
 * @description Player profile creation page.
 * @class CreateCharacterPage
 * @module Pages/Player
 * @inputs onCreatePlayer form submission
 * @outputs User saved to storage + route navigation
 * @external_sources React Router, UserData hook
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { CreatePlayerForm } from "@/components";
import { useUserData } from "@/hooks";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";

export function CreateCharacterPage() {
    const userData = useUserData();
    const navigate = useNavigate();

    const handleCreatePlayer = useCallback((name: string) => {
        console.log("Creating player with name:", name);
        userData.saveUser({ name: name, balance: 1000, dateCreated: new Date(), dateUpdated: new Date() });

        // Navigate to the join page after creating the player
        navigate(RoutePath.JOIN_GAME);
    }, [userData, navigate]);

    const handleNavigateBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    return (
        <>
            <CreatePlayerForm hidden={userData.exists} onCreatePlayer={handleCreatePlayer} />
            <button onClick={handleNavigateBack}>Back</button>
        </>
    );
}