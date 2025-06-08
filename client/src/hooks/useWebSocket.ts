import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port;

    let wsUrl;
    if (host === 'localhost' || host === '127.0.0.1') {
      const fallbackPort = port || '5000';
      wsUrl = `${protocol}//${host}:${fallbackPort}/ws`;
    } else {
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    console.log("🔌 Attempting WebSocket connection to:", wsUrl);
    console.log("Current location:", window.location.href);

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        console.log('✅ WebSocket connected successfully');
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message);
          setLastMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          console.error('Raw message data:', event.data);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        console.log('🔌 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect WebSocket...');
          // This will trigger the useEffect again
          setLastMessage(null);
        }, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('WebSocket state:', ws.current?.readyState);
        console.error('WebSocket URL was:', wsUrl);
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
    }

    return () => {
      if (ws.current) {
        console.log('🔌 Closing WebSocket connection');
        ws.current.close();
      }
    };
  }, []);

  const sendMessage = (type: string, data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: Date.now(),
      };
      ws.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}