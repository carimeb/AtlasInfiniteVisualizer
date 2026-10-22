// ─── TAB 1 — ARCHITECTURE & WRITE PATH ───────────────────────────────────────

const AP = {};   // coordinates of the last render, used by the animations

function archSetMode(mode) {
  if (S.arch.busy) return;
  S.arch.mode = mode;
  document.querySelectorAll('#arch-seg button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
  archRender();
  archUpdateInfo();
  renderSteps('arch-steps', []);
  $('arch-steps-label').textContent = '';
  log('INFO', 'ARCH', mode === 'core'
    ? tx('Showing Atlas Core — compute and storage coupled on every node', 'Exibindo Atlas Core — compute e storage acoplados em cada nó')
    : tx('Showing Atlas Infinite — compute and storage as independent layers', 'Exibindo Atlas Infinite — compute e storage como camadas independentes'));
  updateCAP();
}

function archElectable() { return S.ha.nodes; }
function archUpAZ(i) { return !S.ha.azDown[i]; }

function archRender() {
  if (S.arch.mode === 'core') return archRenderCore();
  const nodes = archElectable();
  const extra = S.extra;
  let s = `<svg viewBox="0 0 800 520" width="100%" xmlns="http://www.w3.org/2000/svg">`;

  // Bands
  s += `<rect x="20" y="64" width="760" height="156" rx="12" fill="#E3FCF7" stroke="rgba(0,104,74,.35)" stroke-width="1.5"/>
    <text x="34" y="83" font-size="10" font-weight="800" fill="#00684A" letter-spacing="1">${tx('COMPUTE LAYER', 'CAMADA DE COMPUTE')}</text>
    <text x="766" y="83" text-anchor="end" font-size="9" fill="rgba(0,30,43,.72)">${tx('queries & transactions · scales by tier and by node count', 'queries e transações · escala por tier e por número de nós')}</text>
    <rect x="20" y="238" width="760" height="274" rx="12" fill="#F9EBFF" stroke="rgba(0,30,43,.16)" stroke-width="1.5"/>
    <text x="34" y="257" font-size="10" font-weight="800" fill="#001E2B" letter-spacing="1">${tx('STORAGE LAYER', 'CAMADA DE STORAGE')}</text>
    <text x="766" y="257" text-anchor="end" font-size="9" fill="rgba(0,30,43,.72)">${tx('durability · replication · failover coordination · backup', 'durabilidade · replicação · coordenação de failover · backup')}</text>`;

  // AZ columns
  AP.log = []; AP.page = []; AP.s3 = [];
  for (let i = 0; i < 3; i++) {
    const x0 = 40 + i * 250, down = !archUpAZ(i);
    s += `<rect x="${x0}" y="266" width="220" height="150" rx="9" fill="${down ? '#FDF0EE' : '#fff'}" stroke="${down ? 'rgba(192,57,43,.5)' : 'rgba(0,30,43,.28)'}" stroke-dasharray="5 4" stroke-width="1.3"/>
      <text x="${x0 + 110}" y="283" text-anchor="middle" font-size="9.5" font-weight="700" fill="${down ? '#C0392B' : '#001E2B'}">${AZ_NAMES[i]}${down ? ' — ' + tx('DOWN', 'FORA') : ''}</text>`;
    const lx = x0 + 56, px = x0 + 164, y = 330;
    AP.log.push([lx, y]); AP.page.push([px, y]); AP.s3.push([px, 456]);
    s += `<line x1="${lx + 22}" y1="${y}" x2="${px - 20}" y2="${y}" stroke="rgba(0,104,74,.6)" stroke-width="1.5" class="repl-slow"/>`;
    s += `<line x1="${px}" y1="${y + 50}" x2="${px}" y2="438" stroke="rgba(0,30,43,.35)" stroke-width="1.5" class="repl-slow"/>`;
    s += logIcon(lx, y, down) + pageIcon(px, y, down);
    s += `<text x="${lx}" y="${y + 33}" text-anchor="middle" font-size="9" font-weight="700" fill="#001E2B">Log Service</text>
      <text x="${lx}" y="${y + 44}" text-anchor="middle" font-size="8" fill="rgba(0,30,43,.5)">${tx('consensus replica', 'réplica de consenso')}</text>
      <text x="${px}" y="${y + 33}" text-anchor="middle" font-size="9" font-weight="700" fill="#00684A">Page Service</text>
      <text x="${px}" y="${y + 44}" text-anchor="middle" font-size="8" fill="rgba(0,30,43,.5)">${tx('warm materialized pages', 'páginas materializadas')}</text>`;
  }
  // Object storage
  s += `<rect x="40" y="438" width="720" height="62" rx="10" fill="#FFFFFF" stroke="rgba(0,30,43,.28)" stroke-width="1.5"/>
    ${bucketIcon(72, 449)}
    <text x="122" y="462" font-size="11" font-weight="700" fill="#001E2B">Object Index Service → Amazon S3</text>
    <text x="122" y="478" font-size="9" fill="#001E2B">${tx('durability floor — designed for eleven nines of durability', 'piso de durabilidade — projetado para onze noves de durabilidade')} (blog)</text>
    <text x="122" y="491" font-size="8.5" fill="#00684A">${tx('backups, restores and point-in-time recovery also run here, independent of compute', 'backups, restores e point-in-time recovery também rodam aqui, independentes do compute')}</text>`;

  // Compute nodes
  AP.client = [400, 46];
  s += clientBox(400, 8, 300, tx('CLIENT APP', 'APLICAÇÃO CLIENTE'), tx('MongoDB driver — same drivers & APIs as Atlas Core', 'driver MongoDB — mesmos drivers e APIs do Atlas Core'));
  AP.nodes = {};
  const ex = [130, 280];
  nodes.forEach((n, i) => { AP.nodes[n.id] = [ex[i], 140]; });
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
      s += `<path d="M${lx + 8},${ly - 20} C${lx + 8},${ly - 70} ${sx + 40},${sy + 90} ${sx + 40},${sy + 20}" fill="none" stroke="#00684A" stroke-width="1.3" stroke-dasharray="2 4" opacity=".8"/>
        <text x="${sx + 46}" y="${sy + 34}" font-size="8" fill="#00684A" font-weight="600">${tx('tails the oplog', 'acompanha o oplog')}</text>`;
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
      <text x="581" y="152" text-anchor="middle" font-size="8.5" fill="rgba(0,30,43,.4)">${tx('add them in tab ④ — they attach to storage, no initial sync', 'adicione na aba ④ — conectam no storage, sem initial sync')}</text>`;
  } else {
    extra.forEach((n, i) => {
      const x = 440 + i * 72, y = 140;
      AP.nodes[n.id] = [x, y];
      const lbl = n.state === 'PROVISIONING' ? tx('ATTACHING', 'CONECTANDO') : n.state === 'DOWN' ? tx('DOWN', 'FORA') : (n.type === 'READ_ONLY' ? 'READ-ONLY' : 'ANALYTICS');
      s += `<g class="${n.state === 'PROVISIONING' ? 'prov' : ''}">${mdbNodeIcon(x, y, 40, n.state, n.type)}</g>
        <text x="${x}" y="${y + 31}" text-anchor="middle" font-size="8" fill="rgba(0,30,43,.72)">${n.id}</text>
        ${roleBadge(x, y + 36, n.type, n.state, lbl)}`;
    });
    s += `<text x="${440 + (extra.length - 1) * 36}" y="${206}" text-anchor="middle" font-size="8" fill="#00684A">${tx('↓ read pages straight from the Page Service', '↓ leem páginas direto do Page Service')}</text>`;
  }
  s += `</svg>`;
  $('arch-svg').innerHTML = s;
  $('arch-mode-label').textContent = tx('Atlas Infinite · disaggregated', 'Atlas Infinite · desagregado');
  $('arch-legend').innerHTML = archLegend();
}

function archRenderCore() {
  let s = `<svg viewBox="0 0 800 520" width="100%" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="20" y="64" width="760" height="380" rx="12" fill="#FAFBFC" stroke="rgba(0,30,43,.14)" stroke-width="1.5"/>
    <text x="34" y="83" font-size="10" font-weight="800" fill="#001E2B" letter-spacing="1">${tx('REPLICA SET — EVERY NODE = COMPUTE + ITS OWN STORAGE', 'REPLICA SET — CADA NÓ = COMPUTE + SEU PRÓPRIO STORAGE')}</text>`;
  AP.client = [400, 46];
  s += clientBox(400, 8, 230, tx('CLIENT APP', 'APLICAÇÃO CLIENTE'), tx('MongoDB driver', 'driver MongoDB'));
  const xs = [160, 400, 640];
  AP.core = xs.map(x => [x, 175]);
  AP.coreDisk = xs.map(x => [x, 300]);
  s += `<line x1="400" y1="46" x2="160" y2="146" stroke="#00684A" stroke-width="1.5" stroke-dasharray="5 4" opacity=".55"/>`;
  s += `<path d="M190,170 C260,150 330,150 372,170" fill="none" stroke="rgba(0,30,43,.35)" stroke-width="1.8" class="repl"/>
        <path d="M190,182 C330,232 500,232 612,182" fill="none" stroke="rgba(0,30,43,.35)" stroke-width="1.8" class="repl"/>
        <text x="281" y="146" text-anchor="middle" font-size="8.5" fill="rgba(0,30,43,.72)">${tx('oplog replication', 'replicação do oplog')}</text>`;
  xs.forEach((x, i) => {
    s += `<rect x="${x - 95}" y="112" width="190" height="270" rx="12" fill="#fff" stroke="rgba(0,30,43,.22)" stroke-width="1.3"/>`;
    s += `<g class="${i === 0 ? 'gnod' : ''}">${mdbNodeIcon(x, 175, 50, 'UP', i === 0 ? 'PRIMARY' : 'SECONDARY')}</g>`;
    s += roleBadge(x, 208, i === 0 ? 'PRIMARY' : 'SECONDARY', 'UP', i === 0 ? tx('PRIMARY', 'PRIMÁRIO') : tx('SECONDARY', 'SECUNDÁRIO'));
    s += `<line x1="${x}" y1="226" x2="${x}" y2="270" stroke="#001E2B" stroke-width="1.3"/>`;
    s += diskIcon(x, 300, 110, 46, tx('full data copy', 'cópia completa'));
    s += `<text x="${x}" y="356" text-anchor="middle" font-size="8.5" fill="rgba(0,30,43,.5)">${tx('local volume — sized by tier', 'volume local — dimensionado pelo tier')}</text>`;
  });
  s += `<rect x="40" y="396" width="720" height="36" rx="8" fill="rgba(0,30,43,.05)"/>
    <text x="400" y="411" text-anchor="middle" font-size="9.5" fill="#001E2B" font-weight="600">${tx('Each node stores and replicates a full copy of the data', 'Cada nó armazena e replica uma cópia completa dos dados')}</text>
    <text x="400" y="425" text-anchor="middle" font-size="8.5" fill="rgba(0,30,43,.72)">${tx('Adding or replacing a node means copying data (initial sync) · failover = election by majority vote', 'Adicionar ou substituir um nó implica copiar dados (initial sync) · failover = eleição por voto majoritário')}</text>`;
  s += `<text x="400" y="472" text-anchor="middle" font-size="10" fill="rgba(0,30,43,.72)">${tx('Atlas Core runs on AWS, Azure and Google Cloud with the full Atlas feature set —', 'O Atlas Core roda em AWS, Azure e Google Cloud com o conjunto completo de recursos do Atlas —')}</text>
    <text x="400" y="487" text-anchor="middle" font-size="10" fill="rgba(0,30,43,.72)">${tx('multi-region, multi-cloud, sharding, Atlas Search and Vector Search.', 'multi-region, multi-cloud, sharding, Atlas Search e Vector Search.')}</text>`;
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
  const core = S.arch.mode === 'core';
  $('arch-mode-desc').innerHTML = core
    ? tx(`<strong>Atlas Core</strong> (the existing Atlas offering, now renamed) keeps compute and storage together on each node of a replica set. Best for steady, predictable workloads; full Atlas feature set.${src('B2', 'B7')}`,
         `<strong>Atlas Core</strong> (a oferta atual do Atlas, agora renomeada) mantém compute e storage juntos em cada nó do replica set. Ideal para workloads estáveis e previsíveis; conjunto completo de recursos do Atlas.${src('B2', 'B7')}`)
    : tx(`<strong>Atlas Infinite</strong> is a new deployment option in Atlas — not a new database. Same document model, drivers and APIs; built for spiky, AI-driven, fast-growing workloads. Runs MongoDB 9.0+ (always latest, auto-upgrades).${src('B3', 'B6', 'D1')}`,
         `<strong>Atlas Infinite</strong> é uma nova opção de deployment no Atlas — não um novo banco de dados. Mesmo document model, drivers e APIs; feito para workloads com picos, guiados por IA e de crescimento rápido. Roda MongoDB 9.0+ (sempre a última versão, com auto-upgrade).${src('B3', 'B6', 'D1')}`);

  const wcDesc = {
    w0: core ? tx('<strong>w:0</strong> — fire-and-forget. No acknowledgment; fastest, but the client never knows if the write landed.', '<strong>w:0</strong> — fire-and-forget. Sem confirmação; mais rápido, mas o cliente nunca sabe se a escrita foi gravada.')
             : tx(`<strong>w:0</strong> — accepted as sent: fire-and-forget, no acknowledgment.${src('D2')}`, `<strong>w:0</strong> — aceito como enviado: fire-and-forget, sem confirmação.${src('D2')}`),
    w1: core ? tx('<strong>w:1</strong> — ACK after the primary applies the write. May be rolled back if the primary fails before replicating.', '<strong>w:1</strong> — ACK depois que o primário aplica a escrita. Pode sofrer rollback se o primário falhar antes de replicar.')
             : tx(`<strong>w:1</strong> — accepted as sent. Returns sooner than majority, but <strong>Atlas can roll it back in rare failures</strong>.${src('D2')}`, `<strong>w:1</strong> — aceito como enviado. Retorna antes do majority, mas <strong>o Atlas pode fazer rollback em falhas raras</strong>.${src('D2')}`),
    wmaj: core ? tx('<strong>w:"majority"</strong> — ACK when a majority of voting, data-bearing nodes (2 of 3) have the write.', '<strong>w:"majority"</strong> — ACK quando a maioria dos nós votantes com dados (2 de 3) tem a escrita.')
               : tx(`<strong>w:"majority"</strong> — ACK once a <strong>majority within the storage layer</strong> holds the write (not a majority of compute nodes). Atlas <strong>never rolls back</strong> a majority write. <code>j</code> has no effect: every write is persisted outside node memory before the ACK.${src('D2')}`, `<strong>w:"majority"</strong> — ACK quando a <strong>maioria dentro da camada de storage</strong> tem a escrita (não a maioria dos nós de compute). O Atlas <strong>nunca faz rollback</strong> de uma escrita majority. <code>j</code> não tem efeito: toda escrita é persistida fora da memória do nó antes do ACK.${src('D2')}`),
    wnum: core ? tx('<strong>w:3</strong> — on a 3-node replica set, every node must acknowledge (if one is down, the write waits).', '<strong>w:3</strong> — num replica set de 3 nós, todos precisam confirmar (se um cair, a escrita espera).')
               : tx(`<strong>w:3</strong> — on Atlas Infinite, <strong>any numeric value above 2 is mapped to "majority"</strong> (there are only 2 electable compute nodes).${src('D2')}`, `<strong>w:3</strong> — no Atlas Infinite, <strong>qualquer valor numérico acima de 2 é mapeado para "majority"</strong> (há apenas 2 nós de compute elegíveis).${src('D2')}`),
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
     tx(`Atlas never rolls back a w:"majority" write; on failover the former primary has no unreplicated writes to revert, because the storage layer commits writes.${src('D2', 'D8')}`,
        `O Atlas nunca faz rollback de uma escrita w:"majority"; no failover, o antigo primário não tem escritas não replicadas para reverter, pois quem faz o commit é a camada de storage.${src('D2', 'D8')}`)],
    ['🧩', tx('Three storage services', 'Três serviços de storage'),
     tx(`<strong>Log Service</strong> (consensus on every write), <strong>Page Service</strong> (warm materialized pages in each AZ) and <strong>Object Index Service</strong> over object storage — each scales, fails and recovers independently.${src('B4')}`,
        `<strong>Log Service</strong> (consenso em cada escrita), <strong>Page Service</strong> (páginas materializadas e aquecidas em cada AZ) e <strong>Object Index Service</strong> sobre object storage — cada um escala, falha e se recupera de forma independente.${src('B4')}`)],
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
    [tx('High availability', 'Alta disponibilidade'), tx('Replica set of 3+ electable, data-bearing nodes', 'Replica set com 3+ nós elegíveis que guardam dados'), tx(`2 electable compute nodes (primary + standby) + storage layer replicated across 3 AZs${src('D2', 'B4')}`, `2 nós de compute elegíveis (primário + standby) + camada de storage replicada em 3 AZs${src('D2', 'B4')}`)],
    [tx('Failover', 'Failover'), tx('Election — nodes vote, majority wins', 'Eleição — nós votam, a maioria vence'), tx(`Coordinated by the storage layer — no vote among compute nodes${src('D2')}`, `Coordenado pela camada de storage — sem votação entre nós de compute${src('D2')}`)],
    [tx('"majority" means', '"majority" significa'), tx('Majority of voting nodes', 'Maioria dos nós votantes'), tx(`Majority within the storage layer${src('D2')}`, `Maioria dentro da camada de storage${src('D2')}`)],
    [tx('Rollbacks', 'Rollbacks'), tx('Possible for writes not majority-committed', 'Possíveis para escritas não confirmadas pela maioria'), tx(`Don't occur — the storage layer commits writes${src('D8', 'D17')}`, `Não ocorrem — a camada de storage faz o commit das escritas${src('D8', 'D17')}`)],
    [tx('Storage', 'Storage'), tx(`Tied to the cluster tier; shard when nearing the tier limit${src('B7')}`, `Atrelado ao tier; shard quando se aproxima do limite do tier${src('B7')}`), tx(`Grows automatically up to 128 TB (logical) per replica set, independent of tier${src('D4', 'B7')}`, `Cresce automaticamente até 128 TB (lógico) por replica set, independente do tier${src('D4', 'B7')}`)],
    [tx('Adding read capacity', 'Adicionar capacidade de leitura'), tx('New node needs an initial sync (data copy)', 'Novo nó precisa de initial sync (cópia de dados)'), tx(`Read-only nodes attach to storage and serve reads in minutes — no initial sync${src('D6', 'B3')}`, `Nós read-only se conectam ao storage e atendem leituras em minutos — sem initial sync${src('D6', 'B3')}`)],
    [tx('Write scale-out', 'Escala horizontal de escrita'), tx(`Sharding & Global Clusters${src('B7')}`, `Sharding e Global Clusters${src('B7')}`), tx(`Not available in public preview${src('D1')}`, `Não disponível no public preview${src('D1')}`)],
    [tx('Pricing model', 'Modelo de preço'), tx(`Provision-based${src('B7')}`, `Baseado em provisionamento${src('B7')}`), tx(`Compute on a reserved instance tier + storage billed by consumption${src('B7', 'B2')}`, `Compute num tier de instância reservada + storage cobrado por consumo${src('B7', 'B2')}`)],
    [tx('Clouds & regions', 'Clouds e regiões'), tx(`AWS, Azure, Google Cloud · multi-region · multi-cloud${src('B7')}`, `AWS, Azure, Google Cloud · multi-region · multi-cloud${src('B7')}`), tx(`AWS only, single region, select regions (public preview)${src('D1', 'B1')}`, `Somente AWS, single-region, regiões selecionadas (public preview)${src('D1', 'B1')}`)],
  ];
  $('arch-cmp').innerHTML = `<table class="cmp"><thead><tr><th></th><th>Atlas Core</th><th class="inf">Atlas Infinite</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="inf">${r[2]}</td></tr>`).join('')}</tbody></table>`;
}

// ── Animations ───────────────────────────────────────────────────────────────

function archLock(on) {
  S.arch.busy = on;
  $('arch-btn-w').disabled = on; $('arch-btn-r').disabled = on;
}

async function archSimWrite() {
  if (S.arch.busy) return;
  if (S.arch.mode === 'core') return archSimWriteCore();
  const prim = S.ha.nodes.find(n => n.role === 'PRIMARY' && n.state === 'UP');
  const wc = S.wc, ackOnMajority = wc === 'wmaj' || wc === 'wnum';
  const steps = [
    tx('<b>Client → primary.</b> The driver routes the write to the primary compute node.', '<b>Cliente → primário.</b> O driver envia a escrita ao nó de compute primário.'),
    tx('<b>Primary → Log Service.</b> The primary executes the write and appends the oplog entry to the storage layer.', '<b>Primário → Log Service.</b> O primário executa a escrita e anexa a entrada do oplog na camada de storage.'),
    tx('<b>Replicated across 3 AZs.</b> The Log Service replicates the entry to its replicas in three Availability Zones.', '<b>Replicado em 3 AZs.</b> O Log Service replica a entrada para suas réplicas em três Availability Zones.'),
    ackOnMajority ? tx('<b>Majority durable → ACK.</b> 2 of 3 log replicas hold the entry → the write is acknowledged. It will never be rolled back.', '<b>Maioria durável → ACK.</b> 2 de 3 réplicas do log têm a entrada → a escrita é confirmada. Nunca sofrerá rollback.')
      : wc === 'w1' ? tx('<b>ACK already sent (w:1).</b> The client got its ACK before the storage majority — faster, but can be rolled back in rare failures.', '<b>ACK já enviado (w:1).</b> O cliente recebeu o ACK antes da maioria do storage — mais rápido, mas pode sofrer rollback em falhas raras.')
      : tx('<b>No ACK (w:0).</b> The client never waits for — or learns about — the outcome.', '<b>Sem ACK (w:0).</b> O cliente nunca espera — nem fica sabendo — o resultado.'),
    tx('<b>Standby tails the log.</b> It applies the oplog into an in-memory ingest table on top of the stable table — standby lag measured in milliseconds.', '<b>Standby acompanha o log.</b> Aplica o oplog numa ingest table em memória sobre a stable table — lag do standby medido em milissegundos.'),
    tx('<b>Pages materialized asynchronously.</b> On checkpoint, physical page changes flow to the Page Service in each AZ and on to object storage (S3) — the durability floor.', '<b>Páginas materializadas de forma assíncrona.</b> No checkpoint, as mudanças físicas de página vão para o Page Service em cada AZ e daí para o object storage (S3) — o piso de durabilidade.'),
  ];
  renderSteps('arch-steps', steps);
  $('arch-steps-label').textContent = tx('write · ', 'escrita · ') + { w0: 'w:0', w1: 'w:1', wmaj: 'w:"majority"', wnum: 'w:3 → majority' }[wc];
  if (!prim) {
    setStep('arch-steps', 0, 'active');
    log('WARN', 'DRIVER', tx('No primary available right now — the driver waits for a new primary and retries the write (retryable writes)', 'Nenhum primário disponível agora — o driver espera um novo primário e refaz a escrita (retryable writes)'));
    return;
  }
  archLock(true);
  const [px, py] = AP.nodes[prim.id];
  log('INFO', 'CLIENT', tx(`insertOne() with writeConcern ${$('arch-steps-label').textContent.split('· ')[1]}`, `insertOne() com writeConcern ${$('arch-steps-label').textContent.split('· ')[1]}`));
  setStep('arch-steps', 0, 'active');
  await fly('arch-svg', [AP.client, [px, py - 26]], 650, '#00ED64');
  setStep('arch-steps', 0, 'done'); setStep('arch-steps', 1, 'active');
  flash('arch-svg', px, py - 34, tx('apply', 'aplica'), '#00684A');
  let ackP = Promise.resolve();
  if (wc === 'w1') ackP = fly('arch-svg', [[px, py - 26], AP.client], 650, '#00684A').then(() => { flash('arch-svg', 400, 62, 'ACK (w:1)', '#B45309'); log('SUCCESS', 'CLIENT', tx('ACK received (w:1) — before storage-layer majority', 'ACK recebido (w:1) — antes da maioria da camada de storage')); });
  await sleep(250);
  setStep('arch-steps', 1, 'done'); setStep('arch-steps', 2, 'active');
  const upAZ = [0, 1, 2].filter(archUpAZ);
  let arrived = 0, majorityAt = null;
  const durs = [700, 900, 1250];
  const flights = [0, 1, 2].map(i => {
    if (!archUpAZ(i)) return Promise.resolve();
    const [lx, ly] = AP.log[i];
    return fly('arch-svg', [[px, py + 62], [px, py + 100], [lx, ly - 70], [lx, ly - 20]], durs[i], '#023430').then(() => {
      arrived++;
      flash('arch-svg', lx, ly - 26, `${arrived}/3`, '#001E2B');
      if (arrived === 2) majorityAt = performance.now();
    });
  });
  // wait for majority (or all flights)
  await new Promise(res => {
    const iv = setInterval(() => { if (arrived >= 2 || arrived >= upAZ.length) { clearInterval(iv); res(); } }, 40);
    Promise.all(flights).then(() => { clearInterval(iv); res(); });
  });
  setStep('arch-steps', 2, 'done');
  setStep('arch-steps', 3, 'active');
  if (upAZ.length < 2) {
    flash('arch-svg', 400, 236, tx('no storage majority', 'sem maioria no storage'), '#C0392B');
    setStep('arch-steps', 3, 'active');
    $('arch-steps').children[3].innerHTML = tx('<b>Waiting… no storage-layer majority.</b> Only 1 of 3 AZs is reachable, so a majority write can\'t be acknowledged. Without <b>wtimeout</b> the write waits indefinitely.', '<b>Esperando… sem maioria na camada de storage.</b> Só 1 de 3 AZs está acessível, então uma escrita majority não pode ser confirmada. Sem <b>wtimeout</b>, a escrita espera indefinidamente.');
    log('ERROR', 'STORAGE', tx('Log Service has 1/3 replicas — majority (2) unavailable; majority writes cannot be acknowledged', 'Log Service com 1/3 réplicas — maioria (2) indisponível; escritas majority não podem ser confirmadas'));
    await Promise.all(flights);
    await ackP;
    archLock(false);
    updateCAP();
    return;
  }
  log('SUCCESS', 'LOG-SVC', tx('Entry durable on a majority of log replicas (2/3 AZs)', 'Entrada durável na maioria das réplicas do log (2/3 AZs)'));
  if (ackOnMajority) {
    flash('arch-svg', px + 40, py - 30, tx('majority ✓', 'maioria ✓'), '#001E2B');
    await fly('arch-svg', [[px, py - 26], AP.client], 600, '#00684A');
    flash('arch-svg', 400, 62, 'ACK ✓', '#00684A');
    log('SUCCESS', 'CLIENT', tx('ACK received — write is majority-durable in the storage layer and will never be rolled back', 'ACK recebido — escrita durável na maioria da camada de storage; nunca sofrerá rollback'));
  } else {
    await ackP;
    if (wc === 'w0') log('INFO', 'CLIENT', tx('w:0 — no ACK requested', 'w:0 — nenhum ACK solicitado'));
  }
  setStep('arch-steps', 3, 'done'); setStep('arch-steps', 4, 'active');
  const stby = S.ha.nodes.find(n => n.role === 'STANDBY' && n.state === 'UP');
  if (stby) {
    const li = archUpAZ(stby.az) ? stby.az : upAZ[0];
    const [lx, ly] = AP.log[li]; const [sx, sy] = AP.nodes[stby.id];
    await fly('arch-svg', [[lx + 8, ly - 20], [sx + 40, sy + 90], [sx + 40, sy + 20]], 650, '#00684A', 5);
    flash('arch-svg', sx, sy - 34, tx('applied (ms lag)', 'aplicado (lag em ms)'), '#00684A');
  } else setStep('arch-steps', 4, 'skip');
  setStep('arch-steps', 4, stby ? 'done' : 'skip'); setStep('arch-steps', 5, 'active');
  await Promise.all(flights);
  await Promise.all(upAZ.map(i => fly('arch-svg', [[AP.log[i][0] + 22, AP.log[i][1]], [AP.page[i][0] - 20, AP.page[i][1]]], 700, '#00684A', 5)
    .then(() => fly('arch-svg', [[AP.page[i][0], AP.page[i][1] + 50], [AP.page[i][0], 450]], 600, '#001E2B', 5))));
  flash('arch-svg', 400, 432, tx('persisted to object storage', 'persistido no object storage'), '#00684A');
  setStep('arch-steps', 5, 'done');
  log('INFO', 'PAGE-SVC', tx('Checkpoint: page changes materialized in each AZ and persisted to S3', 'Checkpoint: mudanças de página materializadas em cada AZ e persistidas no S3'));
  archLock(false);
}

async function archSimWriteCore() {
  const wc = S.wc;
  const steps = [
    tx('<b>Client → primary.</b> The driver routes the write to the primary node.', '<b>Cliente → primário.</b> O driver envia a escrita ao nó primário.'),
    tx('<b>Primary writes locally.</b> Applies the write and journals it to its own local volume.', '<b>Primário grava localmente.</b> Aplica a escrita e registra no journal do seu próprio volume local.'),
    tx('<b>Secondaries replicate.</b> Each secondary pulls the oplog and applies it to its own full copy.', '<b>Secundários replicam.</b> Cada secundário puxa o oplog e aplica na sua própria cópia completa.'),
    { w0: tx('<b>No ACK (w:0).</b>', '<b>Sem ACK (w:0).</b>'), w1: tx('<b>ACK after the primary (w:1).</b> Fast, but can be rolled back if the primary fails before replicating.', '<b>ACK após o primário (w:1).</b> Rápido, mas pode sofrer rollback se o primário falhar antes de replicar.'), wmaj: tx('<b>ACK at 2 of 3 nodes (majority).</b>', '<b>ACK em 2 de 3 nós (maioria).</b>'), wnum: tx('<b>ACK at 3 of 3 nodes (w:3).</b> Any node down = the write waits.', '<b>ACK em 3 de 3 nós (w:3).</b> Qualquer nó fora = a escrita espera.') }[wc],
  ];
  renderSteps('arch-steps', steps);
  $('arch-steps-label').textContent = tx('write · Atlas Core', 'escrita · Atlas Core');
  archLock(true);
  const [px, py] = AP.core[0];
  setStep('arch-steps', 0, 'active');
  await fly('arch-svg', [AP.client, [px, py - 26]], 650, '#00ED64');
  setStep('arch-steps', 0, 'done'); setStep('arch-steps', 1, 'active');
  await fly('arch-svg', [[px, py + 50], [px, 280]], 400, '#001E2B', 5);
  flash('arch-svg', px, 262, 'journal', '#001E2B');
  if (wc === 'w1') fly('arch-svg', [[px, py - 26], AP.client], 600, '#00684A').then(() => flash('arch-svg', 400, 62, 'ACK (w:1)', '#B45309'));
  setStep('arch-steps', 1, 'done'); setStep('arch-steps', 2, 'active');
  let n = 1;
  const f = AP.core.slice(1).map(([x, y], i) => fly('arch-svg', [[px + 30, py], [x - 30, y]], 800 + i * 500, 'rgba(0,30,43,.35)').then(() => fly('arch-svg', [[x, y + 50], [x, 280]], 350, '#001E2B', 5)).then(() => { n++; flash('arch-svg', x, y - 34, `${n}/3`, '#001E2B'); }));
  await f[0];
  setStep('arch-steps', 2, wc === 'wnum' ? 'active' : 'done');
  if (wc === 'wmaj') { await fly('arch-svg', [[px, py - 26], AP.client], 600, '#00684A'); flash('arch-svg', 400, 62, 'ACK ✓', '#00684A'); }
  await f[1];
  if (wc === 'wnum') { setStep('arch-steps', 2, 'done'); await fly('arch-svg', [[px, py - 26], AP.client], 600, '#00684A'); flash('arch-svg', 400, 62, 'ACK ✓', '#00684A'); }
  setStep('arch-steps', 3, 'done');
  archLock(false);
}

function archPickReadNode() {
  const up = [...S.ha.nodes, ...S.extra].filter(n => n.state === 'UP');
  const prim = up.find(n => n.role === 'PRIMARY');
  const secs = up.filter(n => n.role !== 'PRIMARY');
  const pick = a => a[Math.floor(Math.random() * a.length)];
  switch (S.rp) {
    case 'primary': return prim;
    case 'primaryPreferred': return prim || pick(secs);
    case 'secondary': return secs.length ? pick(secs) : null;
    case 'secondaryPreferred': return secs.length ? pick(secs) : prim;
    case 'nearest': return pick(up);
  }
}

async function archSimRead() {
  if (S.arch.busy) return;
  const core = S.arch.mode === 'core';
  if (S.rc === 'linearizable' && S.rp !== 'primary') {
    renderSteps('arch-steps', [tx('<b>Rejected.</b> readConcern "linearizable" only works with readPreference primary.', '<b>Rejeitada.</b> readConcern "linearizable" só funciona com readPreference primary.')], ['active']);
    log('ERROR', 'DRIVER', tx('linearizable read concern requires readPreference primary', 'read concern linearizable exige readPreference primary'));
    return;
  }
  if (core) {
    renderSteps('arch-steps', [tx('<b>Server selection</b> by readPreference.', '<b>Seleção de servidor</b> pelo readPreference.'), tx('<b>Node reads from memory or its local disk.</b>', '<b>O nó lê da memória ou do seu disco local.</b>'), tx('<b>Result returned.</b>', '<b>Resultado retornado.</b>')]);
    archLock(true);
    const idx = { primary: 0, primaryPreferred: 0, secondary: 1 + Math.floor(Math.random() * 2), secondaryPreferred: 1 + Math.floor(Math.random() * 2), nearest: Math.floor(Math.random() * 3) }[S.rp];
    const [x, y] = AP.core[idx];
    setStep('arch-steps', 0, 'active');
    await fly('arch-svg', [AP.client, [x, y - 26]], 600, '#001E2B');
    setStep('arch-steps', 0, 'done'); setStep('arch-steps', 1, 'active');
    await fly('arch-svg', [[x, y + 50], [x, 285]], 350, '#001E2B', 5);
    await fly('arch-svg', [[x, 285], [x, y + 50]], 350, '#001E2B', 5);
    setStep('arch-steps', 1, 'done'); setStep('arch-steps', 2, 'active');
    await fly('arch-svg', [[x, y - 26], AP.client], 600, '#00684A');
    setStep('arch-steps', 2, 'done');
    archLock(false);
    return;
  }
  const node = archPickReadNode();
  const steps = [
    tx(`<b>Server selection.</b> readPreference <b>${S.rp}</b> → ${node ? `<b>${node.id}</b> (${node.role || node.type})` : tx('<b>no eligible node</b>', '<b>nenhum nó elegível</b>')}.`, `<b>Seleção de servidor.</b> readPreference <b>${S.rp}</b> → ${node ? `<b>${node.id}</b> (${node.role || node.type})` : '<b>nenhum nó elegível</b>'}.`),
    tx('<b>Served from memory</b> — on a cache miss the node fetches the page from the shared, warm <b>Page Service</b> instead of a local disk.', '<b>Atendida da memória</b> — num cache miss o nó busca a página no <b>Page Service</b> compartilhado e aquecido, em vez de um disco local.'),
    { local: tx('<b>readConcern local:</b> newest data on that node (may include not-yet-majority writes).', '<b>readConcern local:</b> dado mais novo naquele nó (pode incluir escritas ainda não majority).'), available: tx('<b>readConcern available:</b> lowest latency, no majority guarantee.', '<b>readConcern available:</b> menor latência, sem garantia de maioria.'), majority: tx('<b>readConcern majority:</b> only storage-majority-committed data.', '<b>readConcern majority:</b> apenas dados confirmados pela maioria do storage.'), linearizable: tx('<b>readConcern linearizable:</b> primary confirms it is still primary before returning.', '<b>readConcern linearizable:</b> o primário confirma que ainda é primário antes de retornar.'), snapshot: tx('<b>readConcern snapshot:</b> consistent majority-committed snapshot (transactions).', '<b>readConcern snapshot:</b> snapshot consistente confirmado pela maioria (transações).') }[S.rc],
    tx('<b>Result returned to the client.</b>', '<b>Resultado retornado ao cliente.</b>'),
  ];
  renderSteps('arch-steps', steps);
  $('arch-steps-label').textContent = tx('read · ', 'leitura · ') + S.rp;
  if (!node) {
    setStep('arch-steps', 0, 'active');
    log('ERROR', 'DRIVER', tx(`No node matches readPreference ${S.rp} — server selection fails after timeout`, `Nenhum nó atende readPreference ${S.rp} — a seleção de servidor falha após o timeout`));
    return;
  }
  archLock(true);
  const [x, y] = AP.nodes[node.id];
  setStep('arch-steps', 0, 'active');
  await fly('arch-svg', [AP.client, [x, y - 24]], 600, '#001E2B');
  setStep('arch-steps', 0, 'done'); setStep('arch-steps', 1, 'active');
  const az = node.az !== undefined && archUpAZ(node.az) ? node.az : [0, 1, 2].find(archUpAZ);
  if (az !== undefined && Math.random() < 0.6) {
    const [pgx, pgy] = AP.page[az];
    flash('arch-svg', x, y - 32, 'cache miss', '#00684A');
    await fly('arch-svg', [[x, y + 24], [pgx, pgy - 20]], 550, '#00684A', 5);
    await fly('arch-svg', [[pgx, pgy - 20], [x, y + 24]], 550, '#00684A', 5);
    log('INFO', 'PAGE-SVC', tx(`Page fetched from Page Service (${AZ_NAMES[az]}) — no local disk involved`, `Página buscada do Page Service (${AZ_NAMES[az]}) — sem disco local`));
  } else flash('arch-svg', x, y - 32, 'cache hit', '#00684A');
  setStep('arch-steps', 1, 'done'); setStep('arch-steps', 2, 'done'); setStep('arch-steps', 3, 'active');
  await fly('arch-svg', [[x, y - 24], AP.client], 600, '#00684A');
  setStep('arch-steps', 3, 'done');
  log('SUCCESS', 'CLIENT', tx(`Read served by ${node.id} (readPreference ${S.rp}, readConcern ${S.rc})`, `Leitura atendida por ${node.id} (readPreference ${S.rp}, readConcern ${S.rc})`));
  archLock(false);
}
