/**
 * Ingestion Module: NASA POWER Daily & Hourly Meteorological APIs.
 * Handles -999 fill value conversion, verified solar radiation units (MJ/m^2/day),
 * and dynamic FAO-56 Penman-Monteith ET0 calculation.
 */

import { calculateFAO56ET0 } from '../services/et0.js';
import { readCache, writeCache, getNearestPreset } from '../services/presets.js';
import { fetchOpenMeteoArchive } from './openMeteoArchive.js';
import { AppError } from '../utils/errors.js';

export interface ClimateDailySeries {
  dates: string[];
  t2m_c: number[];
  t2m_max_c: number[];
  t2m_min_c: number[];
  rh2m_pct: number[];
  u2_m_s: number[];
  rs_mj_m2_day: number[];
  ps_kpa: number[];
  precip_mm: number[];
  et0_mm: number[];
  provider?: 'nasa_power' | 'open_meteo_archive' | 'regional_benchmark';
  retrieval?: 'live' | 'live_fallback' | 'cache' | 'preset_fallback';
  fetched_at?: string;
  fallback_reason?: string;
}

export async function fetchNasaPowerDaily(
  lat: number,
  lon: number,
  daysBack = 90,
  allowFallback = true
): Promise<ClimateDailySeries> {
  const cacheKey = `climate_${lat.toFixed(4)}_${lon.toFixed(4)}`;
  const cached = readCache(cacheKey);
  if (cached && (cached as unknown as ClimateDailySeries).dates?.length >= 30) {
    const series = cached as unknown as ClimateDailySeries;
    return { ...series, provider: series.provider || 'nasa_power', retrieval: 'cache' };
  }

  // NASA POWER observational data has a 2-day latency
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 2);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysBack);

  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const startStr = fmt(startDate);
  const endStr = fmt(endDate);

  const params = 'T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PS,PRECTOTCORR';
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${params}&community=AG&longitude=${lon}&latitude=${lat}&start=${startStr}&end=${endStr}&format=JSON`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`NASA POWER API HTTP ${res.status}`);
    }

    const data = await res.json() as Record<string, any>;
    const p = data.properties?.parameter || {};

    const rawDates = Object.keys(p.T2M || {}).sort();
    if (rawDates.length === 0) {
      throw new Error('Empty parameters object in NASA POWER response');
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

    for (const dKey of rawDates) {
      const year = parseInt(dKey.slice(0, 4), 10);
      const month = parseInt(dKey.slice(4, 6), 10);
      const day = parseInt(dKey.slice(6, 8), 10);
      const dateIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dates.push(dateIso);

      // Clean sentinel -999 values
      const cleanVal = (val: number | undefined, defaultVal: number) => {
        if (val === undefined || val === null || val === -999 || val === -999.0 || isNaN(val)) {
          return defaultVal;
        }
        return val;
      };

      const tMean = cleanVal(p.T2M?.[dKey], 20.0);
      const tMax = cleanVal(p.T2M_MAX?.[dKey], tMean + 6.0);
      const tMin = cleanVal(p.T2M_MIN?.[dKey], tMean - 6.0);
      const rh = Math.max(5.0, Math.min(100.0, cleanVal(p.RH2M?.[dKey], 50.0)));
      const u2 = Math.max(0.1, cleanVal(p.WS2M?.[dKey], 1.5));
      // NOTE: In community=AG, ALLSKY_SFC_SW_DWN is already in MJ/m^2/day! Do NOT multiply by 3.6!
      const rs = Math.max(0.0, cleanVal(p.ALLSKY_SFC_SW_DWN?.[dKey], 18.0));
      const ps = cleanVal(p.PS?.[dKey], 85.0);
      const pr = Math.max(0.0, cleanVal(p.PRECTOTCORR?.[dKey], 0.0));

      t2m_c.push(tMean);
      t2m_max_c.push(tMax);
      t2m_min_c.push(tMin);
      rh2m_pct.push(rh);
      u2_m_s.push(u2);
      rs_mj_m2_day.push(rs);
      ps_kpa.push(ps);
      precip_mm.push(pr);

      // Day of Year for dynamic solar geometry
      const startOfYear = new Date(year, 0, 1);
      const curDate = new Date(year, month - 1, day);
      const dayOfYear = Math.floor((curDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const et0 = calculateFAO56ET0({
        dayOfYear,
        latitudeDeg: lat,
        tMeanC: tMean,
        tMaxC: tMax,
        tMinC: tMin,
        rhMeanPct: rh,
        rsMjM2Day: rs,
        u2MS: u2,
        psKpa: ps
      });
      et0_mm.push(et0);
    }

    const series: ClimateDailySeries = {
      dates,
      t2m_c,
      t2m_max_c,
      t2m_min_c,
      rh2m_pct,
      u2_m_s,
      rs_mj_m2_day,
      ps_kpa,
      precip_mm,
      et0_mm,
      provider: 'nasa_power',
      retrieval: 'live',
      fetched_at: new Date().toISOString()
    };

    writeCache(cacheKey, series as unknown as Record<string, unknown>);
    return series;
  } catch (err: unknown) {
    const cause = err instanceof Error ? err.message : 'unknown provider error';
    if (allowFallback) {
      const nearest = getNearestPreset(lat, lon) as Record<string, any>;
      if (nearest && nearest.climate) {
        return { ...(nearest.climate as ClimateDailySeries), provider: 'regional_benchmark', retrieval: 'preset_fallback', fallback_reason: cause };
      }
    } else {
      try {
        const archive = await fetchOpenMeteoArchive(lat, lon, startDate, endDate);
        writeCache(cacheKey, archive as unknown as Record<string, unknown>);
        return archive;
      } catch (fallbackError) {
        throw new AppError('CLIMATE_SOURCES_UNAVAILABLE', 'NASA POWER and the historical weather fallback are unavailable for this location.', 503, {
          nasa_power: cause,
          open_meteo_archive: fallbackError instanceof Error ? fallbackError.message : 'unknown provider error'
        });
      }
    }
    throw err;
  }
}
