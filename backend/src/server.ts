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

    private start() {
        this.wss.on('connection', (ws: WebSocket) => {
            this.onClientConnect(ws);
        });

        console.log(`WebSocket server is running on ws://${this.host}:${this.port}`);
    }

    private onClientConnect(ws: WebSocket) {
        console.log('Client connected');
        this.clients.add(ws);

        ws.on('message', (data) => {
            this.processMessage(data.toString(), ws);

            // Echo the message back to the client
            ws.send(`Server received: ${data}`);
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            this.clients.delete(ws);
        });

        ws.send('Welcome to the WebSocket server!');
    }

    private processMessage(message: string, ws: WebSocket) {
        // Placeholder for message processing logic
        console.log(`Processing message: ${message}`);

        // Try to parse the message
        const result = MovementMessageSchema.safeParse(JSON.parse(message));
        if (!result.success) {
            console.error('Invalid message format:', result.error);
            return;
        }
    
        const { x, y } = result.data;
        console.log(`Parsed movement message: x=${x}, y=${y}`);
    }
}
