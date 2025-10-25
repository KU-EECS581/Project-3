import { useCallback, useEffect, useMemo, useState } from "react";
import type { ServerConnectionRequest } from "../../api";

export function useGameServer(request: ServerConnectionRequest) {
    const [receivedMessages, /*setReceivedMessages*/] = useState<string[]>([]);

    // Create the WebSocket instance when request changes (host/port/user)
    const ws = useMemo(() => {
        // Validate host
        if (!request.host) {
            console.error(`Invalid host: ${request.host}`);
            return undefined;
        }

        // Validate port
        if (isNaN(request.port) || request.port <= 0 || request.port > 65535) {
            console.error(`Invalid port: ${request.port}`);
            return undefined;
        }

        // Validate user
        if (!request.user || !request.user.id || !request.user.name) {
            console.error(`Invalid user data`);
            return undefined;
        }

        try {
            return new WebSocket(`ws://${request.host}:${request.port}`);
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            return undefined;
        }
    }, [request]);

    // Keep track of readyState in React state so renders update when it changes
    const [readyState, setReadyState] = useState<number | undefined>(ws?.readyState);

    useEffect(() => {
        if (!ws) {
            setReadyState(undefined);
            return;
        }

        // Initialize readyState from ws
        setReadyState(ws.readyState);

        // Event handlers that update React state (causes re-render when state changes)
        const handleOpen = () => {
            console.log('WebSocket connection established');
            setReadyState(ws.readyState);
        };

        const handleMessage = () => {
            // setReceivedMessages((prev) => [...prev, /* event.data */]);
            // Keep for future use
            setReadyState(ws.readyState);
        };

        const handleClose = () => {
            console.log('WebSocket connection closed');
            setReadyState(ws.readyState);
        };

        const handleError = (error: Event) => {
            console.error('WebSocket error:', error);
            // readyState may be CLOSING/CLOSED after errors
            setReadyState(ws.readyState);
        };

        ws.addEventListener('open', handleOpen);
        ws.addEventListener('message', handleMessage as EventListener);
        ws.addEventListener('close', handleClose);
        ws.addEventListener('error', handleError);

        return () => {
            // Remove listeners and close socket on cleanup
            try {
                ws.removeEventListener('open', handleOpen);
                ws.removeEventListener('message', handleMessage as EventListener);
                ws.removeEventListener('close', handleClose);
                ws.removeEventListener('error', handleError);
            } catch {
                // ignore
            }

            try {
                // Only close if not already closed
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
            } catch {
                // ignore
            }
        };
    }, [ws]);

    // Derived booleans from readyState (stable values causing re-renders when readyState updates)
    const isConnecting = useMemo(() => readyState === WebSocket.CONNECTING, [readyState]);
    const isConnected = useMemo(() => readyState === WebSocket.OPEN, [readyState]);
    const isClosing = useMemo(() => readyState === WebSocket.CLOSING, [readyState]);
    const isClosed = useMemo(() => readyState === WebSocket.CLOSED, [readyState]);

    /**
     * Sends a message through the WebSocket connection.
     * @param message The message to send as a string.
     */
    const sendMessage = useCallback((message: string) => {
        if (!ws) {
            console.error('WebSocket is not available');
            return;
        }

        if (ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not open - cannot send message');
            return;
        }

        ws.send(message);
    }, [ws]);

    return {
        isConnecting,
        isClosing,
        isClosed,
        isConnected,
        sendMessage,
        receivedMessages
    };
}