// ─── TAB 2 — HIGH AVAILABILITY & FAILOVER ────────────────────────────────────
// Single-region cluster: 2 electable compute nodes in separate AZs [D1, D2],
// Log Service replicated across 3 AZs, majority = 2 [B4].

const HP = {};          // coordinates from the last render
let haNodeSeq = 2;      // node-N naming for replacements
let haFailoverSeq = 0;  // invalidate callbacks from an earlier failover

function haInitNodes() {
  haNodeSeq = 2;
  S.ha.nodes = [
    { id: 'node-1', role: 'PRIMARY', az: 0, state: 'UP' },
    { id: 'node-2', role: 'STANDBY', az: 1, state: 'UP' },
  ];
}

const haUpAZ = () => S.ha.azDown.filter(d => !d).length;
const haQuorum = () => haUpAZ() >= 2;
const haPrimary = () => S.ha.nodes.find(n => n.role === 'PRIMARY' && n.state === 'UP' && !S.ha.azDown[n.az]);
const haStandby = () => S.ha.nodes.find(n => n.role === 'STANDBY' && n.state === 'UP' && !S.ha.azDown[n.az]);

function haLater(fn, ms) { const t = setTimeout(fn, ms); S.ha.timers.push(t); return t; }

function haFoSteps() {
  return [
    tx(`<b>Primary lost.</b> The primary fails or restarts. The primary can also change during OS/VM maintenance, vertical scaling and version upgrades.${src('D8')}`, `<b>Primário perdido.</b> O primário falha ou reinicia. O primário também pode mudar durante manutenção de SO/VM, escala vertical e upgrades de versão.${src('D8')}`),
    tx(`<b>Storage layer coordinates the failover.</b> Compute nodes do not vote to elect the new primary.${src('D2')}`, `<b>A camada de storage coordena o failover.</b> Os nós de compute não votam para eleger o novo primário.${src('D2')}`),
    tx(`<b>Standby promoted.</b> No oplog replay and no cold start — it was already tailing the log.${src('D8', 'D19', 'B4')}`, `<b>Standby promovido.</b> Sem replay de oplog e sem cold start — ele já acompanhava o log.${src('D8', 'D19', 'B4')}`),
    tx(`<b>Drivers reconnect.</b> They discover the new primary and retry eligible operations — the Atlas connection string already includes <code>retryWrites=true</code>. Interrupted index builds resume automatically.${src('D18', 'D2')}`, `<b>Drivers reconectam.</b> Descobrem o novo primário e refazem as operações elegíveis — a connection string do Atlas já inclui <code>retryWrites=true</code>. Index builds interrompidos retomam automaticamente.${src('D18', 'D2')}`),
    tx(`<b>No rollback of majority writes.</b> Writes acknowledged with <code>w:"majority"</code> remain committed in the storage layer. A <code>w:1</code> write can still roll back in rare failures.${src('D2', 'D8')}`, `<b>Sem rollback de escritas majority.</b> Escritas confirmadas com <code>w:"majority"</code> permanecem confirmadas na camada de storage. Uma escrita <code>w:1</code> ainda pode sofrer rollback em falhas raras.${src('D2', 'D8')}`),
    tx(`<b>Capacity restored.</b> A compute node attaches to the storage layer as the new standby — recovery without moving or replicating data.${src('D2')}`, `<b>Capacidade restaurada.</b> Um nó de compute se conecta à camada de storage como novo standby — recuperação sem mover nem replicar dados.${src('D2')}`),
  ];
}

// Capacity is a topology condition, not an elapsed animation delay.
function haUpdateCapacityStep() {
  if (S.ha.foPhase !== 5 || !$('ha-steps').children[5]) return;
  const prim = haPrimary(), standby = haStandby();
  const ready = prim && standby && prim.az !== standby.az;
  const attaching = S.ha.nodes.some(n => n.state === 'PROVISIONING' && !S.ha.azDown[n.az]);
  const pending = S.ha.autoHeal || attaching;
  setStep('ha-steps', 5, ready ? 'done' : pending ? 'active' : 'skip');
  $('ha-steps').children[5].innerHTML = stepHTML(ready ? haFoSteps()[5] : !pending
    ? tx('<b>Compute capacity incomplete.</b> Automatic recovery is off. Restore a compute node or enable automatic recovery to rebuild the primary + standby pair.', '<b>Capacidade de compute incompleta.</b> A recuperação automática está desativada. Restaure um nó de compute ou ative a recuperação automática para recompor o par primário + standby.')
    : attaching
      ? tx('<b>Restoring compute capacity.</b> A node is attaching to the shared storage layer. Capacity is restored only when primary and standby are available in separate AZs.', '<b>Recompondo a capacidade de compute.</b> Um nó está se conectando à camada de storage compartilhada. A capacidade só estará restaurada com primário e standby disponíveis em AZs distintas.')
      : tx('<b>Waiting for a standby.</b> Another healthy AZ is needed to restore the primary + standby pair. Recovery resumes when a zone becomes available.', '<b>Aguardando um standby.</b> É necessária outra AZ saudável para recompor o par primário + standby. A recuperação será retomada quando uma zona estiver disponível.'));
}

// ── Render ───────────────────────────────────────────────────────────────────

function haRender() {
  const rs = $('ha-region');
  if (rs && !rs.options.length) rs.innerHTML = INF_REGIONS.map(([r, n]) => `<option value="${r}">${r} — ${n}</option>`).join('');
  if (rs) rs.value = S.ha.region;
  const q = haQuorum();
  let s = `<svg viewBox="0 0 800 500" width="100%" xmlns="http://www.w3.org/2000/svg">`;
  HP.client = [400, 42];
  s += clientBox(400, 4, 250, tx('CLIENT APP', 'APLICAÇÃO CLIENTE'), tx('driver: retryable reads & writes', 'driver: retryable reads e writes'));
  s += `<rect x="10" y="52" width="780" height="440" rx="14" fill="${C.offwhite}" stroke="${C.slate}" stroke-width="1.3"/>
    <text x="24" y="70" font-size="10" font-weight="800" fill="${C.slate}" letter-spacing=".8">AWS ${S.ha.region} · ${tx('SINGLE REGION (PUBLIC PREVIEW)', 'SINGLE-REGION (PUBLIC PREVIEW)')}</text>
    <text x="776" y="70" text-anchor="end" font-size="9.5" font-weight="700" fill="${q ? C.forest : C.bad}">Log Service: ${haUpAZ()}/3 ${tx('replicas', 'réplicas')} · ${tx('majority', 'maioria')} = 2 ${q ? '✓' : '✕'}</text>`;

  HP.log = []; HP.page = []; HP.az = [];
  // Compute remains zonal; the shared storage layer spans all three AZs below.
  for (let i = 0; i < 3; i++) {
    const x0 = 24 + i * 256, down = S.ha.azDown[i];
    HP.az.push(x0);
    s += `<rect x="${x0}" y="80" width="240" height="174" rx="10" fill="${down ? C.badBg : C.white}" stroke="${down ? C.bad : C.line}" stroke-width="1.3" stroke-dasharray="${down ? '' : '5 4'}"/>
      <g class="clickable" onclick="haToggleAZ(${i})">
        <rect x="${x0}" y="80" width="240" height="24" rx="10" fill="${down ? C.bad : C.slate}"/>
        <rect x="${x0}" y="94" width="240" height="10" fill="${down ? C.bad : C.slate}"/>
        <text x="${x0 + 12}" y="96" font-size="10.5" font-weight="800" fill="${down ? C.white : C.spring}">${AZ_NAMES[i]}</text>
        <text x="${x0 + 228}" y="96" text-anchor="end" font-size="8.5" fill="${C.white}" opacity=".85">${down ? tx('DOWN — click to restore', 'FORA — clique para restaurar') : tx('click to fail this zone', 'clique para derrubar a zona')}</text>
      </g>
      <text x="${x0 + 12}" y="122" font-size="8" font-weight="700" fill="${C.t3}" letter-spacing=".8">COMPUTE</text>`;
  }
  const storageTop = 274;
  s += `<rect data-layer="shared-storage" x="24" y="${storageTop}" width="752" height="196" rx="12" fill="${C.lavender}" stroke="${C.forest}" stroke-width="1.5"/>
    <text x="40" y="295" font-size="10" font-weight="800" fill="${C.slate}" letter-spacing=".5">${tx('SHARED STORAGE LAYER', 'CAMADA DE STORAGE COMPARTILHADA')}</text>
    <text x="760" y="295" text-anchor="end" font-size="9" fill="${C.t2}">${tx('Distributed across 3 AZs in the same region', 'Distribuída pelas 3 AZs da mesma região')}</text>`;
  for (let i = 0; i < 3; i++) {
    const x0 = HP.az[i], down = S.ha.azDown[i];
    if (down) s += `<rect x="${x0 + 4}" y="307" width="232" height="102" rx="8" fill="${C.badBg}"/>`;
    if (i) s += `<line x1="${x0 - 8}" y1="307" x2="${x0 - 8}" y2="409" stroke="${C.line}" stroke-dasharray="3 4"/>`;
    s += `<text x="${x0 + 120}" y="323" text-anchor="middle" font-size="9" font-weight="700" fill="${down ? C.bad : C.t2}">${AZ_NAMES[i]}${down ? ' — ' + tx('DOWN', 'FORA') : ''}</text>`;
    const lx = x0 + 70, px = x0 + 170, y = 355;
    HP.log.push([lx, y]); HP.page.push([px, y]);
    s += logIcon(lx, y, down) + pageIcon(px, y, down);
    s += `<text x="${lx}" y="${y + 33}" text-anchor="middle" font-size="9" font-weight="700" fill="${C.slate}">Log Service</text>
      <text x="${px}" y="${y + 33}" text-anchor="middle" font-size="9" font-weight="700" fill="${C.slate}">Page Service</text>
      <text class="dt" x="${(lx + px) / 2}" y="${y + 50}" text-anchor="middle" font-size="8" fill="${down ? C.bad : C.t3}">${down ? tx('replicas unreachable', 'réplicas inacessíveis') : tx('replica in this zone', 'réplica nesta zona')}</text>`;
  }
  // S3
  s += `<rect x="34" y="415" width="732" height="47" rx="8" fill="${C.white}" stroke="${C.line}" stroke-width="1.3"/>
    ${bucketIcon(44, 419)}
    <text x="92" y="434" font-size="10.5" font-weight="700" fill="${C.slate}">Object Index Service → Amazon S3</text>
    <text class="dt" x="92" y="451" font-size="8.8" fill="${C.t2}">${tx('regional object storage — the durability floor beneath the log and page replicas', 'object storage regional — o piso de durabilidade abaixo das réplicas de log e de páginas')} ${tx('(engineering blog)', '(blog de engenharia)')}</text>`;
  // status strip
  const prim = haPrimary();
  const wState = haWriteState();
  s += `<text x="400" y="482" text-anchor="middle" font-size="10" font-weight="700" fill="${wState.ok ? C.forest : (wState.pause ? C.warn : C.bad)}">${wState.short}</text>`;

  // Node positions: electable at x0+60 ; extras at x0+140/x0+200
  HP.nodes = {};
  const slots = [0, 0, 0];
  S.ha.nodes.forEach(n => { HP.nodes[n.id] = [HP.az[n.az] + 62, 180]; });
  S.extra.forEach(n => { HP.nodes[n.id] = [HP.az[n.az] + 140 + slots[n.az]++ * 62, 180]; });

  // Topology overview: every available compute node attaches to the same layer.
  // Start at the badge's bottom edge (15 px high), including after promotion.
  [...S.ha.nodes, ...S.extra].forEach(n => {
    if (n.state === 'DOWN') return;
    const [x, y] = HP.nodes[n.id], badgeBottom = y + (n.role ? 44 : 37) + 15;
    const dotted = n.role === 'STANDBY' || n.state === 'PROVISIONING';
    s += `<line data-connection="compute-storage" data-node="${n.id}" x1="${x}" y1="${badgeBottom}" x2="${x}" y2="${storageTop}" stroke="${C.forest}" stroke-width="1.5" ${dotted ? 'stroke-dasharray="2 4" stroke-linecap="round"' : ''} opacity="${n.state === 'PROVISIONING' ? '.5' : '.85'}"/>`;
  });
  if (prim) {
    const [x, y] = HP.nodes[prim.id];
    s += `<line x1="400" y1="42" x2="${x}" y2="${y - 26}" stroke="${C.forest}" stroke-width="1.5" stroke-dasharray="5 4" opacity=".6"/>`;
  }
  // empty electable slot hint
  [0, 1, 2].forEach(i => {
    if (!S.ha.nodes.some(n => n.az === i) && !S.ha.azDown[i]) {
      s += `<rect x="${HP.az[i] + 30}" y="150" width="64" height="62" rx="9" fill="none" stroke="${C.line}" stroke-dasharray="4 4"/>
        <text x="${HP.az[i] + 62}" y="178" text-anchor="middle" font-size="7.5" fill="${C.t3}">${tx('no electable', 'sem nó')}</text>
        <text x="${HP.az[i] + 62}" y="189" text-anchor="middle" font-size="7.5" fill="${C.t3}">${tx('node here', 'elegível aqui')}</text>`;
    }
  });
  // nodes
  S.ha.nodes.forEach(n => {
    const [x, y] = HP.nodes[n.id];
    const lbl = n.state === 'DOWN' ? tx('DOWN', 'FORA') : n.state === 'PROVISIONING' ? tx('ATTACHING', 'CONECTANDO') : (n.role === 'PRIMARY' ? tx('PRIMARY', 'PRIMÁRIO') : 'STANDBY');
    const cls = n.state === 'PROVISIONING' ? 'prov' : (n.role === 'PRIMARY' && n.state === 'UP' ? 'gnod' : '');
    s += `<g class="clickable ${cls}" onclick="haClickNode('${n.id}')">${mdbNodeIcon(x, y, 50, n.state, n.role)}</g>
      <text x="${x}" y="${y + 38}" text-anchor="middle" font-size="9" fill="${C.t2}">${n.id}</text>
      ${roleBadge(x, y + 44, n.role, n.state, lbl)}`;
  });
  S.extra.forEach(n => {
    const [x, y] = HP.nodes[n.id];
    const lbl = n.state === 'DOWN' ? tx('DOWN', 'FORA') : n.state === 'PROVISIONING' ? tx('ATTACHING', 'CONECTANDO') : (n.type === 'READ_ONLY' ? 'READ-ONLY' : 'ANALYTICS');
    s += `<g class="clickable ${n.state === 'PROVISIONING' ? 'prov' : ''}" onclick="haClickNode('${n.id}')">${mdbNodeIcon(x, y, 40, n.state, n.type)}</g>
      <text x="${x}" y="${y + 32}" text-anchor="middle" font-size="8" fill="${C.t2}">${n.id}</text>
      ${roleBadge(x, y + 37, n.type, n.state, lbl)}`;
  });
  s += `</svg>`;
  $('ha-svg').innerHTML = s;

  $('ha-legend').innerHTML = `
    <div class="li-leg"><div class="ld" style="background:${C.spring};border:2px solid ${C.slate}"></div> ${tx('Primary', 'Primário')}</div>
    <div class="li-leg"><div class="ld" style="background:${C.slate}"></div> Standby</div>
    <div class="li-leg"><div class="ld" style="background:#fff;border:2.5px solid ${C.slate}"></div> Read-only</div>
    <div class="li-leg"><div class="ld" style="background:#fff;border:3px solid ${C.spring}"></div> Analytics</div>
    <div class="li-leg"><div class="ld" style="background:${C.badBg};border:2px solid ${C.bad}"></div> ${tx('Down', 'Fora')}</div>
    <div class="li-leg" style="margin-left:auto;color:${C.t3}">${tx('Add read-only/analytics nodes in tab ④', 'Adicione nós read-only/analytics na aba ④')}</div>`;
  haUpdateInfo();
}

// ── Derived state ────────────────────────────────────────────────────────────

function haWriteState() {
  const prim = haPrimary();
  if (!prim && S.ha.failingOver) return { ok: false, pause: true, short: tx('Writes: paused for failover — the driver retries', 'Escritas: pausadas pelo failover — o driver refaz') };
  if (!prim) return { ok: false, short: tx('Writes: unavailable — no primary', 'Escritas: indisponíveis — sem primário') };
  if (!haQuorum()) return { ok: false, short: tx('Writes: cannot be acknowledged — no storage-layer majority', 'Escritas: não podem ser confirmadas — sem maioria na camada de storage') };
  return { ok: true, short: tx(`Writes: OK — majority-durable across ${haUpAZ()} AZs`, `Escritas: OK — duráveis na maioria em ${haUpAZ()} AZs`) };
}

function haReadTargets() {
  const up = [...S.ha.nodes, ...S.extra].filter(n => n.state === 'UP');
  const prim = up.find(n => n.role === 'PRIMARY');
  const secs = up.filter(n => n.role !== 'PRIMARY');
  switch (S.rp) {
    case 'primary': return prim ? [prim] : [];
    case 'primaryPreferred': return prim ? [prim] : secs;
    case 'secondary': return secs;
    case 'secondaryPreferred': return secs.length ? secs : (prim ? [prim] : []);
    case 'nearest': return up;
  }
  return [];
}

function haUpdateInfo() {
  const prim = haPrimary(), q = haQuorum(), upAZ = haUpAZ();
  const anyCompute = [...S.ha.nodes, ...S.extra].some(n => n.state === 'UP');
  $('ha-bn-fo').classList.toggle('show', S.ha.failingOver);
  $('ha-bn-az').classList.toggle('show', upAZ === 2 && !S.ha.failingOver);
  $('ha-bn-q').classList.toggle('show', !q && anyCompute);
  $('ha-bn-down').classList.toggle('show', !anyCompute);
  $('ha-bn-q-d').innerHTML = tx(
    `Only ${upAZ} of 3 zones are reachable, so the Log Service can't form a majority (2). MongoDB describes the design as surviving the loss of <strong>one</strong> zone; with two zones gone, majority writes wait until the storage majority is reachable again. Set <strong>wtimeout</strong> so writes don't block indefinitely.${src('B4', 'D2')} <em>Shown here by quorum arithmetic — this scenario isn't described in the public docs.</em>`,
    `Apenas ${upAZ} de 3 zonas estão acessíveis, então o Log Service não forma maioria (2). A MongoDB descreve o design como resistente à perda de <strong>uma</strong> zona; com duas zonas fora, escritas majority esperam até que a maioria do storage fique acessível novamente. Defina <strong>wtimeout</strong> para as escritas não bloquearem indefinidamente.${src('B4', 'D2')} <em>Mostrado aqui pela aritmética de quórum — este cenário não é descrito na documentação pública.</em>`);

  $('ha-status-label').textContent = S.ha.failingOver ? tx('failover in progress', 'failover em andamento')
    : !anyCompute ? tx('no compute available', 'sem compute disponível')
    : !q ? tx('storage majority lost', 'maioria do storage perdida')
    : !prim || !haStandby() ? tx('degraded — incomplete compute pair', 'degradado — par de compute incompleto')
    : upAZ < 3 ? tx('degraded — still serving', 'degradado — ainda atendendo')
    : tx('healthy', 'saudável');

  $('ha-quorum-info').innerHTML = tx(
    `<strong>Log Service:</strong> ${upAZ}/3 zones · majority needed: 2 · ${q ? `<strong>can lose ${upAZ - 2} more zone${upAZ - 2 === 1 ? '' : 's'}</strong>` : '<strong>no majority</strong>'}.<br><strong>Electable compute:</strong> ${S.ha.nodes.filter(n => n.state === 'UP').length}/2 up (primary + standby, in separate zones).${src('D1', 'D2', 'B4')}`,
    `<strong>Log Service:</strong> ${upAZ}/3 zonas · maioria necessária: 2 · ${q ? `<strong>pode perder mais ${upAZ - 2} zona${upAZ - 2 === 1 ? '' : 's'}</strong>` : '<strong>sem maioria</strong>'}.<br><strong>Compute elegível:</strong> ${S.ha.nodes.filter(n => n.state === 'UP').length}/2 ativos (primário + standby, em zonas separadas).${src('D1', 'D2', 'B4')}`);
  $('ha-quorum-info').className = 'desc' + (q ? (upAZ < 3 ? ' warn' : '') : ' bad');

  $('ha-az-btns').innerHTML = [0, 1, 2].map(i => S.ha.azDown[i]
    ? `<button class="btn btn-g btn-sm" onclick="haToggleAZ(${i})">↺ ${tx('Restore', 'Restaurar')} ${AZ_NAMES[i]}</button>`
    : `<button class="btn btn-d btn-sm" onclick="haToggleAZ(${i})">⚡ ${tx('Fail', 'Derrubar')} ${AZ_NAMES[i]}</button>`).join('');

  // Application view
  const w = haWriteState();
  const reads = haReadTargets();
  const wcRisk = S.wc === 'w1' ? tx('w:1 — can be rolled back in rare failures', 'w:1 — pode sofrer rollback em falhas raras')
    : S.wc === 'w0' ? tx('w:0 — no acknowledgment at all', 'w:0 — nenhuma confirmação')
    : tx('majority — never rolled back', 'majority — nunca sofre rollback');
  const row = (k, v, ok) => `<div class="irow"><span class="ik">${k}</span><span class="iv" style="color:${ok === true ? C.forest : ok === false ? C.bad : C.warn}">${v}</span></div>`;
  $('ha-app-view').innerHTML =
    row(tx('Writes', 'Escritas'), w.ok ? '✓ OK' : (w.pause ? tx('⏳ retrying', '⏳ refazendo') : tx('✕ blocked', '✕ bloqueadas')), w.ok ? true : (w.pause ? null : false)) +
    row(tx('Reads', 'Leituras') + ` (${S.rp})`, reads.length ? '✓ ' + reads.map(n => n.id).join(', ') : tx('✕ no eligible node', '✕ nenhum nó elegível'), reads.length > 0) +
    row(tx('Acknowledged writes', 'Escritas confirmadas'), wcRisk, S.wc === 'wmaj' || S.wc === 'wnum' ? true : (S.wc === 'w1' ? null : false)) +
    row(tx('Read-only nodes', 'Nós read-only'), S.extra.length ? tx('keep serving reads; never become primary', 'seguem atendendo leituras; nunca viram primário') : tx('none (add in tab ④)', 'nenhum (adicione na aba ④)'), true) +
    `<div class="desc lav only-detailed" style="margin-top:8px">${tx('Timings in this animation are illustrative. The public preview docs don\'t publish an Atlas Infinite failover duration.', 'Os tempos desta animação são ilustrativos. A documentação do public preview não publica uma duração de failover para o Atlas Infinite.')}</div>`;

  haRenderCmp();
}

function haRenderCmp() {
  const rows = [
    [tx('Who decides', 'Quem decide'), tx('Election — electable nodes vote; majority wins', 'Eleição — nós elegíveis votam; a maioria vence'), tx(`The storage layer coordinates; compute nodes don't vote${src('D2')}`, `A camada de storage coordena; nós de compute não votam${src('D2')}`)],
    [tx('New primary', 'Novo primário'), tx('A secondary with its own full data copy', 'Um secundário com sua própria cópia completa dos dados'), tx(`Standby promoted without log replay or cold start${src('D19')}`, `Standby promovido sem replay de log nem cold start${src('D19')}`)],
    [tx('Former primary', 'Antigo primário'), tx('Unreplicated writes are rolled back', 'Escritas não replicadas sofrem rollback'), tx(`Acknowledged majority writes never roll back; w:1 can roll back in rare failures${src('D2', 'D8', 'D17')}`, `Escritas confirmadas com majority nunca sofrem rollback; w:1 pode sofrer rollback em falhas raras${src('D2', 'D8', 'D17')}`)],
    [tx('Replacing a node', 'Substituir um nó'), tx('Initial sync copies the full dataset', 'Initial sync copia o dataset inteiro'), tx(`Attaches to the storage layer — no data moved or replicated; it can't fall behind the oplog window${src('D1', 'D2')}`, `Conecta na camada de storage — nenhum dado movido ou replicado; não fica para trás da janela do oplog${src('D1', 'D2')}`)],
    [tx('Zone failure', 'Falha de zona'), tx('Survives if a majority of voting nodes remains', 'Sobrevive se restar a maioria dos nós votantes'), tx(`Log majority across 3 zones survives one zone outage; each zone has its own page servers; object storage is zone-failure-proof${src('B4')}`, `A maioria do log em 3 zonas sobrevive à queda de uma zona; cada zona tem seus page servers; o object storage resiste à falha de zona${src('B4')}`)],
    [tx('Region failure', 'Falha de região'), tx('Multi-region clusters can fail over across regions', 'Clusters multi-region fazem failover entre regiões'), tx(`Not covered in public preview — single-region only${src('D1')}`, `Não coberto no public preview — apenas single-region${src('D1')}`)],
    [tx('Test it', 'Teste'), tx('Atlas "Test Primary Failover"', 'Atlas "Test Primary Failover"'), tx(`Same Atlas "Test Primary Failover" button${src('D8')}`, `Mesmo botão "Test Primary Failover" do Atlas${src('D8')}`)],
  ];
  $('ha-cmp').innerHTML = `<table class="cmp"><thead><tr><th></th><th>Atlas Core</th><th class="inf">Atlas Infinite</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="inf">${r[2]}</td></tr>`).join('')}</tbody></table>`;
}

// ── Failures ─────────────────────────────────────────────────────────────────

function haClickNode(id) {
  if (S.ha.failingOver) return;
  const n = S.ha.nodes.find(x => x.id === id) || S.extra.find(x => x.id === id);
  if (!n || n.state === 'PROVISIONING') return;
  if (n.state === 'DOWN') {
    if (S.ha.azDown[n.az]) { log('WARN', 'ATLAS', tx(`${n.id} can't come back while ${AZ_NAMES[n.az]} is down`, `${n.id} não volta enquanto ${AZ_NAMES[n.az]} estiver fora`)); return; }
    haRecoverNode(n);
    return;
  }
  n.state = 'DOWN';
  log('ERROR', n.id.toUpperCase(), tx(`${n.id} (${n.role || n.type}) failed`, `${n.id} (${n.role || n.type}) falhou`));
  haAfterLoss(n, 'node');
}

function haAfterLoss(n, reason) {
  if (n.role === 'PRIMARY') haFailover(reason);
  else {
    if (n.role === 'STANDBY') log('INFO', 'ATLAS', tx('Standby lost — writes unaffected; secondary reads re-route', 'Standby perdido — escritas não afetadas; leituras em secundários são redirecionadas'));
    if (n.type) log('INFO', 'DRIVER', tx(`Reads re-routed away from ${n.id} — read-only nodes never take part in failover`, `Leituras redirecionadas de ${n.id} — nós read-only nunca participam do failover`));
    haScheduleHeal(n);
  }
  haUpdateCapacityStep(); haRender(); syncAll();
}

function haScheduleHeal(n) {
  if (!S.ha.autoHeal || S.ha.azDown[n.az]) return;
  haLater(() => { if (S.ha.autoHeal && n.state === 'DOWN' && !S.ha.azDown[n.az]) haRecoverNode(n); }, 2600);
}

function haRecoverNode(n) {
  const members = n.role ? S.ha.nodes : S.extra;
  if (!members.includes(n) || n.state !== 'DOWN' || S.ha.azDown[n.az]) return;
  if (n.role) {
    const others = S.ha.nodes.filter(x => x !== n && x.state !== 'DOWN' && !S.ha.azDown[x.az]);
    if (others.length >= 2 || others.some(x => x.az === n.az)) { S.ha.nodes = S.ha.nodes.filter(x => x !== n); haRender(); return; }
    n.role = 'STANDBY';
  }
  const recovery = n.recovery = (n.recovery || 0) + 1;
  n.state = 'PROVISIONING';
  log('INFO', 'ATLAS', tx(`Recovering ${n.id}: attaching to the storage layer — no initial sync, no data copy`, `Recuperando ${n.id}: conectando à camada de storage — sem initial sync, sem cópia de dados`));
  haUpdateCapacityStep(); haRender(); syncAll();
  haLater(() => {
    if (!(n.role ? S.ha.nodes : S.extra).includes(n) || n.recovery !== recovery || n.state !== 'PROVISIONING' || S.ha.azDown[n.az]) return;
    n.state = 'UP';
    if (n.role && !haPrimary()) {
      haRender();
      haFailover('recover');
      return;
    }
    if (n.role) n.role = 'STANDBY';
    log('SUCCESS', 'ATLAS', tx(`${n.id} is back (${n.role || n.type})`, `${n.id} voltou (${n.role || n.type})`));
    haReplaceStandby();
    haUpdateCapacityStep(); haRender(); syncAll();
  }, 1600);
}

function haToggleAZ(i) {
  if (S.ha.failingOver) return;
  S.ha.azDown[i] = !S.ha.azDown[i];
  if (S.ha.azDown[i]) {
    log('ERROR', AZ_NAMES[i], tx(`Availability Zone ${AZ_NAMES[i]} is down — its compute nodes and storage replicas are unreachable`, `Availability Zone ${AZ_NAMES[i]} caiu — seus nós de compute e réplicas de storage estão inacessíveis`));
    log(haQuorum() ? 'INFO' : 'ERROR', 'LOG-SVC', haQuorum()
      ? tx(`Log Service ${haUpAZ()}/3 — majority intact, writes stay durable`, `Log Service ${haUpAZ()}/3 — maioria intacta, escritas seguem duráveis`)
      : tx(`Log Service ${haUpAZ()}/3 — no majority: majority writes can't be acknowledged`, `Log Service ${haUpAZ()}/3 — sem maioria: escritas majority não podem ser confirmadas`));
    let lostPrimary = false;
    [...S.ha.nodes, ...S.extra].forEach(n => {
      if (n.az === i && n.state !== 'DOWN') { if (n.role === 'PRIMARY') lostPrimary = true; n.state = 'DOWN'; }
    });
    if (lostPrimary) haFailover('az');
    else {
      const sb = S.ha.nodes.find(n => n.az === i && n.role === 'STANDBY');
      if (sb) haReplaceStandby(sb);
      haRender(); syncAll();
    }
  } else {
    log('SUCCESS', AZ_NAMES[i], tx(`${AZ_NAMES[i]} restored — storage replicas rejoin and catch up`, `${AZ_NAMES[i]} restaurada — réplicas de storage voltam e se atualizam`));
    S.extra.filter(n => n.az === i && n.state === 'DOWN').forEach(n => haRecoverNode(n));
    S.ha.nodes.filter(n => n.az === i && n.state === 'DOWN').forEach(n => haRecoverNode(n));
    // The old node may have been replaced elsewhere. Reconcile even an empty AZ.
    haReplaceStandby();
    haRender(); syncAll();
  }
  haUpdateCapacityStep();
}

// Reserve a slot synchronously so repeated recovery events cannot start a third node.
function haReplaceStandby(old) {
  if (!S.ha.autoHeal || S.ha.failingOver) return;
  const active = S.ha.nodes.filter(n => n.state !== 'DOWN' && !S.ha.azDown[n.az]);
  if (active.length >= 2) return;
  const az = [old?.az, 0, 1, 2].find(a => a !== undefined && !S.ha.azDown[a] && !active.some(n => n.az === a));
  if (az === undefined) { log('WARN', 'ATLAS', tx('No healthy zone available for a new standby yet', 'Ainda não há zona saudável para um novo standby')); return; }
  let node = S.ha.nodes.find(n => n.az === az && n.state === 'DOWN');
  if (!node) {
    const replaced = old?.state === 'DOWN' ? old : S.ha.nodes.find(n => n.state === 'DOWN');
    S.ha.nodes = S.ha.nodes.filter(n => n !== replaced);
    node = { id: 'node-' + (++haNodeSeq), role: 'STANDBY', az, state: 'DOWN' };
    S.ha.nodes.push(node);
  }
  haRecoverNode(node);
}

function haSetAutoHeal(enabled) {
  S.ha.autoHeal = enabled;
  if (enabled) haReplaceStandby();
  haUpdateCapacityStep(); haRender(); syncAll();
}

// ── Failover sequence ────────────────────────────────────────────────────────

const HA_TIMELINE_STEP_MS = 4000; // Reading pace for the illustration, not a failover duration.

function haFailover(reason) {
  if (S.ha.failingOver) return;
  const sequence = ++haFailoverSeq;
  const later = (fn, ms) => haLater(() => { if (sequence === haFailoverSeq) fn(); }, ms);
  S.ha.foPhase = 0;
  const steps = haFoSteps();
  const sb = haStandby();
  renderSteps('ha-steps', steps);
  setStep('ha-steps', 0, sb ? 'active' : 'done');
  if (!sb) {
    setStep('ha-steps', 1, 'fail');
    $('ha-steps').children[1].innerHTML = stepHTML(tx('<b>No standby available.</b> There is no other electable compute node to promote right now. Data stays durable in the storage layer; service resumes when a compute node is back.', '<b>Nenhum standby disponível.</b> Não há outro nó de compute elegível para promover agora. Os dados seguem duráveis na camada de storage; o serviço volta quando um nó de compute retornar.'));
    log('ERROR', 'ATLAS', tx('Primary lost and no standby available', 'Primário perdido e nenhum standby disponível'));
    haReplaceStandby();
    haRender(); syncAll();
    return;
  }
  S.ha.failingOver = true;
  const old = S.ha.nodes.find(n => n.role === 'PRIMARY');
  log('WARN', 'STORAGE', tx('Primary unreachable — storage layer coordinates failover (no election among compute nodes)', 'Primário inacessível — a camada de storage coordena o failover (sem eleição entre nós de compute)'));
  haRender(); syncAll();
  let t = 0;
  const tick = () => {
    const elapsed = (++t * 0.5).toFixed(1);
    $('ha-fo-timer').textContent = tx(`Animation: ${elapsed}s`, `Animação: ${elapsed}s`);
  };
  $('ha-fo-timer').textContent = tx('Animation: 0.0s', 'Animação: 0.0s');
  const iv = setInterval(tick, 500); S.ha.timers.push(iv);
  later(() => { setStep('ha-steps', 0, 'done'); setStep('ha-steps', 1, 'active'); }, HA_TIMELINE_STEP_MS);
  later(() => {
    if (!S.ha.nodes.includes(sb) || sb.state !== 'UP' || S.ha.azDown[sb.az]) {
      ++haFailoverSeq;
      S.ha.failingOver = false;
      clearInterval(iv);
      haReplaceStandby(); haRender(); syncAll();
      return;
    }
    setStep('ha-steps', 1, 'done'); setStep('ha-steps', 2, 'active');
    if (old) old.role = 'STANDBY';
    sb.role = 'PRIMARY';
    log('SUCCESS', 'STORAGE', tx(`${sb.id} promoted to primary in ${AZ_NAMES[sb.az]} — warm, no log replay`, `${sb.id} promovido a primário em ${AZ_NAMES[sb.az]} — aquecido, sem replay de log`));
    haRender();
  }, HA_TIMELINE_STEP_MS * 2);
  later(() => {
    setStep('ha-steps', 2, 'done'); setStep('ha-steps', 3, 'active');
    S.ha.failingOver = false;
    clearInterval(iv);
    log('INFO', 'DRIVER', tx(`Driver discovered new primary ${sb.id}; retryable writes resumed`, `Driver descobriu o novo primário ${sb.id}; retryable writes retomados`));
    haRender(); syncAll();
  }, HA_TIMELINE_STEP_MS * 3);
  later(() => { setStep('ha-steps', 3, 'done'); setStep('ha-steps', 4, 'active'); log('INFO', 'ATLAS', tx('Acknowledged majority writes remain committed after failover; w:1 can roll back in rare failures', 'Escritas confirmadas com majority permanecem confirmadas após o failover; w:1 pode sofrer rollback em falhas raras')); }, HA_TIMELINE_STEP_MS * 4);
  later(() => {
    setStep('ha-steps', 4, 'done');
    S.ha.foPhase = 5;
    if (reason === 'test' && old) haRecoverNode(old);
    haReplaceStandby(old);
    haUpdateCapacityStep(); haRender(); syncAll();
  }, HA_TIMELINE_STEP_MS * 5);
}

function haTestFailover() {
  if (S.ha.failingOver) return;
  const prim = haPrimary();
  if (!prim) { log('WARN', 'ATLAS', tx('Test Primary Failover needs a running primary', 'Test Primary Failover precisa de um primário ativo')); return; }
  if (!haStandby()) { log('WARN', 'ATLAS', tx('Test Primary Failover needs a healthy standby', 'Test Primary Failover precisa de um standby saudável')); return; }
  log('WARN', 'ATLAS', tx(`Test Primary Failover: restarting primary ${prim.id}`, `Test Primary Failover: reiniciando o primário ${prim.id}`));
  prim.state = 'DOWN';
  haFailover('test');
}

function haReset() {
  ++haFailoverSeq;
  S.ha.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
  S.ha.timers = [];
  S.ha.failingOver = false;
  S.ha.foPhase = -1;
  S.ha.azDown = [false, false, false];
  haInitNodes();
  S.extra.forEach(n => { n.state = 'UP'; });
  renderSteps('ha-steps', haFoSteps());
  log('SUCCESS', 'ATLAS', tx('All zones and nodes restored', 'Todas as zonas e nós restaurados'));
  haRender(); syncAll();
}
