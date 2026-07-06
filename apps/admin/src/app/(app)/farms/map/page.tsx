'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Navigation,
  ExternalLink,
  RefreshCw,
  Search,
} from 'lucide-react';
import { farmMapAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useToast } from '@/lib/toasts';

interface FarmLocation {
  id: string;
  name: string;
  farmType: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  size?: number;
  sizeUnit?: string;
  status?: string;
}

const FARM_TYPE_COLORS: Record<string, string> = {
  CROP: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  LIVESTOCK: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  POULTRY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  DAIRY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  AQUACULTURE: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
};

export default function FarmMapPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedFarm, setSelectedFarm] = useState<FarmLocation | null>(null);

  const {
    data: farmsData,
    loading,
    refetch,
  } = useFetch<{ data: FarmLocation[] }>(
    'farm-map',
    () => farmMapAPI.all(),
    { cacheTime: 60_000 }
  );

  const farms = farmsData?.data || [];

  const filtered = farms.filter((farm) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      farm.name.toLowerCase().includes(q) ||
      farm.location?.toLowerCase().includes(q) ||
      farm.farmType.toLowerCase().includes(q)
    );
  });

  const farmsWithCoords = filtered.filter(
    (f) => f.latitude != null && f.longitude != null
  );

  const handleRefresh = () => {
    clearFetchCache('farm-map');
    refetch();
  };

  const openInOSM = (lat: number, lon: number) => {
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Farm Map</h1>
          <p className="text-muted-foreground">View all farm locations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search farms by name, location, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Farm Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner className="h-8 w-8" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No farms found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filtered.map((farm) => (
                    <div
                      key={farm.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedFarm?.id === farm.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedFarm(farm)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{farm.name}</h3>
                            <Badge className={FARM_TYPE_COLORS[farm.farmType] || ''} variant="secondary">
                              {farm.farmType}
                            </Badge>
                          </div>
                          {farm.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {farm.location}
                            </p>
                          )}
                          {farm.latitude != null && farm.longitude != null && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}
                            </p>
                          )}
                          {farm.size && (
                            <p className="text-xs text-muted-foreground">
                              {farm.size} {farm.sizeUnit || 'acres'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {farm.latitude != null && farm.longitude != null && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                openInOSM(farm.latitude!, farm.longitude!);
                              }}
                              title="Open in OpenStreetMap"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/farms/${farm.id}`);
                            }}
                            title="View farm details"
                          >
                            <Navigation className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Farms</span>
                <span className="font-medium">{filtered.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">With Coordinates</span>
                <span className="font-medium">{farmsWithCoords.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Without Coordinates</span>
                <span className="font-medium">{filtered.length - farmsWithCoords.length}</span>
              </div>
            </CardContent>
          </Card>

          {selectedFarm && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedFarm.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge className={FARM_TYPE_COLORS[selectedFarm.farmType] || ''} variant="secondary">
                    {selectedFarm.farmType}
                  </Badge>
                </div>
                {selectedFarm.location && (
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="text-sm">{selectedFarm.location}</p>
                  </div>
                )}
                {selectedFarm.latitude != null && selectedFarm.longitude != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Coordinates</p>
                    <p className="text-sm font-mono">
                      {selectedFarm.latitude.toFixed(4)}, {selectedFarm.longitude.toFixed(4)}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto mt-1"
                      onClick={() => openInOSM(selectedFarm.latitude!, selectedFarm.longitude!)}
                    >
                      Open in OpenStreetMap
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
                {selectedFarm.size && (
                  <div>
                    <p className="text-sm text-muted-foreground">Size</p>
                    <p className="text-sm">
                      {selectedFarm.size} {selectedFarm.sizeUnit || 'acres'}
                    </p>
                  </div>
                )}
                <div className="pt-2">
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/farms/${selectedFarm.id}`)}
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    View Farm Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
