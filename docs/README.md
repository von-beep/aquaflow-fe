# AquaFlow docs

Offline-first **multi-tenant SaaS** for Philippine water-refilling stations (React app + sibling `Aquaflow-api`). Not a monorepo.

| Doc | Purpose |
|-----|---------|
| [ROADMAP.md](./ROADMAP.md) | Product vision, all phases, status |
| [phases.md](./phases.md) | Exit criteria and tasks — Phases 0–5 (frontend) |
| [BACKEND_ROADMAP.md](./BACKEND_ROADMAP.md) | API, sync & SaaS vision, tenancy, Phases 6–13 |
| [backend-phases.md](./backend-phases.md) | Exit criteria and tasks — Phases 6–13 |
| [CURRENT_PHASE.md](./CURRENT_PHASE.md) | What to build **now** |

## For agents

1. Read `.cursor/rules/` (always-on: senior engineering + project phases).
2. Follow **only** the current phase in `CURRENT_PHASE.md`.
3. Behavior reference for local UI: `aquaflow.html` / domain rules.
4. Phases 6–9 and most of 11–13: work in sibling **`Aquaflow-api`** — do not add backend packages to this repo.
5. Phase 7 introduces **tenancy** (`stations` + `station_id`). Phase 12 is **Xendit** billing only.
6. Phase 10 is the main frontend sync/auth UI phase.

## Stack

**This repo:** Vite · React 19 · TypeScript · React Router · `localStorage` (`aquaFlow_v1`)

**Sibling `Aquaflow-api`:** Node.js · Express · TypeScript · MySQL 8 · multi-tenant `station_id` · JWT · Xendit (Phase 12)
