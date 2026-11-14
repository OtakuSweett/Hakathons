# Git Workflow — NASA Agro-DSS
> ES: Flujo de trabajo Git para 4 tracks en paralelo.

## Branch Strategy
| Prefix | Owner | Merges to |
|--------|-------|-----------|
| feat/contracts-\<desc\> | Any (merge FIRST before other tracks start) | main |
| feat/track-a-\<task\> | Track A only (apps/orchestrator/) | main |
| feat/track-b-\<task\> | Track B only (services/py-workers/physics_worker/) | main |
| feat/track-c-\<task\> | Track C only (services/py-workers/optimizer_worker/) | main |
| feat/track-d-\<task\> | Track D only (apps/web/) | main |

## Directory Ownership (strict)
- Track A: `apps/orchestrator/` ONLY
- Track B: `services/py-workers/physics_worker/` ONLY
- Track C: `services/py-workers/optimizer_worker/` ONLY
- Track D: `apps/web/` ONLY
- Contracts: `packages/contracts/` — requires feat/contracts-* branch; ALL tracks review

Shared files (`WORKLIST.md`, `docs/AGENT_LOG.md`): append/tick your OWN lines only. Never rewrite or reorder.

## Commit Convention (Conventional Commits)
```
feat(track-b): mod2 simpson integration
feat(track-a): nasa power ingestion + cache
fix(track-c): milp legume constraint infeasibility handling
feat(contracts): add depletion_p field to crops catalog
chore: bootstrap scaffold
```

## Daily Workflow
Before starting any module:
```bash
git fetch origin
git rebase origin/main
```

Before every PR:
```bash
git fetch origin
git rebase origin/main
pnpm test          # or: uv run pytest  (for Python tracks)
```

## PR Rules
- One PR per module (≤1 module per PR)
- Squash-merge into main
- NO force-push to main
- PR checklist: see `.github/pull_request_template.md`

## Conflict Playbook

### WORKLIST.md conflict on rebase:
Keep BOTH conflicting lines. Mark `[x]` on the line you completed.
Never delete the other track's line.

### AGENT_LOG.md conflict on rebase:
Keep ALL rows from both sides (append order).
Rows are timestamped — no information is lost.

### Schema conflict (packages/contracts/):
Stop. Coordinate on main. The `feat/contracts-*` branch must merge first.
Post to AGENT_LOG.md: `"⚠ Schema conflict on [field] — blocked on contracts merge"`

## CODEOWNERS (optional — fill in team member names)
```
apps/orchestrator/                        @track-a-dev
apps/web/                                 @track-d-dev
services/py-workers/physics_worker/       @track-b-dev
services/py-workers/optimizer_worker/     @track-c-dev
packages/contracts/                       @all   # everyone reviews schema changes
```
