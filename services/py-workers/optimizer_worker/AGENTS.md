# AGENTS.md — services/py-workers/optimizer_worker/ (Track C)
> ES: Reglas del Track C: Módulos 5 a 7 (pre-solver agronómico con filtro EONET, optimización MILP multianual con PuLP/HiGHS y análisis de sensibilidad dual con frontera de Pareto).

See root [AGENTS.md](file:///home/Sweett/hakathon/AGENTS.md) §1–§6 for all shared rules (canonical units, JSON rules, git workflow, and end-of-task protocol).
See [docs/API_REFERENCE.md](file:///home/Sweett/hakathon/docs/API_REFERENCE.md) for data mappings.
See [docs/ARCHITECTURE.md](file:///home/Sweett/hakathon/docs/ARCHITECTURE.md) for the master integration pipeline.

---

## §1 Scope & Permissions
> ES: Alcance de edición para el Track C.

- **Files you MAY edit:** `services/py-workers/optimizer_worker/**`
- **Files you MUST NOT edit:** `physics_worker/`, `apps/`, `packages/contracts/`.

---

## §2 Branch & Port
> ES: Rama y puerto asignados.

- **Branch:** `feat/track-c-<task>`
- **Port:** `:8002` (`uv run --project services/py-workers uvicorn optimizer_worker.main:app --port 8002`)

---

## §3 Contracts
> ES: Esquemas de entrada y salida para optimización.

- **Input:** [packages/contracts/optimizer.schema.json](file:///home/Sweett/hakathon/packages/contracts/optimizer.schema.json) (`OptimizerInput`)
- **Output:** [packages/contracts/optimizer.schema.json](file:///home/Sweett/hakathon/packages/contracts/optimizer.schema.json) (`OptimizerOutput`)
- **Input Validation:** Reject payloads containing `-999`, `-999.0` or `NaN` with HTTP 422.

---

## §4 In-Line Module Mathematics & API Connection (M5–M7)
> ES: Especificación matemática y flujo de implementación de los módulos 5 a 7.

### Module 5: Pre-Solver de Viabilidad Agronómica (`mod5_presolver.py`)
- **Fuentes:** ISRIC SoilGrids (`phh2o / 10`), Módulo 2 ($GDD_{\text{disponible}}$) y NASA EONET v3 (`severeStorms` con `status=open`).
- **Lógica de Poda Vectorizada (Pandas):**
  1. **Térmica:** Si $GDD_{\text{disponible}}(t) < GDD_{\text{requerido}}(i) \implies x_{i,t} = 0$.
  2. **Edafológica:** Si $\text{pH}_{\text{suelo}} \notin [\text{pH}_{\min}(i), \text{pH}_{\max}(i)] \implies x_{i,t} = 0$.
  3. **Filtro por Desastres Naturales (EONET):** Si existen alertas meteorológicas activas de ciclón o inundación en el radio de la parcela, bloquear siembras inmediatas en el primer ciclo ($x_{i,1} = 0$) para cultivos clasificados con alta `sensibilidad_viento` o `sensibilidad_inundacion`.
- **Salida:** Lista de cultivos viables y arreglo estructurado `discarded` con `reason_code` (`"GDD_INSUFFICIENT"`, `"PH_OUT_OF_RANGE"`, `"EXTREME_EVENT_LOCKOUT"`), `reason_text_es` y `reason_text_en`.

### Module 6: Optimizador MILP de Rotación Multianual (`mod6_milp.py`)
- **Fuentes:** Cultivos viables (Módulo 5), SoilGrids (`nitrogen`, `soc`), balance hídrico $W(t)$ de NASA POWER + Módulo 3, y tabla económica (`crops_catalog.json`).
- **Horizonte de Planificación:** $T = 2 \times \text{horizon\_years}$ (3 a 4 años, 6 a 8 ciclos agrícolas alternando Primavera-Verano `PV` y Otoño-Invierno `OI`).
- **Cálculo Económico del Coeficiente $\text{Ganancia}_{i,t}$:**
  $$\text{Ganancia}_{i,t} = (\text{PrecioVenta}_i \times \text{Rendimiento}_i) - (\text{CostoSemilla}_i + \text{CostoRiego}_i + \text{CostoFertilizante}_i)$$
- **Calibración Nutricional (SoilGrids N y SOC):**
  - Si el nitrógeno disponible (`nitrogen / 100`) es bajo, se penaliza el costo de fertilización para cultivos extractores como maíz y se vuelve mandatoria la inclusión de leguminosas fijadoras de N (frijol, garbanzo, alfalfa).
- **Formulación MILP:**
  $$\max Z = \sum_{t=1}^T \sum_i \text{Ganancia}_{i,t} \cdot x_{i,t} - \sum_{t=1}^T \left[ \alpha \cdot \text{AguaRequerida}_t + \beta \cdot s_t^+ \right]$$
  Sujeto a:
  1. **Unicidad de siembra:** $\sum_i x_{i,t} \le 1, \quad \forall t$
  2. **Balance hídrico disponible:** $\sum_i \text{ConsumoAgua}_i \cdot x_{i,t} - \text{AguaDisponible}_t \le s_t^+, \quad \forall t$  *(sólo holgura de déficit $s_t^+ \ge 0$, sobrecosto penalizado por $\beta$)*
  3. **Rotación anti-monocultivo:** $x_{i,t} + x_{i,t+1} \le 1, \quad \forall i, \forall t$
  4. **Fijación de Nitrógeno por Leguminosas:** $\sum_{k \in \text{Year}_y} \sum_{i \in \text{Leguminosas}} x_{i,k} \ge 1, \quad \forall \text{Año } y$
  5. **Dominio:** $x_{i,t} \in \{0, 1\}, \quad s_t^+ \ge 0$.
- **Motor Solver:** `PuLP` o `Pyomo` con solver `HiGHS` (`highspy`), `time_limit = 30`, solución determinista.

### Module 7: Análisis de Sensibilidad y Frontera de Pareto (`mod7_pareto.py`)
- **Precios Sombra (Variables Duales $y_k$):**
  $$y_{\text{agua}} = \frac{\partial Z^*}{\partial \text{AguaDisponible}_t} = \text{constraint.pi}$$
  Extraído de la relajación lineal continua. Si $y_{\text{agua}} > \text{CostoComercialAgua}$, el sistema emite recomendación positiva de inversión en riego adicional.
- **Escalarización Multiobjetivo:**
  $$\max \left[ \lambda \cdot f_1(x) + (1 - \lambda) \cdot f_2(x) \right]$$
  donde $f_1$ es utilidad económica neta ($\text{MXN/ha}$) y $f_2$ es conservación hídrica y salud de suelo.
- **Soporte de Consulta:**
  1. Valor continuo $\lambda \in [0, 1]$ proveniente del slider del frontend.
  2. Barrido automático de 5 puntos: $\lambda \in \{0.0, 0.25, 0.5, 0.75, 1.0\}$, eliminando puntos dominados para garantizar monotonía en la frontera.

---

## §5 Done Criteria & Pytest Verification
> ES: Criterios de aceptación con pytest.

```bash
uv run --project services/py-workers pytest services/py-workers/optimizer_worker/tests/
```
- `pytest -k "test_presolver_deterministic"`: Descarte idéntico y determinista ante entradas iguales.
- `pytest -k "test_presolver_eonet_block"`: Bloquea siembra inmediata de cultivos sensibles ante alerta de tormenta severa abierta.
- `pytest -k "test_milp_feasible_all_presets"`: PuLP/HiGHS alcanza estatus `Optimal` en los 4 presets de datos.
- `pytest -k "test_milp_anti_monoculture"`: Satisface $x_{i,t} + x_{i,t+1} \le 1$ en todos los slots.
- `pytest -k "test_pareto_monotone"`: La función de ganancia $f_1$ es monótonamente no-creciente a medida que $\lambda$ disminuye.
- `pytest -k "test_pareto_shadow_prices"`: Valores duales `.pi` de agua y nitrógeno son reportados con unidades canónicas.

---

## §6 End-of-Task Protocol
> ES: Protocolo de finalización.

See root [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol).
Append completed tasks to [docs/AGENT_LOG.md](file:///home/Sweett/hakathon/docs/AGENT_LOG.md) and check off entries in [WORKLIST.md](file:///home/Sweett/hakathon/WORKLIST.md).
