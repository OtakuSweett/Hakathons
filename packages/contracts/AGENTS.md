# AGENTS.md — packages/contracts/
> ES: Reglas para el track de contratos. Los esquemas y catálogos van PRIMERO.

See root [AGENTS.md](file:///home/Sweett/hakathon/AGENTS.md) §1–§6 for all shared rules (canonical units, JSON rules, git workflow, and end-of-task protocol).

---

## §1 Scope
> ES: Alcance de edición para contratos.

- **Files you MAY edit:** `packages/contracts/*.json`
- **Files you MUST NOT edit:** any file under `apps/`, `services/`, or root configs.

---

## §2 Branch Rule
> ES: Regla obligatoria de ramas para contratos.

ALL changes to `packages/contracts/` MUST be implemented on a dedicated `feat/contracts-<desc>` branch.
This branch MUST be reviewed and merged into `main` BEFORE any dependent track starts implementation.

---

## §3 Schemas & Artifacts
> ES: Esquemas y artefactos gobernados en este paquete.

- [parcel.schema.json](file:///home/Sweett/hakathon/packages/contracts/parcel.schema.json): Specification for `ClimateSoilBundle` (input to all numerical workers).
- [physics.schema.json](file:///home/Sweett/hakathon/packages/contracts/physics.schema.json): Specification for `PhysicsOutput` (output of Track B `physics_worker`).
- [optimizer.schema.json](file:///home/Sweett/hakathon/packages/contracts/optimizer.schema.json): Specification for `OptimizerInput` and `OptimizerOutput` (Track C `optimizer_worker`).
- [crops_catalog.schema.json](file:///home/Sweett/hakathon/packages/contracts/crops_catalog.schema.json): JSON Schema for the enriched 12-crop catalog with agronomic, resilience, and economic fields.
- [crops_catalog.json](file:///home/Sweett/hakathon/packages/contracts/crops_catalog.json): Static agronomic catalog for El Bajío crop parameters (maize, sorghum, wheat, barley, beans, chickpea, alfalfa, broccoli, tomato, onion, garlic, strawberry).
- [schemas.json](file:///home/Sweett/hakathon/packages/contracts/schemas.json): Extended schemas for Pest Risk (`PestRiskOutput`), Farmer Field Reports (`FarmerReportInput`, `FarmerReportRecord`), and Climate What-If Simulation (`SimulationRequest`).

### Schema Standards
- JSON Schema Draft 2020-12
- Strict validation: `"additionalProperties": false` across all objects
- Every property MUST contain units in its `"description"` field
- Water balance invariant MUST be explicitly documented and enforced:
  `wilting_point_mm < critical_water_mm < field_capacity_mm`

---

## §4 Validation Commands
> ES: Comandos de validación con AJV (sin escribir código de aplicación).

Validate single preset against parcel schema:
```bash
npx ajv validate -s packages/contracts/parcel.schema.json -d data/presets/el_marques.json --spec=draft2020
```

Validate all presets:
```bash
for f in data/presets/*.json; do npx ajv validate -s packages/contracts/parcel.schema.json -d "$f" --spec=draft2020 && echo "$f OK"; done
```

Validate crops catalog against its schema:
```bash
npx ajv validate -s packages/contracts/crops_catalog.schema.json -d packages/contracts/crops_catalog.json --spec=draft2020
```

Validate crops catalog syntax:
```bash
python3 -m json.tool packages/contracts/crops_catalog.json > /dev/null && echo "Catalog valid"
```

---

## §5 Done Criteria
> ES: Criterios de aceptación para cambios en contratos.

- All 4 preset bundles validate against `parcel.schema.json` with 0 errors.
- `crops_catalog.json` contains 12 Bajío crops with all 33 agronomic/economic/resilience attributes and validates against `crops_catalog.schema.json`.
- Invariant check passes: `wilting_point_mm < critical_water_mm < field_capacity_mm`.
- JSON files format cleanly with standard JSON linters.

---

## §6 End-of-Task Protocol & Commit Logging
> ES: Protocolo de finalización y documentación de commits.

See root [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol--commit-documentation).
Para cada cambio en contratos:
1. Validar esquemas y presets con `npx ajv validate` o script de validación.
2. Realizar commit en rama `feat/contracts-*` (`git commit -m "feat(contracts): ..."`).
3. Obtener el hash corto (`git rev-parse --short HEAD`).
4. Añadir fila en [docs/AGENT_LOG.md](file:///home/Sweett/hakathon/docs/AGENT_LOG.md) con Timestamp, `contracts`, Archivos, Pruebas y Hash del commit.
5. Marcar casilla en [WORKLIST.md](file:///home/Sweett/hakathon/WORKLIST.md).
