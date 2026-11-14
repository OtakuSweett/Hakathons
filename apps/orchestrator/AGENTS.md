# AGENTS.md — apps/orchestrator/ (Track A)
> ES: Reglas del Track A: orquestador Node.js/TypeScript, ingestión de APIs, preprocesamiento pedológico y meteorológico, gateway hacia workers y gestión de las 9 funciones del producto.

See root [AGENTS.md](file:///home/Sweett/hakathon/AGENTS.md) §1–§6 for all shared rules (canonical units, JSON rules, git workflow, and end-of-task protocol).
See [docs/API_REFERENCE.md](file:///home/Sweett/hakathon/docs/API_REFERENCE.md) for endpoints, parameters, and conversion tables.
See [docs/ARCHITECTURE.md](file:///home/Sweett/hakathon/docs/ARCHITECTURE.md) for the master integration table and product functions.

---

## §1 Scope & Permissions
> ES: Alcance de edición para el Track A.

- **Files you MAY edit:** `apps/orchestrator/src/**`, `apps/orchestrator/package.json`, `apps/orchestrator/tsconfig.json`
- **Files you MUST NOT edit:** `apps/web/`, `services/py-workers/`, `packages/contracts/` (must use `feat/contracts-*`).
- **Zero Application Code in Scaffold:** During bootstrap/scaffold branches, create manifests, configurations, and `.gitkeep` only. Application logic belongs in feature branches (`feat/track-a-*`).

---

## §2 Branch & Port
> ES: Rama y puerto asignados.

- **Branch:** `feat/track-a-<task>`
- **Port:** `:3000` (`pnpm --filter orchestrator dev`)

---

## §3 Inputs, Outputs & Error Format
> ES: Entradas, salidas y formato de error canónico.

- **External Inputs:**
  - NASA POWER Hourly (`temporal/hourly/point`) and Daily (`temporal/daily/point`).
  - ISRIC SoilGrids v2.0 (`properties/query` with `depth=0-5cm`).
  - NASA EONET v3 (`events/geojson?category=severeStorms&status=open`).
  - Open-Meteo Forecast (`forecast?daily=...&hourly=...&forecast_days=16`).
- **Internal Forwarding:** Dispatches sanitized payloads to:
  - `POST http://localhost:8001/physics` (`physics_worker`)
  - `POST http://localhost:8002/optimize` (`optimizer_worker`)
- **Canonical Error Envelope:**
  ```json
  { "error": { "code": "ERROR_CODE", "message": "Human-readable message", "details": {} } }
  ```

---

## §4 Ingestion & Preprocessing Responsibilities
> ES: Reglas de ingestión y preprocesamiento de datos.

1. **Centinelas de Error:** Filtrar rigurosamente los valores `-999` y `-999.0` de NASA POWER y convertirlos a `null` antes de armar el payload.
2. **Escalas de SoilGrids:**
   - `phh2o / 10` $\rightarrow$ `soil_ph`
   - `soc / 10` $\rightarrow$ `soc_g_kg` ($g/kg$)
   - `nitrogen / 100` $\rightarrow$ `nitrogen_g_kg` ($g/kg$)
   - `clay / 10` $\rightarrow$ `clay_pct` (%)
   - `sand / 10` $\rightarrow$ `sand_pct` (%)
3. **Clasificación Textural y Materia Orgánica:**
   - Limo: $\text{silt\_pct} = \max(0, 100 - \text{clay\_pct} - \text{sand\_pct})$.
   - Clasificación según el triángulo textural USDA (ej. $37.8\%$ arcilla, $38.7\%$ arena, $23.5\%$ limo $\rightarrow$ *Clay Loam*).
   - Factor de Van Bemmelen: $\text{om\_pct} = (\text{soc\_g\_kg} / 10) \times 1.724$.
4. **Cálculo Micrometeorológico de $ET_0$ (FAO-56 Penman-Monteith):**
   $$ET_0 = \frac{0.408 \Delta (R_n - G) + \gamma \left(\frac{900}{T+273}\right) u_2 (e_s - e_a)}{\Delta + \gamma (1 + 0.34 u_2)}$$
   - Viento a 2m: $u_2 = \text{WS2M}$ (o $u_{10} \times 0.748$ si solo se dispone de WS10M).
   - Radiación solar (VERIFICADA EN VIVO):
     - Si se consulta NASA POWER con `community=AG`, el campo `ALLSKY_SFC_SW_DWN` **YA VIENE en `MJ/m^2/day`**. ¡NO MULTIPLICAR POR 3.6!
     - Solo si se consulta con `community=RE` viene en `kW-hr/m^2/day` y debe multiplicarse por $3.6$ antes de aplicar el factor $0.408$.
5. **Inyección de Pulsos Extremos EONET:**
   - Consultar eventos activos en NASA EONET v3 (`severeStorms`).
   - Si la trayectoria o polígono intersecta la parcela ($R \le 150\text{ km}$), agregar un pulso de lluvia extraordinaria en el vector de precipitación $P(t)$ enviado a `physics_worker` para simular riesgo de anegamiento.
6. **Detector de Plagas y Enfermedades:**
   - Evaluar ventana móvil de temperatura (`T2M`), humedad relativa (`RH2M` $\ge 80\%$) y lluvia para emitir el semáforo fitosanitario (`PestRiskOutput` en `packages/contracts/schemas.json`).
7. **Gestión de Reportes de Agricultores:**
   - Endpoints para recibir y almacenar reportes de campo georreferenciados (`FarmerReportInput` en `packages/contracts/schemas.json`).

---

## §5 Done Criteria
> ES: Criterios de aceptación para Track A.

- **FAO-56 Golden Vector:** Brussels example evaluates to $ET_0 = 3.75 \text{ mm/day} \pm 0.05 \text{ mm/day}$.
  ```bash
  pnpm --filter orchestrator test -t "fao56_brussels_golden"
  ```
- **SoilGrids Parsing Test:** Parsing raw SoilGrids mean values correctly derives USDA texture and Van Bemmelen organic matter.
- **Cache Envelope Test:** Cached responses contain `"source": "cache"` and ISO-8601 `"fetched_at"`.
- **SoilGrids Throttling:** Enforces serialized interval $\ge 12\text{ s}$ between outbound requests.
- **Offline Presets:** Gracefully falls back to `data/presets/` when external APIs timeout or return HTTP 503.

---

## §6 End-of-Task Protocol
> ES: Protocolo de finalización.

See root [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol).
Append completed tasks to [docs/AGENT_LOG.md](file:///home/Sweett/hakathon/docs/AGENT_LOG.md) and check off entries in [WORKLIST.md](file:///home/Sweett/hakathon/WORKLIST.md).
