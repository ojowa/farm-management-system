import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationsAPI } from '@/lib/api';
import NotificationsPage from './page';

const { mockToast } = vi.hoisted(() => ({
  mockToast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  notificationsAPI: {
    list: vi.fn(),
    unreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, isAuthenticated: true }),
}));

vi.mock('@/lib/socket', () => ({
  useSocket: () => ({ socket: null, isConnected: false, on: vi.fn() }),
}));

vi.mock('@/lib/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => false }),
}));

vi.mock('@/lib/toasts', () => ({
  useToast: () => ({ toast: mockToast }),
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong.',
}));

describe('NotificationsPage network errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsAPI.list).mockRejectedValue(new Error("Can't reach the server."));
    vi.mocked(notificationsAPI.unreadCount).mockRejectedValue(new Error("Can't reach the server."));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a retryable error instead of an empty inbox when requests fail', async () => {
    render(<NotificationsPage />);

    expect(await screen.findByText('Could not load notifications')).toBeInTheDocument();
    expect(screen.getByText("Can't reach the server.")).toBeInTheDocument();
    expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument();
    expect(screen.getByText('Unread count unavailable')).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(notificationsAPI.list).toHaveBeenCalledTimes(2));
  });
});
