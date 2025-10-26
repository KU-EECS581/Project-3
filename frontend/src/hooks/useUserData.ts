import { useCallback, useState } from "react";
import type { User } from "../models";
import { USER_DATA_KEY } from "../constants";

export function useUserData() {
    const [user, setUser] = useState<User | null>(null);

    const saveUser = useCallback((newUser: User) => {
        setUser(newUser);

        // Save to local storage
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(newUser));
    }, []);

    const loadUser = useCallback(() => {
        const storedUser = localStorage.getItem(USER_DATA_KEY);
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    return {
        user,
        setUser,
        saveUser,
        loadUser
    };
}