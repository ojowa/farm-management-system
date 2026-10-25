import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFetchCache } from '@/hooks/useFetch';
import DashboardPage from './page';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// The dashboard is the one screen that reads every module at once, so each
// endpoint is stubbed individually: a card can only claim the number the
// server handed it.

const { mocks, state } = vi.hoisted(() => ({
  mocks: {
    farmsList: vi.fn(),
    cropsList: vi.fn(),
    livestockList: vi.fn(),
    poultryList: vi.fn(),
    pondsList: vi.fn(),
    listExpenses: vi.fn(),
    listSales: vi.fn(),
    tasksList: vi.fn(),
    attendanceToday: vi.fn(),
    profitSummary: vi.fn(),
  },
  state: { canReadAquaculture: true },
}));

vi.mock('@/lib/api', () => ({
  farmsAPI: { list: mocks.farmsList },
  cropsAPI: { list: mocks.cropsList },
  livestockAPI: { list: mocks.livestockList },
  poultryAPI: { list: mocks.poultryList },
  aquacultureAPI: { ponds: { list: mocks.pondsList } },
  financeAPI: { listExpenses: mocks.listExpenses, listSales: mocks.listSales },
  tasksAPI: { list: mocks.tasksList },
  attendanceAPI: { getToday: mocks.attendanceToday },
  profitabilityAPI: { summary: mocks.profitSummary },
}));

vi.mock('@/lib/usePermission', () => ({
  usePermission: () => ({
    hasPermission: () => true,
    canCreate: () => true,
    canRead: (domain: string) => (domain === 'aquaculture' ? state.canReadAquaculture : true),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard',
}));

// next/link needs the app router mounted; the cards only care that the href
// survives, so render a plain anchor.
vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) => (
    <a href={typeof href === 'string' ? href : href?.href} className={className}>
      {children}
    </a>
  ),
}));

// The charts are recharts wrappers — stub them so the assertions target the
// data the page hands over instead of SVG in jsdom.
vi.mock('@/components/charts', () => ({
  ChartCard: ({ title, children }: any) => <div data-testid={`chart-${title}`}>{children}</div>,
  FarmBarChart: ({ data }: any) => <div data-testid="bar-chart">{JSON.stringify(data)}</div>,
  FarmAreaChart: ({ data }: any) => <div data-testid="area-chart">{JSON.stringify(data)}</div>,
  FarmPieChart: ({ data }: any) => (
    <div data-testid="pie-chart">{data.map((c: any) => `${c.name}:${c.value}`).join(',')}</div>
  ),
}));

const THIS_YEAR = new Date().getFullYear();
const PAGE_SIZE = 200;

describe('DashboardPage', () => {
  beforeEach(() => {
    // useFetch keeps a module-level cache; without clearing it the second test
    // would render the first test's numbers.
    clearFetchCache();
    vi.clearAllMocks();
    state.canReadAquaculture = true;

    mocks.farmsList.mockResolvedValue({ data: { farms: [{ id: 'f1' }], total: 12 } });
    mocks.cropsList.mockResolvedValue({ data: { crops: [{ id: 'c1' }], total: 34 } });
    mocks.livestockList.mockResolvedValue({ data: { data: [{ id: 'l1' }], total: 56 } });
    mocks.poultryList.mockResolvedValue({ data: { data: [{ id: 'p1' }], total: 78 } });
    mocks.pondsList.mockResolvedValue({ data: { data: [{ id: 'pond1' }], total: 90 } });
    mocks.listExpenses.mockResolvedValue({ data: { data: [], total: 0 } });
    mocks.listSales.mockResolvedValue({ data: { data: [], total: 0 } });
    mocks.tasksList.mockResolvedValue({ data: { data: [], stats: [] } });
    mocks.attendanceToday.mockResolvedValue({
      data: { records: [], summary: { present: 1, absent: 0, late: 0 } },
    });
    mocks.profitSummary.mockResolvedValue({
      data: {
        totalRevenue: 800,
        totalExpenses: 300,
        netProfit: 500,
        categories: { Feed: 240, Labor: 60 },
      },
    });
  });

  it('shows the server total behind every stat card, and nothing else', async () => {
    render(<DashboardPage />);

    // The five cards the mobile dashboard also shows, by the same labels.
    expect(await screen.findByText('Total Farms')).toBeInTheDocument();
    expect(screen.getByText('Total Crops')).toBeInTheDocument();
    expect(screen.getByText('Livestock')).toBeInTheDocument();
    expect(screen.getByText('Poultry')).toBeInTheDocument();
    expect(screen.getByText('Ponds')).toBeInTheDocument();

    // …and each value is the server's `total`, not a client-side count.
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    expect(screen.getByText('56')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();

    // Labels that no longer describe what the server returns.
    expect(screen.queryByText('Active Crops')).not.toBeInTheDocument();
    expect(screen.queryByText('Poultry Birds')).not.toBeInTheDocument();

    // One row per query: the total is the whole point of the request.
    expect(mocks.farmsList).toHaveBeenCalledWith({ limit: 1 });
    expect(mocks.cropsList).toHaveBeenCalledWith({ limit: 1 });
    expect(mocks.livestockList).toHaveBeenCalledWith({ limit: 1 });
    expect(mocks.poultryList).toHaveBeenCalledWith({ limit: 1 });
    expect(mocks.pondsList).toHaveBeenCalledWith({ page: 1, limit: 1 });
  });

  it('omits the ponds card — and its request — without aquaculture.read', async () => {
    state.canReadAquaculture = false;

    render(<DashboardPage />);

    expect(await screen.findByText('Total Farms')).toBeInTheDocument();
    expect(screen.queryByText('Ponds')).not.toBeInTheDocument();
    expect(mocks.pondsList).not.toHaveBeenCalled();
  });

  it("builds the expense pie from the server's categories, not loaded rows", async () => {
    // The rows disagree with the summary on purpose: bucketing them locally
    // would produce a different pie than the totalExpenses beside it.
    mocks.listExpenses.mockResolvedValue({
      data: {
        data: [
          { category: 'Feed', amount: 7, date: `${THIS_YEAR}-01-04` },
          { category: 'Transport', amount: 3, date: `${THIS_YEAR}-01-09` },
        ],
        total: 2,
      },
    });

    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByTestId('pie-chart')).toHaveTextContent('Feed:240,Labor:60')
    );

    // The summary card beside it reads from the same server answer.
    expect(await screen.findByText('$800')).toBeInTheDocument();
    expect(screen.getByText('$300')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
  });

  it('keeps paging the ledger until the server says it is covered', async () => {
    const rows = (amount: number) => ({ date: `${THIS_YEAR}-01-05`, amount });
    mocks.listExpenses
      .mockResolvedValueOnce({ data: { data: [rows(10)], total: 3 } })
      .mockResolvedValue({ data: { data: [rows(20), rows(30)], total: 3 } });

    render(<DashboardPage />);

    // The ledger walk is async, so wait for the bar it is asserting on.
    await waitFor(() => {
      const bars = JSON.parse(screen.getByTestId('bar-chart').textContent || '[]');
      const january = bars.find((bar: any) => bar.name === 'Jan');
      // All three rows counted — a single page would have reported 10.
      expect(january.expenses).toBe(60);
    });

    expect(mocks.listExpenses).toHaveBeenNthCalledWith(1, { page: 1, limit: PAGE_SIZE });
    expect(mocks.listExpenses).toHaveBeenNthCalledWith(2, { page: 2, limit: PAGE_SIZE });
    // One page was enough: stop rather than asking again for an empty one.
    expect(mocks.listExpenses).toHaveBeenCalledTimes(2);
  });

  it('buckets the monthly charts by the current year only', async () => {
    const lastYear = THIS_YEAR - 1;
    mocks.listExpenses.mockResolvedValue({
      data: {
        data: [
          { date: `${lastYear}-01-15`, amount: 999 },
          { date: `${THIS_YEAR}-01-10`, amount: 10 },
        ],
        total: 2,
      },
    });
    mocks.listSales.mockResolvedValue({
      data: { data: [{ date: `${THIS_YEAR}-01-05`, total: 40 }], total: 1 },
    });
    mocks.profitSummary.mockRejectedValue(new Error('offline'));

    render(<DashboardPage />);

    await waitFor(() => {
      const bars = JSON.parse(screen.getByTestId('bar-chart').textContent || '[]');
      const january = bars.find((bar: any) => bar.name === 'Jan');
      expect(january.expenses).toBe(10);
      expect(january.income).toBe(40);
      // Last year's row is in no bucket at all — the old month-number-only
      // filter would have filed it under this January.
      expect(bars.reduce((sum: number, bar: any) => sum + bar.expenses, 0)).toBe(10);
    });
  });

  it("quotes the server's pending total instead of the five rows it renders", async () => {
    mocks.tasksList.mockResolvedValue({
      data: {
        data: [{ id: 't1', title: 'Feed the birds', priority: 'HIGH', status: 'PENDING' }],
        stats: [{ status: 'PENDING', count: 17 }],
      },
    });

    render(<DashboardPage />);

    expect(await screen.findByText('17 task(s) awaiting completion')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 17 pending')).toBeInTheDocument();
  });

  it('renders — instead of a fabricated zero when attendance has not loaded', async () => {
    mocks.attendanceToday.mockRejectedValue(new Error('offline'));

    render(<DashboardPage />);

    // Present / Absent / Late all blank out rather than claiming a quiet day.
    expect((await screen.findAllByText('—')).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('Workers Absent')).not.toBeInTheDocument();
  });
});
