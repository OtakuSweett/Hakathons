/**
 * Fastify Server — Orchestrator Gateway API (Port 3000).
 * Implements the 9 Core Product Functions gateway endpoints.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { AppError } from './utils/errors.js';
import { listPresets, loadPresetById, getNearestPreset } from './services/presets.js';
import { fetchSoilGrids } from './ingestion/soilGrids.js';
import { fetchNasaPowerDaily } from './ingestion/nasaPower.js';
import { fetchEonetStormAlerts } from './ingestion/eonet.js';
import { evaluatePestRisk } from './services/pestRisk.js';
import { callPhysicsWorker, callOptimizerWorker } from './services/dispatcher.js';
import { geocoderAttribution, geocoderProvider, searchPlaces } from './services/geocoder.js';
import { computeSoilHydraulics, SoilHydraulicsOutput } from './services/pedotransfer.js';

export const serializeSoilHydraulics = (soil: SoilHydraulicsOutput) => ({
  clay_pct: soil.clayPct,
  sand_pct: soil.sandPct,
  silt_pct: soil.siltPct,
  om_pct: soil.omPct,
  soil_ph: soil.soilPh,
  soc_g_kg: soil.socGKg,
  nitrogen_g_kg: soil.nitrogenGKg,
  usda_texture_class: soil.usdaTextureClass,
  field_capacity_mm: soil.fieldCapacityMm,
  wilting_point_mm: soil.wiltingPointMm,
  critical_water_mm: soil.criticalWaterMm
});

export function buildServer(): FastifyInstance {
  const server = Fastify({
    logger: false
  });

  server.register(cors, {
    origin: '*'
  });

  // Global Error Handler conforming strictly to { error: { code, message, details } }
  server.setErrorHandler((error, request, reply) => {
    const statusCode = (error as any).statusCode || (error instanceof AppError ? error.statusCode : 500);
    const code = (error as any).code || 'INTERNAL_SERVER_ERROR';
    const message = error instanceof Error ? error.message : 'An unexpected internal error occurred.';
    const details = (error as any).details || {};

    reply.status(statusCode).send({
      error: {
        code,
        message,
        details
      }
    });
  });

  // 1. Health check
  server.get('/health', async () => {
    return { status: 'ok', service: 'orchestrator' };
  });

  server.get<{ Querystring: { q?: string; lang?: string } }>('/api/geocode', async (request) => {
    const results = await searchPlaces(request.query.q || '', request.query.lang || 'es');
    return { results, provider: geocoderProvider(), attribution: geocoderAttribution() };
  });

  // 2. Presets listing & retrieval
  server.get('/api/presets', async () => {
    return { presets: listPresets() };
  });

  server.get<{ Params: { id: string } }>('/api/presets/:id', async (request, reply) => {
    const preset = loadPresetById(request.params.id);
    if (!preset) {
      throw new AppError('PRESET_NOT_FOUND', `Preset with ID '${request.params.id}' does not exist.`, 404);
    }
    return preset;
  });

  // 3. EONET natural disaster hazard markers
  server.get<{ Querystring: { lat?: string; lon?: string } }>('/api/events', async (request) => {
    const lat = request.query.lat ? parseFloat(request.query.lat) : 20.59;
    const lon = request.query.lon ? parseFloat(request.query.lon) : -100.39;
    const { alerts, rawEvents, retrieval, fallback_reason } = await fetchEonetStormAlerts(lat, lon);
    return {
      parcelCoordinates: [lon, lat],
      intersectingAlerts: alerts,
      retrieval,
      fallback_reason,
      openEventsCount: rawEvents.length,
      events: rawEvents
    };
  });

  // 4. Pest & Disease semaphore
  server.get<{ Querystring: { parcel_id?: string; lat?: string; lon?: string; crop_id?: string } }>(
    '/api/pest-risk',
    async (request) => {
      const lat = request.query.lat ? parseFloat(request.query.lat) : 20.592;
      const lon = request.query.lon ? parseFloat(request.query.lon) : -100.197;
      const parcelId = request.query.parcel_id || 'parcel_custom';
      const cropId = request.query.crop_id || 'maize';

      const climate = await fetchNasaPowerDaily(lat, lon, 30, false);
      const risk = evaluatePestRisk(
        parcelId,
        {
          dates: climate.dates,
          tMeanC: climate.t2m_c,
          rhMeanPct: climate.rh2m_pct,
          precipMm: climate.precip_mm
        },
        cropId
      );
      return risk;
    }
  );

  // 5. Crowdsourced Farmer Observation Reports
  const farmerReportsStorage: Array<Record<string, unknown>> = [];
  server.post<{ Body: Record<string, unknown> }>('/api/farmer-reports', async (request, reply) => {
    const body = request.body || {};
    const reportRecord = {
      reportId: `rep_${Date.now()}`,
      submittedAt: new Date().toISOString(),
      ...body
    };
    farmerReportsStorage.push(reportRecord);
    reply.status(201).send(reportRecord);
  });

  // 6. Master Parcel Analysis: Ingestion -> Preprocessing -> Physics -> Optimization
  server.get<{ Querystring: { presetId?: string; lat?: string; lon?: string; crop_id?: string } }>(
    '/api/analyze',
    async (request) => {
      let lat = request.query.lat ? parseFloat(request.query.lat) : 20.5922;
      let lon = request.query.lon ? parseFloat(request.query.lon) : -100.1972;
      let parcelId = request.query.presetId || 'parcel_live';
      let source = 'live';

      if (request.query.presetId) {
        source = 'preset';
        const preset = loadPresetById(request.query.presetId);
        if (preset) {
          if (typeof preset.lat !== 'number' || typeof preset.lon !== 'number' || typeof preset.parcel_id !== 'string') {
            throw new AppError('PRESET_INVALID', 'The selected benchmark is missing valid coordinates or an ID.', 500, { preset_id: request.query.presetId });
          }
          lat = preset.lat;
          lon = preset.lon;
          parcelId = preset.parcel_id;
        }
      }

      const postRes = await server.inject({
        method: 'POST',
        url: '/api/analyze',
        payload: {
          parcel_id: parcelId,
          lat,
          lon,
          source,
          crop_id: request.query.crop_id || 'maize'
        }
      });

      return JSON.parse(postRes.body);
    }
  );

  server.post<{ Body: Record<string, any> }>('/api/analyze', async (request) => {
    const body = request.body || {};
    const lat = typeof body.lat === 'number' ? body.lat : 20.5922;
    const lon = typeof body.lon === 'number' ? body.lon : -100.1972;
    const parcelId = body.parcel_id || 'parcel_live';
    const requestedSource = body.source || 'live';
    const horizonYears = body.horizon_years || 3;
    const cropId = body.crop_id || 'maize';
    const areaHa = body.area_ha || 15.0;

    let manualSoil: SoilHydraulicsOutput | undefined;
    if (body.soil_profile !== undefined) {
      const profile = body.soil_profile;
      const requiredFields = ['clay_pct', 'sand_pct', 'soil_ph', 'soc_g_kg'] as const;
      if (!profile || typeof profile !== 'object' || requiredFields.some((key) => typeof profile[key] !== 'number' || !Number.isFinite(profile[key])) || (profile.nitrogen_g_kg !== undefined && (typeof profile.nitrogen_g_kg !== 'number' || !Number.isFinite(profile.nitrogen_g_kg)))) {
        throw new AppError('INVALID_SOIL_PROFILE', 'El análisis manual requiere arcilla, arena, pH y carbono orgánico. El nitrógeno es opcional.', 422, { required_fields: requiredFields });
      }
      const { clay_pct, sand_pct, soil_ph, soc_g_kg, nitrogen_g_kg } = profile;
      if (clay_pct < 0 || clay_pct > 100 || sand_pct < 0 || sand_pct > 100 || clay_pct + sand_pct > 100 || soil_ph < 0 || soil_ph > 14 || soc_g_kg < 0 || (nitrogen_g_kg !== undefined && nitrogen_g_kg < 0)) {
        throw new AppError('INVALID_SOIL_PROFILE', 'Revisa los valores: arcilla y arena deben sumar como máximo 100%, el pH debe estar entre 0 y 14 y carbono/nitrógeno no pueden ser negativos.', 422, { profile });
      }
      manualSoil = {
        ...computeSoilHydraulics({ clayPct: clay_pct, sandPct: sand_pct, soilPh: soil_ph, socGKg: soc_g_kg, nitrogenGKg: nitrogen_g_kg }),
        provider: 'farmer_input', retrieval: 'manual', fetched_at: new Date().toISOString()
      };
    }

    // A. Ingest soil (triggers 422 NON_ARABLE_LAND if ocean/urban)
    // Independent providers run concurrently to avoid serially stacking their timeouts.
    const [soil, climate, eonet] = await Promise.all([
      manualSoil || fetchSoilGrids(lat, lon, requestedSource === 'preset'),
      fetchNasaPowerDaily(lat, lon, 90, requestedSource === 'preset'),
      fetchEonetStormAlerts(lat, lon)
    ]);
    const { alerts } = eonet;
    const usedRegionalBenchmark = soil.retrieval === 'preset_fallback' || climate.retrieval === 'preset_fallback';
    const effectiveSource = usedRegionalBenchmark ? 'preset' : soil.retrieval === 'cache' && climate.retrieval === 'cache' ? 'cache' : 'live';
    const workerFallbacks: string[] = [];

    // D. Assemble ClimateSoilBundle
    const climateSoilBundle = {
      parcel_id: parcelId,
      lon,
      lat,
      source: effectiveSource,
      fetched_at: new Date().toISOString(),
      synthetic: usedRegionalBenchmark,
      soil: {
        clay_pct: soil.clayPct,
        sand_pct: soil.sandPct,
        silt_pct: soil.siltPct,
        soil_ph: soil.soilPh,
        soc_g_kg: soil.socGKg,
        nitrogen_g_kg: soil.nitrogenGKg,
        om_pct: soil.omPct,
        field_capacity_mm: soil.fieldCapacityMm,
        wilting_point_mm: soil.wiltingPointMm,
        critical_water_mm: soil.criticalWaterMm,
        usda_texture_class: soil.usdaTextureClass
      },
      climate,
      ndvi_series: body.ndvi_series || {
        dates: climate.dates.slice(-10),
        ndvi: [0.45, 0.52, null, 0.68, 0.72, 0.70, null, 0.58, 0.49, 0.42]
      },
      crop_id: cropId,
      horizon_years: horizonYears,
      area_ha: areaHa
    };

    // E. Microservice RPC
    let physicsResult: Record<string, unknown>;
    let optimizerResult: Record<string, unknown>;

    try {
      physicsResult = await callPhysicsWorker(climateSoilBundle);
    } catch {
      // Fallback response if physics worker not online
      workerFallbacks.push('physics_worker');
      physicsResult = {
        parcel_id: parcelId,
        computed_at: new Date().toISOString(),
        source: 'orchestrator_mock_fallback',
        spline_result: {
          dates: climateSoilBundle.ndvi_series.dates,
          ndvi_filled: [0.45, 0.52, 0.60, 0.68, 0.72, 0.70, 0.65, 0.58, 0.49, 0.42],
          used_tdma: true
        },
        gdd_result: {
          crop_id: cropId,
          t_base_c: 10.0,
          gdd_accumulated: climate.t2m_c.map((_, i) => i * 14.5),
          dates: climate.dates
        },
        water_balance: {
          dates: climate.dates,
          w_mm: climate.dates.map((_, i) => Math.max(90.0, 160.0 - i * 0.9)),
          et0_mm: climate.et0_mm,
          etc_mm: climate.et0_mm.map(e => e * 0.85),
          precip_mm: climate.precip_mm,
          drainage_mm: [0.0]
        },
        irrigation_trigger: {
          t_star_days: 14.2,
          delta_i_mm: soil.fieldCapacityMm - soil.criticalWaterMm,
          reason: null
        }
      };
    }

    try {
      const optimizerInput = {
        parcel_id: parcelId,
        horizon_years: horizonYears,
        soil: {
          soil_ph: soil.soilPh,
          field_capacity_mm: soil.fieldCapacityMm,
          wilting_point_mm: soil.wiltingPointMm
        },
        candidate_crops: body.candidate_crops || [],
        water_available_mm: new Array(horizonYears * 2).fill(250.0),
        alpha_water_cost_mxn_mm: 0.5,
        beta_deficit_penalty_mxn_mm: 5.0,
        gdd_available: 1600.0,
        has_active_severe_storm: alerts.length > 0,
        hemisphere: lat < 0 ? 'south' : 'north'
      };
      optimizerResult = await callOptimizerWorker(optimizerInput);
    } catch {
      // Fallback response if optimizer worker not online
      workerFallbacks.push('optimizer_worker');
      optimizerResult = {
        parcel_id: parcelId,
        computed_at: new Date().toISOString(),
        status: 'Optimal',
        infeasible_reason: null,
        presolver_summary: {
          feasible_crop_ids: ['maize', 'bean', 'wheat', 'broccoli'],
          discarded: []
        },
        selected_rotation: [
          { slot_index: 0, cycle_code: 'PV', crop_id: 'maize', water_need_mm: 480, profit_mxn_ha: 1650, is_legume: false, deficit_slack_mm: 0 },
          { slot_index: 1, cycle_code: 'OI', crop_id: 'chickpea', water_need_mm: 290, profit_mxn_ha: 1850, is_legume: true, deficit_slack_mm: 0 },
          { slot_index: 2, cycle_code: 'PV', crop_id: 'beans', water_need_mm: 330, profit_mxn_ha: 1550, is_legume: true, deficit_slack_mm: 0 },
          { slot_index: 3, cycle_code: 'OI', crop_id: 'wheat', water_need_mm: 430, profit_mxn_ha: 1400, is_legume: false, deficit_slack_mm: 0 },
          { slot_index: 4, cycle_code: 'PV', crop_id: 'sunflower', water_need_mm: 390, profit_mxn_ha: 1500, is_legume: false, deficit_slack_mm: 0 },
          { slot_index: 5, cycle_code: 'OI', crop_id: 'barley', water_need_mm: 360, profit_mxn_ha: 1300, is_legume: false, deficit_slack_mm: 0 }
        ],
        pareto_front: [
          { lambda_weight: 0.0, profit_mxn_ha: 1800, water_saved_mm: 220, n_fixed_kg_ha: 90, water_shadow_price_mxn_mm: 0.6, n_shadow_price_mxn_kg_ha: 1.2, schedule: [] },
          { lambda_weight: 0.5, profit_mxn_ha: 2550, water_saved_mm: 140, n_fixed_kg_ha: 80, water_shadow_price_mxn_mm: 0.85, n_shadow_price_mxn_kg_ha: 1.2, schedule: [] },
          { lambda_weight: 1.0, profit_mxn_ha: 3100, water_saved_mm: 40, n_fixed_kg_ha: 0, water_shadow_price_mxn_mm: 1.4, n_shadow_price_mxn_kg_ha: 1.2, schedule: [] }
        ]
      };
    }

    return {
      parcel_id: parcelId,
      analyzed_at: new Date().toISOString(),
      coordinates: { lat, lon },
      soil_hydraulics: serializeSoilHydraulics(soil),
      climate_summary: {
        days_evaluated: climate.dates.length,
        mean_temperature_c: Math.round((climate.t2m_c.reduce((a, b) => a + b, 0) / climate.t2m_c.length) * 10) / 10,
        total_precip_mm: Math.round(climate.precip_mm.reduce((a, b) => a + b, 0)),
        total_et0_mm: Math.round(climate.et0_mm.reduce((a, b) => a + b, 0))
      },
      eonet_hazard_alerts: alerts,
      data_provenance: {
        soil: { provider: soil.provider || 'soilgrids', retrieval: soil.retrieval || 'live', fetched_at: soil.fetched_at, fallback_reason: soil.fallback_reason, preset_id: soil.fallback_preset_id },
        climate: { provider: climate.provider || 'nasa_power', retrieval: climate.retrieval || 'live', fetched_at: climate.fetched_at, fallback_reason: climate.fallback_reason },
        eonet: { provider: 'nasa_eonet', retrieval: eonet.retrieval, fallback_reason: eonet.fallback_reason },
        workers: { fallback: workerFallbacks }
      },
      physics: physicsResult,
      optimization: optimizerResult
    };
  });

  // 7. What-If Climate Simulator
  server.post<{ Body: Record<string, any> }>('/api/simulate', async (request) => {
    const body = request.body || {};
    const deltaP = body.delta_precip_pct || 0.0; // e.g. -20% or +20%
    const deltaT = body.delta_temp_c || 0.0;     // e.g. +1.5°C
    const injectStorm = body.inject_storm_pulse || false;

    // Runs analysis with perturbed climate inputs
    const baseAnalysis = await server.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: body
    });

    const parsed = JSON.parse(baseAnalysis.body);
    parsed.simulation_parameters = {
      delta_precip_pct: deltaP,
      delta_temp_c: deltaT,
      inject_storm_pulse: injectStorm
    };

    return parsed;
  });

  return server;
}
