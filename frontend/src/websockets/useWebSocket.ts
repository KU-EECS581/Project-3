import { useCallback, useEffect, useMemo, useState } from "react";

export function useWebSocket(url: string) {
    const [message, setMessage] = useState('');
    const [receivedMessages, /*setReceivedMessages*/] = useState([]);
    const ws = useMemo(() => new WebSocket(url), [url]); // Replace with your server address

    useEffect(() => {
        ws.onopen = () => {
            console.log('WebSocket connection established');
        };

        ws.onmessage = (/*event*/) => {
            //setReceivedMessages((prev) => [...prev, event.data]);
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            ws.close(); // Clean up on component unmount
        };
    }, [ws]); // Empty dependency array ensures effect runs once

    const sendMessage = useCallback(() => {
        ws.send(message);
        setMessage('');
    }, [ws, message]);

    return {
        message,
        setMessage,
        sendMessage,
        receivedMessages
    };
}