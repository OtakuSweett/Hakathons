# WORKLIST — NASA Agro-DSS
> ES: Lista de tareas por track y estado de avance. Marcar [x] al completar cada ítem.

**Instructions:** Tick your own items only. Append new items; never delete. See [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol) for end-of-task protocol.

---

## 🏗 Bootstrap & Governance (Coordinator)
- [x] V1–V8 API verifications recorded in `docs/API_REFERENCE.md`
- [x] Monorepo directory scaffold created (pnpm + uv)
- [x] Root manifests written with pinned versions (`package.json`, `pnpm-workspace.yaml`, `pyproject.toml`)
- [x] Root `AGENTS.md` (SSOT) updated with M1–M7 and 9 product functions
- [x] Child `AGENTS.md` updated for all tracks and packages
- [x] `docs/ARCHITECTURE.md` and `docs/API_REFERENCE.md` synchronized with technical specs
- [x] `packages/contracts/crops_catalog.schema.json` and `schemas.json` created
- [x] `packages/contracts/crops_catalog.json` enriched with 12 Bajío crops (33 fields each)
- [x] 4 synthetic presets verified in `data/presets/`
- [x] Zero application code rule verified across entire repository
- [x] Git initial commit `chore: bootstrap scaffold` on `main`

---

## 🅰 Track A — Orchestrator (`apps/orchestrator/`, :3000)
> ES: Ingestión de datos, preprocesamiento edafológico/climático, gateway y soporte de las 9 funciones.

- [ ] A-01: Ingestion — NASA POWER Hourly (`temporal/hourly/point`) with `LST` timestamp handling and `-999 -> null` filtering
- [ ] A-02: Ingestion — NASA POWER Daily (`temporal/daily/point`) with solar radiation handling (note: `community=AG` already returns `MJ/m^2/day`; only `community=RE` requires $\times 3.6$)
- [ ] A-03: SoilGrids Ingestion & Scaling — `phh2o/10`, `soc/10`, `nitrogen/100`, `clay/10`, `sand/10` with $\ge 12\text{s}$ request throttling
- [ ] A-04: Soil Preprocessing — USDA textural triangle classification + Van Bemmelen organic matter formula ($\text{MO}\% = \text{SOC}\% \times 1.724$)
- [ ] A-05: Soil Pedotransfer — Saxton-Rawls calculation for $W_{\text{CC}}$, $W_{\text{PMP}}$, and $W_{\text{crítico}}$ ($Z_r = 600\text{ mm}$)
- [ ] A-06: ET0 Calculation — FAO-56 Penman-Monteith full sub-equations ($e_s, e_a, \Delta, \gamma, R_n, R_a$) + wind height conversion $u_2 = 0.748 \cdot u_{10}$
- [ ] A-07: Golden ET0 Vector — FAO-56 Brussels example verification ($3.75\text{ mm/day} \pm 0.05\text{ mm/day}$)
- [ ] A-08: EONET v3 Ingestion — Fetch `severeStorms` GeoJSON, extract trajectory coordinates, wind magnitude (`kts`), and distance to parcel
- [ ] A-09: Extreme Event Injection — Inject precipitation pulse into $P(t)$ for intersecting storms ($R \le 150\text{ km}$)
- [ ] A-10: Caching Gateway — Cache read/write under `data/cache/` with `"source": "cache"` and `"fetched_at"` metadata envelope
- [ ] A-11: Offline Fallback — Nearest preset loader from `data/presets/` upon network timeout or 503 response
- [ ] A-12: Pest Risk Engine — Moving-window evaluation of temperature, humidity (`RH2M` $\ge 80\%$) and rain $\rightarrow$ `PestRiskOutput`
- [ ] A-13: Farmer Reports Handler — `POST /api/farmer-reports` validating against `FarmerReportInput`
- [ ] A-14: What-If Simulator Dispatcher — `POST /api/simulate` applying perturbation deltas ($\Delta P, \Delta T$)
- [ ] A-15: Canonical Error Handling — Strict enforcement of `{ "error": { "code", "message", "details" } }`
- [ ] A-16: End-of-Task Protocol — Tests passing, `docs/AGENT_LOG.md` row appended, `WORKLIST.md` ticked

---

## 🅱 Track B — Physics Worker (`services/py-workers/physics_worker/`, :8001)
> ES: Módulos numéricos 1–4: splines cúbicos, energía térmica GDD, balance hídrico RK4 y detección de estrés Newton-Raphson.

- [ ] B-01: Module 1 (`mod1_splines.py`) — Natural cubic spline with explicit Thomas algorithm (TDMA) for second derivatives ($c_0 = c_n = 0$)
- [ ] B-02: Module 1 Validation — Assert TDMA matches `scipy.interpolate.CubicSpline(bc_type='natural')` to $< 10^{-9}$; fills missing NDVI/climate points; forbids extrapolation
- [ ] B-03: Module 2 (`mod2_simpson.py`) — 24-hour LST grouping for daily $T_{\max}, T_{\min}$; composite Simpson 1/3 integration via `scipy.integrate.simpson` ($h = 1\text{ d}$)
- [ ] B-04: Module 2 Validation — Constant-temperature analytic integral exact to $< 10^{-10}$; $\text{GDD} \ge 0$; handles even and odd point counts
- [ ] B-05: Module 3 (`mod3_rk4.py`) — Dynamic soil moisture ODE $\frac{dW}{dt} = P(t) + I(t) - ET_c(W, t) - D(W)$ with 4th-order Runge-Kutta ($h = 1\text{ d}$)
- [ ] B-06: Module 3 Ingestion & Pulses — Integrates SoilGrids pedotransfer ($W_{\text{CC}}, W_{\text{PMP}}, W_0$) and EONET hurricane/storm precipitation pulses
- [ ] B-07: Module 3 Validation — Order-4 convergence test (halving $h$ reduces error by $\approx 16$); mass-balance residual $< 10^{-6}\text{ mm}$
- [ ] B-08: Module 4 (`mod4_newton.py`) — Continuous spline representation of $W(t)$ and Newton-Raphson solver for $W(t) - W_{\text{crítico}} = 0$
- [ ] B-09: Module 4 Derivative — Derivative evaluated directly from RK4 analytical slope $\frac{dW}{dt}$ (no finite-difference noise)
- [ ] B-10: Module 4 Trigger — Returns exact trigger day $t^*$ and irrigation depth $\Delta I = W_{\text{CC}} - W_{\text{crítico}}$; returns diagnostic `reason` if no crossing
- [ ] B-11: FastAPI Microservice — `POST /physics` and `GET /health` endpoints matching `physics.schema.json`
- [ ] B-12: End-of-Task Protocol — Pytest suite passes, `docs/AGENT_LOG.md` row appended, `WORKLIST.md` ticked

---

## 🅲 Track C — Optimizer Worker (`services/py-workers/optimizer_worker/`, :8002)
> ES: Módulos 5–7: pre-solver agronómico con filtro EONET, optimización MILP multianual con HiGHS y análisis dual de Pareto.

- [ ] C-01: Module 5 (`mod5_presolver.py`) — Fast vectorized Pandas filtering: $GDD_{\text{disp}} < GDD_{\text{req}} \implies x_{i,t} = 0$; $\text{pH}_{\text{suelo}} \notin [\text{pH}_{\min}, \text{pH}_{\max}] \implies x_{i,t} = 0$
- [ ] C-02: Module 5 Disaster Filter — Blocks immediate cycle planting ($x_{i,1} = 0$) for wind- or flood-sensitive crops under active EONET severe storm alerts
- [ ] C-03: Module 5 Diagnostic Output — Structured `discarded` log with deterministic order and bilingual reason explanations
- [ ] C-04: Module 6 (`mod6_milp.py`) — Multi-year planning horizon ($T = 6 \text{ to } 8$ cycles across 3–4 years, alternating PV and OI)
- [ ] C-05: Module 6 Economic Formulation — $\text{Ganancia}_{i,t} = (\text{PrecioVenta}_i \times \text{Rendimiento}_i) - (\text{CostoSemilla}_i + \text{CostoRiego}_i + \text{CostoFertilizante}_i)$
- [ ] C-06: Module 6 Nutrient Constraints — SoilGrids N & SOC calibrates fertilizer cost and enforces annual legume rotation ($\ge 1$ legume per year)
- [ ] C-07: Module 6 Water & Agronomic Constraints — Single crop per slot ($\sum_i x_{i,t} \le 1$), anti-monoculture ($x_{i,t} + x_{i,t+1} \le 1$), single deficit slack $s_t^+ \ge 0$
- [ ] C-08: Module 6 HiGHS Solver — PuLP/Pyomo integration with HiGHS (`highspy`), 30s timeout, deterministic solution
- [ ] C-09: Module 7 (`mod7_pareto.py`) — Dual shadow prices extraction ($y_{\text{agua}} = \text{constraint.pi}$) from continuous LP relaxation
- [ ] C-10: Module 7 Pareto Scalarization — $\max \lambda f_1 + (1-\lambda) f_2$ supporting continuous slider $\lambda \in [0, 1]$ and 5-point discrete sweep $\{0, 0.25, 0.5, 0.75, 1.0\}$
- [ ] C-11: Module 7 Frontier Pruning — Filtering of dominated solutions to guarantee monotone non-increasing profit $f_1$
- [ ] C-12: FastAPI Microservice — `POST /optimize` and `GET /health` endpoints matching `optimizer.schema.json`
- [ ] C-13: End-of-Task Protocol — Pytest suite passes, `docs/AGENT_LOG.md` row appended, `WORKLIST.md` ticked

---

## 🅳 Track D — Web App (`apps/web/`, :5173)
> ES: Interfaz React 19 + Tailwind v4 + Leaflet + Recharts cubriendo las 9 funciones del producto.

- [ ] D-01: Layout & Core Setup — React 19 + Vite + Tailwind v4 (`@import "tailwindcss";` + `@theme {}`), bilingual EN/ES toggle
- [ ] D-02: Función 1 (Mapa de Riesgos) — Leaflet map with GIBS WMTS raster overlays and EONET v3 GeoJSON disaster markers with bounding box distance
- [ ] D-03: Función 2 (Alertas Anticipadas) — Banner notifying critical irrigation day $t^*$ (Module 4) + frost ($T_{\min} \le 0^\circ\text{C}$) and heatwave badges
- [ ] D-04: Función 3 (Recomendaciones Agrícolas) — Feasible vs. discarded crop cards with agronomic badges (pH, GDD, drought, wind, and flood tolerances)
- [ ] D-05: Función 4 (Simulador Climático) — Interactive sliders ($\Delta P \pm\%$, $\Delta T +^\circ\text{C}$, storm toggle) with live What-If re-evaluation
- [ ] D-06: Función 5 (Monitoreo de Cultivos) — Recharts time-series: raw gapped MODIS NDVI points vs. smooth spline-reconstructed curve (Module 1)
- [ ] D-07: Función 6 (Calendario Inteligente) — 3–4 year optimal rotation timeline (Module 6) + GDD thermal progression + scheduled irrigation dates
- [ ] D-08: Función 7 (Detector Preventivo de Plagas) — Pest & fungal risk semaphore from NASA POWER weather windows (`PestRiskOutput`)
- [ ] D-09: Función 8 (Evaluación Económica) — Multi-year profit/cost breakdown, water shadow price ($y_{\text{agua}}$) recommendation, and interactive Pareto slider $\lambda \in [0, 1]$
- [ ] D-10: Función 9 (Reportes de Agricultores) — Georeferenced field observation form with damage category selection and photo submission
- [ ] D-11: Offline Standalone Mode — Full simulation demo execution loading `data/presets/` when network/gateway is disconnected
- [ ] D-12: End-of-Task Protocol — Vitest passes, `docs/AGENT_LOG.md` row appended, `WORKLIST.md` ticked

---

## 🔗 Integration & System Verification
> ES: Pruebas de integración entre microservicios y validación de extremo a extremo.

- [ ] I-01: Contract Schema Validation — AJV validation passes for `parcel.schema.json`, `physics.schema.json`, `optimizer.schema.json`, `crops_catalog.schema.json`, `schemas.json`
- [ ] I-02: Preset Invariant Verification — Confirm $W_{\text{PMP}} < W_{\text{crítico}} < W_{\text{CC}}$ holds across all presets in `data/presets/`
- [ ] I-03: End-to-End Test on `el_marques.json` — Orchestrator $\rightarrow$ Physics Worker $\rightarrow$ Optimizer Worker $\rightarrow$ Full Response
- [ ] I-04: End-to-End Test on `san_juan_del_rio.json`
- [ ] I-05: End-to-End Test on `colon_semiarid.json` (testing drought-tolerant crops)
- [ ] I-06: End-to-End Test on `celaya.json` (testing high-yield irrigated crops)
- [ ] I-07: Zero Application Code Verification — Repository clean of unpermitted application files outside authorized feature branches
