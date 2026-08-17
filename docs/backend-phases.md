# AquaFlow — Backend, sync & SaaS phase specs

Build only the active phase. Update [CURRENT_PHASE.md](./CURRENT_PHASE.md) when exiting a phase.

Frontend Phases 0–5: [phases.md](./phases.md). Overview: [BACKEND_ROADMAP.md](./BACKEND_ROADMAP.md).

**Repo reminder:** Phases 6–9 and most of 11–13 are implemented in the sibling **`Aquaflow-api`** repository. Phase 10 (and onboarding/billing UI pieces) touch **this** (Aquaflow) repository. Do not create a monorepo.

**SaaS:** Multi-tenant from Phase 7 (`stations` + `station_id`). Subscription billing is Phase 12 (Xendit), not earlier.

---

## Phase 6 — API foundation

**Repo:** `Aquaflow-api` (sibling of Aquaflow)

**Status:** Done

**Outcome:** Runnable Express + TypeScript API with MySQL connectivity, migrations, health check, and seed data.

**Tasks (order):**
1. Create separate git repo `Aquaflow-api` — not inside Aquaflow
2. Scaffold Node.js + Express + TypeScript (`dev`, `build`, `start`, `migrate`)
3. Configure env: `PORT`, `DATABASE_URL`, `JWT_SECRET` placeholder
4. mysql2 pool; versioned SQL migrations
5. Schema for core domain tables (pre-tenant)
6. `GET /health`
7. Seed script mirroring frontend demo data
8. README + docker-compose (MySQL / phpMyAdmin)

**Exit criteria:** Migrate + seed against MySQL 8; `/health` with DB ok.

**Out of scope:** Auth, tenancy, REST CRUD beyond health/seed, sync, frontend changes.

---

## Phase 7 — Tenancy + Auth

**Repo:** `Aquaflow-api`

**Outcome:** Multi-tenant foundation — stations as tenants; users belong to a station; JWT carries `stationId`; domain tables scoped by `station_id`.

**Tasks (order):**
1. Migration: `stations` table (id, name, slug/code, plan_status placeholder e.g. `trial`/`active`/`suspended`, created_at)
2. Migration: add **`station_id`** to settings, inventory, products, customers, riders, deliveries, utang, payments (FKs + indexes); backfill existing seed rows into one demo station if DB already seeded
3. Migration: `users` table (id, station_id, email, password_hash, role e.g. `owner`/`staff`, created_at); unique email per station or globally as documented
4. `POST /auth/register` — create station + owner user (bcrypt); return JWT `{ sub, stationId }`
5. `POST /auth/login` — verify credentials; return same JWT shape
6. Middleware: `Authorization: Bearer` → attach `user` + `stationId`; reject missing/invalid token with `401`
7. Protect all non-health mutating routes (and future CRUD/sync) with auth middleware
8. Document token lifetime, register/login payloads, and `401` / `403` shapes
9. Update seed to create one station + owner (and keep demo domain data under that `station_id`)

**Exit criteria:** Register/login work; JWT includes `stationId`; unauthenticated writes fail; domain rows are tied to a station.

**Out of scope:** OAuth, billing (Phase 12), public marketing signup UX (Phase 11), frontend login UI (Phase 10), inviting second users (Phase 11).

---

## Phase 8 — Tenant-scoped CRUD

**Repo:** `Aquaflow-api`

**Outcome:** Full REST API for domain entities; every operation filtered by JWT `stationId`.

**Tasks (order):**
1. REST CRUD for products, customers, riders, deliveries, utang, payments — always `WHERE station_id = ?`
2. Settings get/update; inventory get + refill/adjust — singleton **per station**
3. Complete-delivery endpoint matching frontend `completeDelivery` rules (within station)
4. Cascade delete customer → deliveries + utang + payments (same station only)
5. Balance helpers: `sum(utang) − sum(payments)` scoped to station + customer
6. Cross-tenant ID access returns `403` or empty/`404` (document choice; prefer no leakage)
7. Input validation; consistent JSON error body
8. API tests: balance, cascade, and tenant isolation (user A cannot read station B)

**Exit criteria:** Entity round-trips via API; cascade/balance match domain rules; two stations’ data do not leak.

**Out of scope:** Sync endpoints, frontend wiring, PWA, billing.

---

## Phase 9 — Tenant-scoped sync

**Repo:** `Aquaflow-api`

**Outcome:** Versioned push/pull so clients reconcile offline changes for **one station**.

**Tasks (order):**
1. Add `updated_at` (and `deleted_at` / tombstones) to syncable tables (already station-scoped)
2. `POST /sync/pull` — records for JWT `stationId` changed since client cursor
3. `POST /sync/push` — apply client mutations only for that `stationId`
4. Conflict policy default: **last-write-wins per record** (document clearly)
5. OpenAPI or markdown contract for Phase 10
6. Tests: two devices on same station converge; device on another station sees none of that data

**Exit criteria:** Same-station clients converge via push/pull; cross-station sync isolation holds.

**Out of scope:** Frontend sync client, websockets, CRDTs, billing.

---

## Phase 10 — Client sync

**Repo:** **Aquaflow** (this frontend)

**Outcome:** Station operators sign in, enable sync, keep working offline; localStorage remains primary when offline.

**Tasks (order):**
1. API base URL + auth token storage (document SPA limits)
2. Settings: login/logout (station user), enable/disable sync, connection status
3. Sync client: push dirty local changes; pull remote; merge into `aquaFlow_v1` for that station
4. Autosave writes localStorage first; queue sync when online
5. Toast/UI for sync success, auth failure, conflict notices (LWW)
6. Keep JSON backup/restore as a safety net

**Exit criteria:** Offline edits survive refresh; after reconnect, push/pull updates server and a second browser; sync-off still usable locally.

**Out of scope:** PWA, Xendit UI, changing API unless contract bugs (fix in api repo).

---

## Phase 11 — SaaS onboarding

**Repos:** `Aquaflow-api` + **Aquaflow**

**Outcome:** New stations can self-serve signup; owners can invite another user to the same station.

**Tasks (order):**
1. Public signup API/flow (may refine Phase 7 register): station name + owner email/password → trial station
2. Invite user endpoint (owner only): create staff user under same `station_id` or invite token
3. Frontend: signup / accept-invite screens (minimal, token-aligned)
4. Server-side station profile fields used by Settings sync
5. Document trial defaults (`plan_status = trial`)

**Exit criteria:** New station signs up without manual DB seed; second user can join same tenant and sync.

**Out of scope:** Xendit checkout, platform super-admin.

---

## Phase 12 — Subscriptions

**Repos:** `Aquaflow-api` + **Aquaflow** (billing UX)

**Outcome:** Stations subscribe via **Xendit**; plan status gates premium capabilities (e.g. sync or seat limits — document chosen gates).

**Tasks (order):**
1. Xendit plan amount/code via env; map to `stations.plan_status` / plan id columns
2. Checkout session + cancel-subscription endpoints (Xendit Payment Session + deactivate plan)
3. Webhooks: update station plan on activate/cancel/cycle failure
4. Middleware or sync guard: enforce plan for gated features
5. Frontend: upgrade / manage subscription entry points
6. Never commit Xendit secret keys; use env only

**Exit criteria:** Test-mode Xendit checkout updates station plan; gated feature rejects suspended/unpaid stations.

**Out of scope:** Full custom billing console, non-Xendit providers, PWA.

---

## Phase 13 — Platform ops

**Repo:** `Aquaflow-api` (+ thin admin UI in Aquaflow or separate internal page)

**Outcome:** Operator can list stations and suspend a tenant.

**Tasks (order):**
1. Super-admin user flag or separate admin credentials (document)
2. `GET /admin/stations`, `POST /admin/stations/:id/suspend` (and unsuspend)
3. Suspended stations cannot sync or login (document behavior)
4. Minimal UI or authenticated API-only is acceptable if documented

**Exit criteria:** Suspended station is blocked; list shows tenant status.

**Out of scope:** Full CRM, analytics warehouse, rewriting Xendit billing UX.
