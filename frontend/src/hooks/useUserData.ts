/**
 * @file useUserData.ts
 * @description Custom hook for managing user data.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import { UserDataContext } from "@/contexts/UserDataContext";
import { useContext } from "react";

export function useUserData() {
    const context = useContext(UserDataContext);
    if (!context) {
        throw new Error("useUserData must be used within a UserDataProvider");
    }
    return context;
}