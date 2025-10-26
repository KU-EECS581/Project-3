import { useCallback, useMemo, useState } from "react";
import type { User } from "../models";
import { USER_DATA_KEY } from "../constants";

export function useUserData() {
    const [user, setUser] = useState<User | null>(localStorage.getItem(USER_DATA_KEY) ? JSON.parse(localStorage.getItem(USER_DATA_KEY) as string) : null);

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
        setUser(null);
        localStorage.removeItem(USER_DATA_KEY);
    }, [setUser]);
    
    /**
     * Indicates whether user data exists
     */
    const exists = useMemo(() => user !== null, [user]);

    return {
        user,
        setUser,
        saveUser,
        loadUser,
        clearUser,
        exists
    };
}