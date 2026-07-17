import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/farms',
}));

vi.mock('@/lib/api', () => ({
  farmsAPI: {
    list: vi.fn().mockResolvedValue({ data: { farms: [
      { id: '1', name: 'Green Valley Farm', location: 'Nairobi', size: 50, createdAt: '2025-01-15T00:00:00Z' },
      { id: '2', name: 'Sunrise Ranch', location: 'Mombasa', size: 100, createdAt: '2025-02-20T00:00:00Z' },
    ]}}),
    create: vi.fn().mockResolvedValue({ data: { id: '3' } }),
  },
  cropsAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
  livestockAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
  poultryAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
  inventoryAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
  workersAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
  financeAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
  salesAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
  authAPI: { getProfile: vi.fn().mockResolvedValue({ data: { user: { id: '1', email: 'test@test.com', fullName: 'Test User', role: 'ADMIN', organizationId: 'org1', permissions: [] } } }) },
}));

vi.mock('@/lib/socket', () => ({
  SocketProvider: ({ children }: { children: React.ReactNode }) => children,
  useSocketContext: () => ({ socket: null, connected: false, reconnecting: false, online: true }),
}));

vi.mock('@/lib/theme', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/lib/toasts', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToasts: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }),
}));

vi.mock('@/hooks/useRealtime', () => ({
  useRealtime: () => {},
}));

vi.mock('@farm/hooks', () => ({
  useFarms: () => ({ data: { farms: [
    { id: '1', name: 'Green Valley Farm', location: 'Nairobi', size: 50, createdAt: '2025-01-15T00:00:00Z' },
    { id: '2', name: 'Sunrise Ranch', location: 'Mombasa', size: 100, createdAt: '2025-02-20T00:00:00Z' },
  ]}, isLoading: false, error: null, refetch: vi.fn() }),
  useCreateFarm: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: '3' }), isPending: false }),
}));

import { FarmsClient } from '@/app/(app)/farms/FarmsClient';

const defaultProps = {
  initialFarms: [
    { id: '1', name: 'Green Valley Farm', location: 'Nairobi', size: 50, createdAt: '2025-01-15T00:00:00Z' },
    { id: '2', name: 'Sunrise Ranch', location: 'Mombasa', size: 100, createdAt: '2025-02-20T00:00:00Z' },
  ],
};

describe('Farms CRUD page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    render(<FarmsClient {...defaultProps} />);
    expect(screen.getByText('Farms')).toBeInTheDocument();
    expect(screen.getByText('Manage your farm properties')).toBeInTheDocument();
  });

  it('displays farm data in the table', async () => {
    render(<FarmsClient {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Green Valley Farm')).toBeInTheDocument();
      expect(screen.getByText('Sunrise Ranch')).toBeInTheDocument();
    });
  });

  it('displays location data', async () => {
    render(<FarmsClient {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Nairobi')).toBeInTheDocument();
      expect(screen.getByText('Mombasa')).toBeInTheDocument();
    });
  });

  it('has an add farm button', () => {
    render(<FarmsClient {...defaultProps} />);
    expect(screen.getByText('+ Add Farm')).toBeInTheDocument();
  });

  it('opens add modal when clicking add button', async () => {
    const user = userEvent.setup();
    render(<FarmsClient {...defaultProps} />);
    await user.click(screen.getByText('+ Add Farm'));
    expect(screen.getByText('Create Farm')).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<FarmsClient {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Search farms/)).toBeInTheDocument();
  });

  it('shows filter dropdown', () => {
    render(<FarmsClient {...defaultProps} />);
    expect(screen.getByText('All statuses')).toBeInTheDocument();
  });
});
