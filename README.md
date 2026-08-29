# Systematica — System Design Playground

A "lint tool" for system architecture. Drag components onto a canvas, wire them
together, and instantly see estimated cost, bottlenecks, a nine-dimensional
quality report, and actionable findings powered by a rule engine.

## 📖 Documentation

Full documentation lives in [`docs/`](docs/):

- **[docs/OVERVIEW.md](docs/OVERVIEW.md)** — Executive summary for management / stakeholders.
- **[docs/RULES.md](docs/RULES.md)** — All 48 rules, each highlighted with severity, dimensions, and rationale.
- **[docs/COMPONENTS.md](docs/COMPONENTS.md)** — Full component catalog (113 items) with AWS / Azure / GCP / On-Prem mappings.
- **[docs/SCORING.md](docs/SCORING.md)** — How the multi-dimensional scoring engine works.

## Stack

- **Frontend:** React 18 + Vite + [React Flow](https://reactflow.dev)
- **Backend:** Node.js + Express
- **Database:** MongoDB (optional — the app runs without it; save/load is disabled)
- **Rule engine:** Custom, in [server/src/engine/](server/src/engine/)

## Feature highlights

- **35+ component types** across 9 categories (Entry, Network, Compute, Data, Storage, Async, Security, Observability, ML/AI).
- **Cloud provider labels**: each component shows AWS / Azure / GCP / On-Prem naming. Provider selector at top of the palette toggles the label shown on the palette and node badge.
- **Searchable palette**: instant filter over label, category, tags, description, and provider names.
- **Multi-dimensional scoring** — Overall grade plus per-dimension score (0-100):
  Scalability, Fault Tolerance, Availability, Performance, Security, Cost Efficiency, Modularity, Observability, Maintainability.
- **30+ rules** covering horizontal scale, multi-AZ, replication, caching, async decoupling, DLQs, WAF, identity, secrets, service mesh, tracing, alerting, headroom, and cost anti-patterns.
- **Live evaluation** — every canvas change re-evaluates the design (debounced).
- **Persistence** — Save / update / delete named designs (requires MongoDB).

## Project layout

```
Systematica/
├── server/          Express API + rule engine + Mongo persistence
│   └── src/
│       ├── engine/  components / bottlenecks / cost / scoring
│       ├── models/  Mongoose Design schema
│       └── routes/  /designs, /evaluate
└── client/          Vite + React Flow UI
    └── src/
        ├── components/   Palette, Canvas, MetricsPanel, NodeConfig
        └── lib/          API client + spec helpers (search, provider labels)
```

## Prerequisites

- Node.js 18+
- MongoDB (optional) — connect string via `MONGO_URI` in [server/.env](server/.env.example).

## Running

Two terminals.

### Backend
```powershell
cd server
copy .env.example .env
npm install
npm run dev            # nodemon on :5000
```

### Frontend
```powershell
cd client
npm install
npm run dev            # Vite on :5173, proxies /api -> :5000
```

Open http://localhost:5173.

## Quality dimensions

| Dimension        | What it measures                                                    |
|------------------|---------------------------------------------------------------------|
| Scalability      | Horizontal scale, autoscaling, headroom, sharding                   |
| Fault Tolerance  | Replication, backups, DLQs, redundant compute                       |
| Availability     | Multi-AZ, HA replicas, redundant ingress                            |
| Performance      | Caching, CDN/edge, tracing, warehouse split from OLTP               |
| Security         | WAF, IdP, gateway auth, mTLS mesh, secret manager                   |
| Cost Efficiency  | Autoscaling on, no unused premium tiers, no idle GPUs               |
| Modularity       | Async boundaries, decoupled services, no shared DBs, orphan-free    |
| Observability    | Metrics + logs + tracing + alerting                                 |
| Maintainability  | Managed services, autoscaling, backups                              |

Overall score is the arithmetic mean of the nine dimensions; grade `A`-`F`.

## Rule engine

Located in [server/src/engine/](server/src/engine/):

- **[components.js](server/src/engine/components.js)** — full component catalog with providers, capacity, cost, and traits (`entry`, `stateful`, `edge`, `security`, `observability`, ...).
- **[bottlenecks.js](server/src/engine/bottlenecks.js)** — propagates load from entry-type nodes through the DAG (cache absorbs by hit-rate, CDN by cacheHitRate, load balancers fan out), then compares to capacity to flag `hot` / `overloaded` nodes.
- **[cost.js](server/src/engine/cost.js)** — sums each component's monthly cost, produces per-item breakdown.
- **[scoring.js](server/src/engine/scoring.js)** — weighted rule set producing per-dimension scores and lint findings.

### Add a rule

Add an entry to the `rules` array in [scoring.js](server/src/engine/scoring.js):

```js
{
  id: 'my-rule-id',
  contributions: { security: 5, faultTolerance: 3 },
  check: ({ nodes, edges, report }) => ({
    passed: /* boolean */,
    severity: 'low' | 'medium' | 'high',
    message: 'Human-readable finding.'
  })
}
```

`contributions` distributes the rule's weight across one or more dimensions.

### Add a component

Add an entry to `COMPONENT_SPECS` in [components.js](server/src/engine/components.js) with `providers`, `defaultConfig`, `tunables`, `capacity(cfg)`, `monthlyCost(cfg)`, and `traits`. It appears in the palette and inspector automatically — the client fetches specs at boot.

## API

- `GET  /api/health` — liveness
- `GET  /api/components` — full component catalog (specs + providers + tunables)
- `POST /api/evaluate` — `{ nodes, edges } → report` (no persistence)
- `GET  /api/designs` — list saved designs
- `GET  /api/designs/:id` — fetch one
- `POST /api/designs` — create
- `PUT  /api/designs/:id` — update
- `DELETE /api/designs/:id` — remove

## Notes

- Cost and capacity numbers are illustrative baselines for interview-style reasoning, not billing accuracy.
- Evaluation is debounced ~300 ms after each canvas change.
- If MongoDB is offline, Save is disabled but the playground remains fully usable.
