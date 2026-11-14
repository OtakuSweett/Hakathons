"""Module 2: Cumulative Growing Degree Days (GDD) Thermal Time Integration.

Extracts daily T_max and T_min from 24-hour Local Solar Time (LST) or daily series,
evaluates physiological heat unit integrand f(t) = max(0, (T_max + T_min)/2 - T_base),
and computes cumulative GDD integral via composite Simpson 1/3 rule.
"""

from typing import List, Tuple
import numpy as np
from scipy.integrate import simpson


def calculate_daily_gdd(
    t_max: float,
    t_min: float,
    t_base: float,
    t_max_cutoff: float = 35.0
) -> float:
    """Calculates daily GDD with optional high temperature cutoff."""
    t_eff_max = min(t_max, t_max_cutoff)
    t_mean = (t_eff_max + t_min) / 2.0
    return max(0.0, float(t_mean - t_base))


def integrate_cumulative_gdd(
    dates: List[str],
    t2m_hourly: np.ndarray = None,
    t_max_daily: List[float] = None,
    t_min_daily: List[float] = None,
    t_base: float = 10.0,
    t_max_cutoff: float = 35.0
) -> Tuple[List[float], List[str]]:
    """Computes daily and cumulative GDD trajectory over time.

    Returns:
        cumulative_gdd: Monotonically non-decreasing cumulative GDD (°C-days).
        evaluated_dates: Timeline dates corresponding to cumulative GDD.
    """
    if t_max_daily is not None and t_min_daily is not None:
        if len(t_max_daily) != len(t_min_daily) or len(t_max_daily) != len(dates):
            raise ValueError("Mismatched lengths among dates, t_max_daily, and t_min_daily")
        daily_max = np.array(t_max_daily, dtype=np.float64)
        daily_min = np.array(t_min_daily, dtype=np.float64)
    elif t2m_hourly is not None:
        # Group 24-hour LST blocks
        n_days = len(t2m_hourly) // 24
        if n_days == 0:
            raise ValueError(f"Need at least 24 hourly readings, got {len(t2m_hourly)}")
        daily_max = np.zeros(n_days, dtype=np.float64)
        daily_min = np.zeros(n_days, dtype=np.float64)
        for d in range(n_days):
            day_slice = t2m_hourly[d * 24:(d + 1) * 24]
            daily_max[d] = np.max(day_slice)
            daily_min[d] = np.min(day_slice)
        dates = dates[:n_days]
    else:
        raise ValueError("Must provide either daily t_max/t_min or t2m_hourly series.")

    n_samples = len(daily_max)
    if n_samples == 0:
        return [], []

    # Daily thermal increment
    daily_gdd = np.zeros(n_samples, dtype=np.float64)
    for i in range(n_samples):
        daily_gdd[i] = calculate_daily_gdd(daily_max[i], daily_min[i], t_base, t_max_cutoff)

    # Cumulative GDD accumulation
    # For day 0, cumulative is 0
    # For day k (k >= 1), integral from day 0 to day k via Simpson / trapezoid
    cumulative = np.zeros(n_samples, dtype=np.float64)
    x_days = np.arange(n_samples, dtype=np.float64)

    running_sum = 0.0
    for k in range(n_samples):
        if k == 0:
            cumulative[0] = daily_gdd[0]
        else:
            # Composite Simpson 1/3 integration over evaluated points [0..k]
            sub_x = x_days[:k + 1]
            sub_y = daily_gdd[:k + 1]
            if len(sub_x) >= 3:
                # Simpson 1/3 (composite) handles even and odd point counts internally
                val = float(simpson(y=sub_y, x=sub_x))
            else:
                # Trapezoidal fallback for first 2 points
                val = float(np.trapz(sub_y, sub_x) if hasattr(np, 'trapz') else np.trapezoid(sub_y, sub_x))
            # Cumulative GDD must be monotonically non-decreasing
            cumulative[k] = max(cumulative[k - 1], val)

    return cumulative.tolist(), dates
