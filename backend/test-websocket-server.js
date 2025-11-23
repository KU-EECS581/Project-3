/**
 * Simple test WebSocket server to verify cross-device WebSocket connectivity
 * Run this to test if WebSocket connections work between devices on your network
 * 
 * Usage:
 *   node test-websocket-server.js [port]
 * 
 * Default port: 51338 (different from game server to avoid conflicts)
 */

import WebSocket, { WebSocketServer } from 'ws';

const port = process.argv[2] ? parseInt(process.argv[2]) : 51338;

const wss = new WebSocketServer({ 
    host: '0.0.0.0',  // Listen on all interfaces
    port: port 
});

console.log(`[Test WS Server] Starting on ws://0.0.0.0:${port}`);
console.log(`[Test WS Server] Connect from another device using: ws://<this-machine-ip>:${port}`);

wss.on('connection', (ws, req) => {
    const remoteAddress = req.socket.remoteAddress;
    const remotePort = req.socket.remotePort;
    
    console.log(`[Test WS Server] ✅ Client connected from ${remoteAddress}:${remotePort}`);
    
    // Send welcome message
    ws.send(JSON.stringify({ 
        type: 'welcome', 
        message: 'Test WebSocket server connection successful!',
        timestamp: new Date().toISOString()
    }));
    
    // Echo back any messages
    ws.on('message', (data) => {
        console.log(`[Test WS Server] Received message from ${remoteAddress}:${remotePort}:`, data.toString());
        ws.send(JSON.stringify({ 
            type: 'echo', 
            original: data.toString(),
            timestamp: new Date().toISOString()
        }));
    });
    
    ws.on('close', (code, reason) => {
        const reasonStr = reason && reason.length > 0 ? reason.toString() : '(no reason)';
        console.log(`[Test WS Server] Client ${remoteAddress}:${remotePort} disconnected: Code ${code}, Reason: ${reasonStr}`);
    });
    
    ws.on('error', (err) => {
        console.error(`[Test WS Server] Error from ${remoteAddress}:${remotePort}:`, err);
    });
    
    // Send periodic pings to keep connection alive
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 30000); // Every 30 seconds
    
    ws.on('close', () => {
        clearInterval(pingInterval);
    });
});

wss.on('error', (err) => {
    console.error('[Test WS Server] Server error:', err);
});

console.log(`[Test WS Server] Server ready. Waiting for connections...`);
console.log(`[Test WS Server] Press Ctrl+C to stop`);

