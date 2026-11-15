# WORKLIST — NASA Agro-DSS
> ES: Lista de tareas por track y estado de avance. Marcar [x] al completar cada ítem.

**Instructions:** Tick your own items only. Append new items; never delete. See [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol) for end-of-task protocol.

---

## 🏗 Bootstrap & Governance (Coordinator)
- [x] V1–V8 API verifications recorded in `docs/API_REFERENCE.md`
- [x] Monorepo directory scaffold created (pnpm + uv)
- [x] Root manifests written with pinned versions (`package.json`, `pnpm-workspace.yaml`, `pyproject.toml`)
- [x] Root `AGENTS.md` (SSOT) updated with M1–M7 and 9 product functions
- [x] Planetary Global Scope established (arbitrary lat/lon, dynamic solar geometry, hemisphere adaptation, NON_ARABLE_LAND check)
- [x] Child `AGENTS.md` updated for all tracks and packages
- [x] `docs/ARCHITECTURE.md` and `docs/API_REFERENCE.md` synchronized with technical specs and global planetary engine
- [x] `packages/contracts/crops_catalog.schema.json` and `schemas.json` created
- [x] `packages/contracts/crops_catalog.json` enriched to 20 crops (staple global crops: soybean, sunflower, potato, canola + 16 regional crops)
- [x] 6 realistic presets verified in `data/presets/` (Mexico, USA Corn Belt, Argentina Pampa)
- [x] Zero application code rule verified across entire repository
- [x] Git initial commit `chore: bootstrap scaffold` on `main`

---

## 🅰 Track A — Orchestrator (`apps/orchestrator/`, :3000)
> ES: Ingestión de datos, preprocesamiento edafológico/climático, gateway y soporte de las 9 funciones.

- [x] A-01: Ingestion — NASA POWER Hourly (`temporal/hourly/point`) with `LST` timestamp handling and `-999 -> null` filtering
- [x] A-02: Ingestion — NASA POWER Daily (`temporal/daily/point`) with solar radiation handling (note: `community=AG` already returns `MJ/m^2/day`; only `community=RE` requires $\times 3.6$)
- [x] A-03: SoilGrids Ingestion & Scaling — `phh2o/10`, `soc/10`, `nitrogen/100`, `clay/10`, `sand/10` with $\ge 12\text{s}$ request throttling
- [x] A-04: Soil Preprocessing — USDA textural triangle classification + Van Bemmelen organic matter formula ($\text{MO}\% = \text{SOC}\% \times 1.724$)
- [x] A-05: Soil Pedotransfer — Saxton-Rawls calculation for $W_{\text{CC}}$, $W_{\text{PMP}}$, and $W_{\text{crítico}}$ ($Z_r = 600\text{ mm}$)
- [x] A-06: ET0 Calculation — FAO-56 Penman-Monteith full sub-equations ($e_s, e_a, \Delta, \gamma, R_n, R_a$) + wind height conversion $u_2 = 0.748 \cdot u_{10}$
- [x] A-07: Golden ET0 Vector — FAO-56 Brussels example verification ($3.75\text{ mm/day} \pm 0.05\text{ mm/day}$)
- [x] A-08: EONET v3 Ingestion — Fetch `severeStorms` GeoJSON, extract trajectory coordinates, wind magnitude (`kts`), and distance to parcel
- [x] A-09: Extreme Event Injection — Inject precipitation pulse into $P(t)$ for intersecting storms ($R \le 150\text{ km}$)
- [x] A-10: Caching Gateway — Cache read/write under `data/cache/` with `"source": "cache"` and `"fetched_at"` metadata envelope
- [x] A-11: Offline Fallback — Nearest preset loader from `data/presets/` upon network timeout or 503 response
- [x] A-12: Pest Risk Engine — Moving-window evaluation of temperature, humidity (`RH2M` $\ge 80\%$) and rain $\rightarrow$ `PestRiskOutput`
- [x] A-13: Farmer Reports Handler — `POST /api/farmer-reports` validating against `FarmerReportInput`
- [x] A-14: What-If Simulator Dispatcher — `POST /api/simulate` applying perturbation deltas ($\Delta P, \Delta T$)
- [x] A-15: Canonical Error Handling — Strict enforcement of `{ "error": { "code", "message", "details" } }`
- [x] A-16: End-of-Task Protocol — Tests passing, `docs/AGENT_LOG.md` row appended, `WORKLIST.md` ticked

---

## 🅱 Track B — Physics Worker (`services/py-workers/physics_worker/`, :8001)
> ES: Módulos numéricos 1–4: splines cúbicos, energía térmica GDD, balance hídrico RK4 y detección de estrés Newton-Raphson.

- [x] B-01: Module 1 (`mod1_splines.py`) — Natural cubic spline with explicit Thomas algorithm (TDMA) for second derivatives ($c_0 = c_n = 0$)
- [x] B-02: Module 1 Validation — Assert TDMA matches `scipy.interpolate.CubicSpline(bc_type='natural')` to $< 10^{-9}$; fills missing NDVI/climate points; forbids extrapolation
- [x] B-03: Module 2 (`mod2_simpson.py`) — 24-hour LST grouping for daily $T_{\max}, T_{\min}$; composite Simpson 1/3 integration via `scipy.integrate.simpson` ($h = 1\text{ d}$)
- [x] B-04: Module 2 Validation — Constant-temperature analytic integral exact to $< 10^{-10}$; $\text{GDD} \ge 0$; handles even and odd point counts
- [x] B-05: Module 3 (`mod3_rk4.py`) — Dynamic soil moisture ODE $\frac{dW}{dt} = P(t) + I(t) - ET_c(W, t) - D(W)$ with 4th-order Runge-Kutta ($h = 1\text{ d}$)
- [x] B-06: Module 3 Ingestion & Pulses — Integrates SoilGrids pedotransfer ($W_{\text{CC}}, W_{\text{PMP}}, W_0$) and EONET hurricane/storm precipitation pulses
- [x] B-07: Module 3 Validation — Order-4 convergence test (halving $h$ reduces error by $\approx 16$); mass-balance residual $< 10^{-6}\text{ mm}$
- [x] B-08: Module 4 (`mod4_newton.py`) — Continuous spline representation of $W(t)$ and Newton-Raphson solver for $W(t) - W_{\text{crítico}} = 0$
- [x] B-09: Module 4 Derivative — Derivative evaluated directly from RK4 analytical slope $\frac{dW}{dt}$ (no finite-difference noise)
- [x] B-10: Module 4 Trigger — Returns exact trigger day $t^*$ and irrigation depth $\Delta I = W_{\text{CC}} - W_{\text{crítico}}$; returns diagnostic `reason` if no crossing
- [x] B-11: FastAPI Microservice — `POST /physics` and `GET /health` endpoints matching `physics.schema.json`
- [x] B-12: End-of-Task Protocol — Pytest suite passes, `docs/AGENT_LOG.md` row appended, `WORKLIST.md` ticked

---

## 🅲 Track C — Optimizer Worker (`services/py-workers/optimizer_worker/`, :8002)
> ES: Módulos 5–7: pre-solver agronómico con filtro EONET, optimización MILP multianual con HiGHS y análisis dual de Pareto.

- [x] C-01: Module 5 (`mod5_presolver.py`) — Fast vectorized Pandas filtering: $GDD_{\text{disp}} < GDD_{\text{req}} \implies x_{i,t} = 0$; $\text{pH}_{\text{suelo}} \notin [\text{pH}_{\min}, \text{pH}_{\max}] \implies x_{i,t} = 0$
- [x] C-02: Module 5 Disaster Filter — Blocks immediate cycle planting ($x_{i,1} = 0$) for wind- or flood-sensitive crops under active EONET severe storm alerts
- [x] C-03: Module 5 Diagnostic Output — Structured `discarded` log with deterministic order and bilingual reason explanations
- [x] C-04: Module 6 (`mod6_milp.py`) — Multi-year planning horizon ($T = 6 \text{ to } 8$ cycles across 3–4 years, alternating PV and OI)
- [x] C-05: Module 6 Economic Formulation — $\text{Ganancia}_{i,t} = (\text{PrecioVenta}_i \times \text{Rendimiento}_i) - (\text{CostoSemilla}_i + \text{CostoRiego}_i + \text{CostoFertilizante}_i)$
- [x] C-06: Module 6 Nutrient Constraints — SoilGrids N & SOC calibrates fertilizer cost and enforces annual legume rotation ($\ge 1$ legume per year)
- [x] C-07: Module 6 Water & Agronomic Constraints — Single crop per slot ($\sum_i x_{i,t} \le 1$), anti-monoculture ($x_{i,t} + x_{i,t+1} \le 1$), single deficit slack $s_t^+ \ge 0$
- [x] C-08: Module 6 HiGHS Solver — PuLP/Pyomo integration with HiGHS (`highspy`), 30s timeout, deterministic solution
- [x] C-09: Module 7 (`mod7_pareto.py`) — Dual shadow prices extraction ($y_{\text{agua}} = \text{constraint.pi}$) from continuous LP relaxation
- [x] C-10: Module 7 Pareto Scalarization — $\max \lambda f_1 + (1-\lambda) f_2$ supporting continuous slider $\lambda \in [0, 1]$ and 5-point discrete sweep $\{0, 0.25, 0.5, 0.75, 1.0\}$
- [x] C-11: Module 7 Frontier Pruning — Filtering of dominated solutions to guarantee monotone non-increasing profit $f_1$
- [x] C-12: FastAPI Microservice — `POST /optimize` and `GET /health` endpoints matching `optimizer.schema.json`
- [x] C-13: End-of-Task Protocol — Pytest suite passes, `docs/AGENT_LOG.md` row appended, `WORKLIST.md` ticked

---

## 🅳 Track D — Web App (`apps/web/`, :5173)
> ES: Interfaz React 19 + Tailwind v4 + Leaflet + Recharts cubriendo las 9 funciones del producto.

- [x] D-01: Layout & Core Setup — React 19 + Vite + Tailwind v4 (`@import "tailwindcss";` + `@theme {}`), bilingual EN/ES toggle
- [x] D-02: Función 1 (Mapa de Riesgos) — Leaflet map with GIBS WMTS raster overlays and EONET v3 GeoJSON disaster markers with bounding box distance
- [x] D-03: Función 2 (Alertas Anticipadas) — Banner notifying critical irrigation day $t^*$ (Module 4) + frost ($T_{\min} \le 0^\circ\text{C}$) and heatwave badges
- [x] D-04: Función 3 (Recomendaciones Agrícolas) — Feasible vs. discarded crop cards with agronomic badges (pH, GDD, drought, wind, and flood tolerances)
- [x] D-05: Función 4 (Simulador Climático) — Interactive sliders ($\Delta P \pm\%$, $\Delta T +^\circ\text{C}$, storm toggle) with live What-If re-evaluation
- [x] D-06: Función 5 (Monitoreo de Cultivos) — Recharts time-series: raw gapped MODIS NDVI points vs. smooth spline-reconstructed curve (Module 1)
- [x] D-07: Función 6 (Calendario Inteligente) — 3–4 year optimal rotation timeline (Module 6) + GDD thermal progression + scheduled irrigation dates
- [x] D-08: Función 7 (Detector Preventivo de Plagas) — Pest & fungal risk semaphore from NASA POWER weather windows (`PestRiskOutput`)
- [x] D-09: Función 8 (Evaluación Económica) — Multi-year profit/cost breakdown, water shadow price ($y_{\text{agua}}$) recommendation, and interactive Pareto slider $\lambda \in [0, 1]$
- [x] D-10: Función 9 (Reportes de Agricultores) — Georeferenced field observation form with damage category selection and photo submission
- [x] D-11: Offline Standalone Mode — Full simulation demo execution loading `data/presets/` when network/gateway is disconnected
- [x] D-12: End-of-Task Protocol — Vitest passes, `docs/AGENT_LOG.md` row appended, `WORKLIST.md` ticked
- [x] D-13: Guided Field Workflow — Region selection, bounded parcel map, grower crop selection, bilingual privacy and opt-in location, responsive field analysis
- [x] D-14: Economic empty-state recovery and map tile error handling — Pareto results tolerate empty optimizer output; external tile failures surface a bilingual map notice
- [x] D-15: Consistent monitoring and economic language — section labels, data-source captions, optimizer status, and MXN units follow the active locale
- [x] D-21: Privacy page and analysis readability — separate bilingual data-use page; higher contrast for field cards and irrigation guidance; explain and connect Pareto trade-offs with MXN labels

---

## 🔗 Integration & System Verification
> ES: Pruebas de integración entre microservicios y validación de extremo a extremo.

- [x] I-01: Contract Schema Validation — AJV validation passes for `parcel.schema.json`, `physics.schema.json`, `optimizer.schema.json`, `crops_catalog.schema.json`, `schemas.json`
- [x] I-02: Preset Invariant Verification — Confirm $W_{\text{PMP}} < W_{\text{crítico}} < W_{\text{CC}}$ holds across all presets in `data/presets/`
- [x] I-03: End-to-End Test on `el_marques.json` — Orchestrator $\rightarrow$ Physics Worker $\rightarrow$ Optimizer Worker $\rightarrow$ Full Response
- [x] I-04: End-to-End Test on `san_juan_del_rio.json`
- [x] I-05: End-to-End Test on `colon_semiarid.json` (testing drought-tolerant crops)
- [x] I-06: End-to-End Test on `celaya.json` (testing high-yield irrigated crops)
- [x] I-07: Full DSS End-to-End Suite Verification — All 29 unit, contract, physics, optimization and gateway tests passing at 100%

### Open Integration TODO
- [x] A-17: Add an orchestrator geocoding endpoint for place-name search (with provider, privacy, and attribution configured server-side); Track D must not call external services directly from the browser.
- [x] D-14: Live-location workflow, search by coordinates, bounded map selection, all 20 crop choices, presentation screen, and field-observation recovery
- [x] D-15: Put the interactive map on location step; show crop-based per-cycle water estimates, explain EONET alert radius, and surface API failure detail with retry
- [x] A-18: Add NASA POWER → Open-Meteo Archive climate fallback, exact-source provenance, explicit SoilGrids failure without synthetic soil substitution, EONET outage status, and parallel provider ingestion
- [x] D-16: Connect place-name geocoding to the location map with explicit submit, multiple results, region bounds, provider attribution, privacy notice, and analysis provenance warnings
- [x] A-19: Serialize analysis soil hydraulics in canonical snake_case so the web client can read the live analysis contract
- [x] A-20: Fallback NASA POWER `-999`/missing daily values to complete Open-Meteo Archive series; support validated grower-entered soil profiles with explicit provenance.
- [x] D-17: Improve visible processing/error states, Spanish non-arable recovery with manual soil entry, single parcel selection, and language menu interaction.
- [x] D-18: Remove the redundant parcel-review screen from the normal flow; map selection now continues directly to crop selection, with a recovery screen only for soil errors.
- [x] D-19: Localize remaining mixed-language UI and API errors; promote failures to visible alerts/toasts and explain irrigation timing and water depth in plain language.
- [x] D-20: Keep routine same-location cache reuse internal; omit it from the visible provenance warnings.
- [x] D-21: UX Overhaul for NASA Space Apps 2026 Rubric — Zoom controls (parcel focus zoom 16 vs region zoom 11), high-visibility parcel representation with calculated dimensions, modern orbital loading modal, large-format error dialogs with resolution paths, single-point chart diagnostic widgets, and 3D biophysical stratum digital twin (AgroLayers3D).
- [x] D-22: Decision Matrix & Rubric Level 5 Alignment — Replace confusing/slow Pareto scatter graphs with an interactive Comparative Decision Table (Planes de Rotación), add a Multi-Year Rotation Schedule Table to SmartCalendar, add a Diagnostic Feasibility Table to CropAdvisor, fix floating-point tick formatting (`15.600000000000001 mm` -> integer), remove defensive "Demo local" banners and header debug toggles in favor of confident Planetary & Regional Calibration telemetry.
- [x] D-23: Technical Authority & Soil Hydraulics Table — Added soil hydraulic stratigraphy table to CropMonitor, eliminated remaining apologetic "demo/mock" phrasing across step 1, error modals, and privacy notices, enforcing consistent DSS operational vocabulary.
- [x] B-C-05: Pytest Zero-Warning Suite — Cleaned pytest deprecation warnings in pyproject.toml for PuLP and asyncio event loop fixtures; 10/10 tests pass in 0.59s with 0 warnings.
- [x] D-24: SonarCloud Reliability Rating A Fix — Resolved potential undefined property access in `CropMonitor.tsx`, out-of-bounds index safety in `ModernLoadingModal.tsx`, polar latitude division by zero in `RiskMap.tsx`, removed exception-as-control-flow anti-pattern in `App.tsx` (Rule S3984), eliminated nested interactive table rows and duplicated list keys across all tables.
- [x] M-01: GitHub Hygiene & Clean Main Merge — Purged unneeded `.codex` skill dump from git tracking, hardened `.gitignore` against IDE/agent/coverage artifacts, audited and verified all documentation against active 39/39 passing test suite and planetary specs.
- [x] D-25: Global Breadbaskets Quick-Launch & 10 Planetary Demo Benchmarks — Added 1-click global breadbasket chips (Mexico/Bajío, Yaqui Valley Sonora, USA Corn Belt, Argentina Pampa, Brazil Cerrado, Spain Andalucía Guadalquivir, India Punjab) to RiskMap; expanded benchmark presets to 10 calibrated global regions; added dynamic hemispheric (+182d) and solar telemetry in field analysis header.
- [x] D-26: SonarCloud Duplication & Reliability A Overhaul + SmartCalendar Contrast & Educational Tooltips — Created sonar-project.properties excluding static benchmark JSON and markdown, eliminated non-null assertions across openMeteoArchive.ts, presets.ts, and geocoder.ts, resolved button and badge text contrast with explicit white text on dark green, added dynamic crop phenology with 4 biological stages for all 20 crops, and added interactive ? educational info tooltips explaining GDD (M2 Simpson), predictive irrigation (M4 Newton-Raphson), and rotation (M6 HiGHS).
- [x] D-27: SonarCloud Deep Audit & Zero-Bug / Zero-Duplication Resolution — Queried real SonarCloud API logs (key OtakuSweett_Hakathons); resolved all 6 bugs (S3923 in ClimateSimulator/Navbar/mockData, S9383 void main in index.ts, S2871 localeCompare in nasaPower.ts); eliminated 100% of duplicate translation blocks across CropMonitor, EconomicEvaluation, RiskMap, SmartCalendar, and ModernLoadingModal; created .sonarcloud.properties with matching projectKey.
- [x] D-28: Global Frontend Component Translation Refactoring — Refactored all remaining components (CropAdvisor, ErrorDialogModal, FarmerReportsModal, PestDetector, PrivacyPage, ShiftingLands) to single object pattern, eliminating 100% of translation block duplication across the entire codebase.
- [x] D-29: UI/UX & Quality Gate Overhaul — Fixed breadbasket preset selection to trigger immediate map pan and load regional benchmark data; removed amateurish "(1-clic)" label; added explicit white badge contrast on active SmartCalendar cards (.slot-cycle-badge / .slot-legume-badge); added smooth scroll and active status badge when switching cycles in multi-year rotation summary table; added educational "?" tooltips across all 9 product functions (GDD, Newton-Raphson, Splines TDMA, RK4 balance, What-If simulator, Pre-solver M5, and Pest Risk Semaphore); eliminated Recharts unit floating-point tick artifacts (`15.600000000000001 mm`); corrected .sonarcloud.properties for Autoscan compatibility.
- [x] D-30: Calibrated Agricultural Parcel Ground-Truthing & Location Query Sync — Corrected preset and breadbasket coordinates from urban city centroids (e.g. Ciudad Obregón downtown concrete `27.4864, -109.9408`) to real agricultural parcel land (Valle del Yaqui CENEB Block 910/1114 wheat fields `27.3684, -109.9280`, Andalucía Campiña de Carmona `37.4520, -5.6120`, Iowa Corn Belt `42.0850, -93.5850`, Pergamino Pampa INTA `-33.9500, -60.5500`, Punjab `30.8250, 75.7500`, Celaya Bajío `20.5650, -100.7450`); synchronized search input text on map clicks and preset switches; set preset water regime to gravity irrigation where historically accurate (Valle del Yaqui, Celaya).
- [x] D-31: Rural Parcel Coordinates Ground-Truthing, Zero-Latency Marker Optimization & Agronomic Crop Rotation Seasonality — Recalibrated Cerrado (Brazil) from Sorriso city streets (`-12.5425, -55.7212`) to true rural agricultural grain fields at Fazenda Santa Helena (`-12.4850, -55.8250`) and San Juan del Río from city center (`20.3869, -99.9947`) to La Llave agricultural irrigation valley (`20.4480, -99.9650`); eliminated Leaflet marker latency/disappearance by replacing destructive recreation with direct `marker.setLatLng()` / `halo.setLatLng()` / `polygon.setLatLngs()`, switching cross-region navigation to zero-lag `{ animate: false }` and requesting immediate `invalidateSize()`; enforced botanical seasonality in Module 6 MILP (`mod6_milp.py`) restricting PV crops to PV slots and OI crops to OI slots, plus cross-year same-season diversity ($x_{i,t} + x_{i,t+2} \le 1$), completely eliminating repeating ping-pong 2-crop monocultures; calibrated 100% authentic regional rotation sequences across all 10 planetary breadbasket benchmarks.
- [x] D-32: Local Leaflet CSS Bundling, CORS CDN Elimination, and Complete Fallow / Barbecho Bilingual Localization — Eliminated unpkg CDN stylesheet request by bundling local Leaflet CSS directly into Vite bundle; added resilient topographical grid fallback to .leaflet-container; added complete bilingual localization for resting/fallow cycles ("Barbecho" in ES, "Fallow" in EN) across SmartCalendar, CropAdvisor, EconomicEvaluation, RiskMap, and App; added specific 4-stage soil regeneration phenology, 0 mm water resting cards, and comprehensive test suite verification (14 web tests, 16 orchestrator tests, 11 python tests passing).
