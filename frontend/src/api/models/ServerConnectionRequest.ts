/**
 * @file ServerConnectionRequest.ts
 * @description Represents a request to connect to the game server.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import type { User } from "~middleware/index";

export interface ServerConnectionRequest {
    host?: string; // Optional - only set when user explicitly joins
    port?: number; // Optional - only set when user explicitly joins
    user: User; // TODO/CONSIDER: do we need this for the connection request?
}