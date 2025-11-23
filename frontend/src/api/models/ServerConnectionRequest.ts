/**
 * @file ServerConnectionRequest.ts
 * @description Model for explicit user-initiated server connection request.
 * @class N/A
 * @module API/Models
 * @inputs Host, port, user identity
 * @outputs Structured connection request object
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import type { User } from "~middleware/index";

export interface ServerConnectionRequest {
    host?: string; // Optional - only set when user explicitly joins
    port?: number; // Optional - only set when user explicitly joins
    user: User; // TODO/CONSIDER: do we need this for the connection request?
}