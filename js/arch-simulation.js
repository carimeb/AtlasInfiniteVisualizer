// ─── GUIDED ARCHITECTURE SIMULATIONS ────────────────────────────────────────
// One clock drives packets, parallel branches and the pause between stages.
let archPlayer;
let archRunLabel = '';
let archDrawnStage = null;

function archGetPlayer() {
  if (!archPlayer) archPlayer = new ArchPlayback({ onChange: archPlaybackUI, manual: true });
  return archPlayer;
}

function archClearMotion() {
  $('arch-svg').querySelectorAll('[data-arch-motion]').forEach(el => el.remove());
}

function archPlaybackUI(player = archGetPlayer()) {
  const busy = ['playing', 'waiting'].includes(player.status);
  S.arch.busy = busy;
  ['arch-btn-w', 'arch-btn-r', 'arch-cache'].forEach(id => { $(id).disabled = busy; });
  document.querySelectorAll('#tab-arch .sync-wc, #tab-arch .sync-rc, #tab-arch .sync-rp').forEach(el => { el.disabled = busy; });
  const writeSteps = S.arch.mode === 'core' ? 3 : 4;
  $('arch-btn-w').textContent = tx(`▶ Simulate Write · ${writeSteps} steps`, `▶ Simular Escrita · ${writeSteps} etapas`, `▶ Simular escritura · ${writeSteps} pasos`);
  $('arch-btn-r').textContent = tx('▶ Simulate Read · 3 steps', '▶ Simular Leitura · 3 etapas', "▶ Simular lectura · 3 pasos");
  $('arch-svg').classList.toggle('sim-frozen', player.status !== 'playing');
  const stage = player.stages[player.index];
  const starting = stage && player.index === 0 && stage !== archDrawnStage;
  if (stage !== archDrawnStage || ['completed', 'blocked', 'cancelled'].includes(player.status)) archClearMotion();
  archDrawnStage = stage;
  const count = player.stages.length, current = player.index + 1;
  const last = current === count;
  const nextStage = player.stages[player.index + 1];
  const status = {
    playing: last ? tx('Last step in progress', 'Última etapa em andamento', "Último paso en curso") : tx('In progress', 'Em andamento', "En curso"),
    waiting: tx('Waiting for your click', 'Aguardando seu clique', "Esperando tu clic"),
    completed: tx('✓ Simulation complete', '✓ Simulação concluída', "✓ Simulación completada"), cancelled: tx('Simulation interrupted', 'Simulação interrompida', "Simulación interrumpida"),
    blocked: tx('Cannot continue in this scenario', 'Não é possível continuar neste cenário', "No se puede continuar en este escenario"),
  }[player.status];
  $('arch-now').parentElement.dataset.state = player.status;
  $('arch-now').innerHTML = stage
    ? `<div class="sim-kicker">${archRunLabel}</div><div class="sim-status"><span class="sim-count">${tx(`Step ${current} of ${count}`, `Etapa ${current} de ${count}`, `Paso ${current} de ${count}`)}</span><span class="sim-state">${status}</span></div><strong>${stage.title}</strong><p>${player.message || stage.detail}</p>${stage.more && !player.message ? `<p class="only-detailed">${stage.more}</p>` : ''}`
    : `<div class="sim-kicker">${tx('Step-by-step simulation', 'Simulação passo a passo', "Simulación paso a paso")}</div><strong>${tx('Choose Simulate Write or Simulate Read', 'Escolha Simular Escrita ou Simular Leitura', "Elige Simular escritura o Simular lectura")}</strong><p>${tx(`Write: ${writeSteps} steps. Read: 3 steps. After each animation, you choose when to continue.`, `Escrita: ${writeSteps} etapas. Leitura: 3 etapas. Após cada animação, você escolhe quando continuar.`, `Escritura: ${writeSteps} pasos. Lectura: 3 pasos. Después de cada animación, tú eliges cuándo continuar.`)}</p>`;

  const next = $('arch-next');
  next.hidden = !stage || !busy;
  next.disabled = player.status !== 'waiting';
  next.textContent = player.status === 'waiting'
    ? (current + 1 === count
      ? tx(`View last step (${count} of ${count}) →`, `Ver última etapa (${count} de ${count}) →`, `Ver último paso (${count} de ${count}) →`)
      : tx(`Go to step ${current + 1} of ${count} →`, `Ir para etapa ${current + 1} de ${count} →`, `Ir al paso ${current + 1} de ${count} →`))
    : tx('Please wait…', 'Aguarde…', "Espera…");
  $('arch-next-hint').textContent = !stage ? '' : {
    playing: last
      ? tx('This is the last step. The simulation ends when this animation finishes.', 'Esta é a última etapa. A simulação termina quando esta animação acabar.', "Este es el último paso. La simulación termina cuando finaliza esta animación.")
      : tx('Follow this animation. When it finishes, click to see the next step.', 'Acompanhe esta animação. Quando ela terminar, clique para ver a próxima etapa.', "Sigue esta animación. Cuando termine, haz clic para ver el siguiente paso."),
    waiting: tx(`This step is complete. Next: ${nextStage?.title || ''}.`, `Esta etapa terminou. A seguir: ${nextStage?.title || ''}.`, `Este paso terminó. A continuación: ${nextStage?.title || ''}.`),
    completed: tx(`All ${count} steps have been shown. Choose Simulate Write or Simulate Read to start again.`, `As ${count} etapas foram exibidas. Escolha Simular Escrita ou Simular Leitura para começar novamente.`, `Se mostraron los ${count} pasos. Elige Simular escritura o Simular lectura para empezar de nuevo.`),
    blocked: tx('The simulation ended before completing all steps. Adjust the scenario and start again.', 'A simulação foi encerrada antes de completar todas as etapas. Ajuste o cenário e comece novamente.', "La simulación terminó antes de completar todos los pasos. Ajusta el escenario y empieza de nuevo."),
    cancelled: tx('Choose Simulate Write or Simulate Read to start again.', 'Escolha Simular Escrita ou Simular Leitura para começar novamente.', "Elige Simular escritura o Simular lectura para empezar de nuevo."),
  }[player.status];
  $('arch-next-hint').hidden = !stage;
  renderSteps('arch-steps', player.stages.map(s => `<b>${s.title}</b> ${s.detail}`), player.stages.map((s, i) => i < player.index || player.status === 'completed' ? 'done' : i === player.index ? 'active' : ''));
  $('arch-steps-label').textContent = archRunLabel;
  // Position the lesson after its first caption has its final height.
  if (starting) $('arch-now').closest('.arch-guide').scrollIntoView({ block: 'start', behavior: 'instant' });
}

function archResetPlayback() {
  const player = archGetPlayer();
  player.cancel();
  player.stages = []; player.index = -1; player.status = 'idle'; player.message = '';
  archRunLabel = ''; archDrawnStage = null;
  archClearMotion(); archPlaybackUI(player);
}
// Captions are getters over the original scenario. Changing language keeps the
// same stages, chosen read node and running animation; only visible copy changes.
function archRefreshLanguage() {
  if (!archPlayer) return;
  archRunLabel = archRunLabel.split(' · ').map(translateKnownText).join(' · ');
  archPlayer.message = translateKnownText(archPlayer.message);
  $('arch-svg').querySelectorAll('text[data-arch-motion]').forEach(el => {
    el.textContent = translateKnownText(el.textContent);
  });
}
function archNext() { archGetPlayer().next(); }

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
  return archGetPlayer().start(stages).catch(error => {
    log('ERROR', 'SIMULATION', error.message || String(error));
  });
}

function archSimWrite() {
  if (S.arch.busy) return;
  archRender();
  const core = S.arch.mode === 'core';
  const concern = { w0: 'w:0', w1: 'w:1', wmaj: 'w:"majority"', wnum: core ? 'w:3' : 'w:3 → majority' }[S.wc];
  return archStart(core ? archCoreWritePlan() : archInfiniteWritePlan(), `${core ? 'Atlas Core' : 'Atlas Infinite'} · ${tx('write', 'escrita', "escritura")} · ${concern}`);
}

function archInfiniteWritePlan() {
  const wc = S.wc, majority = wc === 'wmaj' || wc === 'wnum';
  const primary = S.ha.nodes.find(n => n.role === 'PRIMARY' && n.state === 'UP');
  const upAZ = [0, 1, 2].filter(archUpAZ), first = upAZ[0];
  const pos = primary && AP.nodes[primary.id];
  const stby = S.ha.nodes.find(n => n.role === 'STANDBY' && n.state === 'UP');
  return [
    {
      get title() { return tx('Application sends the write', 'Aplicação envia a escrita', "La aplicación envía la escritura"); },
      get detail() { return tx('The driver routes the operation to the primary compute node.', 'O driver envia a operação ao nó de compute primário.', "El driver dirige la operación al nodo de compute primario."); },
      run: async play => {
        if (!pos) return play.block(tx('No primary is available. The driver must wait for an eligible primary.', 'Não há primário disponível. O driver precisa aguardar um primário elegível.', "No hay un primario disponible. El driver debe esperar a un primario elegible."));
        await archFly(play, [AP.client, [pos[0], pos[1] - 26]]);
        archHalo(...pos);
      },
    },
    {
      get title() { return tx('Primary records the operation in storage', 'Primário registra a operação no storage', "El primario registra la operación en el storage"); },
      get detail() { return tx('Compute executes the write and sends the log entry to the Log Service.', 'O compute executa a escrita e envia a entrada de log ao Log Service.', "Compute ejecuta la escritura y envía la entrada del log al Log Service.") + ' ' + (wc === 'w1'
        ? tx('With w:1, the ACK returns earlier than majority; rollback is still possible in rare failures.', 'Com w:1, o ACK retorna antes do majority; ainda pode haver rollback em falhas raras.', "Con w:1, el ACK regresa antes que con majority; aún puede haber reversiones en fallos poco frecuentes.")
        : wc === 'w0' ? tx('With w:0, the client requests no ACK.', 'Com w:0, o cliente não solicita ACK.', "Con w:0, el cliente no solicita ACK.") : tx('The client is still waiting for confirmation.', 'O cliente ainda aguarda a confirmação.', "El cliente todavía espera la confirmación.")); },
      get more() { return tx('The log entry is encrypted before leaving compute. For w:1, the exact ACK point shown here is illustrative.', 'A entrada é criptografada antes de sair do compute. Para w:1, o ponto exato do ACK mostrado aqui é ilustrativo.', "La entrada del log se cifra antes de salir del compute. Para w:1, el momento exacto del ACK mostrado aquí es ilustrativo."); },
      run: async play => {
        if (first === undefined) return play.block(tx('No Log Service is reachable.', 'Nenhum Log Service está acessível.', "No se puede acceder a ningún Log Service."));
        const [x, y] = AP.log[first];
        await archFly(play, [[pos[0], pos[1] + 62], [pos[0], 235], [x, y - 22]], 900);
        archHalo(x, y, 27); archLabel(x, y - 30, '1/3');
        if (wc === 'w1') await archAck(play, pos, 'ACK (w:1)');
      },
    },
    {
      get title() { return majority ? tx('Storage replicates and confirms at 2 of 3 AZs', 'Storage replica e confirma em 2 de 3 AZs', "El storage replica y confirma en 2 de 3 AZ") : tx('Storage replicates across the AZs', 'Storage replica entre as AZs', "El storage replica entre las AZ"); },
      get detail() { return majority
        ? tx('Once two log replicas hold the entry, the ACK goes to the client. The third replica can finish afterward. A majority write never rolls back.', 'Assim que duas réplicas do log têm a entrada, o ACK segue ao cliente. A terceira pode terminar depois. Uma escrita majority nunca sofre rollback.', "Cuando dos réplicas del log tienen la entrada, el ACK se envía al cliente. La tercera réplica puede terminar después. Una escritura majority nunca se revierte.")
        : tx('Replication continues in the storage layer. It sends no additional ACK: w:1 was acknowledged earlier; w:0 requests none.', 'A replicação continua na camada de storage. Não há um novo ACK: w:1 já foi confirmado; w:0 não solicita confirmação.', "La replicación continúa en la capa de storage. No envía otro ACK: w:1 ya se confirmó antes; w:0 no lo solicita."); },
      run: async play => {
        let count = 1;
        await Promise.all(upAZ.filter(i => i !== first).map(async (az, i) => {
          const [x, y] = AP.log[az], [sx, sy] = AP.log[first];
          await archFly(play, [[sx, sy - 22], [sx, 292], [x, 292], [x, y - 22]], 900 + i * 1100, C.slate);
          count++; archHalo(x, y, 27); archLabel(x, y - 30, `${count}/3`);
          if (count === 2 && majority) await archAck(play, pos, 'ACK majority ✓');
        }));
        if (count < 2) return play.block(majority
          ? tx('Fewer than 2 of 3 storage AZs are reachable. No majority ACK is possible; the write waits until recovery or wtimeout.', 'Menos de 2 das 3 AZs de storage estão acessíveis. Não é possível confirmar majority; a escrita aguarda recuperação ou wtimeout.', "Se puede acceder a menos de 2 de las 3 AZ del storage. No es posible un ACK por mayoría; la escritura espera hasta la recuperación o hasta wtimeout.")
          : tx('There is no storage majority. This demonstration stops here; an earlier w:1 ACK does not guarantee protection against rollback, and w:0 provides no result.', 'Não há maioria no storage. A demonstração para aqui; um ACK anterior com w:1 não garante proteção contra rollback, e w:0 não informa o resultado.', "No hay mayoría en el storage. La demostración se detiene aquí; un ACK previo de w:1 no garantiza protección contra reversiones, y w:0 no ofrece un resultado."));
      },
    },
    {
      get title() { return tx('Background work runs in parallel', 'Trabalho em segundo plano acontece em paralelo', "El trabajo en segundo plano ocurre en paralelo"); },
      get detail() { return tx('The standby follows the log while Page Materializers update Page Service and object storage. The order shown is educational: these independent tasks do not depend on the ACK.', 'O standby acompanha o log enquanto os Page Materializers atualizam o Page Service e o object storage. A ordem exibida é didática: essas tarefas independentes não dependem do ACK.', "El standby sigue el log mientras los Page Materializers actualizan el Page Service y el almacenamiento de objetos. El orden mostrado es didáctico: estas tareas independientes no dependen del ACK."); },
      get more() { return tx('Shown in a later stage for clarity; this does not mean background work starts only after the ACK. At checkpoints, compute emits phylog; materializers send phylog to Page Service and oplog + phylog to object storage.', 'Mostrado numa etapa posterior para facilitar a leitura; isso não significa que o trabalho só comece após o ACK. Nos checkpoints, o compute emite phylog; os materializers enviam phylog ao Page Service e oplog + phylog ao object storage.', "Se muestra en un paso posterior para mayor claridad; esto no significa que el trabajo en segundo plano empiece solo después del ACK. En los checkpoints, compute emite phylog; los materializadores envían phylog al Page Service y oplog + phylog al almacenamiento de objetos."); },
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
    { get title() { return tx('Application sends the write', 'Aplicação envia a escrita', "La aplicación envía la escritura"); },
      get detail() { return tx('The driver routes the operation to the primary node.', 'O driver envia a operação ao nó primário.', "El driver dirige la operación al nodo primario."); },
      run: async play => { await archFly(play, [AP.client, [pos[0], pos[1] - 26]]); archHalo(...pos); } },
    { get title() { return tx('Primary writes to its own storage', 'Primário grava no seu próprio storage', "El primario escribe en su propio storage"); },
      get detail() { return tx('The primary applies the operation and records it in its local storage.', 'O primário aplica a operação e a registra no storage local.', "El primario aplica la operación y la registra en su storage local.") + ' ' + (wc === 'w1'
        ? tx('With w:1, it acknowledges without waiting for the secondaries to replicate. Rollback is possible if it fails too soon.', 'Com w:1, ele confirma sem aguardar a replicação nos secundários. Pode haver rollback se ele falhar antes de replicar.', "Con w:1, confirma sin esperar a que los secundarios repliquen. Puede haber una reversión si falla demasiado pronto.")
        : wc === 'w0' ? tx('With w:0, the client requests no ACK.', 'Com w:0, o cliente não solicita ACK.', "Con w:0, el cliente no solicita ACK.") : tx('The client still waits for replication.', 'O cliente ainda aguarda a replicação.', "El cliente todavía espera la replicación.")); },
      run: async play => { await archFly(play, [[pos[0], 226], [pos[0], 272]], 700, C.slate); if (wc === 'w1') await archAck(play, pos, 'ACK (w:1)'); } },
    { get title() { return tx('Secondaries update their own copies', 'Secundários atualizam suas próprias cópias', "Los secundarios actualizan sus propias copias"); },
      get detail() { return tx('Each secondary pulls the oplog and applies the operation to its local storage.', 'Cada secundário puxa o oplog e aplica a operação no seu storage local.', "Cada secundario obtiene el oplog y aplica la operación a su storage local.") + ' ' + (wc === 'wmaj'
        ? tx('The primary sends the ACK when 2 of 3 nodes have the write; it need not wait for the third.', 'O primário envia o ACK quando 2 de 3 nós têm a escrita; não precisa aguardar o terceiro.', "El primario envía el ACK cuando 2 de 3 nodos tienen la escritura; no necesita esperar al tercero.")
        : wc === 'wnum' ? tx('With w:3, the ACK waits for all three nodes.', 'Com w:3, o ACK espera os três nós.', "Con w:3, el ACK espera a los tres nodos.")
        : tx('Replication continues without another ACK.', 'A replicação continua sem um novo ACK.', "La replicación continúa sin otro ACK.")); },
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
  return archStart(archReadPlan(), `${S.arch.mode === 'core' ? 'Atlas Core' : 'Atlas Infinite'} · ${tx('read', 'leitura', "lectura")} · cache ${S.arch.readCache}`);
}

function archReadPlan() {
  const core = S.arch.mode === 'core', miss = S.arch.readCache === 'miss', rp = S.rp, rc = S.rc;
  const idx = ['secondary', 'secondaryPreferred'].includes(rp) ? 1 + Math.floor(Math.random() * 2) : rp === 'nearest' ? Math.floor(Math.random() * 3) : 0;
  const node = core ? { get id() { return idx === 0 ? tx('primary', 'primário', "primario") : tx('secondary', 'secundário', "secundario") + ` ${idx}`; } } : archPickReadNode();
  const pos = node && (core ? AP.core[idx] : AP.nodes[node.id]);
  const az = node && archUpAZ(node.az) && node.az !== undefined ? node.az : [0, 1, 2].find(archUpAZ);
  const concern = () => ({
    local: tx('readConcern local: the node’s latest data, possibly including writes not yet committed by a majority.', 'readConcern local: dados mais recentes do nó, que podem incluir escritas ainda não confirmadas pela maioria.', "readConcern local: los datos más recientes del nodo, que pueden incluir escrituras aún no confirmadas por una mayoría."),
    available: tx('readConcern available: no majority-commit guarantee.', 'readConcern available: sem garantia de confirmação pela maioria.', "readConcern available: sin garantía de confirmación por mayoría."),
    majority: tx('readConcern majority: only majority-committed data.', 'readConcern majority: somente dados confirmados pela maioria.', "readConcern majority: solo datos confirmados por una mayoría."),
    snapshot: tx('readConcern snapshot: a consistent, majority-committed snapshot.', 'readConcern snapshot: um snapshot consistente, confirmado pela maioria.', "readConcern snapshot: una instantánea consistente y confirmada por mayoría."),
    linearizable: tx('readConcern linearizable: the primary must also confirm it is still primary before returning.', 'readConcern linearizable: o primário também precisa confirmar que continua primário antes de responder.', "readConcern linearizable: el primario también debe confirmar que sigue siendo primario antes de responder."),
  })[rc];
  return [
    { get title() { return tx('Driver selects the node', 'Driver escolhe o nó', "El driver selecciona el nodo"); },
      get detail() { return tx(`The driver uses readPreference ${rp} and sends the query to ${node ? node.id : 'an eligible node'}.`, `O driver usa readPreference ${rp} e envia a consulta para ${node ? node.id : 'um nó elegível'}.`, `El driver usa readPreference ${rp} y envía la consulta a ${node ? node.id : 'un nodo elegible'}.`); },
      run: async play => {
        if (rc === 'linearizable' && rp !== 'primary') return play.block(tx('readConcern linearizable requires readPreference primary. Change the settings in Detailed mode.', 'readConcern linearizable exige readPreference primary. Ajuste a configuração no modo Detalhado.', "readConcern linearizable requiere readPreference primary. Cambia los ajustes en el modo Detallado."));
        if (!pos) return play.block(tx('No eligible node matches this readPreference. The driver waits until server selection times out.', 'Nenhum nó elegível atende a este readPreference. O driver aguarda até o timeout da seleção de servidor.', "Ningún nodo elegible coincide con esta readPreference. El driver espera hasta agotar el tiempo de selección del servidor."));
        await archFly(play, [AP.client, [pos[0], pos[1] - 26]], 800, C.slate); archHalo(...pos);
      } },
    { get title() { return miss ? (core ? tx('Cache miss: fetch from the node’s disk', 'Cache miss: busca no disco do nó', "Cache miss: obtener del disco del nodo") : tx('Cache miss: fetch from Page Service', 'Cache miss: busca no Page Service', "Cache miss: obtener del Page Service")) : tx('Cache hit: read from memory', 'Cache hit: leitura da memória', "Cache hit: leer de la memoria"); },
      get detail() { return miss ? (core
        ? tx('The node fetches the page from its own local storage.', 'O nó busca a página no seu próprio storage local.', "El nodo obtiene la página de su propio storage local.")
        : tx('Compute fetches the page from the shared storage layer, through Page Service.', 'O compute busca a página na camada de storage compartilhada, pelo Page Service.', "Compute obtiene la página de la capa de storage compartida, a través del Page Service."))
        : tx('The requested page is already in the node’s memory. This illustrated read needs no storage fetch.', 'A página solicitada já está na memória do nó. Esta leitura ilustrada não precisa buscar a página no storage.', "La página solicitada ya está en la memoria del nodo. Esta lectura ilustrada no necesita acceder al storage."); },
      get more() { return concern(); },
      run: async play => {
        archHalo(...pos); archLabel(pos[0], pos[1] - 35, miss ? 'cache miss' : 'cache hit');
        if (!miss) return play.wait(800);
        if (!core && az === undefined) return play.block(tx('No Page Service is reachable for this cache miss.', 'Nenhum Page Service está acessível para este cache miss.', "No se puede acceder a ningún Page Service para este cache miss."));
        const from = [pos[0], core ? 226 : pos[1] + 62];
        const to = core ? [pos[0], 272] : [AP.page[az][0], AP.page[az][1] - 22];
        await archFly(play, [from, to], 800, C.slate);
        await archFly(play, [to, from], 800, C.forest);
      } },
    { get title() { return tx('Result returns to the application', 'Resultado volta à aplicação', "El resultado regresa a la aplicación"); },
      get detail() { return tx('The selected node returns the query result through the driver.', 'O nó selecionado devolve o resultado da consulta pelo driver.', "El nodo seleccionado devuelve el resultado de la consulta a través del driver."); },
      run: async play => { await archFly(play, [[pos[0], pos[1] - 26], AP.client], 800, C.forest); archLabel(400, 61, tx('result ✓', 'resultado ✓', "resultado ✓")); } },
  ];
}
