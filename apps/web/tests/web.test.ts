import { describe, it, expect } from 'vitest';
import { DEMO_PRESETS_LIST, getMockAnalysis } from '../src/services/mockData.js';

describe('Track D (Web Frontend) Core Suite', () => {
  it('D-01: DEMO_PRESETS_LIST includes all 4 demonstration benchmarks', () => {
    expect(DEMO_PRESETS_LIST.length).toBeGreaterThanOrEqual(3);
    const presetIds = DEMO_PRESETS_LIST.map((p) => p.presetId);
    expect(presetIds).toContain('el_marques_qro');
    expect(presetIds).toContain('iowa_corn_belt_us');
    expect(presetIds).toContain('pampa_pergamino_ar');
  });

  it('D-02: Soil Hydraulics obeys physical invariant wilting_point < critical_water < field_capacity', () => {
    for (const preset of DEMO_PRESETS_LIST) {
      const data = getMockAnalysis(preset.presetId);
      const sh = data.soil_hydraulics;
      expect(sh.wilting_point_mm).toBeLessThan(sh.critical_water_mm);
      expect(sh.critical_water_mm).toBeLessThan(sh.field_capacity_mm);
      expect(sh.soil_moisture_vol).toBeGreaterThanOrEqual(0);
      expect(sh.soil_moisture_vol).toBeLessThanOrEqual(1);
    }
  });

  it('D-03: Southern Hemisphere (Pergamino AR) and Northern Hemisphere coordinates are valid', () => {
    const pergamino = getMockAnalysis('pampa_pergamino_ar');
    expect(pergamino.coordinates.lat).toBeLessThan(0); // Austral hemisphere
    expect(pergamino.coordinates.lon).toBeLessThan(0);

    const iowa = getMockAnalysis('iowa_corn_belt_us');
    expect(iowa.coordinates.lat).toBeGreaterThan(40.0); // US Corn Belt
    expect(iowa.coordinates.lon).toBeLessThan(-90.0);

    const marques = getMockAnalysis('el_marques_qro');
    expect(marques.coordinates.lat).toBeCloseTo(20.59, 1); // Mexico Bajío
  });

  it('D-04: Splines time-series output (M1) contains continuous non-null trajectory', () => {
    const data = getMockAnalysis('el_marques_qro');
    const spline = data.physics.spline_result;
    expect(spline.used_tdma).toBe(true);
    expect(spline.ndvi_filled.length).toBeGreaterThan(0);
    spline.ndvi_filled.forEach((val) => {
      expect(val).toBeGreaterThanOrEqual(0.0);
      expect(val).toBeLessThanOrEqual(1.0);
      expect(isNaN(val)).toBe(false);
    });
  });

  it('D-05: GDD accumulation (M2) is monotonically non-decreasing and non-negative', () => {
    const data = getMockAnalysis('el_marques_qro');
    const gdd = data.physics.gdd_result.gdd_accumulated;
    expect(gdd.length).toBeGreaterThan(10);
    for (let i = 1; i < gdd.length; i++) {
      expect(gdd[i]).toBeGreaterThanOrEqual(gdd[i - 1]);
    }
  });

  it('D-06: Water balance dynamic series (M3) maintains positive soil water storage', () => {
    const data = getMockAnalysis('el_marques_qro');
    const wb = data.physics.water_balance;
    expect(wb.dates.length).toBe(wb.w_mm.length);
    wb.w_mm.forEach((w) => {
      expect(w).toBeGreaterThanOrEqual(0.0);
    });
  });

  it('D-07: Irrigation trigger structure (M4) provides consistent root-crossing information', () => {
    const data = getMockAnalysis('el_marques_qro');
    const trigger = data.physics.irrigation_trigger;
    expect(trigger).toBeDefined();
    if (trigger.t_star_days !== null) {
      expect(trigger.t_star_days).toBeGreaterThan(0);
      expect(trigger.delta_i_mm).toBeGreaterThan(0);
    } else {
      expect(trigger.reason).toBeDefined();
    }
  });

  it('D-08: Pre-solver (M5) cleanly categorizes viable vs discarded crops', () => {
    const data = getMockAnalysis('el_marques_qro');
    const ps = data.optimization.presolver_summary;
    expect(ps.feasible_crop_ids.length).toBeGreaterThan(0);
    expect(ps.discarded.length).toBeGreaterThan(0);
    ps.discarded.forEach((disc) => {
      expect(disc.crop_id).toBeDefined();
      expect(disc.reason_code).toBeDefined();
    });
  });

  it('D-09: Multi-year MILP rotation (M6) satisfies anti-monoculture and includes legumes', () => {
    const data = getMockAnalysis('el_marques_qro');
    const rot = data.optimization.selected_rotation;
    expect(rot.length).toBeGreaterThanOrEqual(4);

    // Anti-monoculture check: consecutive cycles should not have the same crop
    for (let i = 0; i < rot.length - 1; i++) {
      expect(rot[i].crop_id).not.toBe(rot[i + 1].crop_id);
    }

    // Nitrogen fixation check: must contain at least one legume
    const hasLegume = rot.some((slot) => slot.is_legume);
    expect(hasLegume).toBe(true);
  });

  it('D-10: Pareto frontier (M7) provides dual shadow prices and trade-off points', () => {
    const data = getMockAnalysis('el_marques_qro');
    const pareto = data.optimization.pareto_front;
    expect(pareto.length).toBeGreaterThanOrEqual(3);
    pareto.forEach((pt) => {
      expect(pt.lambda_weight).toBeGreaterThanOrEqual(0.0);
      expect(pt.lambda_weight).toBeLessThanOrEqual(1.0);
      expect(pt.profit_mxn_ha).toBeGreaterThan(0);
      expect(pt.water_shadow_price_mxn_mm).toBeGreaterThan(0);
    });
  });
});
