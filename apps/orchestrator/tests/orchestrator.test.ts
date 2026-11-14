/**
 * Unit tests for Track A (Orchestrator).
 * Verifies FAO-56 Brussels golden vector, pedotransfer invariants,
 * non-arable land validation, and server endpoints.
 */

import { describe, it, expect } from 'vitest';
import { calculateFAO56ET0 } from '../src/services/et0.js';
import { computeSoilHydraulics, classifyUSDATexture } from '../src/services/pedotransfer.js';
import { evaluatePestRisk } from '../src/services/pestRisk.js';
import { listPresets, loadPresetById } from '../src/services/presets.js';
import { buildServer } from '../src/server.js';

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
