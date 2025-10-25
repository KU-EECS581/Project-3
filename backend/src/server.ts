import WebSocket, { WebSocketServer } from 'ws';
import { DEFAULT_HOST, DEFAULT_PORT } from './constants';
import { MovementMessageSchema } from '../../middleware';

export class GameServer {
    private host: string = DEFAULT_HOST;
    private port: number = DEFAULT_PORT;
    private wss: WebSocketServer = new WebSocketServer({ port: this.port, host: this.host });
    private clients: Set<WebSocket> = new Set();
    private lobbies: Map<string, WebSocket[]> = new Map();

    constructor(host?: string, port?: number) {
        if (host) this.host = host;
        if (port) this.port = port;
        this.start();
    }

    public start() {
        this.wss.on('connection', (ws: WebSocket) => {
            this.onClientConnect(ws);
        });

        console.log(`WebSocket server is running on ws://${this.host}:${this.port}`);
    }

    public stop() {
        this.wss.close(() => {
            console.log('WebSocket server has been stopped.');
        });
    }

    private onClientConnect(ws: WebSocket) {
        console.log('Client connected');
        this.clients.add(ws);

        ws.on('message', (data) => {
            this.processMessage(data.toString(), ws);
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            this.clients.delete(ws);
            this.lobbies.forEach((clients, lobbyId) => {
                this.lobbies.set(lobbyId, clients.filter(client => client !== ws));
            });
        });

        ws.send('Welcome to the WebSocket server!');
    }

    private processMessage(message: string, ws: WebSocket) {
        // Try to parse the message
        let parsed: unknown;
        try {
            parsed = JSON.parse(message);
        } catch (e) {
            console.error('Received non-JSON message:', message);
            return;
        }

        const result = MovementMessageSchema.safeParse(parsed);
        if (!result.success) {
            console.error('Invalid message format:', result.error);
            return;
        }

        const movement = result.data;
        // Broadcast movement to all connected clients (including sender)
        const payload = JSON.stringify(movement);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }
}
