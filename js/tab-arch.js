// ─── TAB 1 — ARCHITECTURE & WRITE PATH ───────────────────────────────────────

const AP = {};   // coordinates of the last render, used by the animations

function archSetMode(mode) {
  archResetPlayback();
  S.arch.mode = mode;
  document.querySelectorAll('#arch-seg button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
  archRender();
  archUpdateInfo();
  renderSteps('arch-steps', []);
  $('arch-steps-label').textContent = '';
  log('INFO', 'ARCH', mode === 'core'
    ? tx('Showing Atlas Core — compute and storage coupled on every node', 'Exibindo Atlas Core — compute e storage acoplados em cada nó')
    : tx('Showing Atlas Infinite — compute and storage as independent layers', 'Exibindo Atlas Infinite — compute e storage como camadas independentes'));
}

function archElectable() { return S.ha.nodes; }
function archUpAZ(i) { return !S.ha.azDown[i]; }

function archSetReadCache(value) {
  if (S.arch.busy || !['hit', 'miss'].includes(value)) return;
  S.arch.readCache = value;
  archResetPlayback();
}

function archRender() {
  if (S.arch.mode === 'core') return archRenderCore();
  const nodes = archElectable();
  const extra = S.extra;
  let s = `<svg viewBox="0 0 800 580" width="100%" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="arch-async-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#00684A"/></marker></defs>`;

  // Bands
  s += `<rect x="20" y="64" width="760" height="156" rx="12" fill="#E3FCF7" stroke="rgba(0,104,74,.35)" stroke-width="1.5"/>
    <text x="34" y="83" font-size="10" font-weight="800" fill="#00684A" letter-spacing="1">${tx('COMPUTE LAYER', 'CAMADA DE COMPUTE')}</text>
    <text class="dt" x="766" y="83" text-anchor="end" font-size="9" fill="rgba(0,30,43,.72)">${tx('queries & transactions · scales by tier and by node count', 'queries e transações · escala por tier e por número de nós')}</text>
    <rect x="20" y="238" width="760" height="332" rx="12" fill="#F9EBFF" stroke="rgba(0,30,43,.16)" stroke-width="1.5"/>
    <text x="34" y="257" font-size="10" font-weight="800" fill="#001E2B" letter-spacing="1">${tx('STORAGE LAYER', 'CAMADA DE STORAGE')}</text>
    <text class="dt" x="766" y="257" text-anchor="end" font-size="9" fill="rgba(0,30,43,.72)">${tx('durability · replication · failover coordination · backup', 'durabilidade · replicação · coordenação de failover · backup')}</text>`;

  // AZ columns
  AP.log = []; AP.materializer = []; AP.page = []; AP.s3 = [];
  for (let i = 0; i < 3; i++) {
    const x0 = 40 + i * 250, down = !archUpAZ(i);
    s += `<rect x="${x0}" y="266" width="220" height="210" rx="9" fill="${down ? '#FDF0EE' : '#fff'}" stroke="${down ? 'rgba(192,57,43,.5)' : 'rgba(0,30,43,.28)'}" stroke-dasharray="5 4" stroke-width="1.3"/>
      <text x="${x0 + 110}" y="283" text-anchor="middle" font-size="9.5" font-weight="700" fill="${down ? '#C0392B' : '#001E2B'}">${AZ_NAMES[i]}${down ? ' — ' + tx('DOWN', 'FORA') : ''}</text>`;
    const lx = x0 + 56, px = x0 + 164, ly = 327, my = 405;
    AP.log.push([lx, ly]); AP.materializer.push([lx, my]); AP.page.push([px, my]); AP.s3.push([lx, 501]);
    s += `<line data-flow="log-materializer" x1="${lx}" y1="${ly + 22}" x2="${lx}" y2="${my - 17}" stroke="#00684A" stroke-width="1.5" class="repl-slow" marker-end="url(#arch-async-arrow)"/>
      <line data-flow="materializer-page" x1="${lx + 50}" y1="${my}" x2="${px - 22}" y2="${my}" stroke="#00684A" stroke-width="1.5" class="repl-slow" marker-end="url(#arch-async-arrow)"/>
      <line data-flow="materializer-object" x1="${lx}" y1="${my + 16}" x2="${lx}" y2="491" stroke="#00684A" stroke-width="1.5" class="repl-slow" marker-end="url(#arch-async-arrow)"/>
      <rect x="${lx - 50}" y="${my - 16}" width="100" height="32" rx="6" fill="${down ? '#FDF0EE' : '#E3FCF7'}" stroke="#00684A"/>
      <text x="${lx}" y="${my - 2}" text-anchor="middle" font-size="9" font-weight="700" fill="#001E2B">Page</text>
      <text x="${lx}" y="${my + 10}" text-anchor="middle" font-size="9" font-weight="700" fill="#001E2B">Materializer</text>`;
    s += logIcon(lx, ly, down) + pageIcon(px, my, down);
    s += `<text x="${lx + 29}" y="323" font-size="9" font-weight="700" fill="#001E2B">Log Service</text>
      <text class="dt" x="${lx + 29}" y="337" font-size="8" fill="rgba(0,30,43,.5)">${tx('consensus replica', 'réplica de consenso')}</text>
      <text class="dt" x="${lx + 8}" y="373" font-size="8" fill="#00684A">${tx('tails log', 'lê o log')}</text>
      <text class="dt" x="${lx + 69}" y="394" text-anchor="middle" font-size="8" fill="#00684A">phylog</text>
      <text x="${px}" y="438" text-anchor="middle" font-size="9" font-weight="700" fill="#00684A">Page Service</text>
      <text class="dt" x="${px}" y="450" text-anchor="middle" font-size="8" fill="rgba(0,30,43,.5)">${tx('materialized pages', 'páginas materializadas')}</text>
      <text class="dt" x="${lx + 8}" y="469" font-size="8" fill="#00684A">oplog + phylog</text>`;
  }
  // Object storage
  s += `<rect x="40" y="492" width="720" height="66" rx="10" fill="#FFFFFF" stroke="rgba(0,30,43,.28)" stroke-width="1.5"/>
    ${bucketIcon(72, 509)}
    <text x="122" y="516" font-size="11" font-weight="700" fill="#001E2B">Object Index Service → Amazon S3</text>
    <text class="dt" x="122" y="532" font-size="9" fill="#001E2B">${tx('durability floor — designed for eleven nines of durability', 'piso de durabilidade — projetado para onze noves de durabilidade')} (blog)</text>
    <text class="dt" x="122" y="546" font-size="8.5" fill="#00684A">${tx('backups, restores and point-in-time recovery also run here, independent of compute', 'backups, restores e point-in-time recovery também rodam aqui, independentes do compute')}</text>`;

  // Compute nodes
  AP.client = [400, 46];
  s += clientBox(400, 8, 300, tx('CLIENT APP', 'APLICAÇÃO CLIENTE'), tx('MongoDB driver — same drivers & APIs as Atlas Core', 'driver MongoDB — mesmos drivers e APIs do Atlas Core'));
  AP.nodes = {};
  const ex = [130, 280];
  nodes.forEach((n, i) => { AP.nodes[n.id] = [ex[i], 140]; });
  // Frame each compute node's AZ before drawing its connections.
  nodes.forEach(n => {
    const [x] = AP.nodes[n.id], down = !archUpAZ(n.az);
    s += `<rect data-compute-az="${AZ_NAMES[n.az]}" x="${x - 55}" y="102" width="110" height="108" rx="9" fill="${down ? '#FDF0EE' : '#fff'}" stroke="${down ? 'rgba(192,57,43,.5)' : 'rgba(0,30,43,.28)'}" stroke-dasharray="5 4" stroke-width="1.3"/>`;
  });
  // lines: client → primary, primary → log replicas, log → standby
  const prim = nodes.find(n => n.role === 'PRIMARY' && n.state === 'UP');
  const stby = nodes.find(n => n.role === 'STANDBY' && n.state === 'UP');
  if (prim) {
    const [px, py] = AP.nodes[prim.id];
    s += `<line x1="400" y1="46" x2="${px}" y2="${py - 24}" stroke="#00684A" stroke-width="1.5" stroke-dasharray="5 4" opacity=".55"/>`;
    AP.log.forEach(([lx, ly], i) => {
      s += `<path d="M${px},${py + 62} C${px},${py + 110} ${lx},${ly - 80} ${lx},${ly - 20}" fill="none" stroke="${archUpAZ(i) ? '#023430' : 'rgba(192,57,43,.5)'}" stroke-width="1.4" opacity=".7" ${archUpAZ(i) ? 'class="repl"' : 'stroke-dasharray="3 4"'}/>`;
    });
  }
  if (stby) {
    const [sx, sy] = AP.nodes[stby.id];
    const li = archUpAZ(stby.az) ? stby.az : [0, 1, 2].find(archUpAZ);
    if (li !== undefined) {
      const [lx, ly] = AP.log[li];
      s += `<path data-connection="log-standby" d="M${lx + 8},${ly - 20} C${lx + 8},${ly - 70} ${sx},${sy + 90} ${sx},${sy + 59}" fill="none" stroke="#00684A" stroke-width="1.3" stroke-dasharray="2 4" stroke-linecap="round" opacity=".8"/>
        <text class="dt" x="${sx + 46}" y="${sy + 34}" font-size="8" fill="#00684A" font-weight="600">${tx('tails the oplog', 'acompanha o oplog')}</text>`;
    }
  }
  nodes.forEach(n => {
    const [x, y] = AP.nodes[n.id];
    const role = n.role, st = n.state;
    const roleLbl = st === 'DOWN' ? tx('DOWN', 'FORA') : (role === 'PRIMARY' ? tx('PRIMARY', 'PRIMÁRIO') : 'STANDBY');
    s += `<g class="${role === 'PRIMARY' && st === 'UP' ? 'gnod' : ''}">${mdbNodeIcon(x, y, 50, st, role)}</g>
      <text x="${x}" y="${y + 38}" text-anchor="middle" font-size="9" fill="rgba(0,30,43,.72)">${n.id} · ${AZ_NAMES[n.az]}</text>
      ${roleBadge(x, y + 44, role, st, roleLbl)}`;
  });
  // Extra nodes (read-only / analytics)
  if (!extra.length) {
    s += `<rect x="400" y="108" width="362" height="66" rx="10" fill="none" stroke="rgba(0,30,43,.4)" stroke-dasharray="5 4"/>
      <text x="581" y="136" text-anchor="middle" font-size="10" font-weight="600" fill="rgba(0,30,43,.5)">${tx('+ up to 5 read-only / analytics nodes', '+ até 5 nós read-only / analytics')}</text>
      <text x="581" y="152" text-anchor="middle" font-size="10.5" fill="rgba(0,30,43,.4)">${tx('add them in tab 4 — they attach to storage, no initial sync', 'adicione na aba 4 — conectam no storage, sem initial sync')}</text>`;
  } else {
    extra.forEach((n, i) => {
      const x = 440 + i * 72, y = 140;
      AP.nodes[n.id] = [x, y];
      const lbl = n.state === 'PROVISIONING' ? tx('ATTACHING', 'CONECTANDO') : n.state === 'DOWN' ? tx('DOWN', 'FORA') : (n.type === 'READ_ONLY' ? 'READ-ONLY' : 'ANALYTICS');
      s += `<g class="${n.state === 'PROVISIONING' ? 'prov' : ''}">${mdbNodeIcon(x, y, 40, n.state, n.type)}</g>
        <text x="${x}" y="${y + 31}" text-anchor="middle" font-size="9" fill="rgba(0,30,43,.72)">${n.id} · ${AZ_NAMES[n.az]}</text>
        ${roleBadge(x, y + 36, n.type, n.state, lbl)}`;
    });
    s += `<text class="dt" x="${440 + (extra.length - 1) * 36}" y="${206}" text-anchor="middle" font-size="8" fill="#00684A">${tx('↓ read pages straight from the Page Service', '↓ leem páginas direto do Page Service')}</text>`;
  }
  s += `</svg>`;
  $('arch-svg').innerHTML = s;
  $('arch-mode-label').textContent = tx('Atlas Infinite · disaggregated', 'Atlas Infinite · desagregado');
  $('arch-legend').innerHTML = archLegend();
}

function archRenderCore() {
  let s = `<svg viewBox="0 0 800 520" width="100%" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="arch-core-repl-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#001E2B"/></marker></defs>`;
  s += `<rect x="20" y="64" width="760" height="380" rx="12" fill="#FAFBFC" stroke="rgba(0,30,43,.14)" stroke-width="1.5"/>
    <text x="34" y="83" font-size="10" font-weight="800" fill="#001E2B" letter-spacing="1">${tx('REPLICA SET — EVERY NODE = COMPUTE + ITS OWN STORAGE', 'REPLICA SET — CADA NÓ = COMPUTE + SEU PRÓPRIO STORAGE')}</text>`;
  AP.client = [400, 46];
  s += clientBox(400, 8, 230, tx('CLIENT APP', 'APLICAÇÃO CLIENTE'), tx('MongoDB driver', 'driver MongoDB'));
  const xs = [160, 400, 640];
  AP.core = xs.map(x => [x, 175]);
  AP.coreDisk = xs.map(x => [x, 300]);
  // Keep a clear replication lane above the cards; draw routes over their backgrounds.
  xs.forEach(x => {
    s += `<rect x="${x - 95}" y="134" width="190" height="248" rx="12" fill="#fff" stroke="rgba(0,30,43,.22)" stroke-width="1.3"/>`;
  });
  s += `<line x1="400" y1="46" x2="160" y2="146" stroke="#00684A" stroke-width="1.5" stroke-dasharray="5 4" opacity=".55"/>`;
  s += `<path data-connection="core-oplog" d="M190,175 H278 V118 H640 V146" fill="none" stroke="#001E2B" stroke-width="1.5" stroke-linejoin="round" class="repl" marker-end="url(#arch-core-repl-arrow)"/>
        <path data-connection="core-oplog" d="M400,118 V146" fill="none" stroke="#001E2B" stroke-width="1.5" class="repl" marker-end="url(#arch-core-repl-arrow)"/>
        <text x="460" y="107" text-anchor="middle" font-size="9" font-weight="600" fill="#001E2B">${tx('oplog replication', 'replicação do oplog')}</text>`;
  xs.forEach((x, i) => {
    s += `<g class="${i === 0 ? 'gnod' : ''}">${mdbNodeIcon(x, 175, 50, 'UP', i === 0 ? 'PRIMARY' : 'SECONDARY')}</g>`;
    s += roleBadge(x, 208, i === 0 ? 'PRIMARY' : 'SECONDARY', 'UP', i === 0 ? tx('PRIMARY', 'PRIMÁRIO') : tx('SECONDARY', 'SECUNDÁRIO'));
    s += `<line x1="${x}" y1="226" x2="${x}" y2="270" stroke="#001E2B" stroke-width="1.3"/>`;
    s += diskIcon(x, 300, 110, 46, tx('full data copy', 'cópia completa'));
    s += `<text class="dt" x="${x}" y="356" text-anchor="middle" font-size="8.5" fill="rgba(0,30,43,.5)">${tx('local volume — sized by tier', 'volume local — dimensionado pelo tier')}</text>`;
  });
  s += `<rect x="40" y="396" width="720" height="36" rx="8" fill="rgba(0,30,43,.05)"/>
    <text x="400" y="411" text-anchor="middle" font-size="9.5" fill="#001E2B" font-weight="600">${tx('Each node stores and replicates a full copy of the data', 'Cada nó armazena e replica uma cópia completa dos dados')}</text>
    <text x="400" y="425" text-anchor="middle" font-size="8.5" fill="rgba(0,30,43,.72)">${tx('Adding or replacing a node means copying data (initial sync) · failover = election by majority vote', 'Adicionar ou substituir um nó implica copiar dados (initial sync) · failover = eleição por voto majoritário')}</text>`;
  s += `<text class="dt" x="400" y="472" text-anchor="middle" font-size="10" fill="rgba(0,30,43,.72)">${tx('Atlas Core runs on AWS, Azure and Google Cloud with the full Atlas feature set —', 'O Atlas Core roda em AWS, Azure e Google Cloud com o conjunto completo de recursos do Atlas —')}</text>
    <text class="dt" x="400" y="487" text-anchor="middle" font-size="10" fill="rgba(0,30,43,.72)">${tx('multi-region, multi-cloud, sharding, Atlas Search and Vector Search.', 'multi-region, multi-cloud, sharding, Atlas Search e Vector Search.')}</text>`;
  s += `</svg>`;
  $('arch-svg').innerHTML = s;
  $('arch-mode-label').textContent = tx('Atlas Core · coupled', 'Atlas Core · acoplado');
  $('arch-legend').innerHTML = `
    <div class="li-leg"><div class="ld" style="background:#00ED64;border:2px solid #001E2B"></div> ${tx('Primary', 'Primário')}</div>
    <div class="li-leg"><div class="ld" style="background:#001E2B"></div> ${tx('Secondary', 'Secundário')}</div>
    <div class="li-leg"><div class="ls-sq" style="background:#fff;border:1.5px solid #001E2B;border-top:4px solid #00ED64"></div> ${tx('Local storage (full copy per node)', 'Storage local (cópia completa por nó)')}</div>`;
}

function archLegend() {
  return `
    <div class="li-leg"><div class="ld" style="background:#00ED64;border:2px solid #001E2B"></div> ${tx('Primary', 'Primário')}</div>
    <div class="li-leg"><div class="ld" style="background:#001E2B"></div> Standby</div>
    <div class="li-leg"><div class="ld" style="background:#fff;border:2.5px solid #001E2B"></div> Read-only</div>
    <div class="li-leg"><div class="ld" style="background:#fff;border:3px solid #00ED64"></div> Analytics</div>
    <div class="li-leg"><div class="ld" style="background:#00ED64;border:1.5px solid #001E2B;width:9px;height:9px"></div> ${tx('write', 'escrita')}</div>
    <div class="li-leg"><div class="ld" style="background:#001E2B;width:9px;height:9px"></div> ${tx('read', 'leitura')}</div>
    <div class="li-leg"><div class="ld" style="background:#00684A;border:1.5px solid #001E2B;width:9px;height:9px"></div> ACK / ${tx('result', 'resultado')}</div>`;
}

// ── Side panel texts ─────────────────────────────────────────────────────────

function archUpdateInfo() {
  archPlaybackUI();
  const core = S.arch.mode === 'core';
  $('arch-cache').value = S.arch.readCache;
  $('arch-mode-desc').innerHTML = core
    ? tx(`<strong>Atlas Core</strong> (the existing Atlas offering, now renamed) keeps compute and storage together on each node of a replica set. Best for steady, predictable workloads; full Atlas feature set.${src('B2', 'B7')}`,
         `<strong>Atlas Core</strong> (a oferta atual do Atlas, agora renomeada) mantém compute e storage juntos em cada nó do replica set. Ideal para workloads estáveis e previsíveis; conjunto completo de recursos do Atlas.${src('B2', 'B7')}`)
    : tx(`<strong>Atlas Infinite</strong> is a new deployment option in Atlas — not a new database. Same document model, drivers and APIs; built for spiky, AI-driven, fast-growing workloads. Runs MongoDB 9.0+ (always latest, auto-upgrades).${src('B3', 'B6', 'D1')}`,
         `<strong>Atlas Infinite</strong> é uma nova opção de deployment no Atlas — não um novo banco de dados. Mesmo document model, drivers e APIs; feito para workloads com picos, guiados por IA e de crescimento rápido. Roda MongoDB 9.0+ (sempre a última versão, com auto-upgrade).${src('B3', 'B6', 'D1')}`);

  const wcDesc = {
    w0: core ? tx('<strong>w:0</strong> — fire-and-forget. No acknowledgment; fastest, but the client never knows if the write landed.', '<strong>w:0</strong> — fire-and-forget. Sem confirmação; mais rápido, mas o cliente nunca sabe se a escrita foi gravada.')
             : tx(`<strong>w:0</strong> — accepted as sent: fire-and-forget, no acknowledgment.${src('D2')}`, `<strong>w:0</strong> — aceito como enviado: fire-and-forget, sem confirmação.${src('D2')}`),
    w1: core ? tx('<strong>w:1</strong> — ACK after the primary applies the write. May be rolled back if the primary fails before replicating.', '<strong>w:1</strong> — ACK depois que o primário aplica a escrita. Pode sofrer rollback se o primário falhar antes de replicar.')
             : tx(`<strong>w:1</strong> — accepted as sent. The storage layer guarantees the write and it returns sooner than <code>w:"majority"</code>, but <strong>Atlas can roll it back in rare failures</strong>.${src('D2')}`, `<strong>w:1</strong> — aceito como enviado. A camada de storage garante a escrita e ela retorna antes do <code>w:"majority"</code>, mas <strong>o Atlas pode fazer rollback em falhas raras</strong>.${src('D2')}`),
    wmaj: core ? tx('<strong>w:"majority"</strong> — ACK when a majority of voting, data-bearing nodes (2 of 3) have the write.', '<strong>w:"majority"</strong> — ACK quando a maioria dos nós votantes com dados (2 de 3) tem a escrita.')
               : tx(`<strong>w:"majority"</strong> — ACK once a <strong>majority within the storage layer</strong> holds the write (not a majority of compute nodes). Atlas <strong>never rolls back</strong> a majority write. <code>j</code> has no effect: every write is persisted outside node memory before the ACK.${src('D2')}`, `<strong>w:"majority"</strong> — ACK quando a <strong>maioria dentro da camada de storage</strong> tem a escrita (não a maioria dos nós de compute). O Atlas <strong>nunca faz rollback</strong> de uma escrita majority. <code>j</code> não tem efeito: toda escrita é persistida fora da memória do nó antes do ACK.${src('D2')}`),
    wnum: core ? tx('<strong>w:3</strong> — on a 3-node replica set, every node must acknowledge (if one is down, the write waits).', '<strong>w:3</strong> — num replica set de 3 nós, todos precisam confirmar (se um cair, a escrita espera).')
               : tx(`<strong>w:3</strong> — on Atlas Infinite, <strong>w: 2 or any greater number is applied as "majority"</strong>; you effectively choose between 0, 1 and "majority". The default is "majority"; the Atlas UI does not allow changing it.${src('D2', 'D20')}`, `<strong>w:3</strong> — no Atlas Infinite, <strong>w: 2 ou qualquer número maior é aplicado como "majority"</strong>; na prática você escolhe entre 0, 1 e "majority". O padrão é "majority"; a interface do Atlas não permite alterá-lo.${src('D2', 'D20')}`),
  };
  $('arch-wc-desc').innerHTML = wcDesc[S.wc] + (S.wc !== 'w0' && !core ? '<br>' + tx(`⏱ Always set <strong>wtimeout</strong>: without it, a write that can't be acknowledged waits indefinitely.${src('D2')}`, `⏱ Sempre defina <strong>wtimeout</strong>: sem ele, uma escrita que não pode ser confirmada espera indefinidamente.${src('D2')}`) : '');
  $('arch-wc-desc').className = 'desc' + (S.wc === 'w0' ? ' bad' : S.wc === 'w1' ? ' warn' : '');

  const rcTxt = {
    local: tx('<strong>local</strong> returns the node\'s most recent data — it may include writes not yet majority-committed.', '<strong>local</strong> retorna o dado mais recente do nó — pode incluir escritas ainda não confirmadas pela maioria.'),
    available: tx('<strong>available</strong> — like local, lowest latency, no guarantees about majority commit.', '<strong>available</strong> — como local, menor latência, sem garantias de commit majoritário.'),
    majority: tx('<strong>majority</strong> returns only majority-committed data — it can\'t be rolled back.', '<strong>majority</strong> retorna apenas dados confirmados pela maioria — não sofrem rollback.'),
    linearizable: tx('<strong>linearizable</strong> — strongest guarantee; reads from the <strong>primary only</strong> and reflects all majority writes acknowledged before the read.', '<strong>linearizable</strong> — garantia mais forte; lê <strong>somente do primário</strong> e reflete todas as escritas majority confirmadas antes da leitura.'),
    snapshot: tx('<strong>snapshot</strong> — for multi-document transactions: reads a majority-committed snapshot.', '<strong>snapshot</strong> — para transações multi-documento: lê um snapshot confirmado pela maioria.'),
  };
  const rpTxt = core ? '' : (['secondary', 'secondaryPreferred', 'nearest'].includes(S.rp)
    ? tx(` Secondary reads land on the <strong>single standby</strong> unless you add read-only nodes; the docs suggest <strong>secondaryPreferred</strong> to spread reads across standby and read-only nodes. Secondary reads can be slightly stale (standby lag is in milliseconds per the engineering blog).${src('D2', 'B4')}`,
         ` Leituras em secundários caem no <strong>único standby</strong>, a menos que você adicione nós read-only; a documentação sugere <strong>secondaryPreferred</strong> para distribuir leituras entre standby e nós read-only. Leituras em secundários podem estar levemente defasadas (lag do standby em milissegundos, segundo o blog de engenharia).${src('D2', 'B4')}`)
    : tx(` Default read preference is <strong>primary</strong> — every read goes to the primary unless you change it.${src('D2')}`, ` O read preference padrão é <strong>primary</strong> — toda leitura vai ao primário, a menos que você altere.${src('D2')}`));
  let warn = '';
  if (S.rc === 'linearizable' && S.rp !== 'primary') warn = '<br>⚠ ' + tx('linearizable requires readPreference <strong>primary</strong> — this combination is rejected by the server.', 'linearizable exige readPreference <strong>primary</strong> — esta combinação é rejeitada pelo servidor.');
  $('arch-read-desc').innerHTML = rcTxt[S.rc] + rpTxt + warn;
  $('arch-read-desc').className = 'desc' + (warn ? ' bad' : '');

  archRenderIdeas();
  archRenderCmp();
}

function archRenderIdeas() {
  const ideas = [
    ['🧱', tx('Two layers, scaled independently', 'Duas camadas, escaladas de forma independente'),
     tx(`Compute nodes run queries and transactions; the storage layer keeps data durable. Scaling the tier, adding read-only nodes and recovering from a node failure <strong>don't move or replicate data</strong>.${src('D2')}`,
        `Os nós de compute executam queries e transações; a camada de storage mantém os dados duráveis. Escalar o tier, adicionar nós read-only e recuperar de uma falha de nó <strong>não movem nem replicam dados</strong>.${src('D2')}`)],
    ['🗳', tx('"Majority" = storage majority', '"Majority" = maioria do storage'),
     tx(`On Atlas Infinite, <em>majority</em> means a majority <strong>within the storage layer</strong> — not of your cluster's nodes. The Log Service commits on a majority spread across 3 AZs.${src('D2', 'B4')}`,
        `No Atlas Infinite, <em>majority</em> significa maioria <strong>dentro da camada de storage</strong> — não dos nós do cluster. O Log Service faz commit numa maioria distribuída em 3 AZs.${src('D2', 'B4')}`)],
    ['↩', tx('No rollbacks for majority writes', 'Sem rollback de escritas majority'),
     tx(`Writes acknowledged with w:"majority" are durable in the storage layer and never roll back. Writes acknowledged with w:1 can roll back in rare failures.${src('D2', 'D8')}`,
        `Escritas confirmadas com w:"majority" estão duráveis na camada de storage e nunca sofrem rollback. Escritas confirmadas com w:1 podem sofrer rollback em falhas raras.${src('D2', 'D8')}`)],
    ['🧩', tx('Three storage services', 'Três serviços de storage'),
     tx(`<strong>Log Service</strong> (consensus on every write), <strong>Page Service</strong> (warm materialized pages in each AZ) and <strong>Object Index Service</strong> over object storage — each scales, fails and recovers independently. Data is held in three forms at once: replicated log, materialized pages and object store.${src('B4')}`,
        `<strong>Log Service</strong> (consenso em cada escrita), <strong>Page Service</strong> (páginas materializadas e aquecidas em cada AZ) e <strong>Object Index Service</strong> sobre object storage — cada um escala, falha e se recupera de forma independente. Os dados existem em três formas ao mesmo tempo: log replicado, páginas materializadas e object store.${src('B4')}`)],
    ['🔐', tx('Encrypted before it leaves compute', 'Criptografado antes de sair do compute'),
     tx(`Data is always encrypted on the compute node before it reaches the shared storage layer, with keys unique per customer; the storage layer can't read it. Encryption can't be disabled; bring your own key via AWS KMS.${src('D1', 'D2', 'D19')}`,
        `Os dados são sempre criptografados no nó de compute antes de chegar à camada de storage compartilhada, com chaves exclusivas por cliente; o storage não consegue lê-los. A criptografia não pode ser desligada; traga sua chave via AWS KMS.${src('D1', 'D2', 'D19')}`)],
    ['📜', tx('The oplog no longer drives replication', 'O oplog não conduz mais a replicação'),
     tx(`Replication happens in the storage layer, so <code>local.oplog.rs</code> only serves change streams and internal functions (24 h minimum retention by default). A node that joins or rejoins can't fall behind the oplog window.${src('D2')}`,
        `A replicação acontece na camada de storage, então o <code>local.oplog.rs</code> só atende change streams e funções internas (retenção mínima padrão de 24 h). Um nó que entra ou volta ao cluster não fica para trás da janela do oplog.${src('D2')}`)],
    ['🔌', tx('Same MongoDB, no code changes', 'Mesmo MongoDB, sem mudar código'),
     tx(`Same document model, APIs, drivers, security protocols and tooling. Adoption requires no application code changes and no new system to learn.${src('B6', 'B1')}`,
        `Mesmo document model, APIs, drivers, protocolos de segurança e ferramentas. A adoção não exige mudanças no código da aplicação nem aprender um novo sistema.${src('B6', 'B1')}`)],
    ['📈', tx('Built for AI-scale demand', 'Feito para demanda em escala de IA'),
     tx(`MongoDB reports >96% less time to scale reads vs Atlas Core, replica sets holding 10× the data, and 189% more throughput per dollar in internal MongoDB 9.0 tests (vendor claims).${src('B3', 'B2')}`,
        `A MongoDB reporta >96% menos tempo para escalar leituras vs Atlas Core, replica sets com 10× mais dados e 189% mais throughput por dólar em testes internos com MongoDB 9.0 (afirmações do fabricante).${src('B3', 'B2')}`)],
  ];
  $('arch-ideas').innerHTML = ideas.map(([i, t, d]) => `<div class="idea"><div class="it">${i} ${t}</div>${d}</div>`).join('');
}

function archRenderCmp() {
  const rows = [
    [tx('Architecture', 'Arquitetura'), tx('Compute + storage on each node (full copy per node)', 'Compute + storage em cada nó (cópia completa por nó)'), tx(`Compute and storage as independent layers${src('D2')}`, `Compute e storage como camadas independentes${src('D2')}`)],
    ['xr', tx('High availability', 'Alta disponibilidade'), tx('Replica set of 3+ electable, data-bearing nodes', 'Replica set com 3+ nós elegíveis que guardam dados'), tx(`An "HA shard" of 2 electable compute nodes (primary + standby) in separate AZs + storage layer replicated across 3 AZs${src('D1', 'D2', 'B4')}`, `Um "HA shard" com 2 nós de compute elegíveis (primário + standby) em AZs separadas + camada de storage replicada em 3 AZs${src('D1', 'D2', 'B4')}`)],
    [tx('Failover', 'Failover'), tx('Election — nodes vote, majority wins', 'Eleição — nós votam, a maioria vence'), tx(`Coordinated by the storage layer — no vote among compute nodes${src('D2')}`, `Coordenado pela camada de storage — sem votação entre nós de compute${src('D2')}`)],
    ['xr', tx('"majority" means', '"majority" significa'), tx('Majority of voting nodes', 'Maioria dos nós votantes'), tx(`Majority within the storage layer${src('D2')}`, `Maioria dentro da camada de storage${src('D2')}`)],
    ['xr', tx('Rollbacks', 'Rollbacks'), tx('Possible for writes not majority-committed', 'Possíveis para escritas não confirmadas pela maioria'), tx(`No rollback for writes acknowledged with w:"majority"; w:1 can roll back in rare failures${src('D2')}`, `Sem rollback para escritas confirmadas com w:"majority"; w:1 pode sofrer rollback em falhas raras${src('D2')}`)],
    [tx('Storage', 'Storage'), tx(`Tied to the cluster tier; shard when nearing the tier limit${src('B7')}`, `Atrelado ao tier; shard quando se aproxima do limite do tier${src('B7')}`), tx(`Grows automatically up to 128 TB (logical) per replica set, independent of tier${src('D4', 'B7')}`, `Cresce automaticamente até 128 TB (lógico) por replica set, independente do tier${src('D4', 'B7')}`)],
    [tx('Adding read capacity', 'Adicionar capacidade de leitura'), tx('New node needs an initial sync (data copy)', 'Novo nó precisa de initial sync (cópia de dados)'), tx(`Read-only nodes attach to storage and serve reads in minutes — no initial sync${src('D6', 'B3')}`, `Nós read-only se conectam ao storage e atendem leituras em minutos — sem initial sync${src('D6', 'B3')}`)],
    ['xr', tx('Write scale-out', 'Escala horizontal de escrita'), tx(`Sharding & Global Clusters${src('B7')}`, `Sharding e Global Clusters${src('B7')}`), tx(`Not available in public preview${src('D1')}`, `Não disponível no public preview${src('D1')}`)],
    [tx('Pricing model', 'Modelo de preço'), tx(`Provision-based${src('B7')}`, `Baseado em provisionamento${src('B7')}`), tx(`Compute on a reserved instance tier (billed for the running HA shard, not query volume); storage metered by data stored; backup billed separately${src('B6', 'D3')}`, `Compute num tier de instância reservada (cobrado pelo HA shard em execução, não por volume de queries); storage medido pelos dados armazenados; backup cobrado à parte${src('B6', 'D3')}`)],
    [tx('Clouds & regions', 'Clouds e regiões'), tx(`AWS, Azure, Google Cloud · multi-region · multi-cloud${src('B7')}`, `AWS, Azure, Google Cloud · multi-region · multi-cloud${src('B7')}`), tx(`AWS only, single region, select regions (public preview)${src('D1', 'B1')}`, `Somente AWS, single-region, regiões selecionadas (public preview)${src('D1', 'B1')}`)],
  ];
  $('arch-cmp').innerHTML = `<table class="cmp"><thead><tr><th></th><th>Atlas Core</th><th class="inf">Atlas Infinite</th></tr></thead><tbody>
    ${rows.map(r => { const xr = r[0] === 'xr', c = xr ? r.slice(1) : r; return `<tr class="${xr ? 'xr' : ''}"><td>${c[0]}</td><td>${c[1]}</td><td class="inf">${c[2]}</td></tr>`; }).join('')}</tbody></table>`;
}
