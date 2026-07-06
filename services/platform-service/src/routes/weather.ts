import { Router, Request, Response } from 'express';

const router = Router();
const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: any) {
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// GET /weather/current?lat=&lon=
router.get('/current', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

    const cacheKey = `current-${lat}-${lon}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    if (!OPENWEATHER_KEY) {
      return res.json({ temp: null, humidity: null, wind: null, description: 'Weather API key not configured', icon: null });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    const result = {
      temp: data.main?.temp,
      humidity: data.main?.humidity,
      wind: data.wind?.speed,
      description: data.weather?.[0]?.description,
      icon: data.weather?.[0]?.icon,
      feelsLike: data.main?.feels_like,
      pressure: data.main?.pressure,
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /weather/forecast?lat=&lon=&days=7
router.get('/forecast', async (req: Request, res: Response) => {
  try {
    const { lat, lon, days = '7' } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

    const cacheKey = `forecast-${lat}-${lon}-${days}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    if (!OPENWEATHER_KEY) {
      return res.json({ forecast: [], message: 'Weather API key not configured' });
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=${Number(days) * 8}&appid=${OPENWEATHER_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    const forecast = (data.list || []).map((item: any) => ({
      date: item.dt_txt,
      temp: item.main?.temp,
      humidity: item.main?.humidity,
      description: item.weather?.[0]?.description,
      icon: item.weather?.[0]?.icon,
      rain: item.rain?.['3h'] || 0,
    }));

    setCache(cacheKey, { forecast });
    res.json({ forecast });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /weather/alerts?lat=&lon=
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

    const cacheKey = `alerts-${lat}-${lon}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    if (!OPENWEATHER_KEY) {
      return res.json({ alerts: [] });
    }

    // Try One Call API 3.0 first (has native alerts from national weather services)
    const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily&appid=${OPENWEATHER_KEY}`;
    const oneCallRes = await fetch(oneCallUrl);

    if (oneCallRes.ok) {
      const oneCallData = await oneCallRes.json();
      if (oneCallData.alerts && oneCallData.alerts.length > 0) {
        const alerts = oneCallData.alerts.map((a: any) => ({
          type: a.event || 'WEATHER',
          severity: a.tags?.includes('Extreme') ? 'EXTREME' : a.tags?.includes('Severe') ? 'HIGH' : 'MEDIUM',
          message: a.description || a.event,
          sender: a.sender_name,
          start: a.start ? new Date(a.start * 1000).toISOString() : null,
          end: a.end ? new Date(a.end * 1000).toISOString() : null,
        }));
        setCache(cacheKey, { alerts });
        return res.json({ alerts });
      }
    }

    // Fallback: derive alerts from current conditions via 2.5 API
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    const alerts: any[] = [];
    const temp = data.main?.temp;
    const humidity = data.main?.humidity;
    const windSpeed = data.wind?.speed;
    const visibility = data.visibility;
    const rain = data.rain?.['1h'] || 0;

    if (temp !== undefined && temp < 2) alerts.push({ type: 'FROST', severity: 'HIGH', message: 'Frost warning - protect sensitive crops' });
    if (temp !== undefined && temp > 40) alerts.push({ type: 'HEAT', severity: 'HIGH', message: 'Extreme heat warning - ensure adequate irrigation' });
    if (temp !== undefined && temp > 35) alerts.push({ type: 'HEAT_STRESS', severity: 'MEDIUM', message: 'Heat stress risk - monitor livestock and crops' });
    if (windSpeed !== undefined && windSpeed > 20) alerts.push({ type: 'WIND', severity: 'HIGH', message: 'Strong winds - secure loose structures and equipment' });
    if (windSpeed !== undefined && windSpeed > 10 && windSpeed <= 20) alerts.push({ type: 'WIND', severity: 'MEDIUM', message: 'Moderate winds - monitor sensitive crops' });
    if (rain > 10) alerts.push({ type: 'HEAVY_RAIN', severity: 'HIGH', message: 'Heavy rainfall - check drainage and field conditions' });
    if (rain > 5 && rain <= 10) alerts.push({ type: 'RAIN', severity: 'MEDIUM', message: 'Moderate rain - delay field operations if needed' });
    if (humidity !== undefined && humidity > 90) alerts.push({ type: 'HUMIDITY', severity: 'MEDIUM', message: 'High humidity - increased disease risk for crops and livestock' });
    if (visibility !== undefined && visibility < 1000) alerts.push({ type: 'FOG', severity: 'MEDIUM', message: 'Low visibility - exercise caution with farm operations' });

    setCache(cacheKey, { alerts });
    res.json({ alerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const weatherRouter = router;
