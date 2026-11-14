import { calculateFAO56ET0 } from '../services/et0.js';
import { ClimateDailySeries } from './nasaPower.js';

interface OpenMeteoArchiveResponse {
  hourly?: {
    time?: string[];
    temperature_2m?: Array<number | null>;
    relative_humidity_2m?: Array<number | null>;
    wind_speed_10m?: Array<number | null>;
    shortwave_radiation?: Array<number | null>;
    surface_pressure?: Array<number | null>;
    precipitation?: Array<number | null>;
  };
}

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const shiftDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

export async function fetchOpenMeteoArchive(
  lat: number,
  lon: number,
  start: Date,
  end: Date
): Promise<ClimateDailySeries> {
  const firstDay = dateKey(start);
  const lastDay = dateKey(end);
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('start_date', dateKey(shiftDays(start, -1)));
  url.searchParams.set('end_date', dateKey(shiftDays(end, 1)));
  url.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation,surface_pressure,precipitation');
  url.searchParams.set('timezone', 'GMT');

  const response = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Open-Meteo Archive returned HTTP ${response.status}`);
  const body = await response.json() as OpenMeteoArchiveResponse;
  const hourly = body.hourly;
  if (!hourly?.time?.length) throw new Error('Open-Meteo Archive returned no hourly data');

  const byLocalSolarDay = new Map<string, number[]>();
  for (let index = 0; index < hourly.time.length; index += 1) {
    const timestamp = Date.parse(`${hourly.time[index]}Z`);
    if (!Number.isFinite(timestamp)) continue;
    // Align UTC hourly records to the parcel's Local Solar Time (4 minutes per longitude degree).
    const localSolarDay = dateKey(new Date(timestamp + lon * 240_000));
    const values = byLocalSolarDay.get(localSolarDay) || [];
    values.push(index);
    byLocalSolarDay.set(localSolarDay, values);
  }

  const dates: string[] = [];
  const t2m_c: number[] = [];
  const t2m_max_c: number[] = [];
  const t2m_min_c: number[] = [];
  const rh2m_pct: number[] = [];
  const u2_m_s: number[] = [];
  const rs_mj_m2_day: number[] = [];
  const ps_kpa: number[] = [];
  const precip_mm: number[] = [];
  const et0_mm: number[] = [];

  for (let day = new Date(`${firstDay}T00:00:00Z`); dateKey(day) <= lastDay; day = shiftDays(day, 1)) {
    const date = dateKey(day);
    const indices = byLocalSolarDay.get(date) || [];
    const usable = indices.filter((i) => [hourly.temperature_2m?.[i], hourly.relative_humidity_2m?.[i], hourly.wind_speed_10m?.[i], hourly.shortwave_radiation?.[i], hourly.surface_pressure?.[i], hourly.precipitation?.[i]].every(Number.isFinite));
    if (usable.length < 20) throw new Error(`Open-Meteo Archive has only ${usable.length} valid hourly observations for ${date}`);

    const temperatures = usable.map((i) => hourly.temperature_2m![i] as number);
    const humidity = usable.map((i) => hourly.relative_humidity_2m![i] as number);
    const wind10KmH = usable.map((i) => hourly.wind_speed_10m![i] as number);
    const radiationWM2 = usable.map((i) => hourly.shortwave_radiation![i] as number);
    const pressureHPa = usable.map((i) => hourly.surface_pressure![i] as number);
    const precipitation = usable.map((i) => hourly.precipitation![i] as number);
    const tMean = mean(temperatures);
    const tMax = Math.max(...temperatures);
    const tMin = Math.min(...temperatures);
    const rhMean = mean(humidity);
    const u2 = mean(wind10KmH) / 3.6 * 0.748;
    const rs = radiationWM2.reduce((sum, radiation) => sum + radiation * 0.0036, 0);
    const ps = mean(pressureHPa) / 10;
    const precip = precipitation.reduce((sum, amount) => sum + amount, 0);
    const year = Number(date.slice(0, 4));
    const dayOfYear = Math.floor((day.getTime() - Date.UTC(year, 0, 1)) / 86_400_000) + 1;

    dates.push(date);
    t2m_c.push(tMean);
    t2m_max_c.push(tMax);
    t2m_min_c.push(tMin);
    rh2m_pct.push(rhMean);
    u2_m_s.push(u2);
    rs_mj_m2_day.push(rs);
    ps_kpa.push(ps);
    precip_mm.push(precip);
    et0_mm.push(calculateFAO56ET0({ dayOfYear, latitudeDeg: lat, tMeanC: tMean, tMaxC: tMax, tMinC: tMin, rhMeanPct: rhMean, rsMjM2Day: rs, u2MS: u2, psKpa: ps }));
  }

  return {
    dates, t2m_c, t2m_max_c, t2m_min_c, rh2m_pct, u2_m_s, rs_mj_m2_day, ps_kpa, precip_mm, et0_mm,
    provider: 'open_meteo_archive',
    retrieval: 'live_fallback',
    fetched_at: new Date().toISOString()
  };
}
