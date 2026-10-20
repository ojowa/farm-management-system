import { resolveNotificationRoute } from '../services/notifications';
import reducer, {
  applyAllRead,
  applyDeleted,
  applyIncoming,
  applyRead,
  setUnreadCount,
} from '../store/slices/notificationsSlice';

// expo-constants is mocked as Expo Go (storeClient) in jest-setup, so the
// push module no-ops — exactly what we assert alongside the pure helpers.

describe('notification deep links', () => {
  it.each([
    ['/hr/leave', '/(app)/leave'],
    ['/hr/leave/approvals', '/(app)/leave'],
    ['/messages', '/(app)/messages'],
    ['/tasks', '/(app)/tasks'],
    ['/farms', '/(app)/farms'],
    ['/nope', null],
    [undefined, null],
  ])('maps %s to %s', (link, expected) => {
    expect(resolveNotificationRoute(link as any)).toBe(expected);
  });
});

describe('notifications slice', () => {
  const base = {
    items: [],
    unreadCount: 0,
    loading: false,
    refreshing: false,
    error: null,
    pushStatus: 'unknown' as const,
    pushToken: null,
  };

  it('applies incoming rows and bumps the badge', () => {
    const row: any = { id: 'n1', userId: 'u1', title: 'T', message: 'M', type: 'INFO', read: false };
    const next = reducer(base, applyIncoming(row));
    expect(next.items).toHaveLength(1);
    expect(next.unreadCount).toBe(1);
    // Idempotent — socket echoes never double-count.
    expect(reducer(next, applyIncoming(row)).unreadCount).toBe(1);
  });

  it('marks read / all-read / delete', () => {
    const row: any = { id: 'n1', userId: 'u1', title: 'T', message: 'M', type: 'INFO', read: false };
    let state = reducer(base, applyIncoming(row));
    state = reducer(state, applyRead('n1'));
    expect(state.unreadCount).toBe(0);
    state = reducer(state, applyIncoming({ ...row, id: 'n2' }));
    state = reducer(state, applyAllRead());
    expect(state.unreadCount).toBe(0);
    state = reducer(state, applyDeleted('n2'));
    expect(state.items).toHaveLength(1);
    state = reducer(state, setUnreadCount(5));
    expect(state.unreadCount).toBe(5);
  });
});
