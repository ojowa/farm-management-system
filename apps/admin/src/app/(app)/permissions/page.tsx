'use client';

import React, { useEffect, useState } from 'react';
import { permissionsAPI } from '@/lib/api';
import { Card, Badge, Input, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui';

export default function PermissionsPage() {
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => { loadPermissions(); }, []);

  async function loadPermissions() {
    try {
      const { data } = await permissionsAPI.list();
      setGrouped(data.grouped || {});
      setExpandedCategories(new Set(Object.keys(data.grouped || {})));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const filteredGrouped: Record<string, any[]> = {};
  for (const [cat, perms] of Object.entries(grouped)) {
    const filtered = perms.filter((p: any) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) filteredGrouped[cat] = filtered;
  }

  const totalPermissions = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Permissions</h1>
        <p className="text-sm text-gray-500 mt-1">{totalPermissions} permissions across {Object.keys(grouped).length} categories</p>
      </div>

      <Card>
        <div className="p-4 border-b">
          <Input placeholder="Search permissions..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : Object.keys(filteredGrouped).length === 0 ? (
          <div className="p-8 text-center text-gray-500">No permissions found</div>
        ) : (
          <div className="divide-y">
            {Object.entries(filteredGrouped).map(([category, perms]) => (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">{category}</span>
                    <Badge variant="secondary">{perms.length}</Badge>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {expandedCategories.has(category) ? '▾' : '▸'}
                  </span>
                </button>
                {expandedCategories.has(category) && (
                  <div className="px-4 pb-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Permission</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Roles</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {perms.map((perm: any) => (
                          <TableRow key={perm.id}>
                            <TableCell className="font-medium font-mono text-sm">{perm.name}</TableCell>
                            <TableCell className="text-gray-500">{perm.description || '—'}</TableCell>
                            <TableCell>{perm._count?.roles || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
