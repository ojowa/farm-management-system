import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '@/app/(auth)/register/page';

// Mock the toast hook
vi.mock('@/lib/toasts', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock the API
vi.mock('@/lib/api', () => ({
  authAPI: {
    register: vi.fn(),
  },
}));

describe('Register Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders step 1 (Organization)', () => {
    render(<RegisterPage />);
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
  });

  it('shows progress indicator', () => {
    render(<RegisterPage />);
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });

  it('navigates to step 2 when organization name is provided', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/organization name/i), 'Green Valley Farms');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Your Account')).toBeInTheDocument();
    });
  });

  it('shows back button on step 2', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/organization name/i), 'Green Valley Farms');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  it('navigates back to step 1', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/organization name/i), 'Green Valley Farms');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Your Account')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /back/i }));

    await waitFor(() => {
      expect(screen.getByText('Organization')).toBeInTheDocument();
    });
  });

  it('renders step 2 fields', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/organization name/i), 'Test');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });
  });

  it('has link to login page', () => {
    render(<RegisterPage />);
    const loginLink = screen.getByText('Sign in');
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
