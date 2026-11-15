/**
 * Mock & Demo Provider: Supplies realistic AnalysisResponse bundles
 * for immediate offline demonstration benchmarks across global breadbaskets:
 * Mexico (El Marqués, Celaya, Colón, San Juan del Río, Valle del Yaqui),
 * United States (Iowa Corn Belt), Argentina (Pampa Húmeda),
 * Brazil (Mato Grosso Cerrado), Spain (Andalucía Guadalquivir), and India (Punjab Plains).
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
    presetId: 'san_juan_del_rio',
    parcelName: 'Parcela Ejidal San Juan',
    country: 'Mexico',
    region: 'Querétaro (San Juan del Río)',
    lat: 20.3869,
    lon: -99.9947,
    areaHa: 25.0,
    cropId: 'maize'
  },
  {
    presetId: 'celaya_gto',
    parcelName: 'Valle de Celaya - Módulo de Riego',
    country: 'Mexico',
    region: 'Guanajuato (El Bajío)',
    lat: 20.5231,
    lon: -100.8138,
    areaHa: 20.0,
    cropId: 'wheat'
  },
  {
    presetId: 'colon_qro_semiarid',
    parcelName: 'Tierras de Secano - Colón Semiárido',
    country: 'Mexico',
    region: 'Querétaro (Semidesierto)',
    lat: 20.7250,
    lon: -100.0450,
    areaHa: 15.0,
    cropId: 'sorghum'
  },
  {
    presetId: 'valle_yaqui_sonora_mx',
    parcelName: 'Bloque 1114 - Valle del Yaqui',
    country: 'Mexico',
    region: 'Sonora (Valle del Yaqui)',
    lat: 27.4864,
    lon: -109.9408,
    areaHa: 45.0,
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
    presetId: 'mato_grosso_cerrado_br',
    parcelName: 'Fazenda Santa Helena - Sorriso',
    country: 'Brazil',
    region: 'Mato Grosso (Cerrado)',
    lat: -12.5425,
    lon: -55.7212,
    areaHa: 150.0,
    cropId: 'soybean'
  },
  {
    presetId: 'andalucia_guadalquivir_es',
    parcelName: 'Finca Las Marismas - Guadalquivir',
    country: 'Spain',
    region: 'Andalucía (Cuenca del Guadalquivir)',
    lat: 37.3891,
    lon: -5.9845,
    areaHa: 35.0,
    cropId: 'wheat'
  },
  {
    presetId: 'punjab_ludhiana_in',
    parcelName: 'Ludhiana Fields - Indo-Gangetic Basin',
    country: 'India',
    region: 'Punjab (Indo-Gangetic Plain)',
    lat: 30.9010,
    lon: 75.8573,
    areaHa: 18.0,
    cropId: 'wheat'
  }
];

export function getMockAnalysis(presetId: string = 'el_marques_qro'): AnalysisResponse {
  const isUS = presetId.includes('iowa');
  const isAR = presetId.includes('pampa');
  const isBR = presetId.includes('mato_grosso');
  const isES = presetId.includes('andalucia');
  const isIN = presetId.includes('punjab');
  const isSonora = presetId.includes('yaqui');
  const isCelaya = presetId.includes('celaya');
  const isColon = presetId.includes('colon');

  const lat = isUS ? 42.0308
    : isAR ? -33.8911
    : isBR ? -12.5425
    : isES ? 37.3891
    : isIN ? 30.9010
    : isSonora ? 27.4864
    : isCelaya ? 20.5231
    : isColon ? 20.7250
    : 20.5922;

  const lon = isUS ? -93.6319
    : isAR ? -60.5736
    : isBR ? -55.7212
    : isES ? -5.9845
    : isIN ? 75.8573
    : isSonora ? -109.9408
    : isCelaya ? -100.8138
    : isColon ? -100.0450
    : -100.1972;

  const dates: string[] = [];
  const w_mm: number[] = [];
  const et0_mm: number[] = [];
  const precip_mm: number[] = [];
  const gdd_accum: number[] = [];

  let runningW = isUS ? 190.0 : isAR ? 180.0 : isBR ? 195.0 : isES ? 165.0 : isIN ? 145.0 : isSonora ? 175.0 : 160.0;
  let runningGdd = 0.0;

  for (let i = 0; i < 90; i++) {
    const d = new Date(2026, 0, 1 + i);
    dates.push(d.toISOString().slice(0, 10));

    const et = isES ? 3.8 + Math.sin(i / 15.0) * 1.4
      : isIN ? 3.4 + Math.sin(i / 14.0) * 1.1
      : isSonora ? 4.2 + Math.sin(i / 16.0) * 1.5
      : isBR ? 4.5 + Math.sin(i / 20.0) * 0.9
      : 3.5 + Math.sin(i / 15.0) * 1.2;
    et0_mm.push(Math.round(et * 10) / 10);

    const rain = isBR
      ? (i % 6 === 0 ? 32.0 : i % 3 === 0 ? 8.5 : 0.0)
      : (i === 12 || i === 45) ? 28.0 : (i % 7 === 0 ? 4.5 : 0.0);
    precip_mm.push(rain);

    runningW = Math.max(70.0, runningW + rain - et * 0.85);
    w_mm.push(Math.round(runningW * 10) / 10);

    const dailyGdd = isBR ? 18.5 + Math.sin(i / 10.0) * 2.0
      : isSonora ? 16.0 + Math.sin(i / 12.0) * 3.5
      : 14.5 + Math.sin(i / 10.0) * 4.0;
    runningGdd += Math.max(0.0, dailyGdd);
    gdd_accum.push(Math.round(runningGdd));
  }

  const ndviDates = dates.filter((_, i) => i % 9 === 0).slice(0, 10);
  const ndviFilled = isBR
    ? [0.45, 0.58, 0.72, 0.84, 0.88, 0.86, 0.78, 0.65, 0.52, 0.44]
    : [0.38, 0.44, 0.52, 0.65, 0.74, 0.72, 0.64, 0.53, 0.45, 0.39];

  // Soil hydraulics properties strictly obeying: wilting_point < critical_water < field_capacity
  const soilClay = isUS ? 24.0 : isAR ? 26.0 : isBR ? 48.0 : isES ? 32.0 : isIN ? 18.0 : isSonora ? 36.0 : isCelaya ? 35.0 : isColon ? 22.0 : 28.0;
  const soilSand = isUS ? 28.0 : isAR ? 24.0 : isBR ? 38.0 : isES ? 26.0 : isIN ? 42.0 : isSonora ? 24.0 : isCelaya ? 15.0 : isColon ? 48.0 : 22.0;
  const soilSilt = Math.max(0, 100 - soilClay - soilSand);
  const soilPh = isUS ? 6.5 : isAR ? 6.2 : isBR ? 5.8 : isES ? 7.8 : isIN ? 7.6 : isSonora ? 7.9 : isCelaya ? 7.2 : isColon ? 7.4 : 6.8;
  const socGKg = isUS ? 28.5 : isAR ? 18.0 : isBR ? 22.0 : isES ? 11.5 : isIN ? 8.5 : isSonora ? 9.8 : isCelaya ? 16.5 : isColon ? 9.2 : 14.2;
  const nitrogenGKg = isUS ? 2.6 : isAR ? 1.6 : isBR ? 1.9 : isES ? 1.1 : isIN ? 0.95 : isSonora ? 1.05 : isCelaya ? 1.5 : isColon ? 0.85 : 1.3;
  const omPct = Math.round((socGKg / 10) * 1.724 * 100) / 100;

  const fcMm = isUS ? 210.0 : isAR ? 195.0 : isBR ? 205.0 : isES ? 185.0 : isIN ? 160.0 : isSonora ? 195.0 : isCelaya ? 200.0 : isColon ? 155.0 : 175.0;
  const wpMm = isUS ? 80.0 : isAR ? 82.0 : isBR ? 95.0 : isES ? 88.0 : isIN ? 70.0 : isSonora ? 92.0 : isCelaya ? 100.0 : isColon ? 75.0 : 85.0;
  const cwMm = Math.round((wpMm + 0.5 * (fcMm - wpMm)) * 10) / 10;
  const smVol = isUS ? 0.28 : isAR ? 0.26 : isBR ? 0.29 : isES ? 0.22 : isIN ? 0.20 : isSonora ? 0.18 : 0.24;
  const textureClass = isUS ? 'Loam' : isBR ? 'SandyClay' : isIN ? 'Loam' : isCelaya ? 'SiltyClay' : 'ClayLoam';

  return {
    parcel_id: presetId,
    analyzed_at: new Date().toISOString(),
    coordinates: { lat, lon },
    soil_hydraulics: {
      clay_pct: soilClay,
      sand_pct: soilSand,
      silt_pct: soilSilt,
      soil_ph: soilPh,
      soc_g_kg: socGKg,
      nitrogen_g_kg: nitrogenGKg,
      om_pct: omPct,
      field_capacity_mm: fcMm,
      wilting_point_mm: wpMm,
      critical_water_mm: cwMm,
      soil_moisture_vol: smVol,
      usda_texture_class: textureClass
    },
    climate_summary: {
      days_evaluated: 90,
      mean_temperature_c: isUS ? 18.2 : isBR ? 26.5 : isSonora ? 24.1 : 21.4,
      total_precip_mm: isBR ? 340.0 : 124.0,
      total_et0_mm: isBR ? 395.0 : 342.0
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
        crop_id: isUS ? 'soybean' : (isAR || isBR ? 'soybean' : 'wheat'),
        t_base_c: 10.0,
        gdd_accumulated: gdd_accum,
        dates
      },
      water_balance: {
        dates,
        w_mm,
        et0_mm,
        etc_mm: et0_mm.map((e) => Math.round(e * 0.85 * 10) / 10),
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
          : isBR
            ? ['soybean', 'maize', 'canola', 'sunflower']
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
        { slot_index: 0, cycle_code: 'PV', crop_id: 'maize', water_need_mm: 480, profit_mxn_ha: 1650, is_legume: false, deficit_slack_mm: 0 },
        { slot_index: 1, cycle_code: 'OI', crop_id: isUS || isBR ? 'soybean' : 'chickpea', water_need_mm: 310, profit_mxn_ha: 1420, is_legume: true, deficit_slack_mm: 0 },
        { slot_index: 2, cycle_code: 'PV', crop_id: isUS ? 'canola' : 'broccoli', water_need_mm: 390, profit_mxn_ha: 2100, is_legume: false, deficit_slack_mm: 0 },
        { slot_index: 3, cycle_code: 'OI', crop_id: isUS || isBR ? 'soybean' : 'bean', water_need_mm: 330, profit_mxn_ha: 1350, is_legume: true, deficit_slack_mm: 0 },
        { slot_index: 4, cycle_code: 'PV', crop_id: 'wheat', water_need_mm: 420, profit_mxn_ha: 1200, is_legume: false, deficit_slack_mm: 0 },
        { slot_index: 5, cycle_code: 'OI', crop_id: isUS || isBR ? 'soybean' : 'chickpea', water_need_mm: 300, profit_mxn_ha: 1450, is_legume: true, deficit_slack_mm: 0 }
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
