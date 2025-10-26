/**
 * @file UserDataProvider.ts
 * @description Context provider for user data.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { USER_DATA_KEY } from "@/constants";
import type { User } from "~middleware/index";
import { useState, useCallback, useMemo } from "react";
import { UserDataContext } from "./UserDataContext";

export function UserDataProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | undefined>(localStorage.getItem(USER_DATA_KEY) ? JSON.parse(localStorage.getItem(USER_DATA_KEY) as string) : undefined);

    /**
     * Saves/writes user data to state and local storage
     */
    const saveUser = useCallback((newUser: User) => {
        setUser(newUser);

        // Save to local storage
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(newUser));
    }, [setUser]);

    /**
     * Loads/reads user data from local storage
     */
    const loadUser = useCallback(() => {
        const storedUser = localStorage.getItem(USER_DATA_KEY);
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, [setUser]);

    /**
     * Clears user data from state and local storage
     */
    const clearUser = useCallback(() => {
        setUser(undefined);
        localStorage.removeItem(USER_DATA_KEY);
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
            exists
        }}>
            {children}
        </UserDataContext.Provider>
    );
}