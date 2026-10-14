'use client';

import React from 'react';
import { useAuth } from '@/lib/auth';
import { settingsAPI } from '@/lib/api';
import { Building2, Loader2, ShieldCheck } from 'lucide-react';

interface PlatformOrganization {
  id: string;
  name: string;
  slug?: string | null;
}

/**
 * Full-screen gate for platform admins (SUPER_ADMIN / SUPPORT_ADMIN) on
 * admin-app entry: their account carries no home organization, so the app
 * cannot know whose data to open until they pick one. Organization staff and
 * users already belong to exactly one organization and never see this screen.
 */
export function OrganizationPicker({ onChosen }: { onChosen: () => void }) {
  const { user, refreshUser } = useAuth();
  const [orgs, setOrgs] = React.useState<PlatformOrganization[] | null>(null);
  const [error, setError] = React.useState('');
  const [selecting, setSelecting] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError('');
    setOrgs(null);
    try {
      const res = await settingsAPI.listPlatformOrganizations();
      const data = res.data;
      setOrgs(Array.isArray(data) ? data : (data?.organizations ?? []));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load organizations');
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const choose = async (organizationId: string) => {
    setSelecting(organizationId);
    setError('');
    try {
      await settingsAPI.switchOrganization(organizationId);
      // The response set a fresh cookie carrying the chosen organization.
      // Re-read /auth/me so the shell, socket rooms and permission views all
      // boot inside that context before we unmount the gate.
      await refreshUser();
      onChosen();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not open that organization');
      setSelecting(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Choose an organization
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You&apos;re signed in as a platform admin
            {user?.firstName ? `, ${user.firstName}` : ''}. Select the
            organization you want to work in — your access stays scoped to it.
          </p>
        </div>

        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {orgs === null && !error && (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading organizations...
            </div>
          )}

          {orgs?.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              No organizations exist yet.
            </div>
          )}

          {orgs?.map((org) => {
            const isCurrent = org.id === user?.organizationId;
            const busy = selecting !== null;
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => choose(org.id)}
                disabled={busy}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:opacity-60 dark:hover:bg-gray-700/50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {org.name}
                  </span>
                  {org.slug && (
                    <span className="block truncate text-xs text-gray-400">/{org.slug}</span>
                  )}
                </span>
                {isCurrent ? (
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                    Current
                  </span>
                ) : selecting === org.id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
                ) : null}
              </button>
            );
          })}

          {error && (
            <div className="flex items-center justify-between gap-3 p-4 text-sm text-red-600">
              <span>{error}</span>
              <button
                type="button"
                onClick={load}
                className="shrink-0 rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Your session stays scoped to the selected organization.
        </p>
      </div>
    </div>
  );
}
