/**
 * Module: Pedotransfer Functions and Soil Textural Triangle Classification.
 * Implements USDA soil textural classes, Van Bemmelen organic matter factor (1.724),
 * and Saxton-Rawls pedotransfer equations over Zr = 600 mm.
 */

export interface SoilPropertiesInput {
  clayPct: number;
  sandPct: number;
  socGKg: number;
  nitrogenGKg?: number;
  soilPh: number;
  depletionFractionP?: number;
}

export interface SoilHydraulicsOutput {
  clayPct: number;
  sandPct: number;
  siltPct: number;
  omPct: number;
  soilPh: number;
  socGKg: number;
  nitrogenGKg: number;
  usdaTextureClass: string;
  fieldCapacityMm: number;
  wiltingPointMm: number;
  criticalWaterMm: number;
  provider?: 'soilgrids' | 'regional_benchmark';
  retrieval?: 'live' | 'cache' | 'preset_fallback';
  fetched_at?: string;
  fallback_reason?: string;
  fallback_preset_id?: string;
}

export function classifyUSDATexture(clay: number, sand: number, silt: number): string {
  if (clay >= 40) {
    if (silt >= 40) return 'SiltyClay';
    if (sand >= 45) return 'SandyClay';
    return 'Clay';
  } else if (clay >= 27) {
    if (sand >= 45) return 'SandyClayLoam';
    if (sand <= 20) return 'SiltyClayLoam';
    return 'ClayLoam';
  } else if (clay >= 20) {
    if (sand >= 52) return 'SandyClayLoam';
    if (silt >= 50) return 'SiltLoam';
    return 'Loam';
  } else if (clay >= 7) {
    if (silt >= 80) return 'Silt';
    if (silt >= 50) return 'SiltLoam';
    if (sand >= 52) return 'SandyLoam';
    return 'Loam';
  } else {
    // clay < 7
    if (silt >= 80) return 'Silt';
    if (silt >= 50) return 'SiltLoam';
    if (sand >= 85) return 'Sand';
    if (sand >= 70) return 'LoamySand';
    return 'SandyLoam';
  }
}

export function computeSoilHydraulics(input: SoilPropertiesInput): SoilHydraulicsOutput {
  const clay = Math.max(0.0, Math.min(100.0, input.clayPct));
  const sand = Math.max(0.0, Math.min(100.0, input.sandPct));
  const silt = Math.max(0.0, 100.0 - clay - sand);

  // Van Bemmelen equation: OM% = (SOC g/kg / 10) * 1.724
  const socGKg = Math.max(0.0, input.socGKg);
  const omPct = Math.round(((socGKg / 10.0) * 1.724) * 100.0) / 100.0;

  const usdaClass = classifyUSDATexture(clay, sand, silt);

  // Saxton-Rawls pedotransfer (fractions S, C, OM in [0, 1])
  const S = sand / 100.0;
  const C = clay / 100.0;
  const OM = omPct; // in percent for Saxton-Rawls equation

  // 1. Wilting point theta_1500
  const theta1500 = -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * (S * OM) - 0.013 * (C * OM) + 0.068 * (S * C) + 0.031;
  let thetaWP = theta1500 + (0.14 * theta1500 - 0.02);
  thetaWP = Math.max(0.04, Math.min(0.40, thetaWP));

  // 2. Field capacity theta_33
  const theta33 = -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * (S * OM) - 0.027 * (C * OM) + 0.452 * (S * C) + 0.299;
  let thetaFC = theta33 + (1.283 * Math.pow(theta33, 2) - 0.374 * theta33 - 0.015);
  thetaFC = Math.max(thetaWP + 0.05, Math.min(0.55, thetaFC));

  // Root zone depth Zr = 600 mm
  const Zr = 600.0;
  const wpMm = Math.round(thetaWP * Zr * 10.0) / 10.0;
  const fcMm = Math.round(thetaFC * Zr * 10.0) / 10.0;

  // Depletion fraction p (default 0.5)
  const p = input.depletionFractionP !== undefined ? Math.max(0.1, Math.min(0.9, input.depletionFractionP)) : 0.5;
  const wcritMm = Math.round((wpMm + p * (fcMm - wpMm)) * 10.0) / 10.0;

  // Strict invariant guarantee: wpMm < wcritMm < fcMm
  let safeWp = wpMm;
  let safeWcrit = wcritMm;
  let safeFc = fcMm;

  if (safeWp >= safeWcrit) {
    safeWp = safeWcrit - 10.0;
  }
  if (safeWcrit >= safeFc) {
    safeFc = safeWcrit + 20.0;
  }

  return {
    clayPct: Math.round(clay * 10.0) / 10.0,
    sandPct: Math.round(sand * 10.0) / 10.0,
    siltPct: Math.round(silt * 10.0) / 10.0,
    omPct,
    soilPh: Math.round(input.soilPh * 10.0) / 10.0,
    socGKg: Math.round(socGKg * 10.0) / 10.0,
    nitrogenGKg: input.nitrogenGKg ? Math.round(input.nitrogenGKg * 100.0) / 100.0 : 1.5,
    usdaTextureClass: usdaClass,
    fieldCapacityMm: safeFc,
    wiltingPointMm: safeWp,
    criticalWaterMm: safeWcrit
  };
}
