"""Module 4: Predictive Water Stress Detection via Newton-Raphson.

Solves the continuous root problem:
    g(t) = W(t) - W_crit = 0
using scipy.optimize.newton with analytical derivative fprime = dW/dt.
Determines exact irrigation trigger day t* and recommended depth delta_I = FC - W_crit.
"""

from typing import List, Dict, Any, Optional
import numpy as np
from scipy.optimize import newton
from scipy.interpolate import CubicSpline


def find_irrigation_trigger(
    dates: List[str],
    w_mm: List[float],
    critical_water_mm: float,
    field_capacity_mm: float,
    precip_mm: List[float] = None,
    et0_mm: List[float] = None
) -> Dict[str, Any]:
    """Finds exact root t* of W(t) - W_crit = 0 via Newton-Raphson.

    Returns:
        {
            "t_star_days": float or None,
            "delta_i_mm": float or None,
            "reason": str or None
        }
    """
    w_array = np.array(w_mm, dtype=np.float64)
    n_days = len(w_array)
    w_crit = float(critical_water_mm)
    w_fc = float(field_capacity_mm)
    delta_i = float(w_fc - w_crit)

    if n_days < 2:
        return {
            "t_star_days": None,
            "delta_i_mm": None,
            "reason": "insufficient_time_series_points"
        }

    # Case 1: Already starting below threshold
    if w_array[0] <= w_crit:
        return {
            "t_star_days": 0.0,
            "delta_i_mm": delta_i,
            "reason": "W_already_below_Wcrit"
        }

    # Case 2: Never drops below threshold
    if np.all(w_array > w_crit):
        return {
            "t_star_days": None,
            "delta_i_mm": None,
            "reason": "W_never_crosses_Wcrit"
        }

    # Identify interval where crossing occurs
    t_days = np.arange(n_days, dtype=np.float64)
    crossing_idx = None
    for i in range(n_days - 1):
        if w_array[i] >= w_crit and w_array[i + 1] < w_crit:
            crossing_idx = i
            break

    if crossing_idx is None:
        # Crosses, but starts below or fluctuating
        first_below = int(np.where(w_array <= w_crit)[0][0])
        return {
            "t_star_days": float(first_below),
            "delta_i_mm": delta_i,
            "reason": "discrete_crossing_detected"
        }

    # Fit natural cubic spline to W(t) for smooth root finding
    spline_w = CubicSpline(t_days, w_array, bc_type='natural')
    spline_dw = spline_w.derivative()

    def g(t: float) -> float:
        return float(spline_w(t) - w_crit)

    def dg_dt(t: float) -> float:
        return float(spline_dw(t))

    # Initial guess: linear interpolation between i and i+1
    y0 = w_array[crossing_idx]
    y1 = w_array[crossing_idx + 1]
    denom = y1 - y0
    if abs(denom) > 1e-12:
        t0 = crossing_idx + (w_crit - y0) / denom
    else:
        t0 = crossing_idx + 0.5

    try:
        root_t = float(newton(func=g, x0=t0, fprime=dg_dt, tol=0.01, maxiter=50))
        # Ensure root is within [0, n_days - 1]
        if 0.0 <= root_t <= float(n_days - 1):
            return {
                "t_star_days": round(root_t, 2),
                "delta_i_mm": round(delta_i, 2),
                "reason": None
            }
        else:
            return {
                "t_star_days": round(float(crossing_idx + 1), 2),
                "delta_i_mm": round(delta_i, 2),
                "reason": "root_bounded_to_step"
            }
    except Exception:
        # Newton failed to converge, fall back to linear interpolation
        return {
            "t_star_days": round(float(t0), 2),
            "delta_i_mm": round(delta_i, 2),
            "reason": "linear_fallback_newton_diverged"
        }
