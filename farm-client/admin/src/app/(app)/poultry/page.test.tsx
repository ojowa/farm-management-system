import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFetchCache } from '@/hooks/useFetch';
import { POULTRY_TABS } from '@/lib/poultryTabs';
import PoultryPage from './page';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// The hub only needs the farm-name lookup behind the ?farmId= chip; everything
// else it renders is static markup.

const { mocks, state } = vi.hoisted(() => ({
  mocks: { farmsList: vi.fn() },
  state: { pathname: '/poultry' },
}));

vi.mock('@/lib/api', () => ({
  farmsAPI: { list: mocks.farmsList },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => state.pathname,
  useSearchParams: () => ({ get: () => null }),
}));

// next/link needs the app router mounted; a plain anchor keeps the hrefs and
// aria-current the assertions care about.
vi.mock('next/link', () => ({
  default: ({ href, children, className, ...rest }: any) => (
    <a
      href={typeof href === 'string' ? href : href?.href}
      className={className}
      aria-current={rest['aria-current']}
    >
      {children}
    </a>
  ),
}));

describe('PoultryHubPage — section tab bar', () => {
  // RTL's role queries don't filter on aria-current, so match it by hand —
  // the point of these assertions is that exactly one tab is ever active.
  const activeLinks = () =>
    screen.getAllByRole('link').filter((el) => el.getAttribute('aria-current') === 'page');

  beforeEach(() => {
    clearFetchCache();
    vi.clearAllMocks();
    state.pathname = '/poultry';
    mocks.farmsList.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('renders every POULTRY_TABS entry as a link to its section', () => {
    render(<PoultryPage />);

    for (const { label, href } of POULTRY_TABS) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', href);
    }
    expect(screen.getAllByRole('link').length).toBeGreaterThanOrEqual(POULTRY_TABS.length);
  });

  it('lights exactly one tab — the hub itself on /poultry', () => {
    render(<PoultryPage />);

    expect(screen.getByRole('link', { name: 'Poultry' })).toHaveAttribute('aria-current', 'page');
    expect(activeLinks()).toHaveLength(1);
  });

  // Detail routes (/poultry/houses/:id) have no bar of their own — the list
  // pages below them carry it, and NavTabs' longest match lights their tab.
  it('lights the owning section for a deeper route under the section', () => {
    state.pathname = '/poultry/houses/house-1';

    render(<PoultryPage />);

    expect(screen.getByRole('link', { name: 'Houses & Pens' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(activeLinks()).toHaveLength(1);
    // The parent tab must NOT be active at the same time.
    expect(screen.getByRole('link', { name: 'Poultry' })).not.toHaveAttribute('aria-current');
  });
});
