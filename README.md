# MongoDB Atlas Infinite Visualizer

An interactive, browser-based tool that explains **MongoDB Atlas Infinite** — the new deployment option in public preview — and how it handles **high availability, failover, vertical & horizontal scaling and backup**.

**▶ Live:** https://carimeb.github.io/AtlasInfiniteVisualizer/ · Portuguese: add `?lang=pt` · deep-link a tab with `?tab=ha` (`arch`, `ha`, `vs`, `hs`, `bk`, `lim`) · pick the view with `?view=basic` or `?view=detailed`

### Two views

* **Essentials** (default) — the main diagram and interaction, without introductory banners. No source chips or advanced settings. White dashed frames distinguish the primary and standby compute AZs in the Infinite architecture.
* **Deep dive** — everything: the side-by-side Core vs Infinite comparison, write/read concerns, failover internals, an illustrative model of documented auto-scaling rules with a live "why did/didn't it scale" panel, restore rules, the full official preview-limitations list and every source.

Neither view has a bottom event-log panel; the available height is reserved for the diagrams and controls.

Companion to the [Data Resilience Visualizer](https://carimeb.github.io/DataResilienceVisualizer/) (replica sets, multi-region, multi-cloud on Atlas Core).

> Educational and unofficial. Every factual claim carries a chip (`D1`, `B4`…) that links to the official MongoDB page it comes from; all sources were re-read in full on 2026-10-22. Atlas Infinite is in **Public Preview** — capabilities and docs may change before GA. Anything that is a simplified illustration (animation timings, capacity units, demand curves) is labelled as such in the UI.

---

## The six tabs

| Tab | What you can do |
|---|---|
| **① Architecture & Write Path** | Toggle **Atlas Core ↔ Atlas Infinite**. Animate a write: client → primary → **Log Service replicated across 3 AZs** → ACK on storage-layer majority. Background work shows the standby following the log independently of the **Page Materializer**, which feeds phylog to Page Service and oplog + phylog to object storage **in parallel**. Simulations run **step by step only**: the buttons show the total number of steps before starting, each step explains its action, and you click to continue. The last step and completion are explicit. Temporary animation lines and highlights are cleared on completion. Explanations scroll with the page without covering the diagram. Choose **cache hit or cache miss** for repeatable read demonstrations in both views, with labels matching the selected path. This selector affects reads only. Deep dive also exposes `readPreference`/`readConcern`. Side-by-side Core vs Infinite table in Deep dive only. |
| **② High Availability & Failover** | Pick one of the 10 Infinite-supported AWS regions, then click nodes or whole **Availability Zones** to fail them. Watch the **storage layer coordinate failover** (no votes among compute nodes), the warm standby get promoted, drivers retry, and a replacement node attach to storage without an initial sync. **Acknowledged majority writes never roll back; w:1 can roll back in rare failures.** Lose 2 of 3 AZs to see majority writes wait for the storage quorum. *Test Primary Failover* button. |
| **③ Vertical Scaling & Storage** | Pick a tier (M10–M60 General, M40–M60 Low-CPU) to watch a resize that **moves no data**. Run an **AI-agent traffic spike** or a **recurring daily peak** against an illustrative model of **operational-node auto-scaling** (scale up after >90% for 10 min, or 20 min on M10/M20, or a 1-h average >75%; scale down when the 10-min and 4-h CPU averages are below 45% and projected utilization at the lower tier is below 60% in both windows, at most once per 24 h; predictive scales up to 2 tiers ahead of cyclical peaks). CPU and memory share a utilization proxy, WiredTiger cache is assumed below 90%, and recent provisioning/restart guards are not simulated. A live panel explains each scaling decision. Ingest data against the **max storage limit** (up to 128 TB; writes blocked near the limit, reads still served). |
| **④ Horizontal Read Scaling** | Add up to **5 read-only / analytics nodes** (7 nodes max) that serve reads in minutes. Change `readPreference` and `readPreferenceTags` (`nodeType`) and watch per-node load. |
| **⑤ Backup & Restore** | Storage-layer backups, **24-hour continuous (point-in-time) window**, snapshots kept up to 3 years, and allowed restore targets. The animation illustrates the **storage step**: creating a log branch reuses existing data without copying it; the complete restore job includes other steps before the target is ready. General database cloning is identified as a future possibility built on this architecture. |
| **⑥ Preview Limits & Sources** | The full official list of what isn't available yet — **multi-region, multi-cloud, Atlas Search, Vector Search**, sharding, Global Clusters, Online Archive, live migration, Atlas Charts, MCP Server… — the 10 supported AWS regions, and every official source. |

## Run it

No server, no build step required.

* **Modular (development):** open `index.html` in a browser.
* **Single file (sharing/presenting):** `./build.sh` → `dist/atlas-infinite-visualizer.html` (no dependencies besides the Google Font).

## File structure

```
AtlasInfiniteVisualizer/
├── index.html            # HTML + CSS shell (MongoDB 2026 brand palette)
├── js/
│   ├── state.js          # global state S, tiers, official SOURCES registry
│   ├── i18n.js           # EN (in the HTML) + PT-BR dictionary, setLang()
│   ├── utils.js          # helpers, brand colors, SVG icons, packet animation
│   ├── arch-playback.js  # active-time clock and stage controller
│   ├── tab-arch.js       # ① architecture diagrams and explanatory text
│   ├── arch-simulation.js # guided write/read plans and playback controls
│   ├── tab-ha.js         # ② high availability & failover
│   ├── tab-vs.js         # ③ vertical scaling, auto-scaling, storage
│   ├── tab-hs.js         # ④ horizontal read scaling
│   ├── tab-bk.js         # ⑤ backup & restore
│   ├── tab-lim.js        # ⑥ preview limits & sources
│   └── main.js           # tabs, shared settings, init
├── assets/               # official MongoDB logo (unaltered, Spring Green)
├── build.sh              # bundles js/ + logo into dist/atlas-infinite-visualizer.html
└── dist/
```

Script order matters (globals): `state → i18n → utils → arch-playback → tab-arch → arch-simulation → other tab-* → main`.

## Regression checks

Run `node --test tests/*.test.js` with Node.js 18 or newer. The tests use simulated timers to cover guided playback, manual advancement, completion cleanup, cancellation, acknowledgment thresholds, read cache paths, consecutive AZ failures, standby recovery, and operational-node auto-scaling thresholds and time windows. No extra dependencies are required.

## Brand

The header uses the **official MongoDB logo, unaltered**: the paths come from MongoDB's own design system package [`@leafygreen-ui/logo`](https://github.com/mongodb/leafygreen-ui/tree/main/packages/logo) (v11.1.1, `MongoDBLogo`), in its `green-base` color (`#00ED64`, Spring Green) as the brand guidelines recommend on dark backgrounds — see `assets/`.


Colors follow the MongoDB 2026 brand refresh: Slate `#001E2B`, Spring Green `#00ED64`, Forest Green `#00684A`, Evergreen `#023430`, Off-white `#FAFBFC`; Lavender `#F9EBFF` and Mist `#E3FCF7` as accents; chart-only colors (Sky `#00D2FF`) used only in charts, on a Slate surface. Architecture icons use only Spring Green and Slate. Red/amber appear only as status (failure/warning), always with an icon and a label. The logo is not redrawn.

## Official sources

Documentation (`D*`)

* D1 [Atlas Infinite: Overview](https://www.mongodb.com/docs/atlas/infinite/atlas-infinite-landing/)
* D2 [Atlas Infinite: Architecture](https://www.mongodb.com/docs/atlas/infinite/atlas-infinite-architecture/)
* D3 [Modify an Atlas Infinite Cluster](https://www.mongodb.com/docs/atlas/infinite/atlas-infinite-modify-cluster/)
* D4 [Manage Storage on an Atlas Infinite Cluster](https://www.mongodb.com/docs/atlas/infinite/atlas-infinite-storage/)
* D5 [Compute Auto-Scaling on Atlas Infinite](https://www.mongodb.com/docs/atlas/cluster-autoscaling-compute-infinite/)
* D6 [Configure High Availability and Workload Isolation](https://www.mongodb.com/docs/atlas/cluster-config/multi-cloud-distribution/)
* D7 [Query using Pre-Defined Replica Set Tags](https://www.mongodb.com/docs/atlas/reference/replica-set-tags/)
* D8 [Test Primary Failover](https://www.mongodb.com/docs/atlas/tutorial/test-resilience/test-primary-failover/)
* D9 [Restore an Atlas Infinite Cluster](https://www.mongodb.com/docs/atlas/backup/cloud-backup/atlas-infinite-restore/)
* D10 [Load Data into an Atlas Infinite Cluster](https://www.mongodb.com/docs/atlas/import/atlas-infinite-load-data/)
* D11 [Create an Atlas Infinite or Atlas Core Cluster](https://www.mongodb.com/docs/atlas/tutorial/create-new-cluster/)
* D12 [AWS supported regions (Atlas Infinite Support column)](https://www.mongodb.com/docs/atlas/reference/amazon-aws/)
* D13 [MongoDB Vector Search Overview](https://www.mongodb.com/docs/vector-search/)
* D14 [Live Migrate (Pull) a Cluster into Atlas](https://www.mongodb.com/docs/atlas/live-migration/)
* D15 [Atlas Kubernetes Operator — AtlasDeployment](https://www.mongodb.com/docs/atlas/operator/current/atlasdeployment-custom-resource/)
* D16 [Manage Online Archives](https://www.mongodb.com/docs/atlas/online-archive/manage-online-archive/)
* D17 [Rollbacks During Failover in Atlas](https://www.mongodb.com/docs/atlas/replica-set-rollbacks/)
* D18 [Build a Resilient Application with MongoDB Atlas](https://www.mongodb.com/docs/atlas/resilient-application/)
* D19 [Technical and Organizational Security Measures](https://www.mongodb.com/legal/customer-service-agreement/technical-and-organizational-security-measures)
* D20 [Configure Additional Settings (backup)](https://www.mongodb.com/docs/atlas/cluster-additional-settings/)
* D21 [atlas backups restores start — Atlas CLI](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-backups-restores-start/)

Blog, press and product pages (`B*`, vendor claims)

* B1 [Press release — MongoDB 9.0 and Atlas Infinite](https://www.mongodb.com/company/newsroom/press-releases/mongodb-launches-mongodb-9-0-the-best-version-ever-built-and-atlas-infinite-for-ai-scale-demand)
* B2 [Everything Announced at MongoDB.local NYC 2026](https://www.mongodb.com/company/blog/product-release-announcements/everything-announced-mongodb-local-nyc-2026)
* B3 [AI Demand is Constant, Unpredictable, and Extreme](https://www.mongodb.com/company/blog/product-release-announcements/ai-demand-constant-unpredictable-extreme-mongodb-is-built-for-it)
* B4 [Engineering blog — The Ground Beneath the Database](https://www.mongodb.com/company/blog/engineering/ground-beneath-database)
* B5 [Atlas Infinite built for Extreme Elasticity and AI-scale](https://www.mongodb.com/products/updates/now-in-public-preview-atlas-infinite-built-for-extreme-elasticity-and-ai-scale/)
* B6 [Atlas Deployment Options: Core vs. Infinite](https://www.mongodb.com/products/platform/atlas-database/deployment-options)
* B7 [Atlas Core vs. Atlas Infinite: What's the Difference?](https://www.mongodb.com/resources/products/platform/atlas-core-vs-atlas-infinite)
