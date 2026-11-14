# AGENTS.md — services/py-workers/physics_worker/ (Track B)
> ES: Reglas del Track B: Módulos numéricos 1 a 4 (reconstrucción con splines, energía térmica GDD con Simpson 1/3, balance hídrico RK4 con pulsos EONET y detección de estrés hídrico con Newton-Raphson).

See root [AGENTS.md](file:///home/Sweett/hakathon/AGENTS.md) §1–§6 for all shared rules (canonical units, JSON rules, git workflow, and end-of-task protocol).
See [docs/API_REFERENCE.md](file:///home/Sweett/hakathon/docs/API_REFERENCE.md) for data mappings.
See [docs/ARCHITECTURE.md](file:///home/Sweett/hakathon/docs/ARCHITECTURE.md) for the master integration pipeline.

---

## §1 Scope & Permissions
> ES: Alcance de edición para el Track B.

- **Files you MAY edit:** `services/py-workers/physics_worker/**`
- **Files you MUST NOT edit:** `optimizer_worker/`, `apps/`, `packages/contracts/`.

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
- **Input Validation:** Reject payloads containing `-999`, `-999.0` or `NaN` with HTTP 422.

---

## §4 In-Line Module Mathematics & API Connection (M1–M4)
> ES: Especificación matemática y flujo de implementación de los módulos 1 a 4.

### Module 1: Reconstrucción de Series Temporales (`mod1_splines.py`)
- **Fuente:** NASA POWER Hourly (`T2M`, `RH2M`, `PRECTOTCORR`, `WS10M`) y series MODIS NDVI.
- **Construcción del Eje Temporal:** Utilizar `LST` (*Local Solar Time*) para alinear el tiempo local exacto de la parcela.
- **Sistema Tridiagonal:** Para cada subintervalo $[x_i, x_{i+1}]$:
  $$S_i(x) = a_i + b_i(x - x_i) + c_i(x - x_i)^2 + d_i(x - x_i)^3$$
  $$h_{i-1} c_{i-1} + 2(h_{i-1} + h_i) c_i + h_i c_{i+1} = 3 \left( \frac{a_{i+1} - a_i}{h_i} - \frac{a_i - a_{i-1}}{h_{i-1}} \right)$$
  con condiciones de frontera natural $c_0 = 0, c_n = 0$.
- **Implementación:**
  1. Filtrar índices con centinelas `-999`.
  2. Resolver con algoritmo de Thomas (TDMA) explícito y validar contra `scipy.interpolate.CubicSpline(x_validos, y_validos, bc_type='natural')`.
  3. Evaluar sobre `x_faltantes` para entregar series completas hacia los Módulos 2 y 3.
  4. Levantar `ValueError` ante intentos de extrapolación fuera del rango $[x_0, x_n]$.

### Module 2: Cuantificación de Energía Térmica ($GDD$) (`mod2_simpson.py`)
- **Fuente:** Serie horaria interpolada `T2M` (Módulo 1) y umbral $T_{\text{base}}$ del cultivo.
- **Agrupamiento en 24h LST:** Extraer $T_{\max}(t_k)$ y $T_{\min}(t_k)$ diarios para cada día $k$.
- **Formulación Integral:**
  $$\text{GDD} = \int_{t_{\text{siembra}}}^{t_{\text{cosecha}}} \max\left(0, \frac{T_{\max}(t) + T_{\min}(t)}{2} - T_{\text{base}}\right) dt$$
- **Aproximación Numérica:** Regla de Simpson 1/3 Compuesta con $h = 1\text{ día}$:
  $$I \approx \frac{h}{3} \left[ f(t_0) + 4 \sum_{j=1}^{n/2} f(t_{2j-1}) + 2 \sum_{j=1}^{(n/2)-1} f(t_{2j}) + f(t_n) \right]$$
  mediante `scipy.integrate.simpson(y=y_gdd, x=x_dias)`. Invariante: $\text{GDD} \ge 0$.

### Module 3: Simulación Dinámica del Balance Hídrico (`mod3_rk4.py`)
- **Fusión de Fuentes:**
  - **ISRIC SoilGrids v2.0:** Parámetros `clay`, `sand`, `soc` divididos entre `d_factor`. Triángulo USDA + Van Bemmelen ($\text{MO}\% = \text{soc}\% \times 1.724$). Pedotransferencia Saxton-Rawls para $W_{\text{CC}}$, $W_{\text{PMP}}$ y $W_0 = \theta_{\text{vol}} \times Z_r$ ($Z_r = 600\text{ mm}$).
  - **NASA POWER:** Precipitación diaria acumulada $P(t)$ en $\text{mm/día}$, y $ET_0$ de Penman-Monteith.
  - **NASA EONET v3:** Si un ciclón/tormenta severa intersecta la parcela, inyectar un **pulso extraordinario de precipitación** en $P(t)$ para simular saturación e inundación.
- **Ecuación Diferencial Ordinaria:**
  $$\frac{dW}{dt} = P(t) + I(t) - ET_c(W, t) - D(W)$$
  $$ET_c(W, t) = K_c(t) \cdot ET_0(t) \cdot \text{clip}\left(\frac{W - W_{\text{PMP}}}{W_{\text{crítico}} - W_{\text{PMP}}}, 0, 1\right)$$
  $$D(W) = \max\left(0, 0.25 (W - W_{\text{CC}})\right)$$
- **Integración Runge-Kutta 4º Orden (RK4):**
  $$k_1 = f(t_n, W_n), \quad k_2 = f\left(t_n + \frac{h}{2}, W_n + \frac{h}{2} k_1\right)$$
  $$k_3 = f\left(t_n + \frac{h}{2}, W_n + \frac{h}{2} k_2\right), \quad k_4 = f(t_n + h, W_n + h k_3)$$
  $$W_{n+1} = \max\left(0, W_n + \frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)\right), \quad h = 1\text{ día}$$

### Module 4: Detección Predictiva de Estrés Hídrico (`mod4_newton.py`)
- **Función de Cruce:** $g(t) = W(t) - W_{\text{crítico}} = 0$.
  $$W_{\text{crítico}} = W_{\text{PMP}} + p \cdot (W_{\text{CC}} - W_{\text{PMP}}) \quad (p = \text{fraccion\_agotamiento\_p}, \text{default } 0.5)$$
- **Derivada Continua:** $g'(t_n) = \left.\frac{dW}{dt}\right\vert_{t_n}$ evaluada directamente de la función de pendiente RK4 (sin ruido de diferencias finitas).
- **Resolución:**
  $$t_{n+1} = t_n - \frac{W(t_n) - W_{\text{crítico}}}{W'(t_n)}$$
  mediante `scipy.optimize.newton(func=g, x0=dia_actual, fprime=dW_dt, tol=0.01)`.
- **Salida:** Si $t^*$ se encuentra dentro del horizonte de pronóstico (ej. 15 días), emitir fecha exacta para la *Alerta Anticipada* en el frontend y volumen de reposición $\Delta I = W_{\text{CC}} - W_{\text{crítico}}$. Si no cruza, devolver `t_star_days: null` y `"reason": "W_never_crosses_Wcrit"`.

---

## §5 Done Criteria & Pytest Verification
> ES: Criterios de aceptación con pytest.

```bash
uv run --project services/py-workers pytest services/py-workers/physics_worker/tests/
```
- `pytest -k "test_tdma_vs_scipy"`: $\max | \text{TDMA} - \text{SciPy} | < 10^{-9}$.
- `pytest -k "test_constant_temp_analytic"`: Simpson analytic match $< 10^{-10}$.
- `pytest -k "test_rk4_order4"`: Disminución de error por factor $\approx 16$ al reducir $h$ a la mitad.
- `pytest -k "test_mass_balance"`: Residual de balance de masa $< 10^{-6}\text{ mm}$.
- `pytest -k "test_newton_finds_crossing"`: $|W(t^*) - W_{\text{crítico}}| < 0.01\text{ mm}$.
- `pytest -k "test_newton_no_crossing_returns_null"`: Retorna `null` y diagnóstico sin excepciones.

---

## §6 End-of-Task Protocol
> ES: Protocolo de finalización.

See root [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol).
Append completed tasks to [docs/AGENT_LOG.md](file:///home/Sweett/hakathon/docs/AGENT_LOG.md) and check off entries in [WORKLIST.md](file:///home/Sweett/hakathon/WORKLIST.md).
