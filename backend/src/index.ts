/**
 * @file index.ts
 * @description Simple HTTP server for the backend. Placeholder for future backend functionality.
 * @author Riley Meyerkorth
 * @date 2025-10-24
 */

import { WebSocketServer } from 'ws';

const host = process.env.HOST || 'localhost';
const port = Number(process.env.PORT) || 8080;

const wss = new WebSocketServer({ port: port, host: host });

wss.on('connection', function connection(ws) {
    console.log('Client connected');

    ws.on('message', function message(data) {
        console.log(`Received: ${data}`);
        // Echo the message back to the client
        ws.send(`Server received: ${data}`);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.send('Welcome to the WebSocket server!');
});

console.log('WebSocket server is running on ws://localhost:8080');