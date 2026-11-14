# AGENTS.md — services/py-workers/
> ES: Reglas raíz para los microservicios numéricos en Python (Tracks B y C).

See root [AGENTS.md](file:///home/Sweett/hakathon/AGENTS.md) §1–§6 for all shared rules (canonical units, JSON rules, git workflow, and end-of-task protocol).

---

## §1 Scope
> ES: Alcance de edición para los workers de Python.

- **Files you MAY edit:** files within your assigned track:
  - Track B: `services/py-workers/physics_worker/**`
  - Track C: `services/py-workers/optimizer_worker/**`
  - Root project file: `services/py-workers/pyproject.toml` (only to add dependencies and log in AGENT_LOG)
- **Files you MUST NOT edit:** the other track's directory, `apps/`, or `packages/contracts/`.

---

## §2 Shared Python Standards
> ES: Estándares compartidos para el entorno Python.

- **Python Version:** $\ge 3.12$ (System verified: 3.14.9).
- **Package Manager:** `uv` (`uv run --project services/py-workers pytest`).
- **Input Validation:** All endpoints MUST reject inputs containing `-999`, `-999.0`, or `NaN` values, returning HTTP 422 with the canonical error format:
  ```json
  { "error": { "code": "INVALID_NUMERIC_PAYLOAD", "message": "Payload contains unhandled fill/NaN values", "details": {} } }
  ```
- **Health Check:** Every worker MUST expose `GET /health` responding with:
  ```json
  { "status": "ok", "worker": "physics" | "optimizer" }
  ```

---

## §3 End-of-Task Protocol
> ES: Protocolo de finalización.

See root [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol).
Append completed tasks to [docs/AGENT_LOG.md](file:///home/Sweett/hakathon/docs/AGENT_LOG.md) and check off entries in [WORKLIST.md](file:///home/Sweett/hakathon/WORKLIST.md).
