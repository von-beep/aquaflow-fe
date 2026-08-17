# AquaFlow — Backend, Sync & SaaS Roadmap

> **Last updated:** August 2026  
> **Current phase:** [Roadmap complete through Phase 13](./CURRENT_PHASE.md)  
> **Frontend roadmap (Phases 0–5):** [ROADMAP.md](./ROADMAP.md)  
> **Detailed tasks:** [backend-phases.md](./backend-phases.md)

---

## Vision

AquaFlow is a **multi-tenant SaaS**: many water-refilling **stations** share one **`Aquaflow-api`**, with data isolated by `station_id`.

The product stays **offline-first**. The React app uses `localStorage` (`aquaFlow_v1`) as the working store when the network is unavailable. Sync (Phases 9–10) reconciles that local state with the station’s cloud data.

`Aquaflow-api` provides:

1. Tenant root (`stations`) and station-scoped users  
2. Durable multi-device source of truth per station  
3. JWT auth carrying `stationId`  
4. Versioned **push/pull sync** scoped to the station  
5. Later: public onboarding, Xendit subscriptions, thin platform ops  

This is **not** an online-only rewrite. Local CRUD remains usable without the API until the operator opts into sync (Phase 10).

### Tenant model

| Entity | Role |
|--------|------|
| `stations` | Tenant root (id, name, slug/code, plan/status placeholder, created_at) |
| `users` | Belong to one `station_id`; JWT includes `sub` + `stationId` |
| Domain tables | All carry `station_id`; every query filters by JWT `stationId`; cross-tenant = `403` |

Phase 6 schema had **no** `station_id` — Phase 7 adds stations/users and migrates domain tables.

---

## Two-repo layout (not a monorepo)

| Repo | Role |
|------|------|
| **Aquaflow** (this repo) | Vite + React admin UI, domain helpers, localStorage, sync *client* (Phase 10), onboarding UI (Phase 11+) |
| **Aquaflow-api** | Express API, MySQL, tenancy, auth, CRUD, sync, billing webhooks (Phases 6–9, 11–13) |

**Rules:**

- Do **not** add `Aquaflow-api` as a folder, workspace package, or git submodule inside this repo.
- Create/clone `Aquaflow-api` as a **sibling** project (e.g. `d:\Projects\Aquaflow-api`).
- Share contracts via **HTTP JSON + documented schema** (OpenAPI or markdown). Do **not** link shared TypeScript packages across repos.

```
d:\Projects\
  Aquaflow\        ← this frontend repo
  Aquaflow-api\    ← separate backend repo
```

---

## Roadmap at a glance

| Phase | Name | Repo | User / eng outcome | Depends on |
|:-----:|------|------|--------------------|------------|
| 6 | [API foundation](#phase-6--api-foundation) | Aquaflow-api | Express + TS, MySQL migrations, health, seed | Phase 5 |
| 7 | [Tenancy + Auth](#phase-7--tenancy--auth) | Aquaflow-api | `stations`, `station_id` migration, JWT | Phase 6 |
| 8 | [Tenant-scoped CRUD](#phase-8--tenant-scoped-crud) | Aquaflow-api | REST isolated per station | Phase 7 |
| 9 | [Tenant-scoped sync](#phase-9--tenant-scoped-sync) | Aquaflow-api | Push/pull + LWW, station-scoped | Phase 8 |
| 10 | [Client sync](#phase-10--client-sync) | **Aquaflow** | Login + sync; local primary offline | Phase 9 |
| 11 | [SaaS onboarding](#phase-11--saas-onboarding) | both | Public signup, invite users | Phase 10 |
| 12 | [Subscriptions](#phase-12--subscriptions) | both | Xendit plans; gate features | Phase 11 |
| 13 | [Platform ops](#phase-13--platform-ops) | Aquaflow-api (+ thin UI) | Super-admin list/suspend | Phase 12 |

**Legend:** Done · In progress · Not started

| Phase | Status |
|:-----:|:------:|
| 6 | Done |
| 7 | Done |
| 8 | Done |
| 9 | Done |
| 10 | Done |
| 11 | Done |
| 12 | Done |
| 13 | Done |

Detailed exit criteria and task lists: [backend-phases.md](./backend-phases.md).

---

## Phase 6 — API foundation

Scaffold **Aquaflow-api**: Express + TypeScript, MySQL 8, versioned SQL migrations, `/health`, env config, seed data aligned with frontend domain types. (**Done** — pre-tenant schema.)

## Phase 7 — Tenancy + Auth

Add `stations` and `users`; migrate **`station_id`** onto all domain tables; register creates station + owner; login returns JWT with `stationId`; middleware attaches user + station; protect non-health mutating routes.

## Phase 8 — Tenant-scoped CRUD

REST for settings, inventory, products, customers, riders, deliveries, utang, payments — always filtered by JWT `stationId`. Cascade delete and balance rules unchanged in meaning, scoped to tenant.

## Phase 9 — Tenant-scoped sync

Versioned push/pull, `updatedAt` / tombstones, **last-write-wins per record**, all scoped to the authenticated station. Document wire format for Phase 10.

## Phase 10 — Client sync

In **this** repo: station-user login, sync toggle, background push/pull into `aquaFlow_v1`. Local storage remains primary when offline.

## Phase 11 — SaaS onboarding

Public station signup / trial flow, invite a second user to the same station, basic station profile on the server. Frontend + API.

## Phase 12 — Subscriptions

**Xendit** plans and entitlements; store plan/status on `stations`; gate sync or premium features by active subscription; webhook handling in `Aquaflow-api`.

## Phase 13 — Platform ops

Thin super-admin: list stations, suspend tenant. No full billing console rewrite.

---

## Stack (locked for Aquaflow-api)

- Node.js + Express + TypeScript
- MySQL 8
- **mysql2** + **versioned SQL migration files** (no ORM required)
- Auth: bcrypt + JWT bearer (`sub` + `stationId`)
- Billing: Xendit (Phase 12)
- API and DB deploy separately from the Vite static host

---

## Domain alignment

Server tables and JSON shapes should mirror frontend types in `src/domain/types.ts`, plus SaaS tables:

- **Tenant:** stations, users  
- **Domain (per station):** settings, inventory, products, customers, riders, deliveries, utang, payments  

Invariants (balance, complete-delivery inventory, cascade delete) stay consistent with [aquaflow-domain](../.cursor/rules/aquaflow-domain.mdc), always within one `station_id`.

---

## Out of scope (until a later roadmap)

- Installable PWA
- Realtime websockets
- Monorepo / shared npm workspace across Aquaflow and Aquaflow-api
- Full multi-product billing portal beyond Xendit hosted checkout / Phase 13 suspend
