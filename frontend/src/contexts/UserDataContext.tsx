/**
 * @file UserDataContext.tsx
 * @description React context for persistent user profile & balance management.
 * @class UserDataContext
 * @module Contexts/User
 * @inputs N/A
 * @outputs UserDataContext object
 * @external_sources React
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import type { User } from "~middleware/index";
import { createContext } from "react";

export interface UserDataContextProps {
    user?: User;
    setUser: (user: User | undefined) => void;
    saveUser: (newUser: User) => void;
    loadUser: () => void;
    clearUser: () => void;
    addFunds: (amount: number) => void;
    removeFunds: (amount: number) => void;
    exists: boolean;
}

export const UserDataContext = createContext<UserDataContextProps | undefined>(undefined);