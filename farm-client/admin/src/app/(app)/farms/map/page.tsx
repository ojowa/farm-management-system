'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Navigation,
  ExternalLink,
  RefreshCw,
  Search,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { farmMapAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useFetch } from '@/hooks/useFetch';

import { FARM_TYPE_MAP } from '@/lib/farmTypes';

interface FarmLocation {
  id: string;
  name: string;
  farmType: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  size?: number;
  status?: string;
}

const TILE_SIZE = 256;
const MAP_HEIGHT = 420;
const MIN_ZOOM = 2;
const MAX_ZOOM = 17;

/** Web-Mercator projection: lat/lng → absolute pixel space at a zoom level. */
function project(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Dependency-free slippy map: a raw grid of OpenStreetMap tile images plus
 * absolutely-positioned markers. Bounds are computed from the farms, the zoom
 * picked to fit them in the container, and tiles rendered around the center.
 */
function FarmTileMap({
  farms,
  onMarkerClick,
}: {
  farms: Array<FarmLocation & { latitude: number; longitude: number }>;
  onMarkerClick: (farm: FarmLocation) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Track the container width so the tile grid stays responsive.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const view = useMemo(() => {
    if (farms.length === 0 || width === 0) return null;
    let minLat = farms[0].latitude;
    let maxLat = farms[0].latitude;
    let minLng = farms[0].longitude;
    let maxLng = farms[0].longitude;
    for (const f of farms) {
      minLat = Math.min(minLat, f.latitude);
      maxLat = Math.max(maxLat, f.latitude);
      minLng = Math.min(minLng, f.longitude);
      maxLng = Math.max(maxLng, f.longitude);
    }
    // A single point (or a coincident cluster) has zero-size bounds — pad it
    // so we don't divide by zero and the marker isn't jammed against the edge.
    if (maxLat - minLat < 0.05) {
      minLat -= 0.05;
      maxLat += 0.05;
    }
    if (maxLng - minLng < 0.05) {
      minLng -= 0.05;
      maxLng += 0.05;
    }

    // Pick the highest zoom whose lat/lng span still fits the container.
    let zoom = MIN_ZOOM;
    for (let z = MAX_ZOOM; z >= MIN_ZOOM; z--) {
      const tl = project(maxLat, minLng, z);
      const br = project(minLat, maxLng, z);
      if (br.x - tl.x <= width && br.y - tl.y <= MAP_HEIGHT) {
        zoom = z;
        break;
      }
    }

    const topLeft = project(maxLat, minLng, zoom);
    const bottomRight = project(minLat, maxLng, zoom);
    const center = { x: (topLeft.x + bottomRight.x) / 2, y: (topLeft.y + bottomRight.y) / 2 };
    const origin = { x: center.x - width / 2, y: center.y - MAP_HEIGHT / 2 };

    const minTileX = Math.floor(origin.x / TILE_SIZE);
    const maxTileX = Math.floor((origin.x + width) / TILE_SIZE);
    const minTileY = Math.floor(origin.y / TILE_SIZE);
    const maxTileY = Math.floor((origin.y + MAP_HEIGHT) / TILE_SIZE);
    const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        tiles.push({
          key: `${zoom}/${x}/${y}`,
          url: `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
          left: x * TILE_SIZE - origin.x,
          top: y * TILE_SIZE - origin.y,
        });
      }
    }

    const markers = farms.map((f) => {
      const p = project(f.latitude, f.longitude, zoom);
      return { farm: f, left: p.x - origin.x, top: p.y - origin.y };
    });

    return { tiles, markers };
  }, [farms, width]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border bg-muted"
      style={{ height: MAP_HEIGHT }}
    >
      {view ? (
        <>
          {view.tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              aria-hidden="true"
              width={TILE_SIZE}
              height={TILE_SIZE}
              className="absolute select-none"
              style={{ left: tile.left, top: tile.top }}
              // A failed tile (offline, rate-limited) just leaves a gap.
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
              }}
              draggable={false}
            />
          ))}
          {view.markers.map(({ farm, left, top }) => {
            const meta = FARM_TYPE_MAP[farm.farmType];
            const Icon = meta?.icon || MapPin;
            return (
              <button
                key={farm.id}
                type="button"
                onClick={() => onMarkerClick(farm)}
                aria-label={`View ${farm.name}`}
                title={farm.name}
                className={`absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring ${
                  meta?.color || 'bg-secondary text-secondary-foreground'
                }`}
                style={{ left, top }}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-1 right-1 z-10 rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
          >
            © OpenStreetMap contributors
          </a>
        </>
      ) : (
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}

export default function FarmMapPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedFarm, setSelectedFarm] = useState<FarmLocation | null>(null);

  const {
    data: farmsData,
    loading,
    error,
    refetch,
  } = useFetch<{ data: FarmLocation[] }>(
    'farm-map',
    () => farmMapAPI.all(),
    { cacheTime: 60_000 }
  );

  const farms = farmsData?.data || [];

  const filtered = useMemo(() => {
    if (!search) return farms;
    const q = search.toLowerCase();
    return farms.filter(
      (farm) =>
        farm.name.toLowerCase().includes(q) ||
        farm.location?.toLowerCase().includes(q) ||
        farm.farmType.toLowerCase().includes(q)
    );
  }, [farms, search]);

  const farmsWithCoords = useMemo(
    () =>
      filtered.filter(
        (f): f is FarmLocation & { latitude: number; longitude: number } =>
          f.latitude != null && f.longitude != null
      ),
    [filtered]
  );

  const handleRefresh = () => {
    refetch();
  };

  const openInOSM = (lat: number, lon: number) => {
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`, '_blank');
  };

  const getFarmTypeBadge = (farmType: string) => {
    const meta = FARM_TYPE_MAP[farmType];
    if (!meta) return <Badge variant="secondary">{farmType}</Badge>;
    return (
      <Badge className={meta.color}>
        <meta.icon className="mr-1 h-3 w-3" />
        {meta.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/farms"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Farms
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Farm Map</h1>
            <p className="text-muted-foreground">
              {filtered.length === farms.length
                ? `${farms.length} farm${farms.length === 1 ? '' : 's'} · ${farmsWithCoords.length} have coordinates`
                : `${filtered.length} of ${farms.length} farms match · ${farmsWithCoords.length} have coordinates`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
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
              aria-label="Search farms"
            />
          </div>
        </CardContent>
      </Card>

      {error && !farmsData ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Failed to load farm locations</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : loading && !farmsData ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        </Card>
      ) : farmsWithCoords.length > 0 ? (
        <FarmTileMap
          farms={farmsWithCoords}
          onMarkerClick={(farm) => router.push(`/farms/${farm.id}`)}
        />
      ) : null}

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
              {loading && !farmsData ? (
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
                            {getFarmTypeBadge(farm.farmType)}
                            <Badge
                              variant={farm.status === 'inactive' ? 'secondary' : 'success'}
                            >
                              {farm.status === 'inactive' ? 'Inactive' : 'Active'}
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
                              {farm.size} acres
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {farm.latitude != null && farm.longitude != null && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Open ${farm.name} in OpenStreetMap`}
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
                            aria-label={`View ${farm.name} details`}
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Matching Farms</span>
                <span className="font-medium">
                  {filtered.length}
                  {filtered.length !== farms.length && (
                    <span className="text-muted-foreground font-normal"> of {farms.length}</span>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">With Coordinates</span>
                <span className="font-medium">{farmsWithCoords.length}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
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
                <div className="flex items-center gap-2">
                  {getFarmTypeBadge(selectedFarm.farmType)}
                  <Badge
                    variant={selectedFarm.status === 'inactive' ? 'secondary' : 'success'}
                  >
                    {selectedFarm.status === 'inactive' ? 'Inactive' : 'Active'}
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
                      {selectedFarm.size} acres
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
