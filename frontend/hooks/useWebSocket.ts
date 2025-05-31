import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  data: any;
  payload?: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectDelay?: number;
}

interface UseWebSocketReturn {
  sendMessage: (message: WebSocketMessage) => void;
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);

  const {
    onMessage,
    reconnectAttempts: maxReconnectAttempts = 5,
    reconnectInterval = 1000,
    maxReconnectDelay = 10000
  } = options;

  const connect = useCallback(() => {
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        return;
      }

      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Don't reconnect if closure was clean
        if (event.wasClean) {
          return;
        }

        // Attempt to reconnect if not at max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttempts.current),
            maxReconnectDelay
          );
          reconnectTimeout.current = setTimeout(connect, delay);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError(new Error('WebSocket connection error'));
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          setError(new Error('Failed to parse WebSocket message'));
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setError(error instanceof Error ? error : new Error('Failed to connect'));
    }
  }, [url, maxReconnectAttempts, reconnectInterval, maxReconnectDelay, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError(new Error('WebSocket is not connected'));
      return;
    }

    try {
      ws.current.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
      setError(error instanceof Error ? error : new Error('Failed to send message'));
    }
  }, []);

  const reconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close(1000, 'Manual reconnect');
    }
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  return {
    sendMessage,
    isConnected,
    error,
    reconnect
  };
} 