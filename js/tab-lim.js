// ─── TAB 6 — PREVIEW LIMITATIONS & SOURCES ───────────────────────────────────

function limRender() {
  const hero = [
    ['AWS', tx('only cloud in preview — others planned', 'única cloud no preview — outras planejadas')],
    [tx('1 region', '1 região'), tx('single-region clusters only', 'apenas clusters single-region')],
    ['M10–M60', tx('General · Low-CPU M40–M60', 'General · Low-CPU M40–M60')],
    ['128 TB', tx('logical data per replica set', 'dados lógicos por replica set')],
    [tx('7 nodes', '7 nós'), tx('2 electable + up to 5 read-only/analytics', '2 elegíveis + até 5 read-only/analytics')],
    ['9.0+', tx('MongoDB version, always latest', 'versão do MongoDB, sempre a mais recente')],
  ];
  $('lim-hero').innerHTML = hero.map(([b, s]) => `<div class="h"><div class="big">${b}</div><div class="sm">${s}</div></div>`).join('');

  const groups = [
    ['🌎', tx('Topology & clouds', 'Topologia e clouds'), [
      ['no', tx('<b>Multi-region clusters</b> — all nodes of an Atlas Infinite cluster deploy in the same region.', '<b>Clusters multi-region</b> — todos os nós de um cluster Atlas Infinite ficam na mesma região.'), ['D1', 'D6']],
      ['no', tx('<b>Multi-cloud</b> — Atlas Infinite deploys on AWS only during the preview.', '<b>Multi-cloud</b> — o Atlas Infinite roda apenas na AWS durante o preview.'), ['D1', 'B1']],
      ['plan', tx('<b>Other cloud providers</b> and <b>Atlas for Government</b> — currently planned for the future.', '<b>Outros cloud providers</b> e <b>Atlas for Government</b> — planejados para o futuro.'), ['B1']],
      ['lim', tx('<b>Select AWS regions</b> only — see the “Atlas Infinite Support” column.', '<b>Apenas algumas regiões AWS</b> — veja a coluna “Atlas Infinite Support”.'), ['D12']],
      ['no', tx('<b>Sharded clusters</b> — no horizontal write scaling yet.', '<b>Clusters shardeados</b> — ainda sem escala horizontal de escrita.'), ['D1']],
      ['no', tx('<b>Global Clusters</b> (zone sharding).', '<b>Global Clusters</b> (zone sharding).'), ['D1']],
    ]],
    ['🔎', tx('Search & AI', 'Search e IA'), [
      ['no', tx('<b>Atlas Search</b> — not supported on Atlas Infinite clusters in public preview.', '<b>Atlas Search</b> — não suportado em clusters Atlas Infinite no public preview.'), ['D1']],
      ['no', tx('<b>Atlas Vector Search</b> — not supported on Atlas Infinite clusters in public preview.', '<b>Atlas Vector Search</b> — não suportado em clusters Atlas Infinite no public preview.'), ['D1', 'D13']],
      ['no', tx('<b>Search Nodes</b> — not supported.', '<b>Search Nodes</b> — não suportados.'), ['D1']],
    ]],
    ['⚙', tx('Cluster & operations', 'Cluster e operação'), [
      ['lim', tx('<b>Tiers:</b> M10–M60 General and M40–M60 Low-CPU; M80 and larger not supported.', '<b>Tiers:</b> M10–M60 General e M40–M60 Low-CPU; M80 ou maiores não suportados.'), ['D1', 'D3']],
      ['no', tx('<b>No uptime SLA</b> during the public preview.', '<b>Sem SLA de uptime</b> durante o public preview.'), ['D1']],
      ['lim', tx('<b>MongoDB 9.0+</b>, always “Latest Version With Auto Upgrades” — no manual version pinning.', '<b>MongoDB 9.0+</b>, sempre “Latest Version With Auto Upgrades” — sem fixar versão manualmente.'), ['D1', 'D11']],
      ['no', tx('<b>Edition is fixed at creation</b> — you can\'t convert a cluster between Atlas Core and Atlas Infinite.', '<b>A edição é definida na criação</b> — não é possível converter um cluster entre Atlas Core e Atlas Infinite.'), ['D11', 'D3']],
      ['lim', tx('Create via Atlas UI, Admin API or <code>atlas api</code> — <code>atlas clusters create</code> always creates Atlas Core.', 'Crie pela UI do Atlas, Admin API ou <code>atlas api</code> — <code>atlas clusters create</code> sempre cria Atlas Core.'), ['D11']],
      ['no', tx('<b>Atlas Kubernetes Operator</b> doesn\'t manage Atlas Infinite clusters.', '<b>Atlas Kubernetes Operator</b> não gerencia clusters Atlas Infinite.'), ['D1', 'D15']],
      ['lim', tx('<b>mongostat / mongotop</b>: limited support.', '<b>mongostat / mongotop</b>: suporte limitado.'), ['D1']],
    ]],
    ['💾', tx('Data & storage', 'Dados e storage'), [
      ['no', tx('<b>Online Archive</b> — not supported.', '<b>Online Archive</b> — não suportado.'), ['D1', 'D16']],
      ['lim', tx('Writes <b>may be throttled before</b> reaching the max storage limit, to preserve availability.', 'Escritas <b>podem sofrer throttling antes</b> de atingir o limite máximo de storage, para preservar a disponibilidade.'), ['D4']],
      ['yes', tx('<b>Atlas Data Federation</b> and <b>Atlas Stream Processing</b> are supported.', '<b>Atlas Data Federation</b> e <b>Atlas Stream Processing</b> são suportados.'), ['D1']],
    ]],
    ['🗄', tx('Backup', 'Backup'), [
      ['lim', tx('Point-in-time restore limited to the <b>last 24 hours</b>; snapshots retained up to 3 years.', 'Restore point-in-time limitado às <b>últimas 24 horas</b>; snapshots retidos por até 3 anos.'), ['D20', 'D1']],
      ['no', tx('No collection-level restore, cross-region snapshot copies, snapshot download / local restore, archived-snapshot import, immutable snapshots, or Core ↔ Infinite backup/restore.', 'Sem restore por coleção, cópia de snapshots entre regiões, download de snapshot / restore local, importação de snapshots arquivados, snapshots imutáveis ou backup/restore Core ↔ Infinite.'), ['D1']],
    ]],
    ['🔐', tx('Migration & security', 'Migração e segurança'), [
      ['no', tx('<b>Live migration</b> (mongosync-based pull) into Atlas Infinite — not supported.', '<b>Live migration</b> (pull baseado em mongosync) para o Atlas Infinite — não suportado.'), ['D14']],
      ['lim', tx('Load data with <b>mongodump/mongorestore</b> (needs a write freeze; no <code>--oplog</code>/<code>--oplogReplay</code>), <b>mongoimport</b> or bulk writes.', 'Carregue dados com <b>mongodump/mongorestore</b> (exige congelar escritas; sem <code>--oplog</code>/<code>--oplogReplay</code>), <b>mongoimport</b> ou bulk writes.'), ['D10']],
      ['lim', tx('<b>Customer-managed keys</b> only via AWS KMS (no Azure Key Vault / Google Cloud KMS).', '<b>Chaves gerenciadas pelo cliente</b> apenas via AWS KMS (sem Azure Key Vault / Google Cloud KMS).'), ['D1']],
    ]],
  ];
  const ico = { no: '✕', lim: '!', yes: '✓', plan: '→' };
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
