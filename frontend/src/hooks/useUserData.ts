/**
 * @file useUserData.ts
 * @description Hook for accessing persistent user data state.
 * @class useUserData
 * @module Hooks/User
 * @inputs UserDataContext
 * @outputs User object & mutators
 * @external_sources React
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