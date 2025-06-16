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

    // More robust WebSocket URL construction for Replit
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Construct the WebSocket URL more safely
    let wsUrl: string;
    
    if (hostname.includes('replit.dev') || hostname.includes('janeway.replit.dev')) {
      // For Replit domains, use the hostname without port
      wsUrl = `${protocol}//${hostname}/ws?token=${token}`;
    } else if (port && port !== '80' && port !== '443') {
      // For localhost or other development environments with explicit ports
      wsUrl = `${protocol}//${hostname}:${port}/ws?token=${token}`;
    } else {
      // Fallback to hostname only
      wsUrl = `${protocol}//${hostname}/ws?token=${token}`;
    }

    // Validate URL before attempting connection
    if (wsUrl.includes('undefined') || wsUrl.includes('null')) {
      console.error('Invalid WebSocket URL detected, skipping connection:', wsUrl);
      return;
    }

    console.log('Attempting WebSocket connection to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      const cleanup = () => {
        setSocket(null);
        setIsConnected(false);
      };

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
        } catch (e) {
          console.log('WebSocket raw message:', event.data);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        cleanup();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        cleanup();
      };

      setSocket(ws);

      return () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, 'Component unmounting');
        }
        cleanup();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [token]);

  return { socket, isConnected };
}