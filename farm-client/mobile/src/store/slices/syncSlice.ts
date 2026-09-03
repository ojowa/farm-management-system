import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OfflineOperation {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: any;
  module: 'farms' | 'crops' | 'livestocks' | 'poultry' | 'finance' | 'tasks' | 'attendance';
  createdAt: number;
  retryCount: number;
  /** Client-generated version for conflict detection */
  clientVersion: number;
  /** Server-assigned version from last known state */
  serverVersion?: number;
}

export interface SyncState {
  socketConnected: boolean;
  isOnline: boolean;
  reconnectAttempt: number;
  offlineQueue: OfflineOperation[];
  syncing: boolean;
}

const initialState: SyncState = {
  socketConnected: false,
  isOnline: true,
  reconnectAttempt: 0,
  offlineQueue: [],
  syncing: false,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.socketConnected = action.payload;
      if (action.payload) {
        state.reconnectAttempt = 0;
      }
    },
    setIsOnline: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setReconnectAttempt: (state, action: PayloadAction<number>) => {
      state.reconnectAttempt = action.payload;
    },
    enqueueOperation: (state, action: PayloadAction<Omit<OfflineOperation, 'id' | 'createdAt' | 'retryCount' | 'clientVersion'>>) => {
      state.offlineQueue.push({
        ...action.payload,
        id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        retryCount: 0,
        clientVersion: Date.now(),
      });
    },
    removeOperation: (state, action: PayloadAction<string>) => {
      state.offlineQueue = state.offlineQueue.filter((op) => op.id !== action.payload);
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const op = state.offlineQueue.find((o) => o.id === action.payload);
      if (op) op.retryCount++;
    },
    clearQueue: (state) => {
      state.offlineQueue = [];
    },
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.syncing = action.payload;
    },
  },
});

export const {
  setSocketConnected,
  setIsOnline,
  setReconnectAttempt,
  enqueueOperation,
  removeOperation,
  incrementRetryCount,
  clearQueue,
  setSyncing,
} = syncSlice.actions;

export default syncSlice.reducer;
