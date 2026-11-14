# AGENTS.md — services/py-workers/physics_worker/ (Track B)
> ES: Reglas del Track B: Módulos numéricos 1–4 (splines, GDD, balance hídrico RK4, Newton-Raphson).

See root [AGENTS.md](file:///home/Sweett/hakathon/AGENTS.md) §1–§6 for all shared rules (canonical units, JSON rules, git workflow, and end-of-task protocol).
See root [AGENTS.md §3](file:///home/Sweett/hakathon/AGENTS.md#3-canonical-json--units-ssot--children-link-here-do-not-copy) for the Canonical Unit Table.
See root [AGENTS.md §4](file:///home/Sweett/hakathon/AGENTS.md#4-math-pipeline-ssot--children-inline-their-own-equations--cite-here) for math pipeline context.

---

## §1 Scope
> ES: Alcance de edición para el Track B.

- **Files you MAY edit:** `services/py-workers/physics_worker/**`
- **Files you MUST NOT edit:** `services/py-workers/optimizer_worker/**`, `apps/`, `packages/contracts/`.

---

## §2 Branch & Port
> ES: Rama y puerto asignados.

- **Branch:** `feat/track-b-<task>`
- **Port:** `:8001` (`uv run --project services/py-workers uvicorn physics_worker.main:app --port 8001`)

---

## §3 Contracts
> ES: Esquemas de entrada y salida para física.

- **Input:** [packages/contracts/parcel.schema.json](file:///home/Sweett/hakathon/packages/contracts/parcel.schema.json) (`ClimateSoilBundle`)
- **Output:** [packages/contracts/physics.schema.json](file:///home/Sweett/hakathon/packages/contracts/physics.schema.json) (`PhysicsOutput`)

---

## §4 In-Line Module Mathematics (Modules 1–4)
> ES: Ecuaciones detalladas de los módulos 1 a 4.

### Module 1: Natural Cubic Spline Interpolation (`mod1_splines.py`)
Used for gap-filling 16-day MODIS NDVI series affected by cloud cover.

Tridiagonal system for second derivatives $c_i = S''(x_i)/2$:
$$h_{i-1} c_{i-1} + 2(h_{i-1} + h_i) c_i + h_i c_{i+1} = 3 \left( \frac{a_{i+1} - a_i}{h_i} - \frac{a_i - a_{i-1}}{h_{i-1}} \right)$$
where $h_i = x_{i+1} - x_i$ and $a_i = y_i$.
- Natural boundary conditions: $c_0 = 0$ and $c_n = 0$.
- Solution: Tridiagonal Matrix Algorithm (TDMA / Thomas algorithm) implemented explicitly, with `scipy.interpolate.CubicSpline(bc_type='natural')` used as reference.
- Extrapolation behavior: Must raise `ValueError` for points outside $[x_0, x_n]$.

### Module 2: Cumulative GDD via Composite Simpson 1/3 (`mod2_simpson.py`)
Calculates cumulative thermal time above crop base temperature $T_{\text{base}}$:
$$\text{GDD} = \int_{t_0}^{t_f} \max\left(0, \frac{T_{\max}(t) + T_{\min}(t)}{2} - T_{\text{base}}\right) dt$$
- Numerical integration: Composite Simpson 1/3 rule via `scipy.integrate.simpson`.
- Invariant: $\text{GDD} \ge 0$ unconditionally.
- Sample sizes: Handles both even and odd sample counts cleanly (Simpson rule + trapezoidal step for even intervals).

### Module 3: Soil Moisture Balance via Explicit RK4 (`mod3_rk4.py`)
Dynamic differential equation for root-zone water storage $W(t)$ (over $Z_r = 600\text{ mm}$):
$$\frac{dW}{dt} = P(t) + I(t) - ET_c(W, t) - D(W)$$
where:
$$ET_c(W, t) = K_c(t) \cdot ET_0(t) \cdot \text{clip}\left( \frac{W - W_{\text{wp}}}{W_{\text{crit}} - W_{\text{wp}}}, 0, 1 \right)$$
$$D(W) = \max\left(0, 0.25 (W - W_{\text{fc}})\right)$$
$$W_{\text{crit}} = W_{\text{wp}} + p \cdot (W_{\text{fc}} - W_{\text{wp}})$$

Numerical Integration (Runge-Kutta 4th Order with step $h = 1\text{ day}$):
$$k_1 = f(t_n, W_n)$$
$$k_2 = f\left(t_n + \frac{h}{2}, W_n + \frac{h}{2} k_1\right)$$
$$k_3 = f\left(t_n + \frac{h}{2}, W_n + \frac{h}{2} k_2\right)$$
$$k_4 = f(t_n + h, W_n + h k_3)$$
$$W_{n+1} = \max\left(0, W_n + \frac{h}{6} (k_1 + 2k_2 + 2k_3 + k_4)\right)$$

### Module 4: Newton-Raphson Irrigation Trigger (`mod4_newton.py`)
Detects the exact moment $t^*$ when available water drops to critical threshold:
$$f(t) = W(t) - W_{\text{crit}} = 0$$
- Solved via `scipy.optimize.newton` with tolerance $|f(t^*)| < 0.01\text{ day}$.
- Derivative calculation: Evaluates $f'(t) = \frac{dW}{dt}$ directly using the continuous RK4 slope function (NOT finite differences).
- Irrigation Depth: $\Delta I = W_{\text{fc}} - W_{\text{crit}}$.
- Fallback / Boundary Condition: If $W(t) > W_{\text{crit}}$ throughout the horizon, returns `{"t_star_days": null, "delta_i_mm": null, "reason": "W_never_crosses_Wcrit"}` without failing.

---

## §5 Done Criteria
> ES: Criterios de aceptación y comandos de prueba para Track B.

Run tests using uv:
```bash
uv run --project services/py-workers pytest services/py-workers/physics_worker/tests/
```

Individual verifications:
- **M1 Splines:**
  - `pytest -k "test_tdma_vs_scipy"`: asserts $\max | \text{TDMA} - \text{SciPy} | < 10^{-9}$.
  - `pytest -k "test_spline_interpolates_knots"`: verified exact passage through valid observation points.
  - `pytest -k "test_no_extrapolation"`: raises `ValueError` outside boundary range.
- **M2 Simpson:**
  - `pytest -k "test_constant_temp_analytic"`: matches analytical integral within $10^{-10}$.
  - `pytest -k "test_vs_trapezoid"`: agrees with composite trapezoid within $1\%$.
- **M3 RK4:**
  - `pytest -k "test_rk4_order4"`: step halving decreases numerical error by factor of $\approx 16$.
  - `pytest -k "test_mass_balance"`: conservation residual $|\sum P + \sum I - \sum ET_c - \sum D - \Delta W| < 10^{-6}\text{ mm}$.
- **M4 Newton:**
  - `pytest -k "test_newton_finds_crossing"`: $|W(t^*) - W_{\text{crit}}| < 0.01\text{ mm}$.
  - `pytest -k "test_newton_no_crossing_returns_null"`: returns explicit reason and `null` without throwing exceptions.

---

## §6 End-of-Task Protocol
> ES: Protocolo de finalización.

See root [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol).
Append completed tasks to [docs/AGENT_LOG.md](file:///home/Sweett/hakathon/docs/AGENT_LOG.md) and check off entries in [WORKLIST.md](file:///home/Sweett/hakathon/WORKLIST.md).
