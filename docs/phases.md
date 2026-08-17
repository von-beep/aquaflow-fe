# AquaFlow — Phase specs (0–5)

Build only the active phase. Update [CURRENT_PHASE.md](./CURRENT_PHASE.md) when exiting a phase.

**Phases 6–13 (Express + MySQL API, multi-tenant SaaS, sync, Xendit):** see [backend-phases.md](./backend-phases.md) and [BACKEND_ROADMAP.md](./BACKEND_ROADMAP.md). Those phases use a separate **`Aquaflow-api`** repository — not a monorepo. Tenancy starts in **Phase 7**.

---

## Phase 0 — Foundation

**Outcome:** Dev server runs; sidebar + mobile nav; 9 routes with stub pages; design tokens ported.

**Tasks (order):**
1. Confirm Vite + React Router; configure `@/` → `src/`
2. Port CSS tokens/layout from `aquaflow.html` into `src/styles/`
3. Build `AppShell` (desktop sidebar + bottom mobile nav)
4. Wire routes: dash, deliv, routes, cust, utang, inv, coll, rep, settings (stubs OK)
5. Update title/favicon; `npm run build` succeeds

**Exit criteria:** Navigate all 9 screens on desktop and narrow viewport.

**Out of scope:** Persistence, forms, charts, domain logic.

---

## Phase 1 — Core data

**Outcome:** Typed model, seed data, localStorage load/save, Settings backup/restore/reset.

**Tasks (order):**
1. `src/domain/types.ts` — settings, inventory, products, customers, riders, deliveries, utang, payments
2. `seed()` matching HTML demo data; `uid`, date helpers, money helpers
3. Persistence load/save under `aquaFlow_v1` + React context provider
4. Settings page: station name/phone/currency; download JSON; restore; danger reset
5. Toast/autosave feedback optional but preferred

**Exit criteria:** Refresh keeps data; backup JSON round-trips; reset reseeds.

**Out of scope:** Delivery/utang/inventory screens beyond settings.

---

## Phase 2 — Operations

**Outcome:** Customers, riders, deliveries CRUD; complete → pay; rider routes board.

**Tasks (order):**
1. Customers list/search/CRUD (gallons on hand, notes)
2. Riders CRUD (from routes page or shared)
3. Deliveries: filters (Today/All/status), search, create/edit/delete, set In Progress
4. Complete delivery modal: Cash | GCash | Utang; update inventory + gallonsOut
5. Rider Routes: date picker, stops per rider, Done → complete flow

**Exit criteria:** Full delivery lifecycle works offline like the HTML app.

**Out of scope:** Dashboard charts, reports, utang ledger UI.

---

## Phase 3 — Credit & inventory

**Outcome:** Utang list + ledger, collections, inventory refill/adjust, products.

**Tasks (order):**
1. Utang list sorted by balance; detail ledger (utang + bayad)
2. Add utang / receive payment modals; edit/delete ledger entries
3. Collections page (payment history + month total)
4. Gallon inventory KPIs, refill empties → full, adjust counts
5. Products & pricing CRUD; gallons-per-customer table

**Exit criteria:** Balance math and gallon swaps match domain rules in `.cursor/rules/aquaflow-domain.mdc`.

**Out of scope:** Dashboard charts, CSV/print reports.

---

## Phase 4 — Insights

**Outcome:** Dashboard KPIs/charts, reports with print + CSV; HTML parity with KPI fix.

**Tasks (order):**
1. Dashboard: today deliveries, inventory, utang total, **today’s sales** (not a second utang card)
2. Sales last-7-days SVG chart; delivery status donut
3. Recent deliveries + top utang tables
4. Reports: date range, rider performance, delivery table
5. Print stylesheet + CSV export

**Exit criteria:** Parity with HTML dashboard/reports except intentional KPI fix.

**Out of scope:** PWA, auth, cloud sync.

---

## Phase 5 — Hardening

**Outcome:** Data integrity, a11y, automated tests.

**Tasks (order):**
1. Cascade delete customer → deliveries + utang + payments
2. Ensure viewport allows zoom (`user-scalable` not locked)
3. Vitest: `custBal`, complete-delivery inventory mutations
4. Fix any parity gaps found in manual QA
5. `npm test` and `npm run build` pass

**Exit criteria:** Known HTML gaps fixed; tests green; build clean.

**Out of scope:** Backend beyond Phase 5 local app; multi-user/SaaS (see Phases 6–13 in [backend-phases.md](./backend-phases.md)); installable PWA still later.
