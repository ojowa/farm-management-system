'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  reconnecting: boolean;
  online: boolean;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  reconnecting: false,
  online: true,
  emit: () => {},
  on: () => () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [online, setOnline] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL!;

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
      setIsConnected(true);
      setReconnecting(false);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      joinedRef.current = false;
    });

    socket.on('reconnect_attempt', () => setReconnecting(true));
    socket.on('reconnect', () => setReconnecting(false));
    socket.on('reconnect_failed', () => setReconnecting(false));

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
      setIsConnected(false);
      setReconnecting(false);
    };
  }, []);

  // Auto-join user room when connected
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected || !isAuthenticated || !user?.id) return;

    if (!joinedRef.current) {
      socket.emit('join', { userId: user.id });
      joinedRef.current = true;
    }
  }, [isConnected, isAuthenticated, user?.id]);

  // Track online/offline status
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

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
    return () => socketRef.current?.off(event, callback);
  }, []);

  const value = useMemo(() => ({
    socket: socketRef.current,
    isConnected,
    reconnecting,
    online,
    emit,
    on,
  }), [isConnected, reconnecting, online, emit, on]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
