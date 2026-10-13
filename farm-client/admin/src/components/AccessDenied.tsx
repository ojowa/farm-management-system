'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

/**
 * Shown in place of a view the signed-in user has no permission for. The
 * shell (nav, header) stays so they can move somewhere they *can* use —
 * the sidebar never offers them this link in the first place.
 */
export function AccessDenied({ permission }: { permission?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
          <ShieldAlert className="h-7 w-7 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold">You don&apos;t have permission to view this page</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account isn&apos;t allowed to access this section
          {permission ? (
            <>
              {' '}
              (requires <code className="rounded bg-muted px-1 py-0.5 text-xs">{permission}</code>)
            </>
          ) : null}
          . Ask an administrator to update your role if you need it.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
