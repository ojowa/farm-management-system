import { io, Socket } from 'socket.io-client';

declare const process: { env?: Record<string, string | undefined> } | undefined;

const API_BASE_URL =
  (typeof process !== 'undefined' && process?.env?.EXPO_PUBLIC_API_URL) || '';

if (!API_BASE_URL && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'test') {
  throw new Error('[Socket] EXPO_PUBLIC_API_URL is not set.');
}

const SOCKET_URL = API_BASE_URL;

export type RealtimeEvent =
  | 'farm.created'
  | 'farm.updated'
  | 'farm.deleted'
  | 'crop.created'
  | 'crop.updated'
  | 'crop.deleted'
  | 'livestock.created'
  | 'livestock.updated'
  | 'livestock.deleted'
  | 'poultry.created'
  | 'poultry.updated'
  | 'poultry.deleted'
  | 'finance.created'
  | 'finance.updated'
  | 'finance.deleted';

export interface RealtimePayload {
  entity?: string;
  action?: string;
  id?: string;
  data?: any;
  timestamp?: string;
}

type EventCallback = (payload: RealtimePayload) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private onConnectionChange: ((connected: boolean) => void) | null = null;
  private onReconnecting: ((attempt: number) => void) | null = null;

  async connect(accessToken?: string) {
    if (this.socket?.connected) return;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const token = accessToken || undefined;

    this.socket = io(SOCKET_URL, {
      auth: token ? { token } : undefined,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);
    });

    this.socket.on('disconnect', (reason) => {
      this.onConnectionChange?.(false);
      if (reason === 'io server disconnect') {
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (err) => {
      this.reconnectAttempts++;
      this.onReconnecting?.(this.reconnectAttempts);
      if (this.reconnectAttempts >= 3) {
        this.socket?.disconnect();
      }
    });

    this.socket.on('reconnect', () => {
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);
    });

    this.socket.on('reconnect_failed', () => {
      this.onConnectionChange?.(false);
    });

    this.socket.onAny((event: string, payload: RealtimePayload) => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.forEach((cb) => cb(payload));
      }
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }

  on(event: RealtimeEvent, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  onModuleEvent(
    module: 'farm' | 'crop' | 'livestock' | 'poultry' | 'finance',
    callbacks: {
      onCreated?: EventCallback;
      onUpdated?: EventCallback;
      onDeleted?: EventCallback;
    }
  ): () => void {
    const unsubs: (() => void)[] = [];

    if (callbacks.onCreated) {
      unsubs.push(this.on(`${module}.created` as RealtimeEvent, callbacks.onCreated));
    }
    if (callbacks.onUpdated) {
      unsubs.push(this.on(`${module}.updated` as RealtimeEvent, callbacks.onUpdated));
    }
    if (callbacks.onDeleted) {
      unsubs.push(this.on(`${module}.deleted` as RealtimeEvent, callbacks.onDeleted));
    }

    return () => unsubs.forEach((unsub) => unsub());
  }

  setConnectionChangeHandler(handler: (connected: boolean) => void) {
    this.onConnectionChange = handler;
  }

  setReconnectingHandler(handler: (attempt: number) => void) {
    this.onReconnecting = handler;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
