# WORKLIST — NASA Agro-DSS
> ES: Lista de tareas por track. Marcar [x] al completar cada ítem.

**Instructions:** Tick your own items only. Append new items; never delete. See AGENTS.md §6 for end-of-task protocol.

---

## 🏗 Bootstrap (Coordinator)
- [x] V1–V8 API verifications run + docs/API_REFERENCE.md written
- [x] Directory scaffold created
- [x] Root manifests written (package.json, pnpm-workspace.yaml, pyproject.toml)
- [x] Root AGENTS.md (SSOT) written
- [x] WORKLIST.md, GIT_WORKFLOW.md, README.md written
- [x] docs/ARCHITECTURE.md written
- [x] packages/contracts/ schemas written (parcel, physics, optimizer)
- [x] packages/contracts/crops_catalog.json written (≥10 Bajío crops)
- [x] data/presets/ (4 preset JSON bundles) written
- [x] All child AGENTS.md files written
- [x] .github/pull_request_template.md written
- [ ] git commit: chore: bootstrap scaffold

---

## 🅰 Track A — Orchestrator (apps/orchestrator/, :3000)
> ES: Ingestión de datos, caché, cálculo ET0, gateway hacia workers.

- [ ] A-01: Data ingestion — NASA POWER fetch + -999→null conversion
- [ ] A-02: SoilGrids fetch + d_factor conversions (phh2o/10, soc/10, nitrogen/100, clay/10, sand/10)
- [ ] A-03: Cache read/write (soil_*, climate_*) with source/fetched_at envelope
- [ ] A-04: Preset fallback loader (nearest preset by distance)
- [ ] A-05: FAO-56 Penman-Monteith ET0 calculation (sub-eqs: es, ea, Δ, Rn, Ra)
- [ ] A-06: Golden ET0 test vector — Brussels example ±0.05 mm/day
- [ ] A-07: EONET v3 fetch + bbox filter around parcel
- [ ] A-08: Gateway route: POST /analyze → physics_worker + optimizer_worker
- [ ] A-09: Error format { "error": { "code", "message", "details" } } enforced
- [ ] A-10: AGENT_LOG row appended, WORKLIST ticked

---

## 🅱 Track B — Physics Worker (services/py-workers/physics_worker/, :8001)
> ES: Módulos numéricos 1–4: splines, GDD, balance hídrico, Newton-Raphson.

- [ ] B-01: M1 mod1_splines.py — natural cubic spline + explicit TDMA helper
  - Done: TDMA == SciPy CubicSpline to 1e-9; passes through knots; NaN/null gaps filled; no extrapolation
- [ ] B-02: M2 mod2_simpson.py — GDD composite Simpson 1/3
  - Done: constant-T analytic exact; GDD≥0; even/odd sample counts; vs trapezoid within 1%
- [ ] B-03: M3 mod3_rk4.py — soil water balance explicit RK4 (h=1 day)
  - Done: order-4 convergence (halve h → error/16); W≥0; mass-balance residual <1e-6 mm
- [ ] B-04: M4 mod4_newton.py — Newton-Raphson irrigation trigger
  - Done: returns t* or null+reason (never silent); |W(t*)−Wcrit|<tol; derivative via RK4 slope
- [ ] B-05: Tests for M1–M4 in physics_worker/tests/
- [ ] B-06: AGENT_LOG row appended, WORKLIST ticked

---

## 🅲 Track C — Optimizer Worker (services/py-workers/optimizer_worker/, :8002)
> ES: Módulos 5–7: pre-solver, MILP rotación, frente de Pareto.

- [ ] C-01: M5 mod5_presolver.py — prune by GDD and pH feasibility
  - Done: returns discarded[{crop_id, reason_code, reason_text_es, reason_text_en}]; deterministic order
- [ ] C-02: M6 mod6_milp.py — MILP with PuLP+HiGHS (time limit 30s, deterministic)
  - Constraints: 1 crop/slot, water deficit slack s+, anti-monoculture, legume N per year, x∈{0,1}
  - Done: feasible on all 4 presets; status Optimal; constraints verified post-solve
  - Fallback: if legume constraint makes preset infeasible → report infeasible_reason (no silent relax)
- [ ] C-03: M7 mod7_pareto.py — λ ∈ {0.0,0.1,...,1.0}, 11 points
  - Done: f1 non-increasing as λ↓; dominated points filtered; shadow prices for water & N reported
- [ ] C-04: Tests for M5–M7 in optimizer_worker/tests/
- [ ] C-05: AGENT_LOG row appended, WORKLIST ticked

---

## 🅳 Track D — Web App (apps/web/, :5173)
> ES: Interfaz React 19 + Tailwind v4 + Leaflet + charts.

- [ ] D-01: Map component — Leaflet + GIBS WMTS overlay (visual only, never feed math)
- [ ] D-02: GIBS NDVI layer tile integration
- [ ] D-03: EONET alert banner (filter by bbox, non-critical)
- [ ] D-04: Charts — Recharts: soil moisture W(t), GDD accumulation, NDVI series
- [ ] D-05: λ slider for Pareto front (Module 7 output)
- [ ] D-06: EN/ES i18n toggle (all labels bilingual)
- [ ] D-07: Tailwind v4 CSS (@import "tailwindcss"; + @theme {} — no tailwind.config.js)
- [ ] D-08: Offline demo mode (Wi-Fi off → preset data)
- [ ] D-09: AGENT_LOG row appended, WORKLIST ticked

---

## 🔗 Integration
> ES: Pruebas de integración entre tracks.

- [ ] I-01: Contract tests — ajv validate all 4 presets against parcel.schema.json
- [ ] I-02: Contract tests — ajv validate physics + optimizer schemas
- [ ] I-03: End-to-end on el_marques.json preset (offline)
- [ ] I-04: End-to-end on san_juan_del_rio.json preset (offline)
- [ ] I-05: End-to-end on colon_semiarid.json preset (offline)
- [ ] I-06: End-to-end on celaya.json preset (offline)
- [ ] I-07: Offline demo — Wi-Fi off — all 4 presets load correctly
- [ ] I-08: No application code in scaffold (find *.py|*.ts|*.tsx|*.js check clean)
