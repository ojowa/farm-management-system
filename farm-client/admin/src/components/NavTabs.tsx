'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface NavTab {
  label: string;
  href: string;
}

/**
 * Segmented sub-navigation shared by the section pages (Farms, Crops,
 * Livestock, Workers, Finance, Reports, Roles) so their child views can be
 * demoted out of the sidebar without becoming unreachable.
 *
 * Longest matching href wins, so exactly one tab is ever active: a child
 * page lights its own tab instead of the parent's too, and index pages
 * under the parent (`/farms/abc`) still light the parent tab.
 */
export function NavTabs({ tabs, ariaLabel = 'Section navigation' }: { tabs: NavTab[]; ariaLabel?: string }) {
  const pathname = usePathname();

  const matches = (t: NavTab) =>
    t.href === '/' ? pathname === '/' : pathname === t.href || pathname.startsWith(`${t.href}/`);

  const activeHref = tabs.reduce<string>(
    (best, t) => (matches(t) && t.href.length > best.length ? t.href : best),
    ''
  );

  return (
    // flex-wrap: sections with many tabs (Poultry ships nine) wrap onto a
    // second row instead of overflowing the content column on narrow screens.
    <nav
      className="mb-6 flex flex-wrap gap-4 border-b border-gray-200 dark:border-gray-700"
      aria-label={ariaLabel}
    >
      {tabs.map((t) => {
        const active = t.href === activeHref;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
              active
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
