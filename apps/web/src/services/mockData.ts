/**
 * Mock & Demo Provider: Supplies realistic AnalysisResponse bundles
 * for immediate offline demonstration (El Marqués MX, Iowa US, Pergamino AR).
 */

import { AnalysisResponse } from '../types/index.js';

export const DEMO_PRESETS_LIST = [
  {
    presetId: 'el_marques_qro',
    parcelName: 'Rancho San Isidro - El Marqués',
    country: 'Mexico',
    region: 'Querétaro (El Bajío)',
    lat: 20.5922,
    lon: -100.1972,
    areaHa: 12.5,
    cropId: 'wheat'
  },
  {
    presetId: 'iowa_corn_belt_us',
    parcelName: 'Prairie View Farm - Field 3',
    country: 'United States',
    region: 'Iowa (Corn Belt)',
    lat: 42.0308,
    lon: -93.6319,
    areaHa: 65.0,
    cropId: 'soybean'
  },
  {
    presetId: 'pampa_pergamino_ar',
    parcelName: 'Estancia La Campana - Lote 12',
    country: 'Argentina',
    region: 'Buenos Aires (Pampa Húmeda)',
    lat: -33.8911,
    lon: -60.5736,
    areaHa: 120.0,
    cropId: 'sunflower'
  },
  {
    presetId: 'san_juan_del_rio',
    parcelName: 'Parcela Ejidal San Juan',
    country: 'Mexico',
    region: 'Querétaro',
    lat: 20.3869,
    lon: -99.9947,
    areaHa: 25.0,
    cropId: 'maize'
  }
];

export function getMockAnalysis(presetId: string = 'el_marques_qro'): AnalysisResponse {
  const isUS = presetId.includes('iowa');
  const isAR = presetId.includes('pampa');

  const lat = isUS ? 42.0308 : (isAR ? -33.8911 : 20.5922);
  const lon = isUS ? -93.6319 : (isAR ? -60.5736 : -100.1972);

  const dates: string[] = [];
  const w_mm: number[] = [];
  const et0_mm: number[] = [];
  const precip_mm: number[] = [];
  const gdd_accum: number[] = [];

  let runningW = isUS ? 190.0 : (isAR ? 180.0 : 160.0);
  let runningGdd = 0.0;

  for (let i = 0; i < 90; i++) {
    const d = new Date(2026, 0, 1 + i);
    dates.push(d.toISOString().slice(0, 10));

    const et = 3.5 + Math.sin(i / 15.0) * 1.2;
    et0_mm.push(Math.round(et * 10) / 10);

    const rain = (i === 12 || i === 45) ? 28.0 : (i % 7 === 0 ? 4.5 : 0.0);
    precip_mm.push(rain);

    runningW = Math.max(70.0, runningW + rain - et * 0.85);
    w_mm.push(Math.round(runningW * 10) / 10);

    runningGdd += Math.max(0.0, 14.5 + Math.sin(i / 10.0) * 4.0);
    gdd_accum.push(Math.round(runningGdd));
  }

  const ndviDates = dates.filter((_, i) => i % 9 === 0).slice(0, 10);
  const ndviFilled = [0.38, 0.44, 0.52, 0.65, 0.74, 0.72, 0.64, 0.53, 0.45, 0.39];

  return {
    parcel_id: presetId,
    analyzed_at: new Date().toISOString(),
    coordinates: { lat, lon },
    soil_hydraulics: {
      clay_pct: isUS ? 24.0 : 28.0,
      sand_pct: isUS ? 28.0 : 22.0,
      silt_pct: isUS ? 48.0 : 50.0,
      soil_ph: isUS ? 6.5 : (isAR ? 6.2 : 6.8),
      soc_g_kg: isUS ? 28.5 : 14.2,
      nitrogen_g_kg: isUS ? 2.6 : 1.3,
      om_pct: isUS ? 4.91 : 2.44,
      field_capacity_mm: isUS ? 210.0 : 175.0,
      wilting_point_mm: isUS ? 80.0 : 85.0,
      critical_water_mm: isUS ? 145.0 : 130.0,
      soil_moisture_vol: isUS ? 0.28 : 0.24,
      usda_texture_class: isUS ? 'Loam' : 'ClayLoam'
    },
    climate_summary: {
      days_evaluated: 90,
      mean_temperature_c: isUS ? 18.2 : 21.4,
      total_precip_mm: 124.0,
      total_et0_mm: 342.0
    },
    eonet_hazard_alerts: [
      {
        eventId: 'EONET_6412',
        title: 'Tropical Cyclone Alert System - Outer Precipitation Band',
        distanceKm: 112.5,
        nearestCoordinates: [lon + 0.8, lat + 0.4],
        magnitudeKts: 55,
        pulsePrecipitationMm: 45
      }
    ],
    physics: {
      parcel_id: presetId,
      computed_at: new Date().toISOString(),
      source: 'preset',
      spline_result: {
        dates: ndviDates,
        ndvi_filled: ndviFilled,
        used_tdma: true
      },
      gdd_result: {
        crop_id: isUS ? 'soybean' : (isAR ? 'sunflower' : 'wheat'),
        t_base_c: 10.0,
        gdd_accumulated: gdd_accum,
        dates
      },
      water_balance: {
        dates,
        w_mm,
        et0_mm,
        etc_mm: et0_mm.map(e => Math.round(e * 0.85 * 10) / 10),
        precip_mm,
        drainage_mm: dates.map(() => 0.0)
      },
      irrigation_trigger: {
        t_star_days: 14.2,
        delta_i_mm: isUS ? 65.0 : 45.0,
        reason: null
      }
    },
    optimization: {
      parcel_id: presetId,
      computed_at: new Date().toISOString(),
      status: 'Optimal',
      infeasible_reason: null,
      presolver_summary: {
        feasible_crop_ids: isUS
          ? ['soybean', 'maize', 'canola', 'wheat']
          : ['maize', 'bean', 'broccoli', 'wheat', 'chickpea'],
        discarded: [
          {
            crop_id: 'asparagus',
            reason_code: 'GDD_INSUFFICIENT',
            reason_text_es: 'Energía térmica acumulada insuficiente para ciclo de 210 días',
            reason_text_en: 'Accumulated thermal units insufficient for 210-day cycle'
          }
        ]
      },
      selected_rotation: [
        { slot_index: 0, cycle_code: 'PV', crop_id: isUS ? 'maize' : 'maize', water_need_mm: 480, profit_mxn_ha: 1650, is_legume: false, deficit_slack_mm: 0 },
        { slot_index: 1, cycle_code: 'OI', crop_id: isUS ? 'soybean' : 'chickpea', water_need_mm: 310, profit_mxn_ha: 1420, is_legume: true, deficit_slack_mm: 0 },
        { slot_index: 2, cycle_code: 'PV', crop_id: isUS ? 'canola' : 'broccoli', water_need_mm: 390, profit_mxn_ha: 2100, is_legume: false, deficit_slack_mm: 0 },
        { slot_index: 3, cycle_code: 'OI', crop_id: isUS ? 'soybean' : 'bean', water_need_mm: 330, profit_mxn_ha: 1350, is_legume: true, deficit_slack_mm: 0 },
        { slot_index: 4, cycle_code: 'PV', crop_id: isUS ? 'wheat' : 'wheat', water_need_mm: 420, profit_mxn_ha: 1200, is_legume: false, deficit_slack_mm: 0 },
        { slot_index: 5, cycle_code: 'OI', crop_id: isUS ? 'soybean' : 'chickpea', water_need_mm: 300, profit_mxn_ha: 1450, is_legume: true, deficit_slack_mm: 0 }
      ],
      pareto_front: [
        { lambda_weight: 0.0, profit_mxn_ha: 6800, water_saved_mm: 480, n_fixed_kg_ha: 240, water_shadow_price_mxn_mm: 0.45, n_shadow_price_mxn_kg_ha: 1.10, schedule: [] },
        { lambda_weight: 0.25, profit_mxn_ha: 7600, water_saved_mm: 390, n_fixed_kg_ha: 220, water_shadow_price_mxn_mm: 0.65, n_shadow_price_mxn_kg_ha: 1.10, schedule: [] },
        { lambda_weight: 0.5, profit_mxn_ha: 8450, water_saved_mm: 290, n_fixed_kg_ha: 180, water_shadow_price_mxn_mm: 0.85, n_shadow_price_mxn_kg_ha: 1.25, schedule: [] },
        { lambda_weight: 0.75, profit_mxn_ha: 9200, water_saved_mm: 180, n_fixed_kg_ha: 120, water_shadow_price_mxn_mm: 1.20, n_shadow_price_mxn_kg_ha: 1.25, schedule: [] },
        { lambda_weight: 1.0, profit_mxn_ha: 9850, water_saved_mm: 50, n_fixed_kg_ha: 60, water_shadow_price_mxn_mm: 1.65, n_shadow_price_mxn_kg_ha: 1.40, schedule: [] }
      ]
    }
  };
}
