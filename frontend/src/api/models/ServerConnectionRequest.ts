/**
 * @file ServerConnectionRequest.ts
 * @description Represents a request to connect to the game server.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import type { User } from "../../models/User";

export interface ServerConnectionRequest {
    host: string;
    port: number;
    user: User; // TODO/CONSIDER: do we need this for the connection request?
}