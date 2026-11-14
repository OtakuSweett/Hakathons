# AGENTS.md — apps/web/ (Track D)
> ES: Reglas del Track D: interfaz web React 19, Tailwind v4, Leaflet y gráficos.

See root [AGENTS.md](file:///home/Sweett/hakathon/AGENTS.md) §1–§6 for all shared rules (canonical units, JSON rules, git workflow, and end-of-task protocol).
See [docs/API_REFERENCE.md](file:///home/Sweett/hakathon/docs/API_REFERENCE.md) for GIBS WMTS tile templates and EONET GeoJSON schemas.

---

## §1 Scope
> ES: Alcance de edición para el Track D.

- **Files you MAY edit:** `apps/web/src/**`, `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/index.html`
- **Files you MUST NOT edit:** `apps/orchestrator/`, `services/py-workers/`, `packages/contracts/` (must use `feat/contracts-*`).

---

## §2 Branch & Port
> ES: Rama y puerto asignados.

- **Branch:** `feat/track-d-<task>`
- **Port:** `:5173` (`pnpm --filter web dev`)

---

## §3 Architecture & Rules
> ES: Reglas de arquitectura y presentación para el Track D.

- **Direct API Prohibition:** Never make direct requests from the browser to NASA POWER or SoilGrids. All external data flows strictly through the orchestrator at `:3000`.
- **GIBS Layer Role:** NASA GIBS tiles (MODIS NDVI, SMAP soil moisture) are strictly visual overlays in Leaflet. They MUST NEVER be sampled or used as numerical inputs for DSS mathematical models.
- **Tailwind v4 Styling:** Configured exclusively using CSS `@import "tailwindcss";` and `@theme {}`. No `tailwind.config.js` and no PostCSS configuration files are allowed.
- **Bilingual Interface:** All UI components must support English and Spanish via an explicit language toggle.
- **Offline / Standalone Fallback:** The web client must detect when the orchestrator is offline and offer loading preset files directly from `data/presets/`.

---

## §4 UI Components & Features
> ES: Componentes clave de la interfaz.

1. **Interactive Geospatial View (Leaflet):** Centered at El Bajío / Querétaro (`lat: 20.5888, lon: -100.3899`). Supports GIBS WMTS raster overlays.
2. **Hazard Alert Banner:** Displays NASA EONET v3 severe events filtered client-side by distance to the parcel.
3. **Agronomic & Climate Charts (Recharts):**
   - Daily soil water balance trajectory $W(t)$ showing wilting point $W_{\text{wp}}$, critical threshold $W_{\text{crit}}$, and field capacity $W_{\text{fc}}$.
   - Cumulative Growing Degree Days (GDD) with crop maturity target markers.
   - 16-day NDVI trajectory highlighting gap-filled spline regions.
4. **Pareto Trade-off Explorer:** Interactive slider for $\lambda \in [0.0, 1.0]$ with real-time updates for economic profit versus water conservation and dual shadow prices.

---

## §5 Done Criteria
> ES: Criterios de aceptación para Track D.

- **Component Tests:** Vitest suites run and verify render integrity without runtime errors:
  ```bash
  pnpm --filter web test
  ```
- **GIBS Tile Formatting:** WMTS URL generator produces valid EPSG:4326 tile coordinate requests.
- **EONET Bbox Filtering:** Events outside $\pm 2^\circ$ bounding box are excluded from the notification banner.
- **Lambda Selector:** Slider strictly produces discrete step increments $\lambda \in \{0.0, 0.1, \dots, 1.0\}$.
- **Offline Mode:** Switching network simulation to offline cleanly loads and visualizes `el_marques.json`.

---

## §6 End-of-Task Protocol
> ES: Protocolo de finalización.

See root [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol).
Append completed tasks to [docs/AGENT_LOG.md](file:///home/Sweett/hakathon/docs/AGENT_LOG.md) and check off entries in [WORKLIST.md](file:///home/Sweett/hakathon/WORKLIST.md).
