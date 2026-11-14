# Git Workflow & Commit Documentation — NASA Agro-DSS
> ES: Flujo de trabajo Git, protocolo de commits documentados y resolución de conflictos para 4 tracks en paralelo.

---

## 1. Branch Strategy & Directory Ownership
> ES: Estrategia de ramas y propiedad estricta de directorios.

| Prefix | Owner | Target Branch | Directory Scope |
| :--- | :--- | :--- | :--- |
| `feat/contracts-<desc>` | Cualquiera (revisado por todos) | `main` | `packages/contracts/` ONLY |
| `feat/track-a-<task>` | Track A (Backend Orchestrator) | `main` | `apps/orchestrator/` ONLY |
| `feat/track-b-<task>` | Track B (Physics Worker) | `main` | `services/py-workers/physics_worker/` ONLY |
| `feat/track-c-<task>` | Track C (Optimizer Worker) | `main` | `services/py-workers/optimizer_worker/` ONLY |
| `feat/track-d-<task>` | Track D (Web Frontend) | `main` | `apps/web/` ONLY |

**Regla de Oro:** Cada agente o desarrollador edita **ÚNICAMENTE** los archivos de su directorio asignado. Está terminantemente prohibido modificar carpetas de otros tracks.

---

## 2. Commit Convention & Commit Documentation Policy
> ES: Convención de commits y política obligatoria de documentación de cada commit.

Utilizamos **Conventional Commits**:
- `feat(track-a): add soilgrids client with van bemmelen calculation`
- `feat(track-b): implement mod3 rk4 soil water balance`
- `feat(track-c): implement mod6 milp multi-year rotation`
- `feat(track-d): add risk map with leaflet and gibs wmts overlay`
- `fix(track-b): clamp w_mm to zero in rk4 loop`
- `docs: update api reference with live response records`
- `chore: bootstrap scaffold`

### 📋 Protocolo Obligatorio para Cada Commit / Every Commit Protocol:
Cada vez que un agente o desarrollador realice un commit de código o documentación, debe seguir estrictamente este orden:

```
[ 1. Ejecutar Pruebas Locales (pnpm test / pytest) ]
                     │
                     ▼
[ 2. Realizar Git Commit con Conventional Commit ]
     git commit -m "feat(track-x): description"
                     │
                     ▼
[ 3. Obtener el Hash del Commit ]
     COMMIT_HASH=$(git rev-parse --short HEAD)
                     │
                     ▼
[ 4. Documentar en docs/AGENT_LOG.md ]
     Añadir fila con Timestamp, Track, Módulo, Archivos, Pruebas y $COMMIT_HASH
                     │
                     ▼
[ 5. Marcar Casilla en WORKLIST.md ]
     Marcar con [x] el ítem correspondiente
                     │
                     ▼
[ 6. Abrir Pull Request ]
     Llenar checklist en .github/pull_request_template.md incluyendo $COMMIT_HASH
```

---

## 3. Daily Workflow & Pull Request Rules
> ES: Flujo de trabajo diario y reglas de Pull Requests.

1. **Antes de empezar un módulo:**
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. **Antes de abrir un PR:**
   - Asegurarse de que las pruebas pasen al 100%.
   - Realizar rebase sobre `origin/main` (`git fetch origin && git rebase origin/main`).
   - El alcance de cada PR debe ser pequeño: **$\le 1$ módulo o función por PR**.
   - Solo se permite **Squash-Merge** en `main`.
   - Prohibido hacer `force-push` (`git push -f`) sobre la rama `main`.

---

## 4. Conflict Playbook / Manual de Resolución de Conflictos
> ES: Qué hacer en caso de conflictos al hacer rebase.

### Conflicto en `WORKLIST.md`:
- Si dos tracks editaron `WORKLIST.md` al mismo tiempo, **CONSERVA AMBAS LÍNEAS**.
- Marca `[x]` en tu tarea y respeta las tareas de los demás tracks. Nunca borres líneas ajenas.

### Conflicto en `docs/AGENT_LOG.md`:
- Si ambos tracks agregaron una fila al log, **CONSERVA AMBAS FILAS**.
- Como cada fila tiene timestamp (`ISO-8601 UTC`) y hash de commit, no hay pérdida de información.

### Conflicto en `packages/contracts/`:
- **ALTO INMEDIATO.** Los contratos se gobiernan en ramas `feat/contracts-*` que se fusionan primero.
- Si hay un conflicto de esquemas, ningún track debe avanzar hasta que la rama de contratos esté aprobada y fusionada en `main`.
