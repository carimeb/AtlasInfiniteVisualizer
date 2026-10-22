# MongoDB Atlas Infinite Visualizer

An interactive, browser-based tool that explains **MongoDB Atlas Infinite** — the new deployment option announced at MongoDB.local NYC 2026 (public preview) — and how it handles **high availability, failover, vertical & horizontal scaling, the CAP theorem and backup**.

**▶ Live:** https://carimeb.github.io/AtlasInfiniteVisualizer/ · Portuguese: add `?lang=pt` · deep-link a tab with `?tab=ha` (`arch`, `ha`, `vs`, `hs`, `bk`, `lim`) · pick the view with `?view=basic` or `?view=detailed`

### Two views

* **Essentials** (default) — one "why it matters" message per tab with the technical/commercial value, the main diagram and interaction, and a compact Core vs Infinite comparison. No source chips, event log or advanced settings.
* **Deep dive** — everything: write/read concerns, failover internals, the documented auto-scaling rules with a live "why did/didn't it scale" panel, restore rules, the full official preview-limitations list and every source.

Companion to the [Data Resilience Visualizer](https://carimeb.github.io/DataResilienceVisualizer/) (replica sets, multi-region, multi-cloud on Atlas Core).

> Educational and unofficial. Every factual claim carries a chip (`D1`, `B4`…) that links to the official MongoDB page it comes from; all sources were re-read in full on 2026-10-22. Atlas Infinite is in **Public Preview** — capabilities and docs may change before GA. Anything that is a simplified illustration (animation timings, capacity units, demand curves) is labelled as such in the UI.

---

## The six tabs

| Tab | What you can do |
|---|---|
| **① Architecture & Write Path** | Toggle **Atlas Core ↔ Atlas Infinite**. Animate a write: client → primary → **Log Service replicated across 3 AZs** → ACK on storage-layer majority → standby tails the log → pages materialized to the Page Service and S3. Animate reads per `readPreference`/`readConcern`. Side-by-side Core vs Infinite table. |
| **② High Availability & Failover** | Pick one of the 10 Infinite-supported AWS regions, then click nodes or whole **Availability Zones** to fail them. Watch the **storage layer coordinate failover** (no election), the standby get promoted without log replay, drivers retry, **no rollback**, and a replacement node attach to storage without an initial sync. Lose 2 of 3 AZs to see the storage majority disappear (CP behaviour). *Test Primary Failover* button. |
| **③ Vertical Scaling & Storage** | Pick a tier (M10–M60 General, M40–M60 Low-CPU) to watch a resize that **moves no data**. Run an **AI-agent traffic spike** or a **recurring daily peak** against compute auto-scaling that follows the **documented criteria** (scale up after >90% for 10 min or a 1-h average >75%; scale down only after 4 h below 45%, at most once per 24 h; predictive scales up to 2 tiers ahead of cyclical peaks), with a live "why did/didn't it scale" panel. Ingest data against the **max storage limit** (up to 128 TB; writes blocked near the limit, reads still served). |
| **④ Horizontal Read Scaling** | Add up to **5 read-only / analytics nodes** (7 nodes max) that serve reads in minutes. Change `readPreference` and `readPreferenceTags` (`nodeType`) and watch per-node load. |
| **⑤ Backup & Restore** | Storage-layer backups, **24-hour continuous (point-in-time) window**, snapshots kept up to 3 years, restores as **forks of the log** (zero copy), and which restore targets are allowed. |
| **⑥ Preview Limits & Sources** | The full official list of what isn't available yet — **multi-region, multi-cloud, Atlas Search, Vector Search**, sharding, Global Clusters, Online Archive, live migration, Atlas Charts, MCP Server… — the 10 supported AWS regions, and every official source. |

The **⬡ CAP Positioning** panel (header) follows every setting and simulated failure across all tabs.

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
│   ├── cap.js            # CAP panel model
│   ├── tab-arch.js       # ① architecture & write path
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

Script order matters (globals): `state → i18n → utils → cap → tab-* → main`.

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
