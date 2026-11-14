"""Module 1: Time-Series Reconstitution via Natural Cubic Splines.

Implements the explicit Thomas Algorithm (TDMA) for tridiagonal second-derivative
system solution with natural boundary conditions (c_0 = c_n = 0), verified against
scipy.interpolate.CubicSpline(bc_type='natural') to < 1e-9 tolerance.
"""

from typing import List, Tuple, Optional
import numpy as np
from scipy.interpolate import CubicSpline


class NaturalCubicSplineTDMA:
    """Natural Cubic Spline interpolator with Thomas Algorithm (TDMA) solver."""

    def __init__(self, x: List[float], y: List[float]):
        if len(x) != len(y):
            raise ValueError(f"Length mismatch: x has {len(x)} points, y has {len(y)} points")
        if len(x) < 3:
            raise ValueError(f"Natural cubic spline requires at least 3 knots, got {len(x)}")

        self.x = np.array(x, dtype=np.float64)
        self.y = np.array(y, dtype=np.float64)

        # Check strictly increasing x
        dx = np.diff(self.x)
        if np.any(dx <= 0):
            raise ValueError("Knots in x must be strictly monotonically increasing.")

        self.n = len(self.x) - 1  # number of intervals
        self.a = self.y.copy()
        self.b = np.zeros(self.n, dtype=np.float64)
        self.c = np.zeros(self.n + 1, dtype=np.float64)  # c_0 ... c_n
        self.d = np.zeros(self.n, dtype=np.float64)

        self._fit_tdma(dx)

    def _fit_tdma(self, h: np.ndarray) -> None:
        """Solves tridiagonal system for second derivative coefficients c_i."""
        n = self.n
        # System size for interior knots: m = n - 1 (from index 1 to n - 1)
        m = n - 1
        if m == 0:
            return

        sub_diag = np.zeros(m, dtype=np.float64)   # A_i
        main_diag = np.zeros(m, dtype=np.float64)  # B_i
        sup_diag = np.zeros(m, dtype=np.float64)   # C_i
        rhs = np.zeros(m, dtype=np.float64)        # D_i

        for k in range(m):
            i = k + 1  # knot index 1 to n-1
            sub_diag[k] = h[i - 1]
            main_diag[k] = 2.0 * (h[i - 1] + h[i])
            sup_diag[k] = h[i]
            rhs[k] = 3.0 * ((self.a[i + 1] - self.a[i]) / h[i] - (self.a[i] - self.a[i - 1]) / h[i - 1])

        # Thomas algorithm forward sweep
        c_prime = np.zeros(m, dtype=np.float64)
        d_prime = np.zeros(m, dtype=np.float64)

        c_prime[0] = sup_diag[0] / main_diag[0]
        d_prime[0] = rhs[0] / main_diag[0]

        for k in range(1, m):
            denom = main_diag[k] - sub_diag[k] * c_prime[k - 1]
            if abs(denom) < 1e-14:
                raise ZeroDivisionError("Singular matrix encountered in TDMA forward sweep.")
            c_prime[k] = sup_diag[k] / denom
            d_prime[k] = (rhs[k] - sub_diag[k] * d_prime[k - 1]) / denom

        # Back-substitution for interior knots
        c_interior = np.zeros(m, dtype=np.float64)
        c_interior[m - 1] = d_prime[m - 1]
        for k in range(m - 2, -1, -1):
            c_interior[k] = d_prime[k] - c_prime[k] * c_interior[k + 1]

        # Natural boundary conditions: c_0 = 0, c_n = 0
        self.c[0] = 0.0
        self.c[1:n] = c_interior
        self.c[n] = 0.0

        # Calculate b_i and d_i coefficients
        for i in range(n):
            self.d[i] = (self.c[i + 1] - self.c[i]) / (3.0 * h[i])
            self.b[i] = (self.a[i + 1] - self.a[i]) / h[i] - (h[i] / 3.0) * (2.0 * self.c[i] + self.c[i + 1])

    def evaluate(self, x_eval: float) -> float:
        """Evaluates spline at a single point x_eval without extrapolation."""
        if x_eval < self.x[0] or x_eval > self.x[-1]:
            raise ValueError(f"Extrapolation forbidden: x_eval={x_eval} outside [{self.x[0]}, {self.x[-1]}]")

        # Find interval
        if x_eval == self.x[-1]:
            i = self.n - 1
        else:
            i = int(np.searchsorted(self.x, x_eval, side='right') - 1)
            i = max(0, min(i, self.n - 1))

        dx = x_eval - self.x[i]
        return float(self.a[i] + self.b[i] * dx + self.c[i] * (dx ** 2) + self.d[i] * (dx ** 3))

    def evaluate_array(self, x_eval: np.ndarray) -> np.ndarray:
        """Vectorized evaluation over an array."""
        return np.array([self.evaluate(xi) for xi in x_eval], dtype=np.float64)


def interpolate_ndvi_series(
    dates: List[str],
    ndvi_raw: List[Optional[float]],
    qa_mask: Optional[List[int]] = None
) -> Tuple[List[float], bool]:
    """Fills null/cloud-gapped points in NDVI series using natural cubic spline TDMA.

    Returns:
        ndvi_filled: Full trajectory with all gaps filled.
        used_tdma: True when solved via TDMA and matched with SciPy.
    """
    valid_indices = []
    valid_x = []
    valid_y = []

    for idx, (val, date) in enumerate(zip(ndvi_raw, dates)):
        is_cloud = (qa_mask is not None and len(qa_mask) > idx and qa_mask[idx] != 0)
        if val is not None and not np.isnan(val) and val != -999 and val != -999.0 and not is_cloud:
            valid_indices.append(idx)
            valid_x.append(float(idx))
            valid_y.append(float(val))

    if len(valid_x) < 3:
        raise ValueError(f"Insufficient valid knots for cubic spline: got {len(valid_x)}, require >= 3")

    spline = NaturalCubicSplineTDMA(valid_x, valid_y)

    # Verify against SciPy to < 1e-9 tolerance
    scipy_spline = CubicSpline(valid_x, valid_y, bc_type='natural')
    test_points = np.linspace(valid_x[0], valid_x[-1], 25)
    tdma_vals = spline.evaluate_array(test_points)
    scipy_vals = scipy_spline(test_points)
    max_err = float(np.max(np.abs(tdma_vals - scipy_vals)))
    if max_err > 1e-9:
        raise AssertionError(f"TDMA deviates from SciPy natural spline: max error {max_err} > 1e-9")

    # Evaluate all points across full range [valid_x[0], valid_x[-1]]
    filled = []
    for idx in range(len(dates)):
        if idx < valid_x[0]:
            # Boundary clamp before first knot
            filled.append(valid_y[0])
        elif idx > valid_x[-1]:
            # Boundary clamp after last knot
            filled.append(valid_y[-1])
        else:
            val = spline.evaluate(float(idx))
            # Clip physical NDVI to [-1.0, 1.0]
            val_clipped = float(np.clip(val, -1.0, 1.0))
            filled.append(val_clipped)

    return filled, True
