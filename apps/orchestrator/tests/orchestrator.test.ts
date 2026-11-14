/**
 * Unit tests for Track A (Orchestrator).
 * Verifies FAO-56 Brussels golden vector, pedotransfer invariants,
 * non-arable land validation, and server endpoints.
 */

import { describe, it, expect, vi } from 'vitest';
import { calculateFAO56ET0 } from '../src/services/et0.js';
import { computeSoilHydraulics, classifyUSDATexture } from '../src/services/pedotransfer.js';
import { evaluatePestRisk } from '../src/services/pestRisk.js';
import { listPresets, loadPresetById } from '../src/services/presets.js';
import { buildServer, serializeSoilHydraulics } from '../src/server.js';
import { fetchOpenMeteoArchive } from '../src/ingestion/openMeteoArchive.js';
import { fetchNasaPowerDaily } from '../src/ingestion/nasaPower.js';

describe('Track A: FAO-56 Penman-Monteith ET0 Calculation', () => {
  it('verifies against FAO-56 Brussels golden vector (3.75 +/- 0.05 mm/day)', () => {
    // Reference parameters from FAO-56 Example 18 / Brussels reference conditions
    // Lat: 50.8°N, DOY: 187 (July 6), Tmean: 16.9°C, Tmax: 21.5°C, Tmin: 12.3°C,
    // RH: 69%, Rs: 22.07 MJ/m^2/day, u2: 2.07 m/s, z: 100m, P: 100.1 kPa
    const et0 = calculateFAO56ET0({
      dayOfYear: 187,
      latitudeDeg: 50.8,
      elevationMeters: 100.0,
      tMeanC: 16.9,
      tMaxC: 21.5,
      tMinC: 12.3,
      rhMeanPct: 69.0,
      rsMjM2Day: 22.07,
      u2MS: 2.07,
      psKpa: 100.1
    });

    // Golden vector criteria: 3.70 to 4.00 mm/day
    expect(et0).toBeGreaterThanOrEqual(3.70);
    expect(et0).toBeLessThanOrEqual(4.00);
  });

  it('guarantees non-negative ET0 even under freezing conditions', () => {
    const et0 = calculateFAO56ET0({
      dayOfYear: 15,
      latitudeDeg: 45.0,
      tMeanC: -5.0,
      tMaxC: -1.0,
      tMinC: -9.0,
      rhMeanPct: 80.0,
      rsMjM2Day: 4.5,
      u2MS: 3.0
    });
    expect(et0).toBeGreaterThanOrEqual(0.0);
  });
});

describe('Track A: Soil Hydraulics & Pedotransfer', () => {
  it('calculates Van Bemmelen organic matter accurately and enforces invariants', () => {
    const res = computeSoilHydraulics({
      clayPct: 28.0,
      sandPct: 32.0,
      socGKg: 14.2,
      soilPh: 6.8
    });

    // Van Bemmelen: (14.2 / 10) * 1.724 = 2.448 -> 2.45%
    expect(res.omPct).toBeCloseTo(2.45, 1);
    expect(res.usdaTextureClass).toBe('ClayLoam');

    // SSOT Invariant: wilting_point_mm < critical_water_mm < field_capacity_mm
    expect(res.wiltingPointMm).toBeLessThan(res.criticalWaterMm);
    expect(res.criticalWaterMm).toBeLessThan(res.fieldCapacityMm);
  });

  it('classifies USDA texture triangle accurately across extremes', () => {
    expect(classifyUSDATexture(55.0, 15.0, 30.0)).toBe('Clay');
    expect(classifyUSDATexture(5.0, 90.0, 5.0)).toBe('Sand');
    expect(classifyUSDATexture(10.0, 10.0, 80.0)).toBe('Silt');
  });

  it('preserves an explicitly measured zero nitrogen value', () => {
    const result = computeSoilHydraulics({ clayPct: 25, sandPct: 35, soilPh: 6.5, socGKg: 10, nitrogenGKg: 0 });
    expect(result.nitrogenGKg).toBe(0);
  });

  it('serializes soil response fields in the canonical snake_case contract', () => {
    const soil = computeSoilHydraulics({ clayPct: 28, sandPct: 32, soilPh: 6.8, socGKg: 14.2 });
    const response = serializeSoilHydraulics(soil);
    expect(response).toMatchObject({ soil_ph: 6.8, clay_pct: 28, sand_pct: 32, field_capacity_mm: soil.fieldCapacityMm });
    expect(response).not.toHaveProperty('soilPh');
    expect(response).not.toHaveProperty('fieldCapacityMm');
  });
});

describe('Track A: Pest & Disease Risk Semaphore', () => {
  it('triggers fungal alert when humidity exceeds 75% for consecutive days', () => {
    const dates = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04'];
    const weather = {
      dates,
      tMeanC: [22.0, 23.0, 21.0, 22.5],
      rhMeanPct: [82.0, 85.0, 80.0, 84.0],
      precipMm: [5.0, 12.0, 2.0, 4.0]
    };

    const risk = evaluatePestRisk('parcel_test', weather, 'maize');
    expect(risk.overallRiskLevel).toBe('alto');
    expect(risk.pests.some(p => p.category === 'fungal')).toBe(true);
  });
});

describe('Track A: Fastify Server & API Endpoints', () => {
  const app = buildServer();

  it('responds with status ok on /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('orchestrator');
  });

  it('lists presets including El Bajio, Iowa, and Argentina', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/presets' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.presets.length).toBeGreaterThanOrEqual(4);
    const countries = body.presets.map((p: any) => p.country);
    expect(countries).toContain('Mexico');
    expect(countries).toContain('United States');
    expect(countries).toContain('Argentina');
  });

  it('rejects nonexistent preset with canonical 404 error envelope', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/presets/nonexistent_preset' });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('PRESET_NOT_FOUND');
  });

  it('returns a clear canonical error for an invalid manual soil profile', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/analyze', payload: {
      parcel_id: 'manual_test', lat: 21.1, lon: -101.6, source: 'live', crop_id: 'maize', soil_profile: { clay_pct: 20 }
    } });
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body).error).toMatchObject({ code: 'INVALID_SOIL_PROFILE' });
  });

  it('geocodes place names through the server and returns map bounds plus attribution', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{
      lat: '20.5888', lon: '-100.3899', display_name: 'Querétaro, Mexico', addresstype: 'city', boundingbox: ['20.4', '20.7', '-100.6', '-100.2']
    }]), { status: 200, headers: { 'content-type': 'application/json' } })));
    const res = await app.inject({ method: 'GET', url: '/api/geocode?q=Quer%C3%A9taro&lang=es' });
    vi.unstubAllGlobals();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.provider).toBe('OpenStreetMap Nominatim');
    expect(body.attribution).toContain('OpenStreetMap');
    expect(body.results[0]).toMatchObject({ lat: 20.5888, lon: -100.3899, name: 'Querétaro, Mexico', bounds: [[20.4, -100.6], [20.7, -100.2]] });
  });

  it('allows crowdsourced farmer reports submission', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/farmer-reports',
      payload: {
        parcel_id: 'el_marques_qro',
        observer_name: 'Juan Agricultor',
        damage_type: 'leaf_blight',
        notes: 'Pústulas rojizas visibles en hojas basales'
      }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.reportId).toBeDefined();
    expect(body.submittedAt).toBeDefined();
  });
});

describe('Track A: Open-Meteo Archive climate fallback', () => {
  it('aggregates hourly data to Local Solar Time and computes ET0 with parcel coordinates', async () => {
    const start = new Date('2026-08-01T00:00:00Z');
    const times = Array.from({ length: 24 }, (_, hour) => `2026-08-01T${String(hour).padStart(2, '0')}:00`);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ hourly: {
      time: times,
      temperature_2m: Array(24).fill(20),
      relative_humidity_2m: Array(24).fill(60),
      wind_speed_10m: Array(24).fill(10),
      shortwave_radiation: Array(24).fill(200),
      surface_pressure: Array(24).fill(850),
      precipitation: Array(24).fill(0)
    } }), { status: 200, headers: { 'content-type': 'application/json' } })));
    const result = await fetchOpenMeteoArchive(0, 0, start, start);
    vi.unstubAllGlobals();
    expect(result.provider).toBe('open_meteo_archive');
    expect(result.retrieval).toBe('live_fallback');
    expect(result.dates).toEqual(['2026-08-01']);
    expect(result.rs_mj_m2_day[0]).toBeCloseTo(17.28, 5);
    expect(result.u2_m_s[0]).toBeCloseTo(10 / 3.6 * 0.748, 5);
    expect(result.et0_mm[0]).toBeGreaterThan(0);
  });

  it('uses Open-Meteo Archive only after NASA POWER fails for a live parcel', async () => {
    const end = new Date();
    end.setDate(end.getDate() - 2);
    const start = new Date(end);
    start.setDate(start.getDate() - 1);
    const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() - 1));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1, 23));
    const times: string[] = [];
    for (let hour = first.getTime(); hour <= last.getTime(); hour += 3_600_000) {
      const stamp = new Date(hour);
      times.push(`${stamp.toISOString().slice(0, 10)}T${stamp.toISOString().slice(11, 16)}`);
    }
    const mockedFetch = vi.fn()
      .mockResolvedValueOnce(new Response('NASA unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ hourly: {
        time: times,
        temperature_2m: Array(times.length).fill(20),
        relative_humidity_2m: Array(times.length).fill(60),
        wind_speed_10m: Array(times.length).fill(10),
        shortwave_radiation: Array(times.length).fill(200),
        surface_pressure: Array(times.length).fill(850),
        precipitation: Array(times.length).fill(0)
      } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', mockedFetch);
    const result = await fetchNasaPowerDaily(0, 0, 1, false);
    vi.unstubAllGlobals();
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(result.provider).toBe('open_meteo_archive');
    expect(result.retrieval).toBe('live_fallback');
    expect(result.dates).toHaveLength(2);
  });

  it('uses Open-Meteo Archive when NASA POWER responds successfully with -999 fill values', async () => {
    const end = new Date();
    end.setDate(end.getDate() - 2);
    const start = new Date(end);
    start.setDate(start.getDate() - 1);
    const nasaKeys = [start, end].map((date) => date.toISOString().slice(0, 10).replaceAll('-', ''));
    const params: Record<string, Record<string, number>> = {};
    for (const parameter of ['T2M', 'T2M_MAX', 'T2M_MIN', 'RH2M', 'WS2M', 'ALLSKY_SFC_SW_DWN', 'PS', 'PRECTOTCORR']) {
      params[parameter] = Object.fromEntries(nasaKeys.map((key) => [key, parameter === 'RH2M' && key === nasaKeys[1] ? -999 : 20]));
    }
    const first = new Date(start);
    first.setDate(first.getDate() - 1);
    const last = new Date(end);
    last.setDate(last.getDate() + 1);
    const times: string[] = [];
    for (let hour = first.getTime(); hour <= last.getTime() + 23 * 3_600_000; hour += 3_600_000) {
      times.push(new Date(hour).toISOString().slice(0, 16));
    }
    const mockedFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ properties: { parameter: params } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ hourly: {
        time: times,
        temperature_2m: Array(times.length).fill(20), relative_humidity_2m: Array(times.length).fill(60),
        wind_speed_10m: Array(times.length).fill(10), shortwave_radiation: Array(times.length).fill(200),
        surface_pressure: Array(times.length).fill(850), precipitation: Array(times.length).fill(0)
      } }), { status: 200 }));
    vi.stubGlobal('fetch', mockedFetch);
    const result = await fetchNasaPowerDaily(0.4321, 0.8765, 1, false);
    vi.unstubAllGlobals();
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(result.provider).toBe('open_meteo_archive');
    expect(result.retrieval).toBe('live_fallback');
    expect(result.fallback_reason).toContain('-999');
  });
});
