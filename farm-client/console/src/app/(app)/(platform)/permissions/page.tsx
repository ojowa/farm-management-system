import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Check,
  PlusCircle,
  Search,
  Settings,
} from 'lucide-react';
import {
  platformPermissionsAPI,
  platformRolesAPI,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/components';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/lib/toast';
import { getErrorMessage } from '@/lib/toast';

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<PlatformPermission[]>([]);
  const [categories, setCategories] = useState<Record<string, PlatformPermission[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    try {
      const res = await platformPermissionsAPI.list();
      const perms: PlatformPermission[] = Array.isArray(res.data) ? res.data : [];
      setPermissions(perms);

      const grouped = perms.reduce((acc, p) => {
        const cat = p.category || 'general';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
      }, {} as Record<string, PlatformPermission[]>);
      setCategories(grouped);
    } catch (err: any) {
      toastError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category.trim()) return;
    setSaving(true);
    try {
      await platformPermissionsAPI.create({
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim(),
      });
      toastSuccess('Permission created');
      setForm({ name: '', category: '', description: '' });
      setShowForm(false);
      loadData();
    } catch (err: any) {
      toastError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this permission? This will remove it from all roles.')) return;
    try {
      await platformPermissionsAPI.delete(id);
      toastSuccess('Permission deleted');
      loadData();
    } catch (err: any) {
      toastError(getErrorMessage(err));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Permissions</h1>
        <p className="text-sm text-gray-500">
          Manage permission definitions. Permissions define what actions users can
          perform and are assigned to roles.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add Permission
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(categories).map(([category, perms]) => (
          <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                  {category.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
                  <p className="text-xs text-gray-500">
                    {perms.length} permission{perms.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {perms.length > 0 && (
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-md hover:text-gray-900"
                  >
                    Edit All
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">ID</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {perms.map((perm) => (
                    <tr key={perm.id} className="group hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-8 rounded-md bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {perm.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <p className="text-sm font-medium text-gray-900">{perm.name}</p>
                            {perm.description && (
                              <p className="text-xs text-gray-400">{perm.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">
                        {perm.id}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TouchableOpacity
                          onClick={() => handleDelete(perm.id)}
                          className="text-xs text-red-600 hover:bg-red-50 rounded-md px-3 py-1.5 hover:text-red-700"
                        >
                          Delete
                        </TouchableOpacity>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Permission Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Permission' : 'Add Permission'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. read:contracts"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'finance',
                        'contracts',
                        'marketplace',
                        'workers',
                        'inventory',
                        'livestock',
                        'poultry',
                        'aquaculture',
                        'crops',
                        'reports',
                        'system',
                        'general',
                      ].map((c) => (
                        <SelectItem key={c} value={c}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Describe what this permission allows"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] disabled:opacity-50">
                  {saving ? 'Saving…' : 'Create Permission'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PermissionsPage;
