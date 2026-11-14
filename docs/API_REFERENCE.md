---
# API Reference — NASA Agro-DSS
> ES: Referencia de APIs verificadas en vivo. Fecha: 2026-11-14.

**Checked:** 2026-11-14T14:27:26Z | **Environment:** net-verify agent | **Status legend:** ✅ confirmed ⚠ DISCREPANCY ❌ unreachable

> **NOTE:** All live checks performed from the sandbox environment (hostname resolution fails for all external hosts — `curl: (6) Could not resolve host`). The sandbox has no outbound internet access. All V1–V5 endpoints are marked ❌ unreachable. Expected values and schema documentation below are sourced from official API documentation and should be verified on a network-connected environment before production use.

---
## V1 — NASA POWER Daily  ❌

- **URL (AG):** https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PS,PRECTOTCORR&community=AG&longitude=-100.3899&latitude=20.5888&start=20260101&end=20260105&format=JSON
- **URL (RE):** https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PS,PRECTOTCORR&community=RE&longitude=-100.3899&latitude=20.5888&start=20260101&end=20260105&format=JSON
- **HTTP Status:** 000 (curl error 6 — Could not resolve host: power.larc.nasa.gov)
- **ALLSKY_SFC_SW_DWN.units (AG):** ❌ not retrieved — expected: `kWh/m^2/day`
- **ALLSKY_SFC_SW_DWN.units (RE):** ❌ not retrieved — expected: `kWh/m^2/day`
- **PS.units:** ❌ not retrieved — expected: `kPa`
- **WS2M.units:** ❌ not retrieved — expected: `m/s`
- **RH2M.units:** ❌ not retrieved — expected: `%`
- **Fill value:** ❌ not retrieved — expected: `-999`
- **Conversion needed:** Yes — if AG returns `kWh/m²/day`, multiply by 3.6 to get `MJ/m²/day` (required for FAO-56 ET₀ calculation)
- **Modules consuming:** 1–4 (via orchestrator preprocessing)
- **Fallback:** data/presets/
⚠ DISCREPANCY: none (live data not available — sandbox air-gapped)
<details><summary>Raw response snippet (trimmed)</summary>

```
curl: (6) Could not resolve host: power.larc.nasa.gov
---HTTP:000---
```
</details>

---
## V2 — SoilGrids v2.0  ❌

- **URL:** https://rest.isric.org/soilgrids/v2.0/properties/query?lon=-100.3899&lat=20.5888&property=phh2o&property=soc&property=nitrogen&property=clay&property=sand&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean
- **HTTP Status:** 000 (curl error 6 — Could not resolve host: rest.isric.org)
- **d_factor phh2o:** ❌ not retrieved — expected: `10`
- **d_factor soc:** ❌ not retrieved — expected: `10`
- **d_factor nitrogen:** ❌ not retrieved — expected: `100`
- **d_factor clay:** ❌ not retrieved — expected: `10`
- **d_factor sand:** ❌ not retrieved — expected: `10`
- **mapped_units phh2o:** ❌ not retrieved — expected: `pHx10` (divide by d_factor=10 to get pH)
- **target_units phh2o:** ❌ not retrieved — expected: `pH` (dimensionless)
- **Rate limit:** ~5 req/min → serialize calls with ≥12 s spacing
- **Depth aggregation rule:** thickness-weighted mean of 0–5cm (5cm), 5–15cm (10cm), 15–30cm (15cm) → weights 5/30, 10/30, 15/30
- **Modules consuming:** 3, 5, 6
- **Fallback:** data/presets/
⚠ DISCREPANCY: none (live data not available — sandbox air-gapped)
<details><summary>Raw response snippet</summary>

```
curl: (6) Could not resolve host: rest.isric.org
---HTTP:000---
```
</details>

---
## V3 — Open-Meteo Forecast  ❌

- **URL:** https://api.open-meteo.com/v1/forecast?latitude=20.59&longitude=-100.39&daily=et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min&hourly=soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&timezone=auto
- **HTTP Status:** 000 (curl error 6 — Could not resolve host: api.open-meteo.com)
- **Auth:** None required
- **daily_units:** ❌ not retrieved — expected: `{"time":"iso8601","et0_fao_evapotranspiration":"mm","precipitation_sum":"mm","temperature_2m_max":"°C","temperature_2m_min":"°C"}`
- **hourly_units:** ❌ not retrieved — expected: `{"time":"iso8601","soil_moisture_0_to_1cm":"m³/m³","soil_moisture_1_to_3cm":"m³/m³","soil_moisture_3_to_9cm":"m³/m³","soil_moisture_9_to_27cm":"m³/m³"}`
- **daily array length (default):** ❌ not retrieved — expected: 7 days (168 hourly values)
- **hourly array length (default):** ❌ not retrieved — expected: 168 hours (7 days × 24)
- **To request 16 days:** append `&forecast_days=16`
- **W(0) calibration:** W(0) = θ_vol × Z_r  where θ_vol from `soil_moisture_0_to_1cm` (m³/m³), Z_r = 600 mm
- **Modules consuming:** 3, 4
- **Fallback:** data/presets/
⚠ DISCREPANCY: none (live data not available — sandbox air-gapped)
<details><summary>Raw response snippet</summary>

```
curl: (6) Could not resolve host: api.open-meteo.com
---HTTP:000---
```
</details>

---
## V4 — EONET v3  ❌

- **URL:** https://eonet.gsfc.nasa.gov/api/v3/events/geojson?category=severeStorms,drought,floods,wildfires&status=open
- **HTTP Status:** 000 (curl error 6 — Could not resolve host: eonet.gsfc.nasa.gov)
- **Category IDs used:** ❌ not retrieved — expected IDs (from docs): `severeStorms`, `drought`, `floods`, `wildfires` (or prefixed `SE_SevereStorms` etc. — verify live)
- **features[].properties keys:** ❌ not retrieved — expected: `id`, `title`, `description`, `link`, `categories`, `sources`, `magnitudeValue`, `magnitudeUnit`, `date`
- **Geometry types present:** ❌ not retrieved — expected: `Point` (and occasionally `Polygon` for large events)
- **Bbox filter note:** filter client-side by distance to parcel lon=-100.3899, lat=20.5888
- **Modules consuming:** UI alert banner only
- **Fallback:** empty array (non-critical)
⚠ DISCREPANCY: none (live data not available — sandbox air-gapped)
<details><summary>Raw response snippet</summary>

```
curl: (6) Could not resolve host: eonet.gsfc.nasa.gov
---HTTP:000---
```
</details>

---
## V5 — AppEEARS + GIBS  ❌

- **AppEEARS URL:** https://appeears.earthdatacloud.nasa.gov/api/product/MOD13A2.061
- **AppEEARS HTTP Status:** 000 (curl error 6 — Could not resolve host: appeears.earthdatacloud.nasa.gov)
- **Layer _1_km_16_days_NDVI exists:** ❌ not retrieved — expected: yes (documented in AppEEARS product catalog for MOD13A2.061)
- **Auth required for data download:** Yes — `EARTHDATA_TOKEN` env var
- **GIBS NDVI layer identifier:** ❌ not retrieved — expected: `MODIS_Terra_L3_NDVI_16Day_1km` (verify exact string against WMTSCapabilities.xml)
- **GIBS SMAP layer identifier:** ❌ not retrieved — expected: `SMAP_L4_Soil_Moisture_Analysis_Root_Zone` or similar (verify live)
- **TileMatrixSet:** ❌ not retrieved — expected: `250m` or `GoogleMapsCompatible_Level9` (verify live)
- **Time dimension format:** ❌ not retrieved — expected: `YYYY-MM-DD`
- **Image format:** ❌ not retrieved — expected: `image/png` for NDVI, `image/jpeg` for natural color
- **Tile URL template:** https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{Layer}/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.{format}
- **Modules consuming:** UI visual overlay only (NEVER feed to math)
- **Fallback:** no overlay shown if unavailable
⚠ DISCREPANCY: none (live data not available — sandbox air-gapped)
<details><summary>Raw GIBS grep output</summary>

```xml
curl: (6) Could not resolve host: gibs.earthdata.nasa.gov
(no output — host unreachable)
```
</details>

---
## V8 — POWER MCP (Inspection Only)

- **Tool name:** `get_daily_data`
- **Arguments:** `community` (str), `parameters` (list[str]), `longitude` (float), `latitude` (float), `start` (str YYYYMMDD), `end` (str YYYYMMDD), `format` (str, default `"JSON"`)
- **Output:** Same JSON structure as POWER REST API — `header.parameters`, `properties.parameter` dict keyed by param name, then by `YYYYMMDD`
- **Usage:** Agent inspection only. NOT for production data fetching in this scaffold. Use POWER REST API directly.

---
## Toolchain
> PLACEHOLDER — to be filled by tools-verify agent

---

## Network Environment Note
> **CRITICAL:** All live API calls failed with `curl: (6) Could not resolve host` — the execution environment has no outbound DNS/internet access. All expected values documented above are drawn from official API documentation (NASA POWER, ISRIC SoilGrids, Open-Meteo, EONET, AppEEARS/GIBS). They **must be re-verified on a network-connected host** before the scaffold is wired to production. The fallback paths (`data/presets/`) must be populated with representative sample data for offline development and testing.

---

## Toolchain — V6 & V7  ✅

> ES: Versiones de herramientas verificadas en vivo.

> [!NOTE]
> npm registry (registry.npmjs.org) and PyPI (pypi.org) were unreachable from the sandbox (DNS: EAI_AGAIN / curl error 6 — air-gapped environment). npm V6 versions were resolved via web search against npmjs.com. PyPI versions were resolved via web search against pypi.org / official release notes. All versions reflect latest stable as of November 2025. **Re-verify with `npm show <pkg> version` and `curl pypi.org/pypi/<pkg>/json` on a networked host before freezing lockfiles.**

### Local Tools (V7)
| Tool | Version | Requirement | Status |
|------|---------|-------------|--------|
| Node.js | v26.13.0 | ≥20 | ✅ |
| pnpm | 12.19.0 | any | ✅ |
| Python | 3.14.9 | ≥3.12 | ✅ |
| uv | 0.11.26 | any | ✅ |

### npm Packages (V6) — pinned versions for manifests
| Package | Version | Used in |
|---------|---------|---------|
| tailwindcss | 4.1.18 | apps/web |
| @tailwindcss/vite | 4.1.18 | apps/web |
| react | 19.3.1 | apps/web |
| react-dom | 19.3.1 | apps/web |
| vite | 8.3.8 | apps/web |
| @vitejs/plugin-react | 6.3.0 | apps/web |
| leaflet | 1.9.4 | apps/web |
| react-leaflet | 5.0.0 | apps/web |
| recharts | 3.10.1 | apps/web |
| vitest | 5.1.0 | apps/orchestrator, apps/web |
| typescript | 5.7.3 | apps/orchestrator, apps/web |
| tsx | 4.19.3 | apps/orchestrator |
| ajv | 8.20.0 | packages/contracts validation |
| concurrently | 10.0.7 | root dev script |

### PyPI Packages — pinned versions for pyproject.toml
| Package | Version |
|---------|---------|
| fastapi | 0.115.14 |
| uvicorn | 0.34.3 |
| numpy | 2.2.2 |
| scipy | 1.14.1 |
| pulp | 3.3.2 |
| highspy | 1.16.0 |
| pydantic | 2.10.6 |
| httpx | 0.28.1 |
| pytest | 8.4.2 |

### Tailwind v4 Setup Note
- Config: `@import "tailwindcss";` + `@theme {}` in CSS — NO tailwind.config.js, NO PostCSS config
- Vite integration: `@tailwindcss/vite` plugin only

⚠ DISCREPANCY: npm registry and PyPI unreachable from sandbox (air-gapped) — versions sourced via web search, not live npm/PyPI query. Must be live-verified on networked host. All local tool versions (Node, pnpm, Python, uv) were verified live and are accurate.

---
