# AGENTS.md — services/py-workers/optimizer_worker/ (Track C)
> ES: Reglas del Track C: Módulos 5–7 (pre-solver agronómico, optimización MILP con PuLP/HiGHS y barrido de Pareto).

See root [AGENTS.md](file:///home/Sweett/hakathon/AGENTS.md) §1–§6 for all shared rules (canonical units, JSON rules, git workflow, and end-of-task protocol).
See root [AGENTS.md §3](file:///home/Sweett/hakathon/AGENTS.md#3-canonical-json--units-ssot--children-link-here-do-not-copy) for the Canonical Unit Table.
See root [AGENTS.md §4](file:///home/Sweett/hakathon/AGENTS.md#4-math-pipeline-ssot--children-inline-their-own-equations--cite-here) for math pipeline context.

---

## §1 Scope
> ES: Alcance de edición para el Track C.

- **Files you MAY edit:** `services/py-workers/optimizer_worker/**`
- **Files you MUST NOT edit:** `services/py-workers/physics_worker/**`, `apps/`, `packages/contracts/`.

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

---

## §4 In-Line Module Mathematics (Modules 5–7)
> ES: Ecuaciones detalladas de los módulos 5 a 7.

### Module 5: Agronomic Pre-Solver Pruning (`mod5_presolver.py`)
Prunes the combinatorial search space prior to MILP formulation:
- **GDD Check:** If $\text{GDD}_{\text{available}, t} < \text{GDD}_{\text{required}}(i)$, force $x_{i,t} = 0$.
- **Soil pH Check:** If $\text{pH}_{\text{soil}} < \text{pH}_{\min}(i)$ or $\text{pH}_{\text{soil}} > \text{pH}_{\max}(i)$, force $x_{i,t} = 0$.
- **Output Structure:** Returns pruned candidate pairs and deterministic list:
  ```json
  {
    "feasible_pairs": [["crop_id", "slot_t"]],
    "discarded": [
      {
        "crop_id": "string",
        "reason_code": "GDD_INSUFFICIENT" | "PH_OUT_OF_RANGE",
        "reason_text_es": "string",
        "reason_text_en": "string"
      }
    ]
  }
  ```

### Module 6: MILP Crop Rotation Solver (`mod6_milp.py`)
Formulates and solves the crop allocation over horizon $T = 2 \times \text{years}$:
$$\max Z = \sum_{t=1}^T \sum_{i \in \text{Crops}} \text{Profit}_{i,t} \cdot x_{i,t} - \sum_{t=1}^T \left[ \alpha \cdot \text{WaterNeed}_t + \beta \cdot s_t^+ \right]$$
subject to:
1. **Single Crop per Cycle:**
   $$\sum_{i} x_{i,t} \le 1 \quad \forall t \in \{1, \dots, T\}$$
2. **Water Deficit Slack (Soft Constraint):**
   $$\sum_{i} \text{WaterNeed}_{i} \cdot x_{i,t} - \text{WaterAvailable}_t \le s_t^+ \quad \forall t$$
   *(SPEC FIX: Only single positive deficit slack $s_t^+ \ge 0$ penalized by $\beta$. Surplus slack $s_t^-$ is omitted).*
3. **Anti-Monoculture Agronomic Rotation:**
   $$x_{i,t} + x_{i,t+1} \le 1 \quad \forall i, \forall t \in \{1, \dots, T-1\}$$
4. **Mandatory Annual Legume Nitrogen Fixation:**
   $$\sum_{k \in \text{Year}_y} \sum_{i \in \text{Legumes}} x_{i,k} \ge 1 \quad \forall \text{Year } y$$
5. **Domain:**
   $$x_{i,t} \in \{0, 1\}, \quad s_t^+ \ge 0$$

- **Solver:** PuLP interface with HiGHS (`highspy`), `time_limit = 30`, deterministic.
- **Infeasibility Handling:** If the legume constraint or water limits cannot be satisfied after pre-solver pruning, returns `{"status": "Infeasible", "infeasible_reason": "LEGUME_CONSTRAINT_UNSATISFIABLE"}` rather than silently relaxing constraints.

### Module 7: Pareto Front $\lambda$-Sweep (`mod7_pareto.py`)
Explores economic vs. water resilience trade-offs across 11 discrete weightings $\lambda \in \{0.0, 0.1, 0.2, \dots, 1.0\}$:
$$\max \quad \lambda f_1 + (1 - \lambda) f_2$$
where:
- $f_1 = \text{Net Profit (MXN/ha)}$
- $f_2 = \text{Water Saved (mm)} + \text{N Fixed (kg/ha)}$ (appropriately normalized)
- **Dual Shadow Prices:** Solves the continuous LP relaxation to extract shadow prices:
  $$y_{\text{water}, t} = \frac{\partial Z^*}{\partial \text{WaterAvailable}_t} = \text{constraint.pi}$$
- **Dominated Solution Pruning:** Filters strictly dominated points to guarantee a monotone Pareto frontier.

---

## §5 Done Criteria
> ES: Criterios de aceptación y comandos de prueba para Track C.

Run tests using uv:
```bash
uv run --project services/py-workers pytest services/py-workers/optimizer_worker/tests/
```

Individual verifications:
- **M5 Pre-solver:**
  - `pytest -k "test_presolver_deterministic"`: Identical inputs produce identical discard order and pairs.
  - `pytest -k "test_presolver_bilingual"`: Both `reason_text_es` and `reason_text_en` are non-empty strings.
- **M6 MILP:**
  - `pytest -k "test_milp_feasible_all_presets"`: PuLP/HiGHS achieves `Optimal` on all 4 presets.
  - `pytest -k "test_milp_anti_monoculture"`: Verifies $x_{i,t} + x_{i,t+1} \le 1$ holds for all solved schedules.
  - `pytest -k "test_milp_infeasible_reports_reason"`: Controlled infeasible scenario returns clear diagnostic reason code without crashing.
- **M7 Pareto:**
  - `pytest -k "test_pareto_11_points"`: Evaluates exactly 11 distinct $\lambda$ values.
  - `pytest -k "test_pareto_monotone"`: Verifies $f_1$ is non-increasing as $\lambda$ decreases.
  - `pytest -k "test_pareto_shadow_prices"`: Valid non-negative shadow prices reported for water and nitrogen.

---

## §6 End-of-Task Protocol
> ES: Protocolo de finalización.

See root [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol).
Append completed tasks to [docs/AGENT_LOG.md](file:///home/Sweett/hakathon/docs/AGENT_LOG.md) and check off entries in [WORKLIST.md](file:///home/Sweett/hakathon/WORKLIST.md).
