'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
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
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    // Set NEXT_PUBLIC_REALTIME_ENABLED=false on hosts that cannot serve
    // persistent WebSocket connections; the socket.io client is then never
    // loaded at all (it is imported lazily below).
    const enabled = process.env.NEXT_PUBLIC_REALTIME_ENABLED !== 'false';

    // The socket connects directly to the API host, which is a different origin
    // on Vercel, so the HttpOnly accessToken cookie is not attached to the
    // handshake. Fetch the token from our own origin and send it in the
    // handshake `auth` payload. Skip connecting when signed out — an anonymous
    // socket is always rejected — so we don't churn reconnects on the login
    // screen.
    if (!enabled || !url || !isAuthenticated) {
      setIsConnected(false);
      setReconnecting(false);
      joinedRef.current = false;
      return;
    }

    let disposed = false;
    let socket: Socket | null = null;

    void (async () => {
      let token: string | null = null;
      try {
        const res = await fetch('/realtime-token', { credentials: 'same-origin' });
        if (res.ok) token = ((await res.json()) as { token: string | null }).token;
      } catch {
        // Fall through to the bail-out below.
      }
      if (disposed || !token) return;

      // Loaded lazily so the socket.io client never reaches the initial bundle,
      // and is dropped from the page entirely when realtime is disabled.
      const { io } = await import('socket.io-client');
      if (disposed) return;

      const s = io(url, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        transports: ['websocket'],
        auth: { token },
      });

      socket = s;
      socketRef.current = s;

      s.on('connect', () => {
        setIsConnected(true);
        setReconnecting(false);
      });

      s.on('disconnect', () => {
        setIsConnected(false);
        joinedRef.current = false;
      });

      s.on('reconnect_attempt', () => setReconnecting(true));
      s.on('reconnect', () => setReconnecting(false));
      s.on('reconnect_failed', () => setReconnecting(false));

      s.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    })();

    return () => {
      disposed = true;
      socket?.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
      setIsConnected(false);
      setReconnecting(false);
    };
  }, [isAuthenticated]);

  // Auto-join user room when connected
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected || !isAuthenticated || !user?.id) return;

    if (!joinedRef.current) {
      // Send the org so the socket joins the tenant's event room; the server
      // verifies it against the JWT and rejects any other organization.
      socket.emit('join', { userId: user.id, organizationId: user.organizationId ?? undefined });
      joinedRef.current = true;
    }
  }, [isConnected, isAuthenticated, user?.id, user?.organizationId]);

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
