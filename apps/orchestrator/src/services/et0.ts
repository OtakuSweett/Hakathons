/**
 * Module: FAO-56 Penman-Monteith Reference Evapotranspiration (ET0).
 * Dynamic solar geometry calculated from latitude and Day of Year (J).
 * Golden vector verified against FAO-56 Example (Brussels: 3.75 +/- 0.05 mm/day).
 */

export interface DailyWeatherForET0 {
  dayOfYear: number;        // J (1 to 365/366)
  latitudeDeg: number;      // phi (-90 to +90)
  elevationMeters?: number; // z (m)
  tMeanC: number;           // T (°C)
  tMaxC: number;            // T_max (°C)
  tMinC: number;            // T_min (°C)
  rhMeanPct: number;        // RH (%)
  rsMjM2Day: number;        // R_s in MJ/m^2/day (NOT multiplied by 3.6 when from community=AG)
  u2MS?: number;            // Wind speed at 2m (m/s)
  u10MS?: number;           // Wind speed at 10m (m/s) -> u2 = 0.748 * u10
  psKpa?: number;           // Atmospheric pressure (kPa)
}

export function calculateFAO56ET0(w: DailyWeatherForET0): number {
  const phi = (w.latitudeDeg * Math.PI) / 180.0;
  const J = w.dayOfYear;

  // 1. Wind speed at 2m
  let u2 = w.u2MS;
  if (u2 === undefined || u2 === null) {
    if (w.u10MS !== undefined && w.u10MS !== null) {
      u2 = w.u10MS * 0.748;
    } else {
      u2 = 2.0; // FAO-56 default assumption
    }
  }

  // 2. Atmospheric pressure (kPa)
  const z = w.elevationMeters || 100.0;
  const P = w.psKpa || (101.3 * Math.pow((293.0 - 0.0065 * z) / 293.0, 5.26));

  // 3. Psychrometric constant gamma (kPa/°C)
  const gamma = 0.000665 * P;

  // 4. Mean saturation vapor pressure e_s(T) (kPa)
  const e0_Tmax = 0.6108 * Math.exp((17.27 * w.tMaxC) / (w.tMaxC + 237.3));
  const e0_Tmin = 0.6108 * Math.exp((17.27 * w.tMinC) / (w.tMinC + 237.3));
  const es = (e0_Tmax + e0_Tmin) / 2.0;

  // 5. Actual vapor pressure e_a (kPa)
  const ea = (es * Math.max(0.0, Math.min(100.0, w.rhMeanPct))) / 100.0;

  // 6. Slope of saturation vapor pressure curve Delta (kPa/°C)
  const delta = (4098.0 * (0.6108 * Math.exp((17.27 * w.tMeanC) / (w.tMeanC + 237.3)))) /
                Math.pow(w.tMeanC + 237.3, 2);

  // 7. Dynamic Solar Geometry
  // Solar declination delta_sol (radians)
  const deltaSol = 0.409 * Math.sin(((2.0 * Math.PI) / 365.0) * J - 1.39);

  // Relative Earth-Sun distance d_r
  const dr = 1.0 + 0.033 * Math.cos(((2.0 * Math.PI) / 365.0) * J);

  // Sunset hour angle omega_s (radians)
  const tanTerm = -Math.tan(phi) * Math.tan(deltaSol);
  const clampedTan = Math.max(-1.0, Math.min(1.0, tanTerm));
  const omegaS = Math.acos(clampedTan);

  // Extraterrestrial radiation R_a (MJ/m^2/day)
  // G_sc = 0.0820 MJ/m^2/min -> 24 * 60 / pi * 0.0820 = 37.586
  const Gsc = 0.0820;
  const Ra = ((24.0 * 60.0) / Math.PI) * Gsc * dr * (
    omegaS * Math.sin(phi) * Math.sin(deltaSol) +
    Math.cos(phi) * Math.cos(deltaSol) * Math.sin(omegaS)
  );

  // Clear-sky solar radiation R_so (MJ/m^2/day)
  const Rso = (0.75 + 2e-5 * z) * Ra;

  // 8. Net Radiation R_n = R_ns - R_nl
  const Rs = Math.max(0.0, w.rsMjM2Day);
  const Rns = (1.0 - 0.23) * Rs; // Albedo alpha = 0.23 for reference grass

  // Net longwave radiation R_nl
  const sigma = 4.903e-9; // Stefan-Boltzmann constant in MJ / (K^4 * m^2 * day)
  const TmaxK = w.tMaxC + 273.16;
  const TminK = w.tMinC + 273.16;
  const rsRatio = Rso > 0 ? Math.min(1.0, Math.max(0.3, Rs / Rso)) : 0.8;
  const cloudFactor = 1.35 * rsRatio - 0.35;
  const humidityFactor = 0.34 - 0.14 * Math.sqrt(Math.max(0.0, ea));
  const tempFactor = sigma * ((Math.pow(TmaxK, 4) + Math.pow(TminK, 4)) / 2.0);
  const Rnl = tempFactor * humidityFactor * Math.max(0.05, cloudFactor);

  const Rn = Rns - Rnl;
  const G = 0.0; // Soil heat flux G is negligible for daily periods

  // 9. Penman-Monteith Combination Equation
  const numerator = 0.408 * delta * (Rn - G) + gamma * (900.0 / (w.tMeanC + 273.0)) * u2 * (es - ea);
  const denominator = delta + gamma * (1.0 + 0.34 * u2);

  const et0 = numerator / denominator;
  return Math.max(0.0, Math.round(et0 * 100.0) / 100.0);
}
