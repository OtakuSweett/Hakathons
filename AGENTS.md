# AGENTS.md — Root SSOT
> ES: Archivo raíz de agentes. Fuente única de verdad para unidades, reglas JSON, ecuaciones y protocolo de agentes.

**Project:** NASA Space Apps 2026 — Crop Rotation & Water Resilience DSS (El Bajío / Querétaro, MX)
**Rule:** If anything here conflicts with a child AGENTS.md, THIS FILE WINS.

---

## §1 Scope & Architecture
> ES: Alcance y arquitectura del sistema.

### Request Flow
web(:5173) → orchestrator(:3000) → physics_worker(:8001) + optimizer_worker(:8002)

### Directory Ownership
| Track | Owner Directory | Port |
|-------|----------------|------|
| A | apps/orchestrator/ | :3000 |
| B | services/py-workers/physics_worker/ | :8001 |
| C | services/py-workers/optimizer_worker/ | :8002 |
| D | apps/web/ | :5173 |
| Contracts | packages/contracts/ | — |

**Rule:** Each agent edits ONLY its own track directory. Never edit another track's folder.

### Canonical Error Format
All HTTP error responses MUST use:
```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message", "details": {} } }
```

### Unknown? Ask First
If you are unsure about any behavior, data format, or business logic: write a TODO in WORKLIST.md and ask. Never guess and silently implement.

---

## §2 Git Rules (SSOT)
> ES: Reglas de Git. Los hijos enlazan aquí; no duplicar.

See GIT_WORKFLOW.md for full branch and commit rules. Summary:
- Branches: feat/contracts-<desc> (merge FIRST), feat/track-a-<task>, feat/track-b-<task>, feat/track-c-<task>, feat/track-d-<task>
- Conventional Commits: `feat(track-b): mod2 simpson`
- Before every PR: `git fetch origin && git rebase origin/main`
- Squash-merge only; no force-push to main
- Shared files (WORKLIST.md, docs/AGENT_LOG.md): append/tick only — never rewrite

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
- Events: `YYYY-MM-DDTHH:mm:ssZ`  (ISO-8601 UTC)

### JSON Key Naming
snake_case with unit suffix: `_pct` (percent), `_mm` (millimeters), `_vol` (m³/m³), `_g_kg` (g/kg), `_kpa`, `_m_s`, `_mj_m2_day`, `_c` (Celsius), `_kg_ha`.

### Missing Value Protocol
- Raw API fill value: `-999` / `-999.0`
- Orchestrator ingestion: `-999` → `null`
- Gap-fill: Module 1 (splines) fills `null` before Modules 2–4
- Workers MUST reject payloads containing `NaN` or `-999` (not `null`)

### Canonical Unit Table
| Field | Range | Unit |
|-------|-------|------|
| clay_pct, sand_pct, silt_pct, rh2m_pct, om_pct | 0–100 | % |
| soil_moisture_vol | 0–1 | m³/m³ |
| field_capacity_mm, wilting_point_mm, critical_water_mm, w_mm, precip_mm, et0_mm | ≥0 | mm |
| soil_ph | 0–14 | pH |
| soc_g_kg, nitrogen_g_kg | ≥0 | g/kg |
| rs_mj_m2_day | ≥0 | MJ/m²/day |
| ps_kpa | ≥0 | kPa |
| u2_m_s | ≥0 | m/s |

**NEVER mix % and fractions.** `soil_moisture_vol` is m³/m³ (0–1), NOT percent.

### Water Balance Invariant
```
wilting_point_mm < critical_water_mm < field_capacity_mm
```
This invariant MUST be encoded in `parcel.schema.json` descriptions and enforced by every worker.

### critical_water_mm Definition
```
critical_water_mm = wilting_point_mm + p × (field_capacity_mm − wilting_point_mm)
```
where `p = depletion_p` from `crops_catalog.json` (crop-specific depletion fraction, 0–1).

### Cache Response Envelope
Every cached/live/preset response MUST include:
```json
{ "source": "live" | "cache" | "preset", "fetched_at": "YYYY-MM-DDTHH:mm:ssZ" }
```

### Cache Paths
- Soil: `data/cache/soil_{lat.toFixed(3)}_{lon.toFixed(3)}.json`  (permanent per parcel)
- Climate: `data/cache/climate_{lat.toFixed(3)}_{lon.toFixed(3)}_{start}_{end}.json`
- Lookup order: cache → live API (timeout 10s, 2 retries, exponential backoff) → nearest preset
- SoilGrids rate limit: serialize calls with ≥12 s spacing

---

## §4 Math Pipeline (SSOT — children inline their own equations + cite here)
> ES: Pipeline matemático. Los módulos B y C citan esta sección para contexto.

### Bridge: Orchestrator Preprocessing (Track A)
Wind height correction (use only if WS2M unavailable):
```
u2 = u10 × 4.87 / ln(67.8 × 10 − 5.42) ≈ 0.748 × u10
```
Prefer WS2M directly from NASA POWER when available.

### FAO-56 Penman-Monteith ET0 (Track A preprocessing)
```
ET0 = [0.408 × Δ × (Rn − G) + γ × (900/(T+273)) × u2 × (es − ea)] / [Δ + γ × (1 + 0.34 × u2)]
```

Sub-equations (cite FAO-56 equation numbers in code comments):
- `es = (e°(Tmax) + e°(Tmin)) / 2`  — FAO-56 Eq.12
- `e°(T) = 0.6108 × exp(17.27×T / (T+237.3))`  — FAO-56 Eq.11
- `ea = es × RH/100`  — FAO-56 Eq.17 (use mean RH)
- `Δ = 4098 × e°(Tmean) / (Tmean + 237.3)²`  — FAO-56 Eq.13
- `γ = 0.000665 × Ps_kpa`  — FAO-56 Eq.8
- `Rn = Rns − Rnl`  (net radiation; `Rns = (1−α)×Rs`, α=0.23; Rnl from FAO-56 Eq.39)
- `Ra` = extraterrestrial radiation — FAO-56 Eq.21 (use for Rnl)
- `G = 0` (daily, soil heat flux negligible)
- Rs input: `rs_mj_m2_day` (already in MJ/m²/day — if from POWER AG in kWh/m²/day, multiply by 3.6)

**Golden test vector:** FAO-56 Example (Brussels) → ET0 ≈ 3.75 mm/day. Tolerance: ±0.05 mm/day.

### Module Math (inline in physics_worker/AGENTS.md; listed here for reference)
- M1: Natural cubic spline (TDMA) — see `services/py-workers/physics_worker/AGENTS.md`
- M2: GDD via composite Simpson 1/3 — see `services/py-workers/physics_worker/AGENTS.md`
- M3: Soil water balance RK4 — see `services/py-workers/physics_worker/AGENTS.md`
- M4: Newton-Raphson irrigation trigger — see `services/py-workers/physics_worker/AGENTS.md`
- M5: Pre-solver pruning — see `services/py-workers/optimizer_worker/AGENTS.md`
- M6: MILP crop rotation — see `services/py-workers/optimizer_worker/AGENTS.md`
- M7: Pareto front λ-sweep — see `services/py-workers/optimizer_worker/AGENTS.md`

---

## §5 Data Sources Summary (SSOT)
> ES: Fuentes de datos. Ver docs/API_REFERENCE.md para detalles completos.

| Source | Endpoint | Auth | Modules | Fallback |
|--------|----------|------|---------|---------|
| A. NASA POWER | power.larc.nasa.gov/api/temporal/daily/point | None | 1–4 | presets/ |
| B. SoilGrids v2.0 | rest.isric.org/soilgrids/v2.0 | None | 3,5,6 | presets/ |
| C. EONET v3 | eonet.gsfc.nasa.gov/api/v3 | None | UI only | [] |
| D. Open-Meteo | api.open-meteo.com/v1/forecast | None | 3,4 | presets/ |
| E. AppEEARS | appeears.earthdatacloud.nasa.gov | EARTHDATA_TOKEN | 1 | presets/ |
| F. GIBS WMTS | gibs.earthdata.nasa.gov | None | UI overlay | no overlay |
| G. POWER GWETROOT | (same as A) | None | 3,4 | presets/ |
| H. POWER MCP | get_daily_data tool | None | inspection | — |

Full details (endpoints, params, units, limits, real response snippets): see `docs/API_REFERENCE.md`.

### SoilGrids d_factor Conversions
| Property | d_factor | Formula | Output field |
|----------|----------|---------|-------------|
| phh2o | 10 | value/10 | soil_ph |
| soc | 10 | value/10 → g/kg; `om_pct = (soc_g_kg/10)×1.724` | soc_g_kg, om_pct |
| nitrogen | 100 | value/100 | nitrogen_g_kg |
| clay | 10 | value/10 | clay_pct |
| sand | 10 | value/10 | sand_pct |

`silt_pct = max(0, 100 − clay_pct − sand_pct)`  (clamp ≥0)

Depth aggregation: thickness-weighted mean: 0–5cm (weight 5/30), 5–15cm (10/30), 15–30cm (15/30).

Saxton–Rawls pedotransfer → `field_capacity_mm`, `wilting_point_mm` over Z_r = 600 mm.

### Open-Meteo Calibration
```
W(0) = θ_vol × Z_r  where θ_vol = soil_moisture_0_to_1cm (m³/m³), Z_r = 600 mm
```

---

## §6 Agent Protocol
> ES: Protocolo de agentes para fin de tarea.

### End-of-Task Protocol (every agent, every task)
1. Tick `[x]` in `WORKLIST.md` for completed item
2. Append row to `docs/AGENT_LOG.md`: `Timestamp (UTC) | Track/Agent | Module | Files Changed | Tests Passed`
3. Complete all checkboxes in `.github/pull_request_template.md` before opening PR

### Forbidden Actions (all agents)
- Editing `packages/contracts/` outside a `feat/contracts-*` branch
- Adding dependencies without logging in `AGENT_LOG.md`
- Duplicating unit tables from §3 (link instead)
- Silently fixing discrepancies — use `⚠ DISCREPANCY` in `API_REFERENCE.md`
- Committing `.env` (real tokens) or `node_modules` or `.venv`
- Generating application code (handlers, components, test bodies) in scaffold branches
- Guessing unknown behavior — write TODO in `WORKLIST.md` instead

### Schema Validation Command (run from project root)
```bash
npx ajv validate -s packages/contracts/parcel.schema.json -d data/presets/el_marques.json
```
(See `packages/contracts/AGENTS.md` for full ajv commands)
