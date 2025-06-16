import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export function useWebSocket(token: string | null) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Handle WebSocket URL construction more safely for Replit
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port;

    // Build host string properly
    let host;
    if (port && port !== '80' && port !== '443') {
      host = hostname + ':' + port;
    } else {
      host = hostname;
    }

    let wsUrl = `${protocol}//${host}/ws?token=${token}`;

    // Validate URL before creating WebSocket - check for undefined in the URL string
    if (wsUrl.includes('undefined') || wsUrl.includes(':undefined')) {
      console.error('Invalid WebSocket URL detected:', wsUrl);
      console.log('Location details:', { 
        hostname, 
        port, 
        protocol: window.location.protocol,
        host: window.location.host 
      });
      return;
    }

    console.log('Attempting WebSocket connection to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected to:', wsUrl);
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        console.log('WebSocket message:', event.data);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error for URL:', wsUrl, error);
        setIsConnected(false);
      };

      setSocket(ws);

      return () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [token]);

  return { socket, isConnected };
}