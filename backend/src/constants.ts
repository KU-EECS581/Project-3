/**
 * @file constants.ts
 * @description Constants for the backend.
 * @class N/A
 * @module N/A
 * @inputs N/A
 * @outputs N/A
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

export const KEY_RESTART = 'r';
export const KEY_SHUTDOWN = 'q';
export const KEY_SEE_CLIENTS = 'c';
export const KEY_SEE_LOBBIES = 'l';

// Default to 0.0.0.0 to allow connections from other devices on the network
// Use localhost only if you want to restrict to same-machine connections
export const DEFAULT_HOST = '0.0.0.0';
// Fixed default port for LAN multiplayer
export const DEFAULT_PORT = 51337;