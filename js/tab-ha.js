// ─── TAB 2 — HIGH AVAILABILITY & FAILOVER ────────────────────────────────────
// Single-region cluster: 2 electable compute nodes in separate AZs [D1, D2],
// Log Service replicated across 3 AZs, majority = 2 [B4].

const HP = {};          // coordinates from the last render
let haNodeSeq = 2;      // node-N naming for replacements

function haInitNodes() {
  haNodeSeq = 2;
  S.ha.nodes = [
    { id: 'node-1', role: 'PRIMARY', az: 0, state: 'UP' },
    { id: 'node-2', role: 'STANDBY', az: 1, state: 'UP' },
  ];
}

const haUpAZ = () => S.ha.azDown.filter(d => !d).length;
const haQuorum = () => haUpAZ() >= 2;
const haPrimary = () => S.ha.nodes.find(n => n.role === 'PRIMARY' && n.state === 'UP');
const haStandby = () => S.ha.nodes.find(n => n.role === 'STANDBY' && n.state === 'UP');

function haLater(fn, ms) { const t = setTimeout(fn, ms); S.ha.timers.push(t); return t; }

function haFoSteps() {
  return [
    tx('<b>Primary lost.</b> The primary compute node fails or restarts.', '<b>Primário perdido.</b> O nó de compute primário falha ou reinicia.'),
    tx(`<b>Storage layer coordinates the failover.</b> No election and no vote among compute nodes.${src('D2')}`, `<b>A camada de storage coordena o failover.</b> Sem eleição e sem votação entre nós de compute.${src('D2')}`),
    tx(`<b>Standby promoted.</b> No log replay and no cold start — it was already tailing the log.${src('D19', 'B4')}`, `<b>Standby promovido.</b> Sem replay de log e sem cold start — ele já acompanhava o log.${src('D19', 'B4')}`),
    tx(`<b>Drivers reconnect.</b> They discover the new primary and retry eligible operations (retryable reads/writes). Interrupted index builds resume automatically.${src('D18', 'D2')}`, `<b>Drivers reconectam.</b> Descobrem o novo primário e refazem as operações elegíveis (retryable reads/writes). Index builds interrompidos retomam automaticamente.${src('D18', 'D2')}`),
    tx(`<b>No rollback.</b> The former primary has no unreplicated writes to revert — the storage layer committed them.${src('D8')}`, `<b>Sem rollback.</b> O antigo primário não tem escritas não replicadas para reverter — a camada de storage fez o commit.${src('D8')}`),
    tx(`<b>Capacity restored.</b> A compute node attaches to the storage layer as the new standby — recovery without moving or replicating data.${src('D2')}`, `<b>Capacidade restaurada.</b> Um nó de compute se conecta à camada de storage como novo standby — recuperação sem mover nem replicar dados.${src('D2')}`),
  ];
}

// ── Render ───────────────────────────────────────────────────────────────────

function haRender() {
  const q = haQuorum();
  let s = `<svg viewBox="0 0 800 500" width="100%" xmlns="http://www.w3.org/2000/svg">`;
  HP.client = [400, 42];
  s += clientBox(400, 4, 250, tx('CLIENT APP', 'APLICAÇÃO CLIENTE'), tx('driver: retryable reads & writes', 'driver: retryable reads e writes'));
  s += `<rect x="10" y="52" width="780" height="440" rx="14" fill="${C.offwhite}" stroke="${C.slate}" stroke-width="1.3"/>
    <text x="24" y="70" font-size="10" font-weight="800" fill="${C.slate}" letter-spacing=".8">AWS · ${tx('SINGLE REGION (PUBLIC PREVIEW)', 'SINGLE-REGION (PUBLIC PREVIEW)')}</text>
    <text x="776" y="70" text-anchor="end" font-size="9.5" font-weight="700" fill="${q ? C.forest : C.bad}">Log Service: ${haUpAZ()}/3 ${tx('replicas', 'réplicas')} · ${tx('majority', 'maioria')} = 2 ${q ? '✓' : '✕'}</text>`;

  HP.log = []; HP.page = []; HP.az = [];
  // AZ columns
  for (let i = 0; i < 3; i++) {
    const x0 = 24 + i * 256, down = S.ha.azDown[i];
    HP.az.push(x0);
    s += `<rect x="${x0}" y="80" width="240" height="318" rx="10" fill="${down ? C.badBg : C.white}" stroke="${down ? C.bad : C.line}" stroke-width="1.3" stroke-dasharray="${down ? '' : '5 4'}"/>
      <g class="clickable" onclick="haToggleAZ(${i})">
        <rect x="${x0}" y="80" width="240" height="24" rx="10" fill="${down ? C.bad : C.slate}"/>
        <rect x="${x0}" y="94" width="240" height="10" fill="${down ? C.bad : C.slate}"/>
        <text x="${x0 + 12}" y="96" font-size="10.5" font-weight="800" fill="${down ? C.white : C.spring}">${AZ_NAMES[i]}</text>
        <text x="${x0 + 228}" y="96" text-anchor="end" font-size="8.5" fill="${C.white}" opacity=".85">${down ? tx('DOWN — click to restore', 'FORA — clique para restaurar') : tx('click to fail this zone', 'clique para derrubar a zona')}</text>
      </g>
      <text x="${x0 + 12}" y="122" font-size="8" font-weight="700" fill="${C.t3}" letter-spacing=".8">COMPUTE</text>
      <line x1="${x0 + 10}" y1="262" x2="${x0 + 230}" y2="262" stroke="${C.faint}"/>
      <text x="${x0 + 12}" y="278" font-size="8" font-weight="700" fill="${C.t3}" letter-spacing=".8">STORAGE</text>`;
    const lx = x0 + 70, px = x0 + 170, y = 318;
    HP.log.push([lx, y]); HP.page.push([px, y]);
    s += logIcon(lx, y, down) + pageIcon(px, y, down);
    s += `<text x="${lx}" y="${y + 33}" text-anchor="middle" font-size="9" font-weight="700" fill="${C.slate}">Log Service</text>
      <text x="${px}" y="${y + 33}" text-anchor="middle" font-size="9" font-weight="700" fill="${C.slate}">Page Service</text>
      <text x="${(lx + px) / 2}" y="${y + 50}" text-anchor="middle" font-size="8" fill="${down ? C.bad : C.t3}">${down ? tx('replicas unreachable', 'réplicas inacessíveis') : tx('replica in this zone', 'réplica nesta zona')}</text>`;
  }
  // S3
  s += `<rect x="24" y="408" width="752" height="54" rx="10" fill="${C.white}" stroke="${C.line}" stroke-width="1.3"/>
    ${bucketIcon(44, 414)}
    <text x="92" y="431" font-size="10.5" font-weight="700" fill="${C.slate}">Object Index Service → Amazon S3</text>
    <text x="92" y="447" font-size="8.8" fill="${C.t2}">${tx('regional object storage — the durability floor beneath the log and page replicas', 'object storage regional — o piso de durabilidade abaixo das réplicas de log e de páginas')} ${tx('(engineering blog)', '(blog de engenharia)')}</text>`;
  // status strip
  const prim = haPrimary();
  const wState = haWriteState();
  s += `<text x="400" y="482" text-anchor="middle" font-size="10" font-weight="700" fill="${wState.ok ? C.forest : (wState.pause ? C.warn : C.bad)}">${wState.short}</text>`;

  // Node positions: electable at x0+60 ; extras at x0+140/x0+200
  HP.nodes = {};
  const slots = [0, 0, 0];
  S.ha.nodes.forEach(n => { HP.nodes[n.id] = [HP.az[n.az] + 62, 180]; });
  S.extra.forEach(n => { HP.nodes[n.id] = [HP.az[n.az] + 140 + slots[n.az]++ * 62, 180]; });

  // lines
  if (prim) {
    const [x, y] = HP.nodes[prim.id];
    s += `<line x1="400" y1="42" x2="${x}" y2="${y - 26}" stroke="${C.forest}" stroke-width="1.5" stroke-dasharray="5 4" opacity=".6"/>`;
    HP.log.forEach(([lx, ly], i) => {
      if (S.ha.azDown[i]) return;
      s += `<path d="M${x},${y + 62} C${x},${y + 95} ${lx},${ly - 60} ${lx},${ly - 20}" fill="none" stroke="${C.evergreen}" stroke-width="1.3" class="repl" opacity=".6"/>`;
    });
  }
  const sb = haStandby();
  if (sb) {
    const [x, y] = HP.nodes[sb.id];
    const [lx, ly] = HP.log[sb.az];
    s += `<path d="M${lx - 6},${ly - 20} C${lx - 6},${ly - 45} ${x + 36},${y + 70} ${x + 36},${y + 30}" fill="none" stroke="${C.forest}" stroke-width="1.3" stroke-dasharray="2 4"/>`;
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
    `Only ${upAZ} of 3 zones are reachable, so the Log Service can't form a majority (2). MongoDB describes the design as surviving the loss of <strong>one</strong> zone; with two zones gone, majority writes wait instead of risking divergence — Consistency is preserved over Availability. Set <strong>wtimeout</strong> so writes don't block indefinitely.${src('B4', 'D2')} <em>Shown here by quorum arithmetic — this scenario isn't described in the public docs.</em>`,
    `Apenas ${upAZ} de 3 zonas estão acessíveis, então o Log Service não forma maioria (2). A MongoDB descreve o design como resistente à perda de <strong>uma</strong> zona; com duas zonas fora, escritas majority esperam em vez de arriscar divergência — a Consistência é preservada em vez da Disponibilidade. Defina <strong>wtimeout</strong> para as escritas não bloquearem indefinidamente.${src('B4', 'D2')} <em>Mostrado aqui pela aritmética de quórum — este cenário não é descrito na documentação pública.</em>`);

  $('ha-status-label').textContent = S.ha.failingOver ? tx('failover in progress', 'failover em andamento')
    : !anyCompute ? tx('no compute available', 'sem compute disponível')
    : !q ? tx('storage majority lost', 'maioria do storage perdida')
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
    : tx('never rolled back', 'nunca sofre rollback');
  const row = (k, v, ok) => `<div class="irow"><span class="ik">${k}</span><span class="iv" style="color:${ok === true ? C.forest : ok === false ? C.bad : C.warn}">${v}</span></div>`;
  $('ha-app-view').innerHTML =
    row(tx('Writes', 'Escritas'), w.ok ? '✓ OK' : (w.pause ? tx('⏳ retrying', '⏳ refazendo') : tx('✕ blocked', '✕ bloqueadas')), w.ok ? true : (w.pause ? null : false)) +
    row(tx('Reads', 'Leituras') + ` (${S.rp})`, reads.length ? '✓ ' + reads.map(n => n.id).join(', ') : tx('✕ no eligible node', '✕ nenhum nó elegível'), reads.length > 0) +
    row(tx('Acknowledged writes', 'Escritas confirmadas'), wcRisk, S.wc === 'wmaj' || S.wc === 'wnum' ? true : (S.wc === 'w1' ? null : false)) +
    row(tx('Read-only nodes', 'Nós read-only'), S.extra.length ? tx('keep serving reads; never become primary', 'seguem atendendo leituras; nunca viram primário') : tx('none (add in tab ④)', 'nenhum (adicione na aba ④)'), true) +
    `<div class="desc lav" style="margin-top:8px">${tx('Timings in this animation are illustrative. The public preview docs don\'t publish an Atlas Infinite failover duration.', 'Os tempos desta animação são ilustrativos. A documentação do public preview não publica uma duração de failover para o Atlas Infinite.')}</div>`;

  haRenderCmp();
  updateCAP();
}

function haRenderCmp() {
  const rows = [
    [tx('Who decides', 'Quem decide'), tx('Election — electable nodes vote; majority wins', 'Eleição — nós elegíveis votam; a maioria vence'), tx(`The storage layer coordinates; compute nodes don't vote${src('D2')}`, `A camada de storage coordena; nós de compute não votam${src('D2')}`)],
    [tx('New primary', 'Novo primário'), tx('A secondary with its own full data copy', 'Um secundário com sua própria cópia completa dos dados'), tx(`Standby promoted without log replay or cold start${src('D19')}`, `Standby promovido sem replay de log nem cold start${src('D19')}`)],
    [tx('Former primary', 'Antigo primário'), tx('Unreplicated writes are rolled back', 'Escritas não replicadas sofrem rollback'), tx(`No rollback — nothing unreplicated to revert${src('D8', 'D17')}`, `Sem rollback — nada não replicado para reverter${src('D8', 'D17')}`)],
    [tx('Replacing a node', 'Substituir um nó'), tx('Initial sync copies the full dataset', 'Initial sync copia o dataset inteiro'), tx(`Attaches to the storage layer — no data moved or replicated${src('D2')}`, `Conecta na camada de storage — nenhum dado movido ou replicado${src('D2')}`)],
    [tx('Zone failure', 'Falha de zona'), tx('Survives if a majority of voting nodes remains', 'Sobrevive se restar a maioria dos nós votantes'), tx(`Log majority across 3 zones survives one zone outage${src('B4')}`, `A maioria do log em 3 zonas sobrevive à queda de uma zona${src('B4')}`)],
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
  haRender(); syncAll();
}

function haScheduleHeal(n) {
  if (!S.ha.autoHeal || S.ha.azDown[n.az]) return;
  haLater(() => { if (n.state === 'DOWN' && !S.ha.azDown[n.az]) haRecoverNode(n); }, 2600);
}

function haRecoverNode(n) {
  if (n.role) {
    const others = S.ha.nodes.filter(x => x !== n && x.state !== 'DOWN');
    if (others.length >= 2) { S.ha.nodes = S.ha.nodes.filter(x => x !== n); haRender(); return; }
  }
  n.state = 'PROVISIONING';
  log('INFO', 'ATLAS', tx(`Recovering ${n.id}: attaching to the storage layer — no initial sync, no data copy`, `Recuperando ${n.id}: conectando à camada de storage — sem initial sync, sem cópia de dados`));
  haRender(); syncAll();
  haLater(() => {
    n.state = 'UP';
    if (n.role && !haPrimary()) {
      n.role = 'STANDBY';
      haRender();
      haFailover('recover');
      return;
    }
    if (n.role) n.role = 'STANDBY';
    log('SUCCESS', 'ATLAS', tx(`${n.id} is back (${n.role || n.type})`, `${n.id} voltou (${n.role || n.type})`));
    haRender(); syncAll();
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
    haRender(); syncAll();
  }
}

// When the standby is lost, Atlas brings a compute node back in a healthy zone other than the primary's
function haReplaceStandby(old) {
  if (!S.ha.autoHeal) return;
  const prim = haPrimary();
  const az = [old.az, 0, 1, 2].find(a => !S.ha.azDown[a] && (!prim || a !== prim.az));
  if (az === undefined) { log('WARN', 'ATLAS', tx('No healthy zone available for a new standby yet', 'Ainda não há zona saudável para um novo standby')); return; }
  const nn = { id: 'node-' + (++haNodeSeq), role: 'STANDBY', az, state: 'PROVISIONING' };
  haLater(() => {
    if (S.ha.nodes.filter(n => n.state !== 'DOWN').length >= 2) return;
    S.ha.nodes = S.ha.nodes.filter(n => n !== old);
    S.ha.nodes.push(nn);
    log('INFO', 'ATLAS', tx(`${nn.id} provisioned in ${AZ_NAMES[az]} — attaching to the storage layer (no initial sync)`, `${nn.id} provisionado em ${AZ_NAMES[az]} — conectando à camada de storage (sem initial sync)`));
    haRender(); syncAll();
    haLater(() => {
      nn.state = 'UP';
      if (!haPrimary() && !S.ha.failingOver) { haRender(); haFailover('recover'); return; }
      log('SUCCESS', 'ATLAS', tx(`${nn.id} is the new standby`, `${nn.id} é o novo standby`));
      haRender(); syncAll();
    }, 1800);
  }, 1400);
}

// ── Failover sequence ────────────────────────────────────────────────────────

function haFailover(reason) {
  const steps = haFoSteps();
  const sb = haStandby();
  renderSteps('ha-steps', steps);
  setStep('ha-steps', 0, 'done');
  if (!sb) {
    setStep('ha-steps', 1, 'fail');
    $('ha-steps').children[1].innerHTML = tx('<b>No standby available.</b> There is no other electable compute node to promote right now. Data stays durable in the storage layer; service resumes when a compute node is back.', '<b>Nenhum standby disponível.</b> Não há outro nó de compute elegível para promover agora. Os dados seguem duráveis na camada de storage; o serviço volta quando um nó de compute retornar.');
    log('ERROR', 'ATLAS', tx('Primary lost and no standby available', 'Primário perdido e nenhum standby disponível'));
    haRender(); syncAll();
    return;
  }
  S.ha.failingOver = true;
  const old = S.ha.nodes.find(n => n.role === 'PRIMARY');
  log('WARN', 'STORAGE', tx('Primary unreachable — storage layer coordinates failover (no election among compute nodes)', 'Primário inacessível — a camada de storage coordena o failover (sem eleição entre nós de compute)'));
  haRender(); syncAll();
  let t = 0;
  const tick = () => { $('ha-fo-timer').textContent = (++t * 0.5).toFixed(1) + 's'; };
  $('ha-fo-timer').textContent = '0.0s';
  const iv = setInterval(tick, 500); S.ha.timers.push(iv);
  setStep('ha-steps', 1, 'active');
  haLater(() => {
    setStep('ha-steps', 1, 'done'); setStep('ha-steps', 2, 'active');
    if (old) old.role = 'STANDBY';
    sb.role = 'PRIMARY';
    log('SUCCESS', 'STORAGE', tx(`${sb.id} promoted to primary in ${AZ_NAMES[sb.az]} — warm, no log replay`, `${sb.id} promovido a primário em ${AZ_NAMES[sb.az]} — aquecido, sem replay de log`));
    haRender();
  }, 1100);
  haLater(() => {
    setStep('ha-steps', 2, 'done'); setStep('ha-steps', 3, 'active');
    S.ha.failingOver = false;
    clearInterval(iv);
    log('INFO', 'DRIVER', tx(`Driver discovered new primary ${sb.id}; retryable writes resumed`, `Driver descobriu o novo primário ${sb.id}; retryable writes retomados`));
    haRender(); syncAll();
  }, 2100);
  haLater(() => { setStep('ha-steps', 3, 'done'); setStep('ha-steps', 4, 'active'); log('INFO', 'ATLAS', tx('No rollback needed — acknowledged majority writes were already in the storage layer', 'Nenhum rollback necessário — escritas majority confirmadas já estavam na camada de storage')); }, 2900);
  haLater(() => {
    setStep('ha-steps', 4, 'done'); setStep('ha-steps', 5, 'active');
    if (!old) { setStep('ha-steps', 5, 'done'); return; }
    if (reason === 'test') {
      old.state = 'PROVISIONING';
      haRender();
      haLater(() => { old.state = 'UP'; old.role = 'STANDBY'; setStep('ha-steps', 5, 'done'); log('SUCCESS', 'ATLAS', tx(`${old.id} restarted and rejoined as standby`, `${old.id} reiniciou e voltou como standby`)); haRender(); syncAll(); }, 1500);
    } else if (reason === 'recover') {
      setStep('ha-steps', 5, 'done');
    } else if (S.ha.autoHeal) {
      haReplaceStandby(old);
      haLater(() => setStep('ha-steps', 5, 'done'), 3400);
    } else setStep('ha-steps', 5, 'skip');
  }, 3700);
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
  S.ha.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
  S.ha.timers = [];
  S.ha.failingOver = false;
  S.ha.azDown = [false, false, false];
  haInitNodes();
  S.extra.forEach(n => { n.state = 'UP'; });
  renderSteps('ha-steps', haFoSteps());
  log('SUCCESS', 'ATLAS', tx('All zones and nodes restored', 'Todas as zonas e nós restaurados'));
  haRender(); syncAll();
}
