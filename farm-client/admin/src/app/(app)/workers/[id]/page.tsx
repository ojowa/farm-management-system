'use client';

import React, { useCallback, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Briefcase,
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  Phone,
  Mail,
  ShieldAlert,
  Banknote,
  Clock,
  Send,
} from 'lucide-react';
import { workersAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { usePermission } from '@/lib/usePermission';

interface Worker {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  position: string;
  department?: string;
  email?: string;
  phone?: string;
  hireDate?: string;
  status: string;
  payRate?: number;
  payType?: string;
  terminationDate?: string;
  skills?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  userId?: string;
  farmId: string;
  farm?: { id: string; name: string };
  createdAt: string;
  updatedAt?: string;
}

const statusVariant: Record<string, 'success' | 'default' | 'warning' | 'destructive' | 'secondary'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  PROBATION: 'warning',
  TERMINATED: 'destructive',
};

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canCreate, canDelete } = usePermission();
  const readOnly = !canCreate('hr');
  const canRemove = canDelete('hr');
  const { toast } = useToast();
  const [reinvite, setReinvite] = useState<{ email?: string; tempPassword: string } | null>(null);
  const [reinviting, setReinviting] = useState(false);

  const {
    data: workerData,
    loading,
    error,
    refetch,
  } = useFetch<{ data: Worker }>(`worker-${id}`, () => workersAPI.get(id), {
    cacheTime: 30_000,
  });

  const worker = workerData?.data;

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id) {
        refetch();
      }
    },
    [id, refetch]
  );
  useRealtime('worker', handleRealtimeEvent);

  const handleDelete = async () => {
    if (!worker || !confirm(`Delete "${worker.firstName} ${worker.lastName}"? This action cannot be undone.`))
      return;
    try {
      await workersAPI.delete(id);
      toast({ type: 'success', title: 'Worker deleted' });
      clearFetchCache('workers');
      router.push('/workers');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete worker',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const handleReinvite = async () => {
    if (!confirm('Reset the login password and resend the invitation email?')) return;
    setReinviting(true);
    try {
      const { data } = await workersAPI.reinvite(id);
      setReinvite({ email: data?.email, tempPassword: data?.tempPassword });
      toast({ type: 'success', title: 'Invitation resent' });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to resend invitation',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setReinviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="font-medium text-destructive">Failed to load worker</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Worker not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/workers')}>
          Back to Workers
        </Button>
      </div>
    );
  }

  const fullName = `${worker.firstName} ${worker.middleName ? `${worker.middleName} ` : ''}${worker.lastName}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/workers"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Workers
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="secondary">{worker.position}</Badge>
              <Badge variant={statusVariant[worker.status] || 'secondary'}>
                {worker.status || 'ACTIVE'}
              </Badge>
              {worker.farm && (
                <span className="text-muted-foreground text-sm">• {worker.farm.name}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/workers/attendance/${worker.id}`)}
            >
              <Clock className="mr-2 h-4 w-4" />
              Attendance History
            </Button>
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  onClick={handleReinvite}
                  loading={reinviting}
                  disabled={!worker.userId}
                  title={
                    worker.userId
                      ? 'Reset password and resend the invitation email'
                      : 'This worker has no linked login account'
                  }
                >
                  <Send className="mr-2 h-4 w-4" />
                  Resend Invite
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/workers/${id}/edit`)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </>
            )}
            {canRemove && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick facts */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-lg font-semibold">{fullName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Position</p>
                <p className="text-lg font-semibold">{worker.position}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hire Date</p>
                <p className="text-lg font-semibold">
                  {worker.hireDate
                    ? new Date(worker.hireDate).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Position</p>
              <p className="font-medium">{worker.position}</p>
            </div>
            {worker.department && (
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{worker.department}</p>
              </div>
            )}
            {worker.email && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email (login)
                </p>
                <p className="font-medium">{worker.email}</p>
              </div>
            )}
            {worker.phone && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </p>
                <p className="font-medium">{worker.phone}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Farm</p>
              <p className="font-medium">{worker.farm?.name || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hire Date</p>
              <p className="font-medium">
                {worker.hireDate
                  ? new Date(worker.hireDate).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(worker.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Employment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Pay Rate</p>
              <p className="font-medium">
                {worker.payRate != null ? worker.payRate : 'Not set'}
                {worker.payType ? ` (${worker.payType.toLowerCase()})` : ''}
              </p>
            </div>
            {worker.skills && worker.skills.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Skills</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {worker.skills.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {worker.terminationDate && (
              <div>
                <p className="text-sm text-muted-foreground">Termination Date</p>
                <p className="font-medium text-red-600">
                  {new Date(worker.terminationDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emergency contact */}
      {(worker.emergencyContactName || worker.emergencyContactPhone) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{worker.emergencyContactName || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{worker.emergencyContactPhone || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Relationship</p>
                <p className="font-medium">{worker.emergencyContactRelation || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credentials dialog — shown after a reinvite */}
      {reinvite && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setReinvite(null);
          }}
          title="Invitation resent — new login credentials"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {reinvite.email} can now log in with this new temporary password
              (it was also emailed if delivery is configured). The previous
              password no longer works.
            </p>
            <div>
              <label className="text-sm font-medium mb-1 block">Temporary password</label>
              <code className="block rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                {reinvite.tempPassword}
              </code>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setReinvite(null)}>
                Done
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
