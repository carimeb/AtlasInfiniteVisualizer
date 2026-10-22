// ─── GLOBAL STATE ────────────────────────────────────────────────────────────

const S = {
  lang: 'en',
  tab: 'arch',
  // Settings shared by every tab (and by the CAP panel)
  wc: 'wmaj',          // w0 | w1 | wmaj | wnum
  rc: 'local',         // local | available | majority | linearizable | snapshot
  rp: 'primary',       // primary | primaryPreferred | secondary | secondaryPreferred | nearest
  // Extra compute nodes (read-only / analytics), shared by tabs ①, ② and ④
  extra: [],           // [{ id, type:'READ_ONLY'|'ANALYTICS', az, state:'PROVISIONING'|'UP'|'DOWN' }]
  arch: { mode: 'infinite', busy: false },
  ha: {
    azDown: [false, false, false],
    nodes: [],         // electable compute nodes, built by haInitNodes()
    failingOver: false,
    foPhase: -1,
    autoHeal: true,
    region: 'us-east-1',
    timers: [],
  },
  vs: {
    cls: 'general', tier: 'M30', resizing: false,
    asOn: true, predOn: true, minTier: 'M30', maxTier: 'M60',
    pattern: 'spike', running: true, t: 0, series: [],
    limitTB: 128, dataTB: 18,
  },
  hs: { tags: 'none', rps: 5, bi: true },
  bk: { point: 985, target: 'same', busy: false },
};

// ─── CLUSTER TIERS (public preview) ──────────────────────────────────────────
// General: M10–M60 · Low-CPU: M40–M60  [D1, D3]
const TIERS = {
  general: ['M10', 'M20', 'M30', 'M40', 'M50', 'M60'],
  lowcpu:  ['M40', 'M50', 'M60'],
};
// Relative capacity units used ONLY by the illustrative auto-scaling simulation
const TIER_CAP = { M10: 1, M20: 2, M30: 4, M40: 8, M50: 16, M60: 32 };

const AZ_NAMES = ['AZ-a', 'AZ-b', 'AZ-c'];
// AWS regions with Atlas Infinite support in public preview (“Atlas Infinite Support” column) [D12]
const INF_REGIONS = [
  ['us-east-1', 'N. Virginia'], ['us-east-2', 'Ohio'], ['us-west-2', 'Oregon'], ['sa-east-1', 'São Paulo'],
  ['eu-west-1', 'Ireland'], ['eu-west-2', 'London'], ['eu-central-1', 'Frankfurt'],
  ['ap-south-1', 'Mumbai'], ['ap-southeast-1', 'Singapore'], ['ap-southeast-2', 'Sydney'],
];
const MAX_EXTRA = 5;   // read-only + analytics nodes combined, on top of 2 electable [D6]

// ─── OFFICIAL SOURCES ────────────────────────────────────────────────────────
// D* = MongoDB documentation · B* = MongoDB blog / press release / product pages
const SOURCES = {
  D1:  { url: 'https://www.mongodb.com/docs/atlas/infinite/atlas-infinite-landing/', t: 'MongoDB Atlas Infinite: Overview (Atlas docs)' },
  D2:  { url: 'https://www.mongodb.com/docs/atlas/infinite/atlas-infinite-architecture/', t: 'MongoDB Atlas Infinite: Architecture (Atlas docs)' },
  D3:  { url: 'https://www.mongodb.com/docs/atlas/infinite/atlas-infinite-modify-cluster/', t: 'Modify an Atlas Infinite Cluster (Atlas docs)' },
  D4:  { url: 'https://www.mongodb.com/docs/atlas/infinite/atlas-infinite-storage/', t: 'Manage Storage on an Atlas Infinite Cluster (Atlas docs)' },
  D5:  { url: 'https://www.mongodb.com/docs/atlas/cluster-autoscaling-compute-infinite/', t: 'Compute Auto-Scaling on Atlas Infinite (Atlas docs)' },
  D6:  { url: 'https://www.mongodb.com/docs/atlas/cluster-config/multi-cloud-distribution/', t: 'Configure High Availability and Workload Isolation (Atlas docs)' },
  D7:  { url: 'https://www.mongodb.com/docs/atlas/reference/replica-set-tags/', t: 'Query using Pre-Defined Replica Set Tags (Atlas docs)' },
  D8:  { url: 'https://www.mongodb.com/docs/atlas/tutorial/test-resilience/test-primary-failover/', t: 'Test Primary Failover (Atlas docs)' },
  D9:  { url: 'https://www.mongodb.com/docs/atlas/backup/cloud-backup/atlas-infinite-restore/', t: 'Restore an Atlas Infinite Cluster (Atlas docs)' },
  D10: { url: 'https://www.mongodb.com/docs/atlas/import/atlas-infinite-load-data/', t: 'Load Data into an Atlas Infinite Cluster (Atlas docs)' },
  D11: { url: 'https://www.mongodb.com/docs/atlas/tutorial/create-new-cluster/', t: 'Create an Atlas Infinite or Atlas Core Cluster (Atlas docs)' },
  D12: { url: 'https://www.mongodb.com/docs/atlas/reference/amazon-aws/', t: 'Amazon Web Services (AWS) — supported regions, “Atlas Infinite Support” column (Atlas docs)' },
  D13: { url: 'https://www.mongodb.com/docs/vector-search/', t: 'MongoDB Vector Search Overview (docs)' },
  D14: { url: 'https://www.mongodb.com/docs/atlas/live-migration/', t: 'Live Migrate (Pull) a Cluster into Atlas (Atlas docs)' },
  D15: { url: 'https://www.mongodb.com/docs/atlas/operator/current/atlasdeployment-custom-resource/', t: 'AtlasDeployment Custom Resource — Atlas Kubernetes Operator (docs)' },
  D16: { url: 'https://www.mongodb.com/docs/atlas/online-archive/manage-online-archive/', t: 'Manage Online Archives in Atlas (Atlas docs)' },
  D17: { url: 'https://www.mongodb.com/docs/atlas/replica-set-rollbacks/', t: 'Rollbacks During Failover in Atlas (Atlas docs)' },
  D18: { url: 'https://www.mongodb.com/docs/atlas/resilient-application/', t: 'Build a Resilient Application with MongoDB Atlas (Atlas docs)' },
  D19: { url: 'https://www.mongodb.com/legal/customer-service-agreement/technical-and-organizational-security-measures', t: 'Technical and Organizational Security Measures (MongoDB legal)' },
  D20: { url: 'https://www.mongodb.com/docs/atlas/cluster-additional-settings/', t: 'Configure Additional Settings — backup options (Atlas docs)' },
  D21: { url: 'https://www.mongodb.com/docs/atlas/cli/current/command/atlas-backups-restores-start/', t: 'atlas backups restores start — Atlas CLI (docs)' },
  B1:  { url: 'https://www.mongodb.com/company/newsroom/press-releases/mongodb-launches-mongodb-9-0-the-best-version-ever-built-and-atlas-infinite-for-ai-scale-demand', t: 'Press release — MongoDB Launches MongoDB 9.0 … and Atlas Infinite for AI-Scale Demand' },
  B2:  { url: 'https://www.mongodb.com/company/blog/product-release-announcements/everything-announced-mongodb-local-nyc-2026', t: 'Blog — Everything Announced at MongoDB.local NYC 2026' },
  B3:  { url: 'https://www.mongodb.com/company/blog/product-release-announcements/ai-demand-constant-unpredictable-extreme-mongodb-is-built-for-it', t: 'Blog — AI Demand is Constant, Unpredictable, and Extreme. MongoDB is Built for It.' },
  B4:  { url: 'https://www.mongodb.com/company/blog/engineering/ground-beneath-database', t: 'Engineering blog — The Ground Beneath the Database' },
  B5:  { url: 'https://www.mongodb.com/products/updates/now-in-public-preview-atlas-infinite-built-for-extreme-elasticity-and-ai-scale/', t: 'Product update — Atlas Infinite built for Extreme Elasticity and AI-scale' },
  B6:  { url: 'https://www.mongodb.com/products/platform/atlas-database/deployment-options', t: 'MongoDB Atlas Deployment Options: Core vs. Infinite' },
  B7:  { url: 'https://www.mongodb.com/resources/products/platform/atlas-core-vs-atlas-infinite', t: 'MongoDB Atlas Core vs. Atlas Infinite: What’s the Difference?' },
};
