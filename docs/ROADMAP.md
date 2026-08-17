# AquaFlow — Product Roadmap

> **Last updated:** August 2026  
> **Current phase:** [Roadmap complete through Phase 13](./CURRENT_PHASE.md)  
> **Source reference:** [`aquaflow.html`](../../aquaflow.html) at workspace root  
> **Backend, sync & SaaS:** [BACKEND_ROADMAP.md](./BACKEND_ROADMAP.md)

---

## Vision

**AquaFlow** is an **offline-first multi-tenant SaaS** for Philippine water-refilling shops: deliveries, riders, gallon stock, and suki credit (utang).

Each **station** is a tenant on a shared cloud API. Devices keep working offline via `localStorage`, then sync when online. Operators sign up per station; subscription billing comes after core sync works.

We ship in **phases**. Each phase delivers a usable slice. Do not skip ahead (no auth before local CRUD works, no cloud sync before offline parity, no billing before tenancy + sync).

Phases **0–5** delivered the local React app. Phases **6–13** add **Aquaflow-api**, multi-tenant auth, sync, onboarding, and Xendit subscriptions — see [BACKEND_ROADMAP.md](./BACKEND_ROADMAP.md).

---

## Roadmap at a glance

| Phase | Name | User outcome | Depends on |
|:-----:|------|--------------|------------|
| 0 | [Foundation](#phase-0--foundation) | Runnable Vite app, shell, routed stubs | — |
| 1 | [Core data](#phase-1--core-data) | Typed store, seed, Settings backup/restore | Phase 0 |
| 2 | [Operations](#phase-2--operations) | Customers, deliveries, complete flow, rider routes | Phase 1 |
| 3 | [Credit & inventory](#phase-3--credit--inventory) | Utang ledger, collections, gallon stock, products | Phase 2 |
| 4 | [Insights](#phase-4--insights) | Dashboard charts, reports, print/CSV | Phase 3 |
| 5 | [Hardening](#phase-5--hardening) | Cascade deletes, a11y, domain unit tests | Phase 4 |
| 6 | [API foundation](./BACKEND_ROADMAP.md#phase-6--api-foundation) | Express + MySQL sibling repo, health, seed | Phase 5 |
| 7 | [Tenancy + Auth](./BACKEND_ROADMAP.md#phase-7--tenancy--auth) | Stations as tenants; JWT with `stationId` | Phase 6 |
| 8 | [Tenant-scoped CRUD](./BACKEND_ROADMAP.md#phase-8--tenant-scoped-crud) | REST isolated per station | Phase 7 |
| 9 | [Tenant-scoped sync](./BACKEND_ROADMAP.md#phase-9--tenant-scoped-sync) | Push/pull scoped to station | Phase 8 |
| 10 | [Client sync](./BACKEND_ROADMAP.md#phase-10--client-sync) | Frontend login + sync; local primary offline | Phase 9 |
| 11 | [SaaS onboarding](./BACKEND_ROADMAP.md#phase-11--saas-onboarding) | Public station signup, invite users | Phase 10 |
| 12 | [Subscriptions](./BACKEND_ROADMAP.md#phase-12--subscriptions) | Xendit plans; gate features by plan | Phase 11 |
| 13 | [Platform ops](./BACKEND_ROADMAP.md#phase-13--platform-ops) | Super-admin list/suspend stations | Phase 12 |

**Legend:** Done · In progress · Not started

| Phase | Status |
|:-----:|:------:|
| 0 | Done |
| 1 | Done |
| 2 | Done |
| 3 | Done |
| 4 | Done |
| 5 | Done |
| 6 | Done |
| 7 | Done |
| 8 | Done |
| 9 | Done |
| 10 | Done |
| 11 | Done |
| 12 | Done |
| 13 | Done |

Detailed exit criteria and task lists: [phases.md](./phases.md) (0–5), [backend-phases.md](./backend-phases.md) (6–13).

---

## Phase 0 — Foundation

Scaffold, design tokens from the HTML app, `AppShell` (sidebar + mobile nav), nine route stubs.

## Phase 1 — Core data

Domain types, `seed()`, `localStorage` (`aquaFlow_v1`), Settings: station info, JSON backup/restore, reset.

## Phase 2 — Operations

Customers & riders CRUD; deliveries list/filters/modals; Complete → Cash / GCash / Utang + inventory swap; rider routes board by date.

## Phase 3 — Credit & inventory

Utang list + per-customer ledger; collections history; gallon inventory (refill/adjust); products & pricing.

## Phase 4 — Insights

Dashboard KPIs (no duplicate utang metric), 7-day sales chart, status donut; reports with date range, print, CSV export.

## Phase 5 — Hardening

Cascade-delete customers; allow viewport zoom; Vitest for balance and inventory helpers; `npm run build` clean.

## Phases 6–13 — API, sync & SaaS

Separate **Aquaflow-api** (Express + MySQL), multi-tenant stations from Phase 7, sync, onboarding, Xendit billing, thin platform ops. Offline-first `localStorage` remains the working store on each device. Full detail: [BACKEND_ROADMAP.md](./BACKEND_ROADMAP.md) and [backend-phases.md](./backend-phases.md).

---

## Stack (locked)

**Frontend (this repo)**

- Vite + React 19 + TypeScript + React Router
- Offline-first `localStorage` (`aquaFlow_v1`) — primary store; sync is additive (Phase 10)
- Port visual tokens from `aquaflow.html` — do not invent a new design system

**Backend (sibling repo `Aquaflow-api` — not a monorepo)**

- Node.js + Express + TypeScript
- MySQL 8 with mysql2 + versioned SQL migrations
- Multi-tenant `station_id` isolation (Phases 7+)
- Auth: bcrypt + JWT bearer (`sub` + `stationId`)
- Billing: Xendit (Phase 12)
