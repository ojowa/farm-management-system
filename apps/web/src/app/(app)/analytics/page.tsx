'use client';

import React, { useEffect, useState } from 'react';
import { farmsAPI, cropsAPI, livestockAPI, financeAPI } from '@/lib/api';
import { Card, LoadingSpinner } from '@/components/ui';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [farms, crops, livestock, finance] = await Promise.allSettled([
          farmsAPI.list(), cropsAPI.list(), livestockAPI.list(), financeAPI.list(),
        ]);
        const farmsList = farms.status === 'fulfilled' ? (farms.value.data.farms || farms.value.data || []) : [];
        const cropsList = crops.status === 'fulfilled' ? (crops.value.data.crops || crops.value.data || []) : [];
        const livestockList = livestock.status === 'fulfilled' ? (livestock.value.data.animals || livestock.value.data || []) : [];
        const txns = finance.status === 'fulfilled' ? (finance.value.data.transactions || finance.value.data || []) : [];

        const cropStatus = cropsList.reduce((acc: any, c: any) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});
        const animalStatus = livestockList.reduce((acc: any, a: any) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
        const monthlyRevenue = txns
          .filter((t: any) => t.type === 'income')
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

        setData({
          farmCount: farmsList.length,
          cropCount: cropsList.length,
          animalCount: livestockList.length,
          cropStatus,
          animalStatus,
          totalRevenue: monthlyRevenue,
        });
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card><p className="text-sm text-gray-500">Farms</p><p className="text-3xl font-bold">{data.farmCount}</p></Card>
        <Card><p className="text-sm text-gray-500">Crops</p><p className="text-3xl font-bold">{data.cropCount}</p></Card>
        <Card><p className="text-sm text-gray-500">Livestock</p><p className="text-3xl font-bold">{data.animalCount}</p></Card>
        <Card><p className="text-sm text-gray-500">Revenue</p><p className="text-3xl font-bold text-green-600">${data.totalRevenue?.toLocaleString()}</p></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Crop Status Breakdown</h3>
          {Object.keys(data.cropStatus || {}).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.cropStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm capitalize text-gray-600">{status}</span>
                  <span className="font-semibold">{count as number}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No crop data</p>}
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Livestock Status Breakdown</h3>
          {Object.keys(data.animalStatus || {}).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.animalStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm capitalize text-gray-600">{status}</span>
                  <span className="font-semibold">{count as number}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No livestock data</p>}
        </Card>
      </div>
    </div>
  );
}
