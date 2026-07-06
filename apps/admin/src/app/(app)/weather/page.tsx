'use client';

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudRain,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  Loader2,
  MapPin,
} from 'lucide-react';
import { weatherAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/lib/toasts';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  feelsLike?: number;
}

interface ForecastDay {
  date: string;
  tempHigh: number;
  tempLow: number;
  description: string;
  humidity: number;
  icon: string;
}

interface WeatherAlert {
  id: string;
  title: string;
  severity: string;
  description: string;
  start?: string;
  end?: string;
}

export default function WeatherPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [farmLocation, setFarmLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);

  useEffect(() => {
    loadWeather();
  }, []);

  async function loadWeather() {
    setLoading(true);
    setError(null);

    try {
      const farmsRes = await farmsAPI.list({ limit: 1 });
      const farms = farmsRes.data?.data || farmsRes.data || [];
      const farmList = Array.isArray(farms) ? farms : farms?.data || [];

      const farm = farmList.find(
        (f: any) => f.latitude && f.longitude
      );

      if (!farm) {
        setError('No farm with GPS coordinates found. Please add latitude and longitude to a farm to view weather data.');
        setLoading(false);
        return;
      }

      const lat = parseFloat(farm.latitude);
      const lon = parseFloat(farm.longitude);
      setFarmLocation({ lat, lon, name: farm.name });

      const [currentRes, forecastRes, alertsRes] = await Promise.allSettled([
        weatherAPI.current(lat, lon),
        weatherAPI.forecast(lat, lon, 7),
        weatherAPI.alerts(lat, lon),
      ]);

      if (currentRes.status === 'fulfilled') {
        const current = currentRes.value.data?.data || currentRes.value.data;
        setWeather({
          temperature: current?.temperature ?? current?.main?.temp ?? 0,
          humidity: current?.humidity ?? current?.main?.humidity ?? 0,
          windSpeed: current?.windSpeed ?? current?.wind?.speed ?? 0,
          description: current?.description ?? current?.weather?.[0]?.description ?? 'N/A',
          icon: current?.icon ?? current?.weather?.[0]?.icon ?? '01d',
          feelsLike: current?.feelsLike ?? current?.main?.feels_like,
        });
      }

      if (forecastRes.status === 'fulfilled') {
        const forecastData = forecastRes.value.data?.data || forecastRes.value.data || [];
        const days = Array.isArray(forecastData) ? forecastData : [];
        setForecast(
          days.slice(0, 7).map((d: any) => ({
            date: d.date || d.dt ? new Date((d.dt || 0) * 1000).toISOString() : '',
            tempHigh: d.tempHigh ?? d.temp?.max ?? 0,
            tempLow: d.tempLow ?? d.temp?.min ?? 0,
            description: d.description ?? d.weather?.[0]?.description ?? 'N/A',
            humidity: d.humidity ?? 0,
            icon: d.icon ?? d.weather?.[0]?.icon ?? '01d',
          }))
        );
      }

      if (alertsRes.status === 'fulfilled') {
        const alertsData = alertsRes.value.data?.data || alertsRes.value.data || [];
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400 || status === 503) {
        setError('Weather service is unavailable. Please check that a valid API key is configured.');
      } else {
        setError('Failed to load weather data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }

  function getWeatherIcon(code: string) {
    if (!code) return <Cloud className="h-8 w-8 text-gray-400" />;
    if (code.includes('01')) return <Sun className="h-8 w-8 text-yellow-500" />;
    if (code.includes('02') || code.includes('03') || code.includes('04'))
      return <Cloud className="h-8 w-8 text-gray-400" />;
    if (code.includes('09') || code.includes('10') || code.includes('11'))
      return <CloudRain className="h-8 w-8 text-blue-500" />;
    return <Cloud className="h-8 w-8 text-gray-400" />;
  }

  function getDayName(dateStr: string, index: number) {
    if (!dateStr) return `Day ${index + 1}`;
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weather</h1>
          <p className="text-muted-foreground">
            Current conditions and forecast
          </p>
        </div>
        <Button variant="outline" onClick={loadWeather} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Cloud className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-4 rounded-lg border ${
                alert.severity === 'severe' || alert.severity === 'extreme'
                  ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                  : 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
              }`}
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm opacity-90 mt-0.5">{alert.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">{error}</p>
            {farmLocation === null && (
              <p className="text-sm text-muted-foreground mt-2">
                Add latitude and longitude coordinates to your farm in the Farms section.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Weather Content */}
      {!loading && !error && weather && (
        <>
          {/* Location */}
          {farmLocation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{farmLocation.name}</span>
              <span>({farmLocation.lat.toFixed(2)}, {farmLocation.lon.toFixed(2)})</span>
            </div>
          )}

          {/* Current Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow-500" />
                Current Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                <div className="flex items-center gap-4">
                  {getWeatherIcon(weather.icon)}
                  <div>
                    <p className="text-3xl font-bold">{Math.round(weather.temperature)}°C</p>
                    <p className="text-sm text-muted-foreground capitalize">{weather.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Droplets className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{weather.humidity}%</p>
                    <p className="text-sm text-muted-foreground">Humidity</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Wind className="h-6 w-6 text-gray-500" />
                  <div>
                    <p className="text-2xl font-bold">{weather.windSpeed} km/h</p>
                    <p className="text-sm text-muted-foreground">Wind Speed</p>
                  </div>
                </div>
                {weather.feelsLike != null && (
                  <div className="flex items-center gap-3">
                    <Thermometer className="h-6 w-6 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{Math.round(weather.feelsLike)}°C</p>
                      <p className="text-sm text-muted-foreground">Feels Like</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 7-Day Forecast */}
          <Card>
            <CardHeader>
              <CardTitle>7-Day Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              {forecast.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No forecast data available.
                </p>
              ) : (
                <div className="grid gap-3">
                  {forecast.map((day, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {getWeatherIcon(day.icon)}
                        <div>
                          <p className="font-medium">{getDayName(day.date, i)}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {day.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-bold">{Math.round(day.tempHigh)}°</p>
                          <p className="text-xs text-muted-foreground">High</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">{Math.round(day.tempLow)}°</p>
                          <p className="text-xs text-muted-foreground">Low</p>
                        </div>
                        <div className="text-center">
                          <p>{day.humidity}%</p>
                          <p className="text-xs text-muted-foreground">Humidity</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
