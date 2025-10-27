/**
 * @file BankPage.tsx
 * @description Page for the bank.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useCallback } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";
import { useUserData } from "@/hooks";
import { BANK_FUNDS_AMOUNT } from "@/constants";

export function BankPage() {
    const navigate = useNavigate();
    const userData = useUserData();

    const handleBackToMap = useCallback(() => {
        navigate(RoutePath.MAP); // Navigate back to the previous page (game world)
    }, [navigate]);

    const handleAddFunds = useCallback(() => {
        userData.addFunds(BANK_FUNDS_AMOUNT);
    }, [userData]);

    return (
        <div>
            <h1>Welcome to the bank</h1>

            <p>Current Balance: {userData.user?.balance}</p>

            <button onClick={handleAddFunds}>Add Funds</button>

            <button onClick={handleBackToMap}>Back to Map</button>
        </div>
    );
}