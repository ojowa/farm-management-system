import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { farmsAPI } from '@/modules/farm';
import { weatherAPI } from '@/modules/reporting';
import { Card, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { describeApiError } from '@/core/utils/apiError';
import { MenuButton } from '@/core/ui/MenuButton';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  refreshButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locationText: { fontSize: 13, color: colors.textLight, marginLeft: 4 },
  alertCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertCardSevere: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 2 },
  alertTitleSevere: { color: '#991B1B' },
  alertDescription: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  alertDescriptionSevere: { color: '#991B1B' },
  currentCard: { marginBottom: 16 },
  currentTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentIcon: { fontSize: 44 },
  currentTemp: { fontSize: 36, fontWeight: '700', color: colors.text },
  currentDescription: { fontSize: 14, color: colors.textLight, textTransform: 'capitalize' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  metricBox: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  metricLabel: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.light,
    borderRadius: 8,
    marginBottom: 8,
  },
  forecastLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  forecastIcon: { fontSize: 22 },
  forecastDay: { fontSize: 14, fontWeight: '600', color: colors.text },
  forecastDescription: { fontSize: 12, color: colors.textLight, textTransform: 'capitalize' },
  forecastTemps: { flexDirection: 'row', gap: 12 },
  forecastHigh: { fontSize: 14, fontWeight: '700', color: colors.text },
  forecastLow: { fontSize: 14, color: colors.textLight },
  partialNotice: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  noForecast: { fontSize: 13, color: colors.textLight, textAlign: 'center', paddingVertical: 12 },
});

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

function unwrapAny(payload: any) {
  return payload?.data ?? payload;
}

/** Emoji equivalent of the admin page's OpenWeather icon codes. */
function weatherEmoji(code: string): string {
  if (!code) return '☁️';
  if (code.includes('01')) return '☀️';
  if (code.includes('02') || code.includes('03') || code.includes('04')) return '⛅';
  if (code.includes('09') || code.includes('10') || code.includes('11')) return '🌧️';
  if (code.includes('13')) return '🌨️';
  return '☁️';
}

function dayName(dateStr: string, index: number): string {
  if (!dateStr) return `Day ${index + 1}`;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? `Day ${index + 1}` : d.toLocaleDateString(undefined, { weekday: 'short' });
}

export default function WeatherScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [noLocation, setNoLocation] = useState(false);
  const [partialNote, setPartialNote] = useState<string | null>(null);
  const [farmLocation, setFarmLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setNoLocation(false);
    setPartialNote(null);
    try {
      // Weather is keyed to the first farm that has GPS coordinates (same as admin).
      const farmsRes = await farmsAPI.list();
      const farms = unwrapAny(farmsRes.data);
      const farmList: any[] = Array.isArray(farms) ? farms : [];
      const farm = farmList.find((f) => f?.latitude != null && f?.longitude != null);

      if (!farm) {
        setNoLocation(true);
        setError('No farm with GPS coordinates found.');
        return;
      }

      const lat = parseFloat(farm.latitude);
      const lon = parseFloat(farm.longitude);
      setFarmLocation({ lat, lon, name: farm.name });

      // Partial failures are tolerated: render whatever came back.
      const [currentRes, forecastRes, alertsRes] = await Promise.allSettled([
        weatherAPI.current(lat, lon),
        weatherAPI.forecast(lat, lon, 7),
        weatherAPI.alerts(lat, lon),
      ]);

      let failures = 0;
      if (currentRes.status === 'fulfilled') {
        const current: any = unwrapAny(currentRes.value.data);
        setWeather({
          temperature: current?.temperature ?? current?.main?.temp ?? 0,
          humidity: current?.humidity ?? current?.main?.humidity ?? 0,
          windSpeed: current?.windSpeed ?? current?.wind?.speed ?? 0,
          description: current?.description ?? current?.weather?.[0]?.description ?? 'N/A',
          icon: current?.icon ?? current?.weather?.[0]?.icon ?? '01d',
          feelsLike: current?.feelsLike ?? current?.main?.feels_like,
        });
      } else {
        failures += 1;
      }

      if (forecastRes.status === 'fulfilled') {
        const forecastData: any = unwrapAny(forecastRes.value.data);
        const days = Array.isArray(forecastData) ? forecastData : [];
        setForecast(
          days.slice(0, 7).map((d: any, i: number) => ({
            date: d.date || (d.dt ? new Date(d.dt * 1000).toISOString() : ''),
            tempHigh: d.tempHigh ?? d.temp?.max ?? 0,
            tempLow: d.tempLow ?? d.temp?.min ?? 0,
            description: d.description ?? d.weather?.[0]?.description ?? 'N/A',
            humidity: d.humidity ?? 0,
            icon: d.icon ?? d.weather?.[0]?.icon ?? '01d',
            key: i,
          })) as any
        );
      } else {
        failures += 1;
      }

      if (alertsRes.status === 'fulfilled') {
        const alertsData: any = unwrapAny(alertsRes.value.data);
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
      } else {
        failures += 1;
      }

      // Everything failed → real error state with retry; partial → notice only.
      if (failures === 3) {
        setError('Weather service is unavailable. Please check that a valid API key is configured.');
      } else if (failures > 0) {
        setPartialNote('Some weather data could not be loaded. Showing what is available.');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400 || status === 503) {
        setError('Weather service is unavailable. Please check that a valid API key is configured.');
      } else {
        setError(describeApiError(err, 'Failed to load weather data. Please try again later.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <MenuButton />
          <Text style={styles.headerTitle}>Weather</Text>
        </View>
        <ScreenLoading message="Loading weather…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MenuButton />
        <Text style={styles.headerTitle}>Weather</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => loadWeather(true)}
          disabled={refreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh weather data"
        >
          <Text style={styles.refreshButtonText}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {error && !weather && (
        <StateView
          variant="error"
          title={noLocation ? 'No Farm Location' : "Couldn't load weather"}
          message={
            error +
            (noLocation ? ' Add latitude and longitude coordinates to a farm in the Farms section.' : '')
          }
          onRetry={noLocation ? undefined : () => loadWeather()}
          retryLabel="Retry"
        />
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadWeather(true)} />}
      >
        {!!partialNote && <Text style={styles.partialNotice}>{partialNote}</Text>}

        {alerts.map((alert) => {
          const severe = alert.severity === 'severe' || alert.severity === 'extreme';
          return (
            <View key={alert.id || alert.title} style={[styles.alertCard, severe && styles.alertCardSevere]}>
              <Text style={[styles.alertTitle, severe && styles.alertTitleSevere]}>
                ⚠️ {alert.title}
              </Text>
              <Text style={[styles.alertDescription, severe && styles.alertDescriptionSevere]}>
                {alert.description}
              </Text>
            </View>
          );
        })}

        {farmLocation && (
          <View style={styles.locationRow}>
            <Text style={{ fontSize: 13 }}>📍</Text>
            <Text style={styles.locationText}>
              {farmLocation.name} ({farmLocation.lat.toFixed(2)}, {farmLocation.lon.toFixed(2)})
            </Text>
          </View>
        )}

        {weather && (
          <Card style={styles.currentCard}>
            <View style={styles.currentTop}>
              <Text style={styles.currentIcon}>{weatherEmoji(weather.icon)}</Text>
              <View>
                <Text style={styles.currentTemp}>{Math.round(weather.temperature)}°C</Text>
                <Text style={styles.currentDescription}>{weather.description}</Text>
              </View>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{Math.round(weather.humidity)}%</Text>
                <Text style={styles.metricLabel}>Humidity</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{Math.round(weather.windSpeed)} km/h</Text>
                <Text style={styles.metricLabel}>Wind</Text>
              </View>
              {weather.feelsLike != null && (
                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>{Math.round(weather.feelsLike)}°C</Text>
                  <Text style={styles.metricLabel}>Feels Like</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        <Text style={styles.sectionTitle}>7-Day Forecast</Text>
        {forecast.length === 0 ? (
          <Text style={styles.noForecast}>No forecast data available.</Text>
        ) : (
          forecast.map((day, i) => (
            <View key={`${day.date}-${i}`} style={styles.forecastRow}>
              <View style={styles.forecastLeft}>
                <Text style={styles.forecastIcon}>{weatherEmoji(day.icon)}</Text>
                <View>
                  <Text style={styles.forecastDay}>{dayName(day.date, i)}</Text>
                  <Text style={styles.forecastDescription}>{day.description}</Text>
                </View>
              </View>
              <View style={styles.forecastTemps}>
                <Text style={styles.forecastHigh}>{Math.round(day.tempHigh)}°</Text>
                <Text style={styles.forecastLow}>{Math.round(day.tempLow)}°</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
