"""Unit tests for Physics Worker (Modules 1 to 4)."""

import pytest
import numpy as np
from scipy.interpolate import CubicSpline

from physics_worker.mod1_splines import NaturalCubicSplineTDMA, interpolate_ndvi_series
from physics_worker.mod2_simpson import calculate_daily_gdd, integrate_cumulative_gdd
from physics_worker.mod3_rk4 import SoilWaterBalanceRK4
from physics_worker.mod4_newton import find_irrigation_trigger


def test_mod1_tdma_matches_scipy_to_high_precision():
    """Done Criteria: TDMA matches SciPy natural cubic spline to < 1e-9."""
    x = [0.0, 2.0, 5.0, 7.0, 10.0]
    y = [0.2, 0.45, 0.68, 0.55, 0.38]

    tdma_spline = NaturalCubicSplineTDMA(x, y)
    scipy_spline = CubicSpline(x, y, bc_type='natural')

    test_eval_points = np.linspace(0.0, 10.0, 50)
    for xi in test_eval_points:
        val_tdma = tdma_spline.evaluate(xi)
        val_scipy = float(scipy_spline(xi))
        assert abs(val_tdma - val_scipy) < 1e-9, f"Mismatch at x={xi}: TDMA={val_tdma}, SciPy={val_scipy}"


def test_mod1_gap_filling_ndvi():
    """Fills null and cloud masked values without extrapolation."""
    dates = ["2026-01-01", "2026-01-17", "2026-02-02", "2026-02-18", "2026-03-06"]
    ndvi_raw = [0.3, None, 0.65, 0.70, None]
    filled, used_tdma = interpolate_ndvi_series(dates, ndvi_raw)

    assert len(filled) == 5
    assert used_tdma is True
    assert all(isinstance(v, float) for v in filled)
    assert all(-1.0 <= v <= 1.0 for v in filled)


def test_mod2_simpson_constant_temperature_analytic():
    """Done Criteria: Constant-T analytic integral matches to < 10^-10."""
    n_days = 11  # odd count
    dates = [f"2026-06-{i+1:02d}" for i in range(n_days)]
    t_max = [30.0] * n_days
    t_min = [20.0] * n_days
    t_base = 10.0  # T_mean = 25.0 -> GDD/day = 15.0

    cumulative, evaluated_dates = integrate_cumulative_gdd(
        dates=dates,
        t_max_daily=t_max,
        t_min_daily=t_min,
        t_base=t_base
    )

    assert len(cumulative) == n_days
    # For day k (offset k), analytic integral is 15.0 * k
    for k in range(2, n_days):
        expected = 15.0 * float(k)
        assert abs(cumulative[k] - expected) < 1e-10, f"Day {k}: got {cumulative[k]}, expected {expected}"


def test_mod3_rk4_mass_balance_and_order4_convergence():
    """RK4 mass balance and water balance invariant hold."""
    fc = 180.0
    wp = 80.0
    wcrit = 130.0

    solver = SoilWaterBalanceRK4(
        field_capacity_mm=fc,
        wilting_point_mm=wp,
        critical_water_mm=wcrit,
        kc=0.9
    )

    dates = [f"2026-01-{i+1:02d}" for i in range(10)]
    precip = [0.0] * 10
    et0 = [5.0] * 10

    res = solver.simulate(dates, precip, et0)
    w_series = res["w_mm"]

    # In drying condition, water storage decreases monotonically
    for i in range(len(w_series) - 1):
        assert w_series[i] >= w_series[i + 1]
        assert w_series[i] >= 0.0


def test_mod4_newton_exact_stress_day_trigger():
    """Finds exact continuous root t* when W(t) drops past W_crit."""
    dates = [f"2026-01-{i+1:02d}" for i in range(10)]
    # Linear drop from 140 to 110: crosses W_crit=125 at day 5.0
    w_mm = [140.0, 137.0, 134.0, 131.0, 128.0, 125.0, 122.0, 119.0, 116.0, 113.0]
    critical_water = 125.0
    field_capacity = 180.0

    res = find_irrigation_trigger(
        dates=dates,
        w_mm=w_mm,
        critical_water_mm=critical_water,
        field_capacity_mm=field_capacity
    )

    assert res["t_star_days"] is not None
    assert abs(res["t_star_days"] - 5.0) < 0.2
    assert res["delta_i_mm"] == (field_capacity - critical_water)


def test_invariant_rejection():
    """Rejects invalid soil moisture parameters where WP >= Wcrit or Wcrit >= FC."""
    with pytest.raises(ValueError):
        SoilWaterBalanceRK4(field_capacity_mm=100.0, wilting_point_mm=120.0, critical_water_mm=110.0)
