# NASA Agro-DSS — Crop Rotation & Water Resilience DSS
> ES: Sistema de Apoyo a Decisiones para Rotación de Cultivos y Resiliencia Hídrica — El Bajío / Querétaro, MX.

**NASA Space Apps 2026** | Node.js/TS + Python 3.12 + React 19/Tailwind v4

## Quickstart / Inicio Rápido

**EN:** Copy `.env.example` to `.env` and set your Earthdata token (optional — presets work offline).  
**ES:** Copia `.env.example` a `.env` y pon tu token de Earthdata (opcional — los presets funcionan sin conexión).

```bash
cp .env.example .env
pnpm install          # instala dependencias JS
uv sync --project services/py-workers   # instala dependencias Python
pnpm dev              # arranca orchestrator:3000 + web:5173 + workers:8001/:8002
```

**Run tests / Ejecutar pruebas:**
```bash
pnpm test             # tests JS
pnpm test:py          # pytest Python (M1–M7)
```

See [WORKLIST.md](./WORKLIST.md) for task status | [AGENTS.md](./AGENTS.md) for architecture & rules | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for API contracts.
