# AGENTS.md — apps/orchestrator/ (Track A)
> ES: Reglas del Track A: orquestador, ingestión de APIs, caché, cálculo ET0 y gateway.

See root [AGENTS.md](file:///home/Sweett/hakathon/AGENTS.md) §1–§6 for all shared rules (canonical units, JSON rules, git workflow, and end-of-task protocol).
See [docs/API_REFERENCE.md](file:///home/Sweett/hakathon/docs/API_REFERENCE.md) for live API response structures, endpoints, and error handling.

---

## §1 Scope
> ES: Alcance de edición para el Track A.

- **Files you MAY edit:** `apps/orchestrator/src/**`, `apps/orchestrator/package.json`, `apps/orchestrator/tsconfig.json`
- **Files you MUST NOT edit:** `apps/web/`, `services/py-workers/`, `packages/contracts/` (must use `feat/contracts-*`).

---

## §2 Branch & Port
> ES: Rama y puerto asignados.

- **Branch:** `feat/track-a-<task>`
- **Port:** `:3000` (`pnpm --filter orchestrator dev`)

---

## §3 Inputs & Outputs
> ES: Entradas y salidas del servicio.

- **Inputs:** External APIs (NASA POWER, SoilGrids v2.0, Open-Meteo, NASA EONET v3) or local cache/presets.
- **Output:** Payload conforming to [packages/contracts/parcel.schema.json](file:///home/Sweett/hakathon/packages/contracts/parcel.schema.json).
- **Forwarding:** Dispatches HTTP requests to `physics_worker (:8001)` and `optimizer_worker (:8002)`.
- **Canonical Error Envelope:**
  ```json
  { "error": { "code": "ERROR_CODE", "message": "Human-readable message", "details": {} } }
  ```

---

## §4 Preprocessing & Equations
> ES: Ecuaciones de preprocesamiento in-line (ET0 FAO-56 y corrección de viento).

### Wind Height Correction
Use only when `WS2M` is unavailable and only `WS10M` is provided:
$$u_2 = u_{10} \times \frac{4.87}{\ln(67.8 \times 10 - 5.42)} \approx 0.748 \times u_{10}$$
*(Prefer NASA POWER WS2M directly when available).*

### FAO-56 Penman-Monteith Reference Evapotranspiration ($ET_0$)
$$ET_0 = \frac{0.408 \Delta (R_n - G) + \gamma \left(\frac{900}{T_{\text{mean}} + 273}\right) u_2 (e_s - e_a)}{\Delta + \gamma (1 + 0.34 u_2)}$$

Sub-equations:
- Saturation vapor pressure: $e^\circ(T) = 0.6108 \exp\left(\frac{17.27 T}{T + 237.3}\right)$ (FAO-56 Eq. 11)
- Mean saturation vapor pressure: $e_s = \frac{e^\circ(T_{\max}) + e^\circ(T_{\min})}{2}$ (FAO-56 Eq. 12)
- Actual vapor pressure: $e_a = e_s \times \frac{RH_{\text{mean}}}{100}$ (FAO-56 Eq. 17)
- Slope of vapor pressure curve: $\Delta = \frac{4098 e^\circ(T_{\text{mean}})}{(T_{\text{mean}} + 237.3)^2}$ (FAO-56 Eq. 13)
- Psychrometric constant: $\gamma = 0.000665 \times P_{s,\text{kpa}}$ (FAO-56 Eq. 8)
- Net radiation: $R_n = R_{ns} - R_{nl}$ with $R_{ns} = (1 - 0.23) R_s$ and $R_{nl}$ from FAO-56 Eq. 39
- Soil heat flux: $G \approx 0$ for daily time steps
- Solar radiation input: Ensure $R_s$ is in $\text{MJ/m}^2/\text{day}$. If source provides $\text{kWh/m}^2/\text{day}$, multiply by $3.6$.

---

## §5 Done Criteria
> ES: Criterios de aceptación para Track A.

- **Golden Test Vector:** FAO-56 Example (Brussels) evaluates to $ET_0 \approx 3.75 \text{ mm/day}$ within tolerance $\pm 0.05 \text{ mm/day}$.
  ```bash
  pnpm --filter orchestrator test -t "fao56_brussels_golden"
  ```
- **Null Ingestion Test:** Values equal to `-999` and `-999.0` are converted to `null` before worker payload dispatch.
- **Cache Envelope Test:** Responses read from cache include `"source": "cache"` and ISO-8601 `"fetched_at"`.
- **SoilGrids Throttling:** Outbound calls to SoilGrids enforce serialized delay $\ge 12\text{ s}$ between queries.
- **Gateway Health:** `GET /health` responds with `{"status": "ok"}`.

---

## §6 End-of-Task Protocol
> ES: Protocolo de finalización.

See root [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol).
Append completed tasks to [docs/AGENT_LOG.md](file:///home/Sweett/hakathon/docs/AGENT_LOG.md) and check off entries in [WORKLIST.md](file:///home/Sweett/hakathon/WORKLIST.md).
