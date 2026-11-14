# Architecture — NASA Agro-DSS
> ES: Arquitectura del sistema. Contratos de API y flujo de datos.

## System Overview
> ES: Vista general del sistema.

```
User Browser
    │  HTTP
    ▼
apps/web (:5173)  — React 19 + Tailwind v4 + Leaflet
    │  REST
    ▼
apps/orchestrator (:3000)  — Node.js/TS gateway
    ├──► services/py-workers/physics_worker (:8001)   — Modules 1–4
    └──► services/py-workers/optimizer_worker (:8002) — Modules 5–7
```

## Data Flow
> ES: Flujo de datos desde las APIs hasta la UI.

1. Orchestrator fetches data from external sources: NASA POWER, SoilGrids, Open-Meteo, EONET (see [docs/API_REFERENCE.md](file:///home/Sweett/hakathon/docs/API_REFERENCE.md)).
2. Orchestrator preprocesses raw data:
   - `-999` / `-999.0` fill values converted to `null`.
   - SoilGrids d-factor scalings applied (`phh2o/10`, `soc/10`, `nitrogen/100`, `clay/10`, `sand/10`).
   - Silt clamped: `silt_pct = max(0, 100 - clay_pct - sand_pct)`.
   - FAO-56 Penman-Monteith reference evapotranspiration `ET0` computed.
3. Orchestrator validates and packages the bundle as `ClimateSoilBundle` conforming to [packages/contracts/parcel.schema.json](file:///home/Sweett/hakathon/packages/contracts/parcel.schema.json).
4. Orchestrator POSTs payload to `physics_worker (:8001)/physics`.
5. Physics worker executes Modules 1–4:
   - M1: Natural cubic splines (TDMA) to fill NDVI gaps.
   - M2: GDD accumulation via composite Simpson 1/3 rule.
   - M3: Soil moisture balance $W(t)$ using explicit 4th-order Runge-Kutta (RK4).
   - M4: Newton-Raphson solver to determine optimal irrigation trigger timing $t^*$ and depth $\Delta I$.
   - Output conforms to [packages/contracts/physics.schema.json](file:///home/Sweett/hakathon/packages/contracts/physics.schema.json).
6. Orchestrator packages input conforming to [packages/contracts/optimizer.schema.json](file:///home/Sweett/hakathon/packages/contracts/optimizer.schema.json) and POSTs to `optimizer_worker (:8002)/optimize`.
7. Optimizer worker executes Modules 5–7:
   - M5: Pre-solver agronomic pruning (GDD requirement and pH tolerance).
   - M6: Mixed-Integer Linear Programming (MILP) crop rotation solver via PuLP + HiGHS.
   - M7: Pareto frontier generation over $\lambda \in [0.0, 1.0]$ with dual shadow prices.
8. Orchestrator consolidates responses and delivers unified JSON to `apps/web`.
9. `apps/web` renders the interactive dashboard: Leaflet map with GIBS visual layers, Recharts time-series, Pareto $\lambda$ slider, and EONET alert banners.

## API Endpoints (Contract-First)
> ES: Endpoints definidos por contrato. Sin lógica de aplicación en scaffold.

| Method | Path | Service | Schema in | Schema out | Purpose |
|--------|------|---------|-----------|------------|---------|
| POST | `/analyze` | orchestrator (:3000) | `parcel.schema.json` | Consolidated DSS response | Complete parcel evaluation |
| POST | `/physics` | physics_worker (:8001) | `parcel.schema.json` | `physics.schema.json` | M1–M4 physics simulation |
| POST | `/optimize` | optimizer_worker (:8002) | `optimizer.schema.json` | `optimizer.schema.json` | M5–M7 rotation optimization |
| GET | `/health` | all services | none | `{"status": "ok"}` | Service health probe |
| GET | `/events` | orchestrator (:3000) | none | EONET GeoJSON | Bounded hazard alerts |

## Module Pipeline
> ES: Pipeline de módulos numéricos.

| Module | Service | Method | Input | Output |
|--------|---------|--------|-------|--------|
| M1 | physics_worker | Natural cubic spline (TDMA) | Cloud-gapped NDVI series | Continuous NDVI trajectory |
| M2 | physics_worker | Composite Simpson 1/3 | Daily $T_{\max}, T_{\min}$ series | Cumulative Growing Degree Days (GDD) |
| M3 | physics_worker | Explicit RK4 ($h=1\text{ day}$) | Initial water $W(0)$, $P$, $ET_0$, $K_c$ | Daily soil moisture $W(t)$ |
| M4 | physics_worker | Newton-Raphson ($W(t) - W_{\text{crit}} = 0$) | RK4 derivative slope | Irrigation date $t^*$, depth $\Delta I$ |
| M5 | optimizer_worker | Feasibility pruning | Crop catalog, GDD, pH | Feasible crop candidate set |
| M6 | optimizer_worker | MILP (PuLP + HiGHS) | Feasible crops, water, profit | Optimal crop rotation sequence |
| M7 | optimizer_worker | Multi-objective $\lambda$-sweep | Objectives $f_1, f_2$ | 11-point Pareto front + shadow prices |

## Schema Locations
> ES: Ubicación de los esquemas y catálogos.

- Parcel schema: [packages/contracts/parcel.schema.json](file:///home/Sweett/hakathon/packages/contracts/parcel.schema.json)
- Physics schema: [packages/contracts/physics.schema.json](file:///home/Sweett/hakathon/packages/contracts/physics.schema.json)
- Optimizer schema: [packages/contracts/optimizer.schema.json](file:///home/Sweett/hakathon/packages/contracts/optimizer.schema.json)
- Crop catalog: [packages/contracts/crops_catalog.json](file:///home/Sweett/hakathon/packages/contracts/crops_catalog.json)
- Presets: [data/presets/](file:///home/Sweett/hakathon/data/presets/)

All JSON Schemas comply with draft 2020-12 and enforce `additionalProperties: false`.

## Service Port Allocation
> ES: Asignación de puertos para desarrollo local.

| Service | Port | Dev Command |
|---------|------|-------------|
| web | 5173 | `pnpm --filter web dev` |
| orchestrator | 3000 | `pnpm --filter orchestrator dev` |
| physics_worker | 8001 | `uv run --project services/py-workers uvicorn physics_worker.main:app --port 8001` |
| optimizer_worker | 8002 | `uv run --project services/py-workers uvicorn optimizer_worker.main:app --port 8002` |
