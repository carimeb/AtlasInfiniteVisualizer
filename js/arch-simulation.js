// ─── GUIDED ARCHITECTURE SIMULATIONS ────────────────────────────────────────
// One clock drives packets, parallel branches and the pause between stages.
let archPlayer;
let archRunLabel = '';
let archDrawnStage = null;

function archGetPlayer() {
  if (!archPlayer) archPlayer = new ArchPlayback({ onChange: archPlaybackUI });
  return archPlayer;
}

function archClearMotion() {
  $('arch-svg').querySelectorAll('[data-arch-motion]').forEach(el => el.remove());
}

function archPlaybackUI(player = archGetPlayer()) {
  const busy = ['playing', 'paused', 'waiting'].includes(player.status);
  S.arch.busy = busy;
  ['arch-btn-w', 'arch-btn-r', 'arch-cache'].forEach(id => { $(id).disabled = busy; });
  document.querySelectorAll('#tab-arch .sync-wc, #tab-arch .sync-rc, #tab-arch .sync-rp').forEach(el => { el.disabled = busy; });
  $('arch-pause').disabled = !['playing', 'paused'].includes(player.status);
  $('arch-pause').textContent = player.status === 'paused' ? tx('▶ Resume', '▶ Continuar') : tx('Ⅱ Pause', 'Ⅱ Pausar');
  $('arch-next').disabled = player.status !== 'waiting';
  $('arch-stop').disabled = !busy;
  $('arch-play-mode').value = player.manual ? 'manual' : 'auto';
  $('arch-speed').value = String(player.speed);
  $('arch-svg').classList.toggle('sim-frozen', player.status !== 'playing');
  const stage = player.stages[player.index];
  if (stage !== archDrawnStage) { archClearMotion(); archDrawnStage = stage; }
  const status = {
    playing: tx('In progress', 'Em andamento'), paused: tx('Paused — resume when ready', 'Pausada — continue quando quiser'),
    waiting: tx('Stage complete — click Next step', 'Etapa concluída — clique em Próxima etapa'),
    completed: tx('Simulation complete', 'Simulação concluída'), cancelled: tx('Stopped — choose a simulation to restart', 'Interrompida — escolha uma simulação para recomeçar'),
    blocked: tx('Cannot continue in this scenario', 'Não é possível continuar neste cenário'),
  }[player.status];
  $('arch-now').innerHTML = stage
    ? `<div class="sim-kicker">${archRunLabel} · ${tx('Step', 'Etapa')} ${player.index + 1}/${player.stages.length} · ${status}</div><strong>${stage.title}</strong><p>${player.message || stage.detail}</p>${stage.more && !player.message ? `<p class="only-detailed">${stage.more}</p>` : ''}`
    : `<div class="sim-kicker">${tx('Follow the path', 'Acompanhe o caminho')}</div><strong>${tx('Choose Simulate Write or Simulate Read', 'Escolha Simular Escrita ou Simular Leitura')}</strong><p>${tx('Start at 0.5×, pause whenever you need, or use Step by step. The current explanation stays here.', 'Comece em 0,5×, pause quando precisar ou use Passo a passo. A explicação da etapa atual fica aqui.')}</p>`;
  renderSteps('arch-steps', player.stages.map(s => `<b>${s.title}</b> ${s.detail}`), player.stages.map((s, i) => i < player.index || player.status === 'completed' ? 'done' : i === player.index ? 'active' : ''));
  $('arch-steps-label').textContent = archRunLabel;
}

function archResetPlayback() {
  const player = archGetPlayer();
  player.cancel();
  player.stages = []; player.index = -1; player.status = 'idle'; player.message = '';
  archRunLabel = ''; archDrawnStage = null;
  archClearMotion(); archPlaybackUI(player);
}
function archSetPlaybackMode(mode) { archGetPlayer().setManual(mode === 'manual'); }
function archSetSpeed(speed) { archGetPlayer().setSpeed(Number(speed)); }
function archTogglePause() { const p = archGetPlayer(); p.status === 'paused' ? p.resume() : p.pause(); }
function archNext() { archGetPlayer().next(); }
function archStop() { archGetPlayer().cancel(); archClearMotion(); }

function archFx(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  el.setAttribute('data-arch-motion', '');
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  $('arch-svg').querySelector('svg').appendChild(el);
  return el;
}
function archHalo(x, y, r = 31) {
  archFx('circle', { cx: x, cy: y, r, fill: 'none', stroke: C.forest, 'stroke-width': 3 });
}
function archLabel(x, y, label) {
  const el = archFx('text', { x, y, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 800, fill: C.forest, 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 4 });
  el.textContent = label;
}
async function archFly(play, points, ms = 800, color = C.spring) {
  archFx('polyline', { points: points.map(p => p.join(',')).join(' '), fill: 'none', stroke: color === C.spring ? C.forest : color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', opacity: .65 });
  const dot = archFx('circle', { r: 6, fill: color, stroke: color === C.slate ? '#fff' : C.slate, 'stroke-width': 1.5 });
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  try {
    await play.wait(ms, progress => {
      let distance = total * progress, i = 0;
      while (i < lengths.length - 1 && distance > lengths[i]) distance -= lengths[i++];
      const f = lengths[i] ? distance / lengths[i] : 1;
      dot.setAttribute('cx', points[i][0] + (points[i + 1][0] - points[i][0]) * f);
      dot.setAttribute('cy', points[i][1] + (points[i + 1][1] - points[i][1]) * f);
    });
  } finally { dot.remove(); }
}
async function archAck(play, position, label) {
  await archFly(play, [[position[0], position[1] - 26], AP.client], 700, C.forest);
  archLabel(400, 61, label);
  log('SUCCESS', 'CLIENT', label);
}

function archStart(stages, label) {
  if (S.arch.busy) return;
  archResetPlayback();
  archRunLabel = label;
  // On narrow screens the sidebar is below the diagram. Bring the lesson into view.
  $('arch-now').closest('.arch-guide').scrollIntoView({ block: 'start', behavior: 'instant' });
  return archGetPlayer().start(stages).catch(error => {
    log('ERROR', 'SIMULATION', error.message || String(error));
  });
}

function archSimWrite() {
  if (S.arch.busy) return;
  archRender();
  const core = S.arch.mode === 'core';
  const concern = { w0: 'w:0', w1: 'w:1', wmaj: 'w:"majority"', wnum: core ? 'w:3' : 'w:3 → majority' }[S.wc];
  return archStart(core ? archCoreWritePlan() : archInfiniteWritePlan(), `${core ? 'Atlas Core' : 'Atlas Infinite'} · ${tx('write', 'escrita')} · ${concern}`);
}

function archInfiniteWritePlan() {
  const wc = S.wc, majority = wc === 'wmaj' || wc === 'wnum';
  const primary = S.ha.nodes.find(n => n.role === 'PRIMARY' && n.state === 'UP');
  const upAZ = [0, 1, 2].filter(archUpAZ), first = upAZ[0];
  const pos = primary && AP.nodes[primary.id];
  const stby = S.ha.nodes.find(n => n.role === 'STANDBY' && n.state === 'UP');
  return [
    {
      title: tx('Application sends the write', 'Aplicação envia a escrita'),
      detail: tx('The driver routes the operation to the primary compute node.', 'O driver envia a operação ao nó de compute primário.'),
      run: async play => {
        if (!pos) return play.block(tx('No primary is available. The driver must wait for an eligible primary.', 'Não há primário disponível. O driver precisa aguardar um primário elegível.'));
        await archFly(play, [AP.client, [pos[0], pos[1] - 26]]);
        archHalo(...pos);
      },
    },
    {
      title: tx('Primary records the operation in storage', 'Primário registra a operação no storage'),
      detail: tx('Compute executes the write and sends the log entry to the Log Service.', 'O compute executa a escrita e envia a entrada de log ao Log Service.') + ' ' + (wc === 'w1'
        ? tx('With w:1, the ACK returns earlier than majority; rollback is still possible in rare failures.', 'Com w:1, o ACK retorna antes do majority; ainda pode haver rollback em falhas raras.')
        : wc === 'w0' ? tx('With w:0, the client requests no ACK.', 'Com w:0, o cliente não solicita ACK.') : tx('The client is still waiting for confirmation.', 'O cliente ainda aguarda a confirmação.')),
      more: tx('The log entry is encrypted before leaving compute. For w:1, the exact ACK point shown here is illustrative.', 'A entrada é criptografada antes de sair do compute. Para w:1, o ponto exato do ACK mostrado aqui é ilustrativo.'),
      run: async play => {
        if (first === undefined) return play.block(tx('No Log Service is reachable.', 'Nenhum Log Service está acessível.'));
        const [x, y] = AP.log[first];
        await archFly(play, [[pos[0], pos[1] + 62], [pos[0], 235], [x, y - 22]], 900);
        archHalo(x, y, 27); archLabel(x, y - 30, '1/3');
        if (wc === 'w1') await archAck(play, pos, 'ACK (w:1)');
      },
    },
    {
      title: majority ? tx('Storage replicates and confirms at 2 of 3 AZs', 'Storage replica e confirma em 2 de 3 AZs') : tx('Storage replicates across the AZs', 'Storage replica entre as AZs'),
      detail: majority
        ? tx('Once two log replicas hold the entry, the ACK goes to the client. The third replica can finish afterward. A majority write never rolls back.', 'Assim que duas réplicas do log têm a entrada, o ACK segue ao cliente. A terceira pode terminar depois. Uma escrita majority nunca sofre rollback.')
        : tx('Replication continues in the storage layer. It sends no additional ACK: w:1 was acknowledged earlier; w:0 requests none.', 'A replicação continua na camada de storage. Não há um novo ACK: w:1 já foi confirmado; w:0 não solicita confirmação.'),
      run: async play => {
        let count = 1;
        await Promise.all(upAZ.filter(i => i !== first).map(async (az, i) => {
          const [x, y] = AP.log[az], [sx, sy] = AP.log[first];
          await archFly(play, [[sx, sy - 22], [sx, 292], [x, 292], [x, y - 22]], 900 + i * 1100, C.slate);
          count++; archHalo(x, y, 27); archLabel(x, y - 30, `${count}/3`);
          if (count === 2 && majority) await archAck(play, pos, 'ACK majority ✓');
        }));
        if (count < 2) return play.block(majority
          ? tx('Fewer than 2 of 3 storage AZs are reachable. No majority ACK is possible; the write waits until recovery or wtimeout.', 'Menos de 2 das 3 AZs de storage estão acessíveis. Não é possível confirmar majority; a escrita aguarda recuperação ou wtimeout.')
          : tx('There is no storage majority. This demonstration stops here; an earlier w:1 ACK does not guarantee protection against rollback, and w:0 provides no result.', 'Não há maioria no storage. A demonstração para aqui; um ACK anterior com w:1 não garante proteção contra rollback, e w:0 não informa o resultado.'));
      },
    },
    {
      title: tx('Background work runs in parallel', 'Trabalho em segundo plano acontece em paralelo'),
      detail: tx('The standby follows the log while Page Materializers update Page Service and object storage. The order shown is educational: these independent tasks do not depend on the ACK.', 'O standby acompanha o log enquanto os Page Materializers atualizam o Page Service e o object storage. A ordem exibida é didática: essas tarefas independentes não dependem do ACK.'),
      more: tx('Shown in a later stage for clarity; this does not mean background work starts only after the ACK. At checkpoints, compute emits phylog; materializers send phylog to Page Service and oplog + phylog to object storage.', 'Mostrado numa etapa posterior para facilitar a leitura; isso não significa que o trabalho só comece após o ACK. Nos checkpoints, o compute emite phylog; os materializers enviam phylog ao Page Service e oplog + phylog ao object storage.'),
      run: async play => {
        const standbyWork = (async () => {
          if (!stby) return;
          const az = upAZ.includes(stby.az) ? stby.az : first;
          const [lx, ly] = AP.log[az], [sx, sy] = AP.nodes[stby.id];
          await archFly(play, [[lx + 8, ly - 22], [sx, sy + 90], [sx, sy + 59]], 1000, C.forest);
          archHalo(sx, sy);
        })();
        const pagesWork = Promise.all(upAZ.map(async az => {
          const [lx, ly] = AP.log[az], [mx, my] = AP.materializer[az], [px, py] = AP.page[az];
          await archFly(play, [[pos[0], pos[1] + 62], [lx, ly - 22]], 700, C.forest);
          await archFly(play, [[lx, ly + 22], [mx, my - 16]], 600, C.forest);
          await Promise.all([
            archFly(play, [[mx + 50, my], [px - 22, py]], 800, C.forest),
            archFly(play, [[mx, my + 16], AP.s3[az]], 800, C.slate),
          ]);
        }));
        await Promise.all([standbyWork, pagesWork]);
      },
    },
  ];
}

function archCoreWritePlan() {
  const wc = S.wc, pos = AP.core[0];
  return [
    { title: tx('Application sends the write', 'Aplicação envia a escrita'),
      detail: tx('The driver routes the operation to the primary node.', 'O driver envia a operação ao nó primário.'),
      run: async play => { await archFly(play, [AP.client, [pos[0], pos[1] - 26]]); archHalo(...pos); } },
    { title: tx('Primary writes to its own storage', 'Primário grava no seu próprio storage'),
      detail: tx('The primary applies the operation and records it in its local storage.', 'O primário aplica a operação e a registra no storage local.') + ' ' + (wc === 'w1'
        ? tx('With w:1, it acknowledges without waiting for the secondaries to replicate. Rollback is possible if it fails too soon.', 'Com w:1, ele confirma sem aguardar a replicação nos secundários. Pode haver rollback se ele falhar antes de replicar.')
        : wc === 'w0' ? tx('With w:0, the client requests no ACK.', 'Com w:0, o cliente não solicita ACK.') : tx('The client still waits for replication.', 'O cliente ainda aguarda a replicação.')),
      run: async play => { await archFly(play, [[pos[0], 226], [pos[0], 272]], 700, C.slate); if (wc === 'w1') await archAck(play, pos, 'ACK (w:1)'); } },
    { title: tx('Secondaries update their own copies', 'Secundários atualizam suas próprias cópias'),
      detail: tx('Each secondary pulls the oplog and applies the operation to its local storage.', 'Cada secundário puxa o oplog e aplica a operação no seu storage local.') + ' ' + (wc === 'wmaj'
        ? tx('The primary sends the ACK when 2 of 3 nodes have the write; it need not wait for the third.', 'O primário envia o ACK quando 2 de 3 nós têm a escrita; não precisa aguardar o terceiro.')
        : wc === 'wnum' ? tx('With w:3, the ACK waits for all three nodes.', 'Com w:3, o ACK espera os três nós.')
        : tx('Replication continues without another ACK.', 'A replicação continua sem um novo ACK.')),
      run: async play => {
        let count = 1;
        await Promise.all(AP.core.slice(1).map(async ([x, y], i) => {
          await archFly(play, [[190, 175], [278, 175], [278, 118], [x, 118], [x, 146]], 900 + i * 1100, C.slate);
          await archFly(play, [[x, 226], [x, 272]], 600, C.slate);
          count++; archHalo(x, y); archLabel(x, 258, `${count}/3`);
          if ((count === 2 && wc === 'wmaj') || (count === 3 && wc === 'wnum')) await archAck(play, pos, wc === 'wnum' ? 'ACK w:3 ✓' : 'ACK majority ✓');
        }));
      } },
  ];
}

function archPickReadNode() {
  const up = [...S.ha.nodes, ...S.extra].filter(n => n.state === 'UP');
  const primary = up.find(n => n.role === 'PRIMARY'), secondaries = up.filter(n => n.role !== 'PRIMARY');
  const pick = a => a[Math.floor(Math.random() * a.length)];
  return { primary: () => primary, primaryPreferred: () => primary || pick(secondaries), secondary: () => pick(secondaries), secondaryPreferred: () => pick(secondaries) || primary, nearest: () => pick(up) }[S.rp]();
}

function archSimRead() {
  if (S.arch.busy) return;
  archRender();
  return archStart(archReadPlan(), `${S.arch.mode === 'core' ? 'Atlas Core' : 'Atlas Infinite'} · ${tx('read', 'leitura')} · cache ${S.arch.readCache}`);
}

function archReadPlan() {
  const core = S.arch.mode === 'core', miss = S.arch.readCache === 'miss', rp = S.rp, rc = S.rc;
  const idx = ['secondary', 'secondaryPreferred'].includes(rp) ? 1 + Math.floor(Math.random() * 2) : rp === 'nearest' ? Math.floor(Math.random() * 3) : 0;
  const node = core ? { id: idx === 0 ? tx('primary', 'primário') : tx('secondary', 'secundário') + ` ${idx}` } : archPickReadNode();
  const pos = node && (core ? AP.core[idx] : AP.nodes[node.id]);
  const az = node && archUpAZ(node.az) && node.az !== undefined ? node.az : [0, 1, 2].find(archUpAZ);
  const concern = {
    local: tx('readConcern local: the node’s latest data, possibly including writes not yet committed by a majority.', 'readConcern local: dados mais recentes do nó, que podem incluir escritas ainda não confirmadas pela maioria.'),
    available: tx('readConcern available: no majority-commit guarantee.', 'readConcern available: sem garantia de confirmação pela maioria.'),
    majority: tx('readConcern majority: only majority-committed data.', 'readConcern majority: somente dados confirmados pela maioria.'),
    snapshot: tx('readConcern snapshot: a consistent, majority-committed snapshot.', 'readConcern snapshot: um snapshot consistente, confirmado pela maioria.'),
    linearizable: tx('readConcern linearizable: the primary must also confirm it is still primary before returning.', 'readConcern linearizable: o primário também precisa confirmar que continua primário antes de responder.'),
  }[rc];
  return [
    { title: tx('Driver selects the node', 'Driver escolhe o nó'),
      detail: tx(`The driver uses readPreference ${rp} and sends the query to ${node ? node.id : 'an eligible node'}.`, `O driver usa readPreference ${rp} e envia a consulta para ${node ? node.id : 'um nó elegível'}.`),
      run: async play => {
        if (rc === 'linearizable' && rp !== 'primary') return play.block(tx('readConcern linearizable requires readPreference primary. Change the settings in Detailed mode.', 'readConcern linearizable exige readPreference primary. Ajuste a configuração no modo Detalhado.'));
        if (!pos) return play.block(tx('No eligible node matches this readPreference. The driver waits until server selection times out.', 'Nenhum nó elegível atende a este readPreference. O driver aguarda até o timeout da seleção de servidor.'));
        await archFly(play, [AP.client, [pos[0], pos[1] - 26]], 800, C.slate); archHalo(...pos);
      } },
    { title: miss ? (core ? tx('Cache miss: fetch from the node’s disk', 'Cache miss: busca no disco do nó') : tx('Cache miss: fetch from Page Service', 'Cache miss: busca no Page Service')) : tx('Cache hit: read from memory', 'Cache hit: leitura da memória'),
      detail: miss ? (core
        ? tx('The node fetches the page from its own local storage.', 'O nó busca a página no seu próprio storage local.')
        : tx('Compute fetches the page from the shared storage layer, through Page Service.', 'O compute busca a página na camada de storage compartilhada, pelo Page Service.'))
        : tx('The requested page is already in the node’s memory. This illustrated read needs no storage fetch.', 'A página solicitada já está na memória do nó. Esta leitura ilustrada não precisa buscar a página no storage.'),
      more: concern,
      run: async play => {
        archHalo(...pos); archLabel(pos[0], pos[1] - 35, miss ? 'cache miss' : 'cache hit');
        if (!miss) return play.wait(800);
        if (!core && az === undefined) return play.block(tx('No Page Service is reachable for this cache miss.', 'Nenhum Page Service está acessível para este cache miss.'));
        const from = [pos[0], core ? 226 : pos[1] + 62];
        const to = core ? [pos[0], 272] : [AP.page[az][0], AP.page[az][1] - 22];
        await archFly(play, [from, to], 800, C.slate);
        await archFly(play, [to, from], 800, C.forest);
      } },
    { title: tx('Result returns to the application', 'Resultado volta à aplicação'),
      detail: tx('The selected node returns the query result through the driver.', 'O nó selecionado devolve o resultado da consulta pelo driver.'),
      run: async play => { await archFly(play, [[pos[0], pos[1] - 26], AP.client], 800, C.forest); archLabel(400, 61, tx('result ✓', 'resultado ✓')); } },
  ];
}
