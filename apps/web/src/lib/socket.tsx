'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  reconnecting: boolean;
  online: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  reconnecting: false,
  online: true,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [online, setOnline] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

    const socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
      if (!joinedRef.current) {
        socket.emit('join', { userId: '1' });
        joinedRef.current = true;
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      joinedRef.current = false;
    });

    socket.on('reconnect_attempt', () => setReconnecting(true));
    socket.on('reconnect', () => {
      setReconnecting(false);
      socket.emit('join', { userId: '1' });
      joinedRef.current = true;
    });
    socket.on('reconnect_failed', () => setReconnecting(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
      setConnected(false);
      setReconnecting(false);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value = useMemo(() => ({ socket: socketRef.current, connected, reconnecting, online }), [connected, reconnecting, online]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => useContext(SocketContext);
