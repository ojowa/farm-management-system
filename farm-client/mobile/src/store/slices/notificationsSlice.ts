import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { notificationsAPI } from '../../services/api';
import { syncBadgeFromServer } from '../../services/notifications';
import type { Notification } from '../../services/types';

export type PushStatus = 'unknown' | 'registered' | 'denied' | 'unsupported' | 'no-device' | 'failed';

export interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  pushStatus: PushStatus;
  pushToken: string | null;
}

/**
 * Central notification store so every surface (Notifications screen, header
 * badge, socket events, push taps) converges on one list + unread count.
 * The screens keep their local pagination; this slice owns the badge count,
 * the push registration state, and the realtime-applied rows.
 */
const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
  refreshing: false,
  error: null,
  pushStatus: 'unknown',
  pushToken: null,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async ({ userId, limit = 20, offset = 0, unreadOnly = false }: {
    userId: string; limit?: number; offset?: number; unreadOnly?: boolean;
  }) => {
    const params: Record<string, unknown> = { limit, offset };
    if (unreadOnly) params.unreadOnly = 'true';
    const res = await notificationsAPI.list(userId, params);
    const items: Notification[] = Array.isArray(res.data) ? res.data : [];
    return { items, reset: offset === 0 };
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (userId: string) => {
    const res = await notificationsAPI.unreadCount(userId);
    const count = Number((res.data as any)?.count ?? 0) || 0;
    await syncBadgeFromServer(userId).catch(() => {});
    return count;
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setPushState(state, action: PayloadAction<{ status: PushStatus; token?: string | null }>) {
      state.pushStatus = action.payload.status;
      if (action.payload.token !== undefined) state.pushToken = action.payload.token;
    },
    applyIncoming(state, action: PayloadAction<Notification>) {
      const incoming = action.payload;
      if (!incoming?.id) return;
      const seen = state.items.some((n) => n.id === incoming.id);
      if (!seen) state.items.unshift(incoming);
      // Only count a row we have not already seen — a socket echo of our own
      // event used to bump the badge on every delivery of the same id.
      if (!seen && !(incoming as any).read) state.unreadCount += 1;
    },
    applyRead(state, action: PayloadAction<string>) {
      const row = state.items.find((n) => n.id === action.payload);
      if (row && !(row as any).read) {
        (row as any).read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    applyAllRead(state) {
      for (const row of state.items) (row as any).read = true;
      state.unreadCount = 0;
    },
    applyDeleted(state, action: PayloadAction<string>) {
      const target = state.items.find((n) => n.id === action.payload);
      // Dropping an unread row must decrement the badge too, otherwise the
      // count drifts up until a manual unread-count refetch.
      if (target && !(target as any).read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      state.items = state.items.filter((n) => n.id !== action.payload);
    },
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = Math.max(0, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state, action) => {
        const offset = (action.meta.arg as any)?.offset ?? 0;
        if (offset === 0) state.loading = true;
        else state.refreshing = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.items = action.payload.reset
          ? action.payload.items
          : [...state.items, ...action.payload.items.filter((n) => !state.items.some((p) => p.id === n.id))];
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.error.message ?? 'Failed to load notifications.';
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });
  },
});

export const {
  setPushState,
  applyIncoming,
  applyRead,
  applyAllRead,
  applyDeleted,
  setUnreadCount,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
