/**
 * @file index.ts
 * @description Simple HTTP server for the backend. Placeholder for future backend functionality.
 * @author Riley Meyerkorth
 * @date 2025-10-24
 */

import { createInterface } from 'readline';
import { KEY_RESTART, KEY_SEE_CLIENTS, KEY_SEE_LOBBIES, KEY_SHUTDOWN } from './constants';
import { GameServer } from './server';

const host = process.env.HOST || undefined;
const port = process.env.PORT ? Number(process.env.PORT) : undefined;

// Start the game server
const server = new GameServer(host, port);

// Allow input for debugging
const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question(`Press '${KEY_RESTART}' to restart the server or '${KEY_SHUTDOWN}' to shut it down.\n`, (input) => {
    switch (input) {
        case KEY_RESTART:
            console.log('Restarting server...');
            process.exit(0); // Exit with code 0 to indicate a restart
        case KEY_SHUTDOWN:
            console.log('Shutting down server...');
            process.exit(0); // Exit with code 0 to indicate a normal shutdown
        case KEY_SEE_CLIENTS:
            console.log('Connected clients: (placeholder)');
        case KEY_SEE_LOBBIES:
            console.log('Active game lobbies: (placeholder)');
        default:
            console.log('Invalid input. Server continues to run.');
    }

    rl.close();
});
