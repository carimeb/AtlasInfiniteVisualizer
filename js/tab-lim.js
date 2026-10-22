// ─── TAB 6 — PREVIEW LIMITATIONS & SOURCES ───────────────────────────────────

function limRender() {
  const hero = [
    ['AWS', tx('only cloud in preview — others planned', 'única cloud no preview — outras planejadas')],
    [tx('10 regions', '10 regiões'), tx('AWS regions with Infinite support · 1 region per cluster', 'regiões AWS com Infinite · 1 região por cluster')],
    ['M10–M60', tx('General · Low-CPU M40–M60', 'General · Low-CPU M40–M60')],
    ['128 TB', tx('logical data per replica set (HA shard)', 'dados lógicos por replica set (HA shard)')],
    [tx('7 nodes', '7 nós'), tx('2 electable + up to 5 read-only/analytics', '2 elegíveis + até 5 read-only/analytics')],
    ['9.0+', tx('MongoDB version, always latest', 'versão do MongoDB, sempre a mais recente')],
  ];
  $('lim-hero').innerHTML = hero.map(([b, s]) => `<div class="h"><div class="big">${b}</div><div class="sm">${s}</div></div>`).join('');
  const regions = INF_REGIONS.map(([r, n]) => `<code>${r}</code> ${n}`).join(' · ');

  const groups = [
    ['🌎', tx('Topology & clouds', 'Topologia e clouds'), [
      ['no', tx('<b>Multi-region clusters</b> — all nodes of an Atlas Infinite cluster deploy in the same region.', '<b>Clusters multi-region</b> — todos os nós de um cluster Atlas Infinite ficam na mesma região.'), ['D1', 'D6']],
      ['no', tx('<b>Multi-cloud clusters</b> — Atlas Infinite deploys on AWS only during the preview.', '<b>Clusters multi-cloud</b> — o Atlas Infinite roda apenas na AWS durante o preview.'), ['D1', 'B1']],
      ['plan', tx('<b>Other cloud providers</b> and <b>Atlas for Government</b> — currently planned for the future.', '<b>Outros cloud providers</b> e <b>Atlas for Government</b> — planejados para o futuro.'), ['B1']],
      ['lim', tx(`<b>10 AWS regions:</b> ${regions}.`, `<b>10 regiões AWS:</b> ${regions}.`), ['D12']],
      ['no', tx('<b>Changing cloud provider or region</b> after creating the cluster.', '<b>Trocar de cloud provider ou região</b> depois de criar o cluster.'), ['D3']],
      ['no', tx('<b>Sharded clusters</b> — no horizontal write scaling yet.', '<b>Clusters shardeados</b> — ainda sem escala horizontal de escrita.'), ['D1']],
      ['no', tx('<b>Global Clusters</b> — and therefore no global writes.', '<b>Global Clusters</b> — e, portanto, sem global writes.'), ['D1']],
      ['no', tx('<b>Additional electable nodes</b> — always 2 (primary + standby).', '<b>Nós elegíveis adicionais</b> — sempre 2 (primário + standby).'), ['D6']],
    ]],
    ['🔎', tx('Search & AI', 'Search e IA'), [
      ['no', tx('<b>Atlas Search</b> — not supported on Atlas Infinite clusters in public preview.', '<b>Atlas Search</b> — não suportado em clusters Atlas Infinite no public preview.'), ['D1']],
      ['no', tx('<b>Atlas Vector Search</b> — not supported on Atlas Infinite clusters in public preview.', '<b>Atlas Vector Search</b> — não suportado em clusters Atlas Infinite no public preview.'), ['D1', 'D13']],
      ['no', tx('<b>Search Nodes</b> — not supported.', '<b>Search Nodes</b> — não suportados.'), ['D2', 'D6']],
      ['no', tx('<b>MongoDB MCP Server</b> and <b>MongoDB Agent Skills</b>.', '<b>MongoDB MCP Server</b> e <b>MongoDB Agent Skills</b>.'), ['D1']],
      ['lim', tx('<b>AI Cluster Assistant</b> is aware of Atlas Infinite clusters but lacks full context on their capabilities.', 'O <b>AI Cluster Assistant</b> reconhece clusters Atlas Infinite, mas sem contexto completo das capacidades.'), ['D1']],
    ]],
    ['⚙', tx('Cluster & operations', 'Cluster e operação'), [
      ['lim', tx('<b>Tiers:</b> M10–M60 General and M40–M60 Low-CPU; M80 and larger not supported.', '<b>Tiers:</b> M10–M60 General e M40–M60 Low-CPU; M80 ou maiores não suportados.'), ['D1', 'D3']],
      ['no', tx('<b>No uptime SLA</b> during the public preview.', '<b>Sem SLA de uptime</b> durante o public preview.'), ['D1']],
      ['no', tx('<b>Edition is fixed at creation</b> — you can\'t convert a cluster between Atlas Core and Atlas Infinite.', '<b>A edição é definida na criação</b> — não é possível converter um cluster entre Atlas Core e Atlas Infinite.'), ['D1', 'D11']],
      ['lim', tx('<b>MongoDB 9.x</b>, always “Latest Version With Auto Upgrades”.', '<b>MongoDB 9.x</b>, sempre “Latest Version With Auto Upgrades”.'), ['D1', 'D11']],
      ['no', tx('<b>Default write concern</b> can\'t be changed — it is always <code>w:"majority"</code>.', '<b>Write concern padrão</b> não pode ser alterado — é sempre <code>w:"majority"</code>.'), ['D2', 'D20']],
      ['no', tx('<b>Locally attached NVMe</b> storage.', 'Storage <b>NVMe local</b>.'), ['D1']],
      ['lim', tx('Automate with the Atlas UI, Admin API, Terraform or <code>atlas api clusters …</code> — the <code>atlas clusters</code> commands don\'t include Atlas Infinite fields.', 'Automatize com a UI do Atlas, Admin API, Terraform ou <code>atlas api clusters …</code> — os comandos <code>atlas clusters</code> não incluem os campos do Atlas Infinite.'), ['D3', 'D20']],
      ['no', tx('<b>Atlas Kubernetes Operator</b>.', '<b>Atlas Kubernetes Operator</b>.'), ['D1', 'D15']],
      ['no', tx('<b>MongoDB logs</b>: no downloads or syncs to external services.', '<b>Logs do MongoDB</b>: sem download nem sync para serviços externos.'), ['D1']],
      ['lim', tx('<b>mongostat</b> reports incomplete metrics; <b>mongotop --locks</b> returns an error.', '<b>mongostat</b> traz métricas incompletas; <b>mongotop --locks</b> retorna erro.'), ['D1']],
      ['no', tx('<b>Atlas Charts</b> and <b>MongoDB for VS Code</b>.', '<b>Atlas Charts</b> e <b>MongoDB for VS Code</b>.'), ['D1']],
    ]],
    ['💾', tx('Data & storage', 'Dados e storage'), [
      ['no', tx('<b>Online Archive</b>.', '<b>Online Archive</b>.'), ['D1', 'D16']],
      ['lim', tx('Writes <b>may be throttled before</b> reaching the max storage limit, to preserve availability.', 'Escritas <b>podem sofrer throttling antes</b> de atingir o limite máximo de storage, para preservar a disponibilidade.'), ['D4']],
      ['yes', tx('Supported: <b>Atlas Data Federation</b>, <b>Atlas Stream Processing</b>, <b>SQL Interface</b> (enabled directly on the cluster), <b>PrivateLink</b>, mongosh and Compass.', 'Suportados: <b>Atlas Data Federation</b>, <b>Atlas Stream Processing</b>, <b>SQL Interface</b> (direto no cluster), <b>PrivateLink</b>, mongosh e Compass.'), ['D1']],
    ]],
    ['🗄', tx('Backup', 'Backup'), [
      ['lim', tx('Point-in-time restore within the <b>24-hour</b> continuous window; snapshots retained up to 3 years.', 'Restore point-in-time dentro da janela contínua de <b>24 horas</b>; snapshots retidos por até 3 anos.'), ['D3', 'D20', 'D1']],
      ['no', tx('No collection-level restore, cross-region snapshot copies, snapshot download / local restore, or archived-snapshot import.', 'Sem restore por coleção, cópia de snapshots entre regiões, download de snapshot / restore local ou importação de snapshots arquivados.'), ['D1']],
      ['no', tx('No <b>cross-organization</b> restores; with customer-managed keys, restore only within the same project.', 'Sem restore <b>entre organizações</b>; com chaves do cliente, restore apenas no mesmo projeto.'), ['D1', 'D9']],
      ['no', tx('No backup/restore or live migration <b>between Atlas Core and Atlas Infinite</b>.', 'Sem backup/restore ou live migration <b>entre Atlas Core e Atlas Infinite</b>.'), ['D1']],
    ]],
    ['🔐', tx('Migration & security', 'Migração e segurança'), [
      ['no', tx('<b>Live migration</b> (mongosync-based pull) into Atlas Infinite.', '<b>Live migration</b> (pull baseado em mongosync) para o Atlas Infinite.'), ['D14', 'D1']],
      ['lim', tx('Load data with <b>mongodump/mongorestore</b> (needs a write freeze; no <code>--oplog</code>/<code>--oplogReplay</code>), <b>mongoimport</b> or bulk writes.', 'Carregue dados com <b>mongodump/mongorestore</b> (exige congelar escritas; sem <code>--oplog</code>/<code>--oplogReplay</code>), <b>mongoimport</b> ou bulk writes.'), ['D10', 'D1']],
      ['lim', tx('<b>Customer-managed keys</b> only via AWS KMS (no Azure Key Vault / Google Cloud KMS).', '<b>Chaves gerenciadas pelo cliente</b> apenas via AWS KMS (sem Azure Key Vault / Google Cloud KMS).'), ['D1']],
      ['yes', tx('<b>Encryption is mandatory</b>: data is encrypted on the compute node before it reaches the storage layer, which can\'t read it.', '<b>Criptografia obrigatória</b>: os dados são criptografados no nó de compute antes de chegar à camada de storage, que não consegue lê-los.'), ['D1', 'D19']],
    ]],
    ['🧭', tx('Choosing during the preview', 'Como escolher durante o preview'), [
      ['lim', tx('MongoDB positions <b>Atlas Core as the default for production</b> while Infinite is in public preview; Infinite is an opt-in choice for spiky, unpredictable workloads.', 'A MongoDB posiciona o <b>Atlas Core como padrão para produção</b> enquanto o Infinite está em public preview; o Infinite é uma escolha opcional para workloads com picos e imprevisíveis.'), ['B7']],
      ['yes', tx('Pick Core when you need multi-region, multi-cloud, sharding, Search/Vector Search or fixed, predictable capacity.', 'Escolha o Core quando precisar de multi-region, multi-cloud, sharding, Search/Vector Search ou capacidade fixa e previsível.'), ['B6', 'B7']],
    ]],
  ];
  const ico = { no: '✕', lim: '!', yes: '✓', plan: '→' };
  // Essentials: the restrictions that matter most when positioning Atlas Infinite
  const key = [
    ['no', tx('Multi-region clusters', 'Clusters multi-region')],
    ['no', tx('Multi-cloud (AWS only for now)', 'Multi-cloud (por enquanto só AWS)')],
    ['no', tx('Atlas Search', 'Atlas Search')],
    ['no', tx('Atlas Vector Search', 'Atlas Vector Search')],
    ['no', tx('Sharded & Global Clusters', 'Clusters shardeados e Global Clusters')],
    ['no', tx('Uptime SLA (during preview)', 'SLA de uptime (durante o preview)')],
    ['lim', tx('Tiers M10–M60 (no M80+)', 'Tiers M10–M60 (sem M80+)')],
    ['no', tx('Online Archive · Kubernetes Operator', 'Online Archive · Kubernetes Operator')],
    ['no', tx('Live migration from Atlas Core', 'Live migration a partir do Atlas Core')],
    ['plan', tx('Other clouds & Atlas for Government: planned', 'Outras clouds e Atlas for Government: planejados')],
  ];
  $('lim-basic').innerHTML = `<div class="card-title">${tx('Not available yet in the public preview', 'Ainda não disponível no public preview')}</div>
    <div class="mini-list">${key.map(([k, t]) => `<div class="lim-item"><span class="ico ${k}">${ico[k]}</span><span><b>${t}</b></span></div>`).join('')}</div>`;

  $('lim-grid').innerHTML = groups.map(([i, t, items]) => `<div class="card lim-group" style="margin-bottom:0"><h3>${i} ${t}</h3>
    ${items.map(([k, h, ids]) => `<div class="lim-item"><span class="ico ${k}">${ico[k]}</span><span>${h}${src(...ids)}</span></div>`).join('')}</div>`).join('');

  $('src-list').innerHTML = Object.entries(SOURCES).map(([id, s]) =>
    `<li><span class="sid">${src(id)}</span><a href="${s.url}" target="_blank" rel="noopener">${s.t}</a></li>`).join('');
}

function footRender() {
  $('foot').innerHTML = tx(
    `Educational, unofficial tool · based on MongoDB public documentation, blog posts and press releases as of October 2026 · Atlas Infinite is in Public Preview and may change · simplified illustrations are labelled as such · see <a href="javascript:switchTab('lim')">sources</a>`,
    `Ferramenta educativa e não oficial · baseada em documentação pública, posts de blog e press releases da MongoDB até outubro de 2026 · o Atlas Infinite está em Public Preview e pode mudar · ilustrações simplificadas estão sinalizadas · veja as <a href="javascript:switchTab('lim')">fontes</a>`);
}
