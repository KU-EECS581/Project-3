/**
 * @file UserDataProvider.tsx
 * @description Provider component handling user persistence & currency mutation.
 * @class UserDataProvider
 * @module Contexts/User
 * @inputs React children
 * @outputs User data state & CRUD helpers
 * @external_sources Web Storage API, React
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { USER_DATA_KEY } from "@/constants";
import type { User } from "~middleware/index";
import { useState, useCallback, useMemo } from "react";
import { UserDataContext } from "./UserDataContext";

// Helper to get user-specific localStorage key
const getUserDataKey = (userName?: string) => {
    if (userName) {
        return `${USER_DATA_KEY}_${userName}`;
    }
    // Fallback to default key if no user name (shouldn't happen)
    return USER_DATA_KEY;
};

export function UserDataProvider({ children }: { children: React.ReactNode }) {
    // Try to load user data - check all localStorage keys that start with USER_DATA_KEY
    const loadInitialUser = useCallback((): User | undefined => {
        // Check for default key first (for backwards compatibility)
        const defaultKey = localStorage.getItem(USER_DATA_KEY);
        if (defaultKey) {
            try {
                return JSON.parse(defaultKey);
            } catch {
                // Invalid data, continue
            }
        }
        
        // Check for user-specific keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`${USER_DATA_KEY}_`)) {
                try {
                    const user = JSON.parse(localStorage.getItem(key) || '');
                    if (user && user.name) {
                        return user;
                    }
                } catch {
                    // Invalid data, continue
                }
            }
        }
        return undefined;
    }, []);

    const [user, setUser] = useState<User | undefined>(loadInitialUser());

    /**
     * Saves/writes user data to state and local storage
     */
    const saveUser = useCallback((newUser: User) => {
        setUser(newUser);

        // Save to user-specific key
        const userKey = getUserDataKey(newUser.name);
        localStorage.setItem(userKey, JSON.stringify(newUser));
        
        // Also save to default key for backwards compatibility (but this is user-specific now)
        // Actually, let's not do this to avoid conflicts
    }, [setUser]);

    /**
     * Loads/reads user data from local storage
     */
    const loadUser = useCallback(() => {
        if (user?.name) {
            const userKey = getUserDataKey(user.name);
            const storedUser = localStorage.getItem(userKey);
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } else {
            // Try to find any user data
            const foundUser = loadInitialUser();
            if (foundUser) {
                setUser(foundUser);
            }
        }
    }, [user, loadInitialUser]);

    /**
     * Clears user data from state and local storage (only for current user)
     */
    const clearUser = useCallback(() => {
        if (user?.name) {
            // Only clear this specific user's data
            const userKey = getUserDataKey(user.name);
            localStorage.removeItem(userKey);
        }
        // Also clear default key if it exists (for backwards compatibility)
        localStorage.removeItem(USER_DATA_KEY);
        setUser(undefined);
    }, [user]);

    const addFunds = useCallback((amount: number) => {
        setUser((prev) => {
            if (prev) {
                const updatedUser = { ...prev, balance: (prev.balance || 0) + amount };
                const userKey = getUserDataKey(prev.name);
                localStorage.setItem(userKey, JSON.stringify(updatedUser));
                return updatedUser;
            }
            return prev;
        });
    }, [setUser]);

    const removeFunds = useCallback((amount: number) => {
        setUser((prev) => {
            if (prev) {
                const updatedUser = { ...prev, balance: (prev.balance || 0) - amount };
                const userKey = getUserDataKey(prev.name);
                localStorage.setItem(userKey, JSON.stringify(updatedUser));
                return updatedUser;
            }
            return prev;
        });
    }, [setUser]);
    
    /**
     * Indicates whether user data exists
     * TODO/CONSIDER: why not just use user !== undefined where needed?
     */
    const exists = useMemo(() => user !== undefined, [user]);
    
    return (
        <UserDataContext.Provider value={{
            user,
            setUser,
            saveUser,
            loadUser,
            clearUser,
            exists,
            addFunds,
            removeFunds,
        }}>
            {children}
        </UserDataContext.Provider>
    );
}