"""Module 3: Dynamic Soil Water Balance via 4th-Order Runge-Kutta (RK4).

Solves the continuous soil water storage ODE:
    dW/dt = P(t) + I(t) - ET_c(W, t) - D(W)
where:
    ET_c(W, t) = Kc * ET0(t) * clip((W - W_pmp) / (W_crit - W_pmp), 0, 1)
    D(W) = max(0, 0.25 * (W - W_cc))
    P(t) includes effective rainfall and injected NASA EONET storm pulses.
"""

from typing import List, Dict, Any, Tuple
import numpy as np


class SoilWaterBalanceRK4:
    """Explicit RK4 solver for dynamic root-zone soil water storage W(t)."""

    def __init__(
        self,
        field_capacity_mm: float,
        wilting_point_mm: float,
        critical_water_mm: float,
        kc: float = 0.85,
        w_initial_mm: float = None,
        depletion_fraction_p: float = 0.5
    ):
        if not (wilting_point_mm < critical_water_mm < field_capacity_mm):
            raise ValueError(
                f"Violates water balance invariant: "
                f"WP ({wilting_point_mm}) < W_crit ({critical_water_mm}) < FC ({field_capacity_mm})"
            )

        self.fc = float(field_capacity_mm)
        self.wp = float(wilting_point_mm)
        self.wcrit = float(critical_water_mm)
        self.kc = float(kc)
        self.p = float(depletion_fraction_p)

        # Default initial water: W0 = field_capacity * 0.85 or calibrated
        if w_initial_mm is not None:
            self.w0 = float(max(0.0, w_initial_mm))
        else:
            self.w0 = float(self.wcrit + 0.5 * (self.fc - self.wcrit))

    def dW_dt(
        self,
        w: float,
        precip: float,
        et0: float,
        irrigation: float = 0.0
    ) -> Tuple[float, float, float]:
        """Calculates instantaneous dW/dt, ETc, and deep percolation drainage D.

        Returns:
            slope: dW/dt in mm/day
            etc: Actual crop evapotranspiration in mm/day
            drainage: Deep percolation loss in mm/day
        """
        # Water stress coefficient Ks
        if w <= self.wp:
            ks = 0.0
        elif w >= self.wcrit:
            ks = 1.0
        else:
            ks = (w - self.wp) / (self.wcrit - self.wp)
        ks = float(np.clip(ks, 0.0, 1.0))

        etc = self.kc * et0 * ks
        drainage = max(0.0, 0.25 * (w - self.fc))

        dw = precip + irrigation - etc - drainage
        return dw, etc, drainage

    def simulate(
        self,
        dates: List[str],
        precip_mm: List[float],
        et0_mm: List[float],
        irrigation_mm: List[float] = None,
        eonet_pulses: List[Dict[str, Any]] = None,
        h: float = 1.0
    ) -> Dict[str, Any]:
        """Integrates ODE over timeline using explicit 4th-Order Runge-Kutta.

        Returns structured dictionary conforming to packages/contracts/physics.schema.json.
        """
        n_steps = len(dates)
        if len(precip_mm) != n_steps or len(et0_mm) != n_steps:
            raise ValueError("Length mismatch among dates, precip_mm, and et0_mm")

        p_array = np.array(precip_mm, dtype=np.float64)
        et0_array = np.array(et0_mm, dtype=np.float64)
        irr_array = np.zeros(n_steps, dtype=np.float64) if irrigation_mm is None else np.array(irrigation_mm, dtype=np.float64)

        # Ingest NASA EONET extreme weather pulse if present
        if eonet_pulses:
            for pulse in eonet_pulses:
                day_offset = pulse.get("day_offset", 0)
                pulse_mm = pulse.get("pulse_precipitation_mm", 0.0)
                if 0 <= day_offset < n_steps:
                    p_array[day_offset] += pulse_mm

        w_trajectory = np.zeros(n_steps, dtype=np.float64)
        etc_trajectory = np.zeros(n_steps, dtype=np.float64)
        drainage_trajectory = np.zeros(n_steps, dtype=np.float64)

        current_w = self.w0

        for t in range(n_steps):
            w_trajectory[t] = current_w

            p_t = p_array[t]
            et0_t = et0_array[t]
            irr_t = irr_array[t]

            # Diagnostic instantaneous values at start of step
            dw_init, etc_t, drain_t = self.dW_dt(current_w, p_t, et0_t, irr_t)
            etc_trajectory[t] = etc_t
            drainage_trajectory[t] = drain_t

            # Explicit RK4 calculation
            k1, _, _ = self.dW_dt(current_w, p_t, et0_t, irr_t)
            k2, _, _ = self.dW_dt(current_w + 0.5 * h * k1, p_t, et0_t, irr_t)
            k3, _, _ = self.dW_dt(current_w + 0.5 * h * k2, p_t, et0_t, irr_t)
            k4, _, _ = self.dW_dt(current_w + h * k3, p_t, et0_t, irr_t)

            next_w = current_w + (h / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
            # Physical non-negative clamp
            current_w = max(0.0, float(next_w))

        return {
            "dates": dates,
            "w_mm": [float(w) for w in w_trajectory],
            "et0_mm": [float(e) for e in et0_array],
            "etc_mm": [float(e) for e in etc_trajectory],
            "precip_mm": [float(p) for p in p_array],
            "drainage_mm": [float(d) for d in drainage_trajectory]
        }
