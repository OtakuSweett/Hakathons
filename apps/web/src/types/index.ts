/**
 * Frontend TypeScript Types & Interfaces.
 */

export type Language = 'es' | 'en';

export interface PresetSummary {
  presetId: string;
  parcelName: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  areaHa: number;
  cropId: string;
}

export interface SoilData {
  clay_pct: number;
  sand_pct: number;
  silt_pct: number;
  soil_ph: number;
  soc_g_kg: number;
  nitrogen_g_kg: number;
  om_pct: number;
  field_capacity_mm: number;
  wilting_point_mm: number;
  critical_water_mm: number;
  soil_moisture_vol?: number;
  usda_texture_class: string;
}

export interface ClimateSummary {
  days_evaluated: number;
  mean_temperature_c: number;
  total_precip_mm: number;
  total_et0_mm: number;
}

export interface SplineResult {
  dates: string[];
  ndvi_filled: number[];
  used_tdma: boolean;
}

export interface GddResult {
  crop_id: string;
  t_base_c: number;
  gdd_accumulated: number[];
  dates: string[];
}

export interface WaterBalance {
  dates: string[];
  w_mm: number[];
  et0_mm: number[];
  etc_mm: number[];
  precip_mm: number[];
  drainage_mm: number[];
}

export interface IrrigationTrigger {
  t_star_days: number | null;
  delta_i_mm: number | null;
  reason: string | null;
}

export interface PhysicsPayload {
  parcel_id: string;
  computed_at: string;
  source: string;
  spline_result: SplineResult;
  gdd_result: GddResult;
  water_balance: WaterBalance;
  irrigation_trigger: IrrigationTrigger;
}

export interface RotationSlot {
  slot_index: number;
  cycle_code: 'PV' | 'OI';
  crop_id: string;
  water_need_mm: number;
  profit_mxn_ha: number;
  is_legume: boolean;
  deficit_slack_mm: number;
}

export interface ParetoPoint {
  lambda_weight: number;
  profit_mxn_ha: number;
  water_saved_mm: number;
  n_fixed_kg_ha: number;
  water_shadow_price_mxn_mm: number;
  n_shadow_price_mxn_kg_ha: number;
  schedule: Array<{ slot_index: number; cycle_code: 'PV' | 'OI'; crop_id: string }>;
}

export interface OptimizationPayload {
  parcel_id: string;
  computed_at: string;
  status: string;
  infeasible_reason: string | null;
  presolver_summary: {
    feasible_crop_ids: string[];
    discarded: Array<{
      crop_id: string;
      reason_code: string;
      reason_text_es: string;
      reason_text_en: string;
    }>;
  };
  selected_rotation: RotationSlot[];
  pareto_front: ParetoPoint[];
}

export interface AnalysisResponse {
  parcel_id: string;
  analyzed_at: string;
  coordinates: { lat: number; lon: number };
  soil_hydraulics: SoilData;
  climate_summary: ClimateSummary;
  eonet_hazard_alerts: Array<{
    eventId: string;
    title: string;
    distanceKm: number;
    nearestCoordinates: [number, number];
    magnitudeKts?: number;
    pulsePrecipitationMm: number;
  }>;
  physics: PhysicsPayload;
  optimization: OptimizationPayload;
}
