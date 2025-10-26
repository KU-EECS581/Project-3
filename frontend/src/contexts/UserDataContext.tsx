/**
 * @file UserDataContext.ts
 * @description Context for user data.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import type { User } from "@/models";
import { createContext } from "react";

export interface UserDataContextProps {
    user?: User;
    setUser: (user: User | undefined) => void;
    saveUser: (newUser: User) => void;
    loadUser: () => void;
    clearUser: () => void;
    exists: boolean;
}

export const UserDataContext = createContext<UserDataContextProps | undefined>(undefined);