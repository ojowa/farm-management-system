import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { POULTRY_TABS } from '@/lib/poultryTabs';

const APP_ROOT = path.join(process.cwd(), 'src', 'app', '(app)');
const POULTRY_ROOT = path.join(APP_ROOT, 'poultry');

/** '/poultry/flocks' -> src/app/(app)/poultry/flocks/page.tsx */
const hrefToFile = (href: string) =>
  path.join(APP_ROOT, ...href.replace(/^\//, '').split('/'), 'page.tsx');

describe('POULTRY_TABS', () => {
  it('every tab points at a page that exists', () => {
    for (const { label, href } of POULTRY_TABS) {
      expect(fs.existsSync(hrefToFile(href)), `${label} -> ${href}`).toBe(true);
    }
  });

  it('labels and hrefs are unique', () => {
    expect(new Set(POULTRY_TABS.map((t) => t.href)).size).toBe(POULTRY_TABS.length);
    expect(new Set(POULTRY_TABS.map((t) => t.label)).size).toBe(POULTRY_TABS.length);
  });

  // A new poultry section page without a tab would only be reachable through
  // the hub cards — the tab bar must cover every top-level section.
  it('covers every top-level poultry section exactly once', () => {
    const sections = fs
      .readdirSync(POULTRY_ROOT, { withFileTypes: true })
      // [module] is the shared detail/edit shell for record pages, not a section.
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('['))
      .map((entry) => `/poultry/${entry.name}`)
      .filter((href) => fs.existsSync(hrefToFile(href)));

    expect([...POULTRY_TABS.map((t) => t.href)].sort()).toEqual(['/poultry', ...sections].sort());
  });

  // A page can reference the tab list and still never draw it (imported but
  // not rendered, or dropped behind an early return in a refactor). Assert the
  // bar is actually in the JSX of every top-level page, not just that its
  // href resolves.
  it('renders the shared bar on every top-level poultry page', () => {
    const BAR = '<NavTabs ariaLabel="Poultry section" tabs={POULTRY_TABS} />';

    for (const { label, href } of POULTRY_TABS) {
      const file = hrefToFile(href);
      const source = fs.readFileSync(file, 'utf8');
      expect(source.includes(BAR), `${label} (${href}) does not render the tab bar`).toBe(true);
      expect(
        source.includes("from '@/lib/poultryTabs'"),
        `${label} (${href}) does not import POULTRY_TABS`
      ).toBe(true);
    }
  });
});
