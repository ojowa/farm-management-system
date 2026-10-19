import React from 'react';
import { render, screen } from '@testing-library/react-native';
import WeatherScreen from '../../app/(app)/weather';

// ─── API mocks ────────────────────────────────────────────────────────────────
// The weather screen mirrors the admin page: it finds the first farm with GPS
// coordinates (farmsAPI.list), then fetches current/forecast/alerts for that
// location in parallel (weatherAPI.*). All three endpoints are stubbed
// independently so any subset can fail — partial failures must degrade
// gracefully, and a farms-list failure must surface as a retryable error.

const mockFarmsList = jest.fn();
const mockCurrent = jest.fn();
const mockForecast = jest.fn();
const mockAlerts = jest.fn();

jest.mock('@/modules/farm', () => ({
  farmsAPI: { list: (...a: any[]) => mockFarmsList(...a) },
}));

jest.mock('@/modules/reporting', () => ({
  weatherAPI: {
    current: (...a: any[]) => mockCurrent(...a),
    forecast: (...a: any[]) => mockForecast(...a),
    alerts: (...a: any[]) => mockAlerts(...a),
  },
}));

jest.mock('@/core/hooks/useToasts', () => ({
  // The weather screen itself doesn't toast, but importing the feedback barrel
  // pulls ToastHost -> useToasts -> react-redux (ESM); mock it to keep jest
  // from parsing the ESM bundle.
  useToasts: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() }),
}));

jest.mock('@/core/theme/ThemeContext', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      primary: '#16A34A',
      background: '#F9FAFB',
      text: '#111827',
      textSecondary: '#6B7280',
      card: '#FFFFFF',
      border: '#E5E7EB',
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/weather',
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const NETWORK_ERROR = new Error('Network Error');
const CONNECTION_COPY = 'No connection. Check your network and try again.';
const UNAVAILABLE_COPY = 'Weather service is unavailable. Please check that a valid API key is configured.';
const NO_GPS_COPY =
  'No farm with GPS coordinates found. Add latitude and longitude coordinates to a farm in the Farms section.';

const FARMS = [{ id: 'f1', name: 'Sunrise Farm', latitude: '1.29', longitude: '36.82' }];

const CURRENT = {
  temperature: 25.6,
  humidity: 61,
  windSpeed: 18,
  description: 'partly cloudy',
  icon: '02d',
  feelsLike: 27.4,
};

const FORECAST = [
  {
    date: '2026-10-20',
    tempHigh: 30.2,
    tempLow: 18.7,
    description: 'Light rain',
    humidity: 72,
    icon: '10d',
  },
];

const ALERTS = [
  {
    id: 'al1',
    title: 'Severe storm warning',
    severity: 'severe',
    description: 'Heavy rains expected on Thursday.',
  },
];

describe('WeatherScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFarmsList.mockResolvedValue({ data: FARMS });
    mockCurrent.mockResolvedValue({ data: CURRENT });
    mockForecast.mockResolvedValue({ data: FORECAST });
    mockAlerts.mockResolvedValue({ data: ALERTS });
  });

  it('renders current conditions, forecast and alerts for the first GPS farm', async () => {
    render(<WeatherScreen />);

    // Location line uses the farm's coordinates.
    expect(await screen.findByText(/Sunrise Farm/)).toBeTruthy();
    // Current conditions.
    expect(screen.getByText('26°C')).toBeTruthy();
    expect(screen.getByText('partly cloudy')).toBeTruthy();
    expect(screen.getByText('61%')).toBeTruthy();
    expect(screen.getByText('18 km/h')).toBeTruthy();
    // Forecast + alerts.
    expect(screen.getByText(/Light rain/)).toBeTruthy();
    expect(screen.getByText(/Severe storm warning/)).toBeTruthy();
  });

  it('requests the farm coordinates from the current/forecast/alert endpoints', async () => {
    render(<WeatherScreen />);
    await screen.findByText(/Sunrise Farm/);

    expect(mockCurrent).toHaveBeenCalledWith(1.29, 36.82);
    expect(mockForecast).toHaveBeenCalledWith(1.29, 36.82, 7);
    expect(mockAlerts).toHaveBeenCalledWith(1.29, 36.82);
  });

  it('shows guidance (not a retry) when no farm has GPS coordinates', async () => {
    mockFarmsList.mockResolvedValue({ data: [{ id: 'f2', name: 'Off-grid Plot' }] });

    render(<WeatherScreen />);

    expect(await screen.findByText('No Farm Location')).toBeTruthy();
    expect(screen.getByText(NO_GPS_COPY)).toBeTruthy();
    // Retrying cannot help without coordinates — no Retry button.
    expect(screen.queryByText('Retry')).toBeNull();
    expect(mockCurrent).not.toHaveBeenCalled();
  });

  it('shows a retryable error when the farms list itself fails', async () => {
    mockFarmsList.mockRejectedValue(NETWORK_ERROR);

    render(<WeatherScreen />);

    expect(await screen.findByText("Couldn't load weather")).toBeTruthy();
    expect(screen.getByText(CONNECTION_COPY)).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('tolerates partial failures: forecast renders even when current conditions fail', async () => {
    mockCurrent.mockRejectedValue(NETWORK_ERROR);

    render(<WeatherScreen />);

    expect(await screen.findByText(/Light rain/)).toBeTruthy();
    // A partial-failure notice, not the full error state.
    expect(screen.getByText('Some weather data could not be loaded. Showing what is available.')).toBeTruthy();
    expect(screen.queryByText("Couldn't load weather")).toBeNull();
  });

  it('shows a retryable unavailable error when every weather endpoint fails', async () => {
    mockCurrent.mockRejectedValue(NETWORK_ERROR);
    mockForecast.mockRejectedValue(NETWORK_ERROR);
    mockAlerts.mockRejectedValue(NETWORK_ERROR);

    render(<WeatherScreen />);

    expect(await screen.findByText(UNAVAILABLE_COPY)).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });
});
