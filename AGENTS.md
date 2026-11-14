# AGENTS.md — Root SSOT
> ES: Archivo raíz de agentes. Fuente única de verdad para unidades, reglas JSON, ecuaciones, flujo de datos y protocolo de agentes.

**Project:** NASA Space Apps 2026 — Crop Rotation & Water Resilience DSS (El Bajío / Querétaro, MX)  
**Rule:** If anything here conflicts with a child AGENTS.md, THIS FILE WINS.

---

## §1 Scope & Architecture
> ES: Alcance y arquitectura del sistema.

### Request Flow
web(:5173) → orchestrator(:3000) → physics_worker(:8001) + optimizer_worker(:8002)

### Directory Ownership
| Track | Owner Directory | Port | Responsibilities |
| :---: | :--- | :---: | :--- |
| **A** | `apps/orchestrator/` | `:3000` | Ingestion, caching, -999 null conversion, USDA/Van Bemmelen, ET0, EONET alerts, Pest Risk, Farmer Reports, gateway. |
| **B** | `services/py-workers/physics_worker/` | `:8001` | Modules 1–4: Splines (TDMA), GDD (Simpson 1/3), Water Balance (RK4 EDO + EONET pulse), Newton-Raphson. |
| **C** | `services/py-workers/optimizer_worker/` | `:8002` | Modules 5–7: Pre-Solver (GDD, pH, EONET storm block), MILP (PuLP/HiGHS), Pareto front & dual shadow prices. |
| **D** | `apps/web/` | `:5173` | React 19 + Tailwind v4 + Leaflet: 9 user functions (Maps, Alerts, Calendar, Simulator, Recharts, Slider). |
| **Contracts** | `packages/contracts/` | — | Schemas, catalogs, and presets. Governed under `feat/contracts-*` branch. |

**Rule:** Each agent edits ONLY its own track directory. Never edit another track's folder.

### The 9 Core Product Functions (DSS Suite)
1. **Mapa de Riesgos:** Leaflet map with GIBS WMTS layers and NASA EONET v3 real-time storm/flood/drought markers.
2. **Alertas Anticipadas:** Early warning banner with exact critical water stress day $t^*$ (Module 4) and frost/heatwave warnings.
3. **Recomendaciones Agrícolas:** Pre-solver crop feasibility panel (viable vs. discarded with agronomic reasons from Module 5).
4. **Simulador Climático:** "What-If" engine allowing $\pm\Delta P$, $+\Delta T$, and storm pulse injections with live re-computation.
5. **Monitoreo de Cultivos:** Raw cloud-gapped NDVI vs. continuous spline trajectory comparative visualization (Module 1).
6. **Calendario Inteligente:** 3–4 year optimal rotation timeline (Module 6) + GDD thermal milestones (Module 2) + irrigation dates (Module 4).
7. **Detector Preventivo de Plagas:** Fungal and insect pest risk semaphore calculated from `T2M`, `RH2M`, and `PRECTOTCORR`.
8. **Evaluación Económica:** Multi-year profit/cost breakdown, dual water shadow prices ($y_{\text{agua}}$), and interactive Pareto slider $\lambda \in [0, 1]$ (Modules 6 & 7).
9. **Reportes de Agricultores:** Crowdsourced, georeferenced field observation modal with photo upload supporting satellite ground truthing.

### Canonical Error Format
All HTTP error responses MUST use:
```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message", "details": {} } }
```

### Unknown? Ask First
If you are unsure about any behavior, data format, or business logic: write a TODO in `WORKLIST.md` and ask. Never guess and silently implement.

---

## §2 Git Rules (SSOT)
> ES: Reglas de Git. Los hijos enlazan aquí; no duplicar.

See [GIT_WORKFLOW.md](file:///home/Sweett/hakathon/GIT_WORKFLOW.md) for full branch and commit rules. Summary:
- Branches: `feat/contracts-<desc>` (merge FIRST), `feat/track-a-<task>`, `feat/track-b-<task>`, `feat/track-c-<task>`, `feat/track-d-<task>`
- Conventional Commits: `feat(track-b): mod2 simpson`
- Before every PR: `git fetch origin && git rebase origin/main`
- Squash-merge only; no force-push to `main`
- Shared files (`WORKLIST.md`, `docs/AGENT_LOG.md`): append/tick only — never rewrite

---

## §3 Canonical JSON & Units (SSOT — children LINK here, do NOT copy)
> ES: Unidades y reglas JSON canónicas. FUENTE ÚNICA DE VERDAD.

### Coordinate Format
```json
{ "lon": -100.3899, "lat": 20.5888 }
```
Decimal degrees; west is negative. Querétaro: lon=-100.3899, lat=20.5888.

### Timestamp Format
- Daily: `YYYY-MM-DD`
- Hourly: `YYYYMMDDHH` (in NASA POWER responses)
- Time standard: `LST` (*Local Solar Time*) based on parcel longitude
- Events & ISO timestamps: `YYYY-MM-DDTHH:mm:ssZ` (ISO-8601 UTC)

### JSON Key Naming
`snake_case` with unit suffix: `_pct` (percent), `_mm` (millimeters), `_vol` (m³/m³), `_g_kg` (g/kg), `_kpa`, `_m_s`, `_mj_m2_day`, `_c` (Celsius), `_kg_ha`, `_ton_ha`, `_usd_ton`.

### Missing Value Protocol & Live Verification Notes
- Raw API fill value: `-999` / `-999.0`
- Orchestrator ingestion: `-999` → `null`
- Gap-fill: Module 1 (natural cubic splines) fills `null` before Modules 2–4
- Workers MUST reject payloads containing `NaN` or `-999` (not `null`) with HTTP 422
- **NASA POWER Radiation Unit Note (VERIFIED LIVE):**
  - In `community=AG`, `ALLSKY_SFC_SW_DWN` is ALREADY returned in **`MJ/m^2/day`**. Do NOT multiply by 3.6!
  - In `community=RE`, it is returned in `kW-hr/m^2/day`, where $1\text{ kW-hr/m}^2/\text{day} = 3.6\text{ MJ/m}^2/\text{day}$.

### Canonical Unit Table
| Field | Range | Unit |
| :--- | :---: | :---: |
| `clay_pct`, `sand_pct`, `silt_pct`, `rh2m_pct`, `om_pct` | 0–100 | % |
| `soil_moisture_vol` | 0–1 | m³/m³ |
| `field_capacity_mm`, `wilting_point_mm`, `critical_water_mm`, `w_mm`, `precip_mm`, `et0_mm` | ≥0 | mm |
| `soil_ph` | 0–14 | pH (adimensional) |
| `soc_g_kg`, `nitrogen_g_kg` | ≥0 | g/kg |
| `rs_mj_m2_day` | ≥0 | MJ/m²/day |
| `ps_kpa` | ≥0 | kPa |
| `u2_m_s` | ≥0 | m/s |
| `fijacion_nitrogeno_kg_ha` | ≥0 | kg/ha |
| `rendimiento_ton_ha` | ≥0 | ton/ha |

**NEVER mix % and fractions.** `soil_moisture_vol` is m³/m³ (0–1), NOT percent.

### Water Balance Invariant
```
wilting_point_mm < critical_water_mm < field_capacity_mm
```
Enforced by all workers and validated in [packages/contracts/parcel.schema.json](file:///home/Sweett/hakathon/packages/contracts/parcel.schema.json).

### critical_water_mm Definition
$$W_{\text{crítico}} = W_{\text{PMP}} + p \cdot (W_{\text{CC}} - W_{\text{PMP}})$$
where $p = \text{depletion\_p}$ (default $0.5$) from `crops_catalog.json`.

### Soil Textural & Pedotransfer Equations
1. **Limo:** $\text{silt\_pct} = \max(0, 100 - \text{clay\_pct} - \text{sand\_pct})$.
2. **Triángulo Textural USDA:** Clases automáticas (ej. $37.8\%$ arcilla, $38.7\%$ arena, $23.5\%$ limo $\rightarrow$ *Clay Loam*).
3. **Materia Orgánica (Factor de Van Bemmelen):**
   $$\text{MO}\% = \left(\frac{\text{soc\_g\_kg}}{10}\right) \times 1.724$$
4. **Pedotransferencia Saxton-Rawls sobre $Z_r = 600\text{ mm}$:** Deriva $W_{\text{CC}}$ y $W_{\text{PMP}}$.

---

## §4 Math Pipeline (SSOT — Modules 1 to 7)
> ES: Especificación completa de los 7 módulos matemáticos.

### Module 1: Time-Series Reconstitution (`mod1_splines.py`)
- **System:** Natural cubic spline solving $h_{i-1} c_{i-1} + 2(h_{i-1}+h_i) c_i + h_i c_{i+1} = 3 \left( \frac{a_{i+1}-a_i}{h_i} - \frac{a_i-a_{i-1}}{h_{i-1}} \right)$ with natural boundary conditions $c_0 = c_n = 0$.
- **Implementation:** Explicit Thomas algorithm (TDMA) verified against `scipy.interpolate.CubicSpline(bc_type='natural')`.
- **Done Criteria:** TDMA matches SciPy to $< 10^{-9}$; passes through valid knots; fills all `-999`/null gaps; no extrapolation beyond data boundary.

### Module 2: Cumulative GDD Thermal Time (`mod2_simpson.py`)
- **Integral:** $\text{GDD} = \int_{t_{\text{start}}}^{t_{\text{end}}} \max\left(0, \frac{T_{\max}(t) + T_{\min}(t)}{2} - T_{\text{base}}\right) dt$.
- **Implementation:** Hourly `T2M` grouped into 24-hour `LST` intervals to extract daily $T_{\max}, T_{\min}$; composite Simpson 1/3 via `scipy.integrate.simpson(y=y_gdd, x=x_dias)` with $h=1\text{ day}$.
- **Done Criteria:** Constant-T analytic integral match $< 10^{-10}$; $\text{GDD} \ge 0$; handles both even and odd sample counts.

### Module 3: Dynamic Soil Water Balance via RK4 (`mod3_rk4.py`)
- **ODE:** $\frac{dW}{dt} = P(t) + I(t) - ET_c(W, t) - D(W)$.
- **Sub-terms:**
  - $ET_c(W, t) = K_c \cdot ET_0(t) \cdot \text{clip}\left(\frac{W - W_{\text{PMP}}}{W_{\text{crítico}} - W_{\text{PMP}}}, 0, 1\right)$.
  - $D(W) = \max\left(0, 0.25 (W - W_{\text{CC}})\right)$.
  - **EONET Extreme Weather Pulse:** If a severe cyclone/storm trajectory from NASA EONET v3 intersects the parcel area ($R \le 150\text{ km}$), inject an extraordinary precipitation pulse into $P(t)$ to model waterlogging.
- **Integration:** 4th-order Runge-Kutta with $h = 1\text{ day}$. Clamped to $W \ge 0$.
- **Done Criteria:** Order-4 convergence test verified; mass-balance residual $< 10^{-6}\text{ mm}$.

### Module 4: Predictive Water Stress Detection (`mod4_newton.py`)
- **Root Problem:** $g(t) = W(t) - W_{\text{crítico}} = 0$.
- **Implementation:** Continuous spline interpolation of $W_k$ points; Newton-Raphson via `scipy.optimize.newton(func=g, x0=t_0, fprime=dW_dt, tol=0.01)` using the analytical RK4 slope $\frac{dW}{dt}$ as derivative.
- **Trigger:** Recommends irrigation date $t^*$ and depth $\Delta I = W_{\text{CC}} - W_{\text{crítico}}$. If no crossing occurs, returns explicit diagnostic reason (`W_never_crosses_Wcrit`).

### Module 5: Agronomic Pre-Solver (`mod5_presolver.py`)
- **Rules:**
  1. If $\text{GDD}_{\text{disponible}}(t) < \text{GDD}_{\text{requerido}}(i) \implies x_{i,t} = 0$.
  2. If $\text{pH}_{\text{suelo}} \notin [\text{pH}_{\min}(i), \text{pH}_{\max}(i)] \implies x_{i,t} = 0$.
  3. **EONET Disaster Lockout:** If an active cyclone/severe storm alert is open in the parcel region, block immediate planting ($x_{i,1} = 0$) for crops with high `sensibilidad_viento` or `sensibilidad_inundacion`.
- **Implementation:** Fast vectorized Pandas filtering. Deterministic discard log.

### Module 6: Multi-Year MILP Crop Rotation (`mod6_milp.py`)
- **Formulation:**
  $$\max Z = \sum_{t=1}^T \sum_i \text{Ganancia}_{i,t} x_{i,t} - \sum_{t=1}^T \left[ \alpha \cdot \text{AguaRequerida}_t + \beta \cdot s_t^+ \right]$$
  Subject to:
  1. $\sum_i x_{i,t} \le 1, \quad \forall t$
  2. $\sum_i \text{ConsumoAgua}_i x_{i,t} - \text{AguaDisponible}_t \le s_t^+, \quad \forall t$
  3. Anti-monoculture: $x_{i,t} + x_{i,t+1} \le 1, \quad \forall i, t$
  4. Nitrogen fixation: $\sum_{k \in \text{Year}_y} \sum_{i \in \text{Leguminosas}} x_{i,k} \ge 1, \quad \forall y$
  5. $x_{i,t} \in \{0, 1\}, \quad s_t^+ \ge 0$.
- **Nutrient Calibration:** SoilGrids `nitrogen` and `soc` calibrate fertilizer costs and enforce legume requirement if soil N is depleted.
- **Solver:** PuLP / Pyomo + HiGHS (`highspy`), deterministic, time limit 30s.

### Module 7: Dual Sensitivity & Pareto Frontier (`mod7_pareto.py`)
- **Dual Shadow Prices:** $y_{\text{water}} = \frac{\partial Z^*}{\partial \text{WaterAvailable}_t} = \text{constraint.pi}$ from continuous relaxation. If shadow price exceeds market water cost, recommend irrigation investment.
- **Pareto Scalarization:** $\max \lambda f_1 + (1-\lambda) f_2$. Evaluates continuous $\lambda \in [0, 1]$ from frontend slider, or default 5-point sweep $\{0, 0.25, 0.5, 0.75, 1.0\}$. Filters dominated solutions.

---

## §5 Data Sources Summary
> ES: Fuentes de datos y fallbacks.

| Source | Endpoint | Auth | Role | Fallback |
| :--- | :--- | :---: | :--- | :--- |
| **A. NASA POWER Hourly/Daily** | `power.larc.nasa.gov/...` | None | Meteorology, $T, P, RH, u_2, R_s$ | `data/presets/` |
| **B. ISRIC SoilGrids v2.0** | `rest.isric.org/...` | None | Soil texture, pH, SOC, N, USDA, Van Bemmelen | `data/presets/` |
| **C. NASA EONET v3** | `eonet.gsfc.nasa.gov/...` | None | Cyclones, severe storms, flood pulses, hazard map | Empty list `[]` |
| **D. Open-Meteo & SMAP** | `api.open-meteo.com/...` | None | 16-day forecast, $W_0 = \theta_{\text{vol}} \times Z_r$ calibration | `data/presets/` |
| **E. NASA AppEEARS** | `appeears.earthdatacloud...`| Token | MOD13A2 NDVI 16-day raw series | Synthetic series in presets |
| **F. NASA GIBS WMTS** | `gibs.earthdata.nasa...` | None | Leaflet raster visual overlay only | Vector base map |
| **G. POWER MCP** | `get_daily_data` | None | Diagnostic agent inspection | REST API |

---

## §6 Agent Protocol
> ES: Protocolo de agentes para finalización de tareas.

### End-of-Task Protocol (every agent, every task)
1. Tick `[x]` in `WORKLIST.md` for completed items.
2. Append row to `docs/AGENT_LOG.md`: `Timestamp (UTC) | Track/Agent | Module | Files Changed | Tests Passed`.
3. Complete all checkboxes in `.github/pull_request_template.md` before opening PR.
