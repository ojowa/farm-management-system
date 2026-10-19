import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ContractsScreen from '../../app/(app)/contracts';
import MarketplaceScreen from '../../app/(app)/marketplace';

// ─── API mocks ────────────────────────────────────────────────────────────────
// Contracts loads contractsAPI.list; Marketplace loads both
// marketplaceAPI.listListings and marketplaceAPI.listBuyers on mount. Each
// endpoint is stubbed independently so one can be failed to exercise the
// retryable error path and the partial-failure behaviour.

const mockListContracts = jest.fn();
const mockListListings = jest.fn();
const mockListBuyers = jest.fn();
const mockHasPermission = jest.fn();
const mockShowError = jest.fn();
const mockSuccess = jest.fn();
const mockPush = jest.fn();

jest.mock('@/modules/finance', () => ({
  contractsAPI: {
    list: (...a: any[]) => mockListContracts(...a),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  marketplaceAPI: {
    listListings: (...a: any[]) => mockListListings(...a),
    listBuyers: (...a: any[]) => mockListBuyers(...a),
    createListing: jest.fn(),
    createBuyer: jest.fn(),
    deleteListing: jest.fn(),
    deleteBuyer: jest.fn(),
  },
}));

jest.mock('@/core/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: mockHasPermission }),
}));

jest.mock('@/core/hooks/useToasts', () => ({
  useToasts: () => ({
    success: mockSuccess,
    error: mockShowError,
    info: jest.fn(),
    warning: jest.fn(),
  }),
}));

jest.mock('@/core/theme/ThemeContext', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      primary: '#16A34A',
      background: '#F9FAFB',
      text: '#111827',
      textSecondary: '#6B7280',
      card: '#FFFFFF',
      border: '#E5E7EB',
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const NETWORK_ERROR = new Error('Network Error');
const CONNECTION_COPY = 'No connection. Check your network and try again.';

const CONTRACTS = [
  {
    id: 'k1',
    buyerSellerName: 'Green Grocers Ltd',
    type: 'SELL',
    status: 'ACTIVE',
    startDate: '2026-01-10',
    endDate: '2026-06-30',
    value: 25000,
    terms: 'Monthly delivery of 500kg tomatoes',
  },
  {
    // Legacy DTO shape: title instead of buyerSellerName.
    id: 'k2',
    title: 'Seed supplier agreement',
    type: 'BUY',
    status: 'DRAFT',
    startDate: '2026-02-01',
    value: 4000,
  },
];

const LISTINGS = [
  {
    id: 'l1',
    entityType: 'crop',
    title: 'Fresh tomatoes — Grade A',
    price: 2.5,
    quantity: 500,
    unit: 'kg',
    status: 'ACTIVE',
    listedDate: '2026-10-01',
  },
  {
    id: 'l2',
    entityType: 'livestock',
    title: 'Dairy cows',
    price: 1200,
    quantity: 4,
    unit: 'head',
    status: 'SOLD',
    listedDate: '2026-09-01',
  },
];

const BUYERS = [
  {
    id: 'b1',
    name: 'Green Grocers Ltd',
    type: 'COMPANY',
    contactPerson: 'Sam Buyer',
    email: 'sam@greengrocers.example',
  },
  { id: 'b2', name: 'City Market Stall', type: 'INDIVIDUAL' },
];

describe('Money screens (Contracts + Marketplace)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListContracts.mockResolvedValue({ data: CONTRACTS });
    mockListListings.mockResolvedValue({ data: LISTINGS });
    mockListBuyers.mockResolvedValue({ data: BUYERS });
    mockHasPermission.mockReturnValue(true);
  });

  describe('ContractsScreen', () => {
    it('renders contracts using buyerSellerName and the legacy title shape', async () => {
      render(<ContractsScreen />);

      expect(await screen.findByText('Green Grocers Ltd')).toBeTruthy();
      expect(screen.getByText('Seed supplier agreement')).toBeTruthy();
      expect(screen.getByText('25,000')).toBeTruthy();
    });

    it('builds status filter chips from the data actually returned', async () => {
      render(<ContractsScreen />);
      await screen.findByText('Green Grocers Ltd');

      // Both statuses in the fixture become filter chips (the text appears on
      // the card badge and on its matching chip).
      expect(screen.getAllByText('ACTIVE').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('DRAFT').length).toBeGreaterThanOrEqual(2);
    });

    it('filters contracts by status', async () => {
      render(<ContractsScreen />);
      await screen.findByText('Green Grocers Ltd');

      fireEvent.press(screen.getByLabelText('Filter draft contracts'));

      expect(screen.queryByText('Green Grocers Ltd')).toBeNull();
      expect(screen.getByText('Seed supplier agreement')).toBeTruthy();
    });

    it('shows a retryable connection error (not a false empty state) when the list fails', async () => {
      mockListContracts.mockRejectedValue(NETWORK_ERROR);

      render(<ContractsScreen />);

      expect(await screen.findByText("Couldn't load contracts")).toBeTruthy();
      expect(screen.getByText(CONNECTION_COPY)).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
      expect(screen.queryByText('No Contracts Found')).toBeNull();
    });

    it('shows the empty state when there are no contracts', async () => {
      mockListContracts.mockResolvedValue({ data: [] });

      render(<ContractsScreen />);

      expect(await screen.findByText('No Contracts Found')).toBeTruthy();
    });
  });

  describe('MarketplaceScreen', () => {
    it('renders listings with title, price and status', async () => {
      render(<MarketplaceScreen />);

      expect(await screen.findByText('Fresh tomatoes — Grade A')).toBeTruthy();
      expect(screen.getByText('2.5 / kg')).toBeTruthy();
      expect(screen.getByText('Dairy cows')).toBeTruthy();
    });

    it('switches to the buyers segment and renders buyers', async () => {
      render(<MarketplaceScreen />);
      await screen.findByText('Fresh tomatoes — Grade A');

      fireEvent.press(screen.getByLabelText('Show buyers'));

      expect(await screen.findByText('Green Grocers Ltd')).toBeTruthy();
      expect(screen.getByText('City Market Stall')).toBeTruthy();
      expect(screen.getByText(/sam@greengrocers\.example/)).toBeTruthy();
    });

    it('shows a retryable error for listings when that endpoint fails', async () => {
      mockListListings.mockRejectedValue(NETWORK_ERROR);

      render(<MarketplaceScreen />);

      expect(await screen.findByText("Couldn't load listings")).toBeTruthy();
      expect(screen.getByText(CONNECTION_COPY)).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
      expect(screen.queryByText('No Listings Found')).toBeNull();
    });

    it('shows a retryable error for buyers when that endpoint fails', async () => {
      mockListBuyers.mockRejectedValue(NETWORK_ERROR);

      render(<MarketplaceScreen />);
      await screen.findByText('Fresh tomatoes — Grade A');

      fireEvent.press(screen.getByLabelText('Show buyers'));

      expect(await screen.findByText("Couldn't load buyers")).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    it('shows the empty state when there are no listings', async () => {
      mockListListings.mockResolvedValue({ data: [] });

      render(<MarketplaceScreen />);

      expect(await screen.findByText('No Listings Found')).toBeTruthy();
    });

    it('hides the add action without finance.write', async () => {
      mockHasPermission.mockImplementation((p: string) => p === 'finance.read');

      render(<MarketplaceScreen />);
      await screen.findByText('Fresh tomatoes — Grade A');

      expect(screen.queryByLabelText('Create new listing')).toBeNull();
      expect(screen.queryByLabelText('Create new buyer')).toBeNull();
    });
  });
});
