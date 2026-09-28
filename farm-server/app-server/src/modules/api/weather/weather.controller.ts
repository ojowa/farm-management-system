import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@farm/auth-server/nestjs';
import axios from 'axios';

const OPEN_METEO_URL = process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';

/** WMO weather interpretation codes → OpenWeather-style description/icon. */
const WMO: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: '01d' },
  1: { description: 'Mainly clear', icon: '02d' },
  2: { description: 'Partly cloudy', icon: '03d' },
  3: { description: 'Overcast', icon: '04d' },
  45: { description: 'Fog', icon: '50d' },
  48: { description: 'Depositing rime fog', icon: '50d' },
  51: { description: 'Light drizzle', icon: '09d' },
  53: { description: 'Moderate drizzle', icon: '09d' },
  55: { description: 'Dense drizzle', icon: '09d' },
  56: { description: 'Light freezing drizzle', icon: '09d' },
  57: { description: 'Dense freezing drizzle', icon: '09d' },
  61: { description: 'Slight rain', icon: '10d' },
  63: { description: 'Moderate rain', icon: '10d' },
  65: { description: 'Heavy rain', icon: '10d' },
  66: { description: 'Light freezing rain', icon: '13d' },
  67: { description: 'Heavy freezing rain', icon: '13d' },
  71: { description: 'Slight snow fall', icon: '13d' },
  73: { description: 'Moderate snow fall', icon: '13d' },
  75: { description: 'Heavy snow fall', icon: '13d' },
  77: { description: 'Snow grains', icon: '13d' },
  80: { description: 'Slight rain showers', icon: '09d' },
  81: { description: 'Moderate rain showers', icon: '09d' },
  82: { description: 'Violent rain showers', icon: '09d' },
  85: { description: 'Slight snow showers', icon: '13d' },
  86: { description: 'Heavy snow showers', icon: '13d' },
  95: { description: 'Thunderstorm', icon: '11d' },
  96: { description: 'Thunderstorm with hail', icon: '11d' },
  99: { description: 'Thunderstorm with heavy hail', icon: '11d' },
};

function describe(code: number | undefined): { description: string; icon: string } {
  return WMO[code ?? -1] || { description: 'Unknown', icon: '01d' };
}

function parseCoords(lat?: string, lon?: string) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new BadRequestException('lat and lon query parameters are required');
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new BadRequestException('lat/lon are out of range');
  }
  return { latitude, longitude };
}

async function callOpenMeteo(params: Record<string, string | number>): Promise<any> {
  try {
    const { data } = await axios.get(OPEN_METEO_URL, {
      params,
      timeout: Number(process.env.WEATHER_TIMEOUT_MS) || 8000,
    });
    return data;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 400) throw new BadRequestException('Invalid coordinates for weather lookup');
    throw new ServiceUnavailableException('Weather service is unavailable');
  }
}

/**
 * Farm weather endpoints used by the admin weather dashboard.
 * Backed by Open-Meteo (keyless); override with WEATHER_API_URL.
 */
@UseGuards(JwtAuthGuard)
@Controller('weather')
export class WeatherController {
  @Get('current')
  async current(@Query('lat') lat?: string, @Query('lon') lon?: string) {
    const { latitude, longitude } = parseCoords(lat, lon);
    const data = await callOpenMeteo({
      latitude,
      longitude,
      current:
        'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
      timezone: 'auto',
    });

    const current = data?.current || {};
    const code = Number(current.weather_code);
    const { description, icon } = describe(code);

    return {
      temperature: current.temperature_2m ?? 0,
      feelsLike: current.apparent_temperature ?? current.temperature_2m ?? 0,
      humidity: current.relative_humidity_2m ?? 0,
      windSpeed: current.wind_speed_10m ?? 0,
      description,
      icon,
      weatherCode: Number.isFinite(code) ? code : null,
      observedAt: current.time || null,
      latitude,
      longitude,
    };
  }

  @Get('forecast')
  async forecast(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('days') days?: string,
  ) {
    const { latitude, longitude } = parseCoords(lat, lon);
    const forecastDays = Math.min(Math.max(parseInt(days || '7', 10) || 7, 1), 16);

    const data = await callOpenMeteo({
      latitude,
      longitude,
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
      forecast_days: forecastDays,
      timezone: 'auto',
    });

    const daily = data?.daily || {};
    const dates: string[] = daily.time || [];
    return dates.map((date, i) => {
      const { description, icon } = describe(Number(daily.weather_code?.[i]));
      return {
        date,
        tempHigh: daily.temperature_2m_max?.[i] ?? 0,
        tempLow: daily.temperature_2m_min?.[i] ?? 0,
        description,
        icon,
        humidity: daily.precipitation_probability_max?.[i] ?? 0,
        windSpeed: daily.wind_speed_10m_max?.[i] ?? 0,
      };
    });
  }

  @Get('alerts')
  async alerts(@Query('lat') lat?: string, @Query('lon') lon?: string) {
    const { latitude, longitude } = parseCoords(lat, lon);
    const data = await callOpenMeteo({
      latitude,
      longitude,
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
      forecast_days: 7,
      timezone: 'auto',
    });

    const daily = data?.daily || {};
    const dates: string[] = daily.time || [];
    const found: any[] = [];

    dates.forEach((date, i) => {
      const high = Number(daily.temperature_2m_max?.[i]);
      const low = Number(daily.temperature_2m_min?.[i]);
      const rain = Number(daily.precipitation_probability_max?.[i]);
      const wind = Number(daily.wind_speed_10m_max?.[i]);
      const code = Number(daily.weather_code?.[i]);

      if (Number.isFinite(high) && high >= 35) {
        found.push({
          id: `heat-${date}`,
          title: 'Extreme heat',
          severity: 'SEVERE',
          description: `Highs near ${high}°C expected. Provide shade and extra water.`,
          start: date,
          end: date,
        });
      }
      if (Number.isFinite(low) && low <= 0) {
        found.push({
          id: `frost-${date}`,
          title: 'Frost risk',
          severity: 'MODERATE',
          description: `Lows near ${low}°C expected. Protect sensitive crops.`,
          start: date,
          end: date,
        });
      }
      if (Number.isFinite(rain) && rain >= 80) {
        found.push({
          id: `rain-${date}`,
          title: 'Heavy rain likely',
          severity: 'MODERATE',
          description: `${Math.round(rain)}% chance of precipitation. Delay spraying and harvesting.`,
          start: date,
          end: date,
        });
      }
      if (Number.isFinite(wind) && wind >= 60) {
        found.push({
          id: `wind-${date}`,
          title: 'Strong wind',
          severity: 'SEVERE',
          description: `Gusts up to ${Math.round(wind)} km/h expected.`,
          start: date,
          end: date,
        });
      }
      if ([95, 96, 99].includes(code)) {
        found.push({
          id: `storm-${date}`,
          title: 'Thunderstorm',
          severity: 'SEVERE',
          description: 'Thunderstorms expected. Secure livestock and equipment.',
          start: date,
          end: date,
        });
      }
    });

    return found;
  }
}
