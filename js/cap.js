// ─── CAP THEOREM PANEL ───────────────────────────────────────────────────────
// Directional, simplified model. It combines the shared settings (writeConcern,
// readConcern, readPreference) with the failures simulated in tab ② and the
// storage-limit state from tab ③.

function getCAPScores() {
  const rcBase = { linearizable: 96, snapshot: 90, majority: 90, local: 78, available: 66 }[S.rc];
  const rpC = { primary: 0, primaryPreferred: -4, secondary: -12, secondaryPreferred: -10, nearest: -12 }[S.rp];
  const wcC = { wmaj: 4, wnum: 4, w1: -10, w0: -22 }[S.wc];
  let c = clamp(rcBase + (S.rc === 'linearizable' ? 0 : rpC) + wcC, 5, 99);

  const up = [...S.ha.nodes, ...S.extra].filter(n => n.state === 'UP');
  const prim = up.some(n => n.role === 'PRIMARY');
  const upAZ = S.ha.azDown.filter(d => !d).length, quorum = upAZ >= 2;
  const storage = vsStorageState();
  let a = 76 + { primary: 0, primaryPreferred: 6, secondary: 2, secondaryPreferred: 8, nearest: 8 }[S.rp] + { w0: 6, w1: 4, wmaj: 0, wnum: 0 }[S.wc];
  a += Math.min(6, 2 * S.extra.filter(n => n.state === 'UP').length);
  if (S.ha.failingOver) a -= 22;
  else if (!prim) a -= 40;
  if (upAZ === 2) a -= 6;
  if (!quorum) a -= 45;
  if (storage.blocked) a -= 30;
  if (!up.length) a = 2;
  a = clamp(a, 2, 99);

  const d = { wmaj: 96, wnum: 96, w1: 68, w0: 25 }[S.wc];
  const lat = {
    w0: tx('none (no ACK)', 'nenhuma (sem ACK)'),
    w1: tx('lowest ACK', 'ACK mais rápido'),
    wmaj: tx('+ storage quorum', '+ quórum do storage'),
    wnum: tx('+ storage quorum', '+ quórum do storage'),
  }[S.wc];
  const latPct = { w0: 8, w1: 25, wmaj: 55, wnum: 55 }[S.wc];
  return { c, a, d, lat, latPct, up, prim, upAZ, quorum, storage };
}

function capLevel(v) { return v >= 85 ? tx('High', 'Alta') : v >= 65 ? tx('Medium', 'Média') : v >= 35 ? tx('Low', 'Baixa') : tx('Very low', 'Muito baixa'); }

function updateCAP() {
  if (!$('cap').classList.contains('cap-visible')) return;
  const k = getCAPScores();
  const invalid = S.rc === 'linearizable' && S.rp !== 'primary';
  let mode, cls, lbl;
  if (!k.up.length) { mode = tx('Unavailable — no compute node', 'Indisponível — sem nó de compute'); cls = 'cm-down'; lbl = '—'; }
  else if (k.c - k.a >= 8) { mode = tx('CP — Consistency priority', 'CP — Prioridade à consistência'); cls = 'cm-cp'; lbl = 'CP'; }
  else if (k.a - k.c >= 8) { mode = tx('AP-leaning — Availability / latency priority', 'Tendendo a AP — prioridade a disponibilidade / latência'); cls = 'cm-ap'; lbl = 'AP'; }
  else { mode = tx('Balanced (PA/EC)', 'Equilibrado (PA/EC)'); cls = 'cm-bal'; lbl = 'PA/EC'; }
  const badge = $('cap-mode-badge');
  badge.textContent = mode; badge.className = 'cap-mode ' + cls;

  // dot: slide along C→A and lean towards P (Atlas Infinite tolerates the loss of one AZ)
  const t = clamp((k.a - k.c) / 80 + 0.5, 0.06, 0.94);
  const cx = 150 + (52 - 150) * t, cy = 48 + (162 - 48) * t;
  const px = cx + (215 - cx) * 0.32, py = cy + (158 - cy) * 0.32;
  ['cap-dot', 'cap-dot-ring'].forEach(id => { $(id).setAttribute('cx', px); $(id).setAttribute('cy', py); });
  $('cap-dot').setAttribute('fill', cls === 'cm-down' ? C.bad : C.forest);
  const dl = $('cap-dot-lbl');
  dl.setAttribute('x', px + 11); dl.setAttribute('y', py - 3); dl.textContent = lbl;
  dl.setAttribute('fill', cls === 'cm-down' ? C.bad : C.forest);
  $('cap-slider-dot').style.left = clamp(100 * k.c / (k.c + k.a), 5, 95) + '%';

  const bar = (name, v, txt) => `<div class="mrow"><span class="mlbl">${name}</span><div class="mtrk"><div class="mfil" style="width:${v}%"></div></div><span class="mval">${txt}</span></div>`;
  $('cap-metrics').innerHTML =
    bar(tx('Consistency', 'Consistência'), k.c, capLevel(k.c)) +
    bar(tx('Availability', 'Disponibilidade'), k.a, capLevel(k.a)) +
    bar(tx('Durability', 'Durabilidade'), k.d, capLevel(k.d)) +
    bar(tx('Write latency', 'Latência de escrita'), k.latPct, k.lat);

  $('cap-p-text').innerHTML = tx(
    `Inside the region, the Log Service commits on a <strong>majority across 3 AZs</strong>, so losing or partitioning <strong>one zone</strong> doesn't stop durable writes${src('B4')}. A side that can't reach a storage majority can't commit writes — the system chooses <strong>consistency over availability</strong>. Region-level partitions aren't covered yet: multi-region isn't available in the preview${src('D1')}.<br><span class="cap-hl">Now: ${k.upAZ}/3 AZs · ${k.quorum ? 'storage majority ✓' : 'no storage majority ✕'}</span>`,
    `Dentro da região, o Log Service faz commit numa <strong>maioria entre 3 AZs</strong>, então perder ou particionar <strong>uma zona</strong> não interrompe as escritas duráveis${src('B4')}. Um lado que não alcança a maioria do storage não consegue fazer commit — o sistema escolhe <strong>consistência em vez de disponibilidade</strong>. Partições no nível de região ainda não são cobertas: multi-region não está disponível no preview${src('D1')}.<br><span class="cap-hl">Agora: ${k.upAZ}/3 AZs · ${k.quorum ? 'maioria do storage ✓' : 'sem maioria do storage ✕'}</span>`);

  let d = '';
  if (lbl === 'CP') d = tx(
    `Acknowledged writes are durable in a <strong>storage-layer majority</strong> and are never rolled back; reads ${S.rp === 'primary' ? 'come from the primary' : 'favour fresh data'}. Under failure, writes <strong>wait or retry</strong> instead of diverging.`,
    `Escritas confirmadas são duráveis numa <strong>maioria da camada de storage</strong> e nunca sofrem rollback; as leituras ${S.rp === 'primary' ? 'vêm do primário' : 'favorecem dados recentes'}. Sob falha, as escritas <strong>esperam ou são refeitas</strong> em vez de divergir.`);
  else if (lbl === 'AP') d = tx(
    `You traded consistency for latency/availability: ${S.wc === 'w0' ? '<strong>w:0</strong> never confirms a write' : S.wc === 'w1' ? '<strong>w:1</strong> returns sooner than majority (can be rolled back in rare failures)' : 'writes are majority-durable'}${['secondary', 'secondaryPreferred', 'nearest'].includes(S.rp) ? ', and reads from the standby/read-only nodes may be slightly stale' : ''}.`,
    `Você trocou consistência por latência/disponibilidade: ${S.wc === 'w0' ? '<strong>w:0</strong> nunca confirma uma escrita' : S.wc === 'w1' ? '<strong>w:1</strong> retorna antes do majority (pode sofrer rollback em falhas raras)' : 'as escritas são duráveis na maioria'}${['secondary', 'secondaryPreferred', 'nearest'].includes(S.rp) ? ', e leituras do standby/nós read-only podem estar levemente defasadas' : ''}.`);
  else if (lbl === 'PA/EC') d = tx(
    `Writes stay majority-durable, while reads are spread to the standby and read-only nodes for availability — those reads can lag by milliseconds${src('B4')}. Use causally consistent sessions when a client must read its own writes.`,
    `As escritas seguem duráveis na maioria, enquanto as leituras são distribuídas para o standby e nós read-only para ganhar disponibilidade — essas leituras podem ter lag de milissegundos${src('B4')}. Use sessões com consistência causal quando um cliente precisar ler as próprias escritas.`);
  else d = tx('No compute node is up. Data remains durable in the storage layer; service returns when a compute node is back.', 'Nenhum nó de compute ativo. Os dados seguem duráveis na camada de storage; o serviço volta quando um nó de compute retornar.');
  if (S.ha.failingOver) d += ' ' + tx('<strong>Failover in progress:</strong> writes are briefly paused while drivers retry.', '<strong>Failover em andamento:</strong> escritas pausadas brevemente enquanto os drivers refazem.');
  if (!k.quorum && k.up.length) d += ' ' + tx('<strong>Storage majority lost:</strong> majority writes can\'t be acknowledged.', '<strong>Maioria do storage perdida:</strong> escritas majority não podem ser confirmadas.');
  if (k.storage.blocked) d += ' ' + tx('<strong>Max storage limit reached:</strong> writes blocked, reads still served.', '<strong>Limite máximo de storage atingido:</strong> escritas bloqueadas, leituras seguem atendidas.');
  if (invalid) d += ' ⚠ ' + tx('linearizable + non-primary readPreference is rejected by the server.', 'linearizable + readPreference diferente de primary é rejeitado pelo servidor.');
  $('cap-desc-text').innerHTML = d;

  const row = (kk, v) => `<div class="irow"><span class="ik">${kk}</span><span class="iv">${v}</span></div>`;
  $('cap-config-tbl').innerHTML =
    row('writeConcern', { w0: 'w:0', w1: 'w:1', wmaj: 'w:"majority"', wnum: 'w:3 → majority' }[S.wc]) +
    row('readConcern', S.rc) + row('readPreference', S.rp) +
    row(tx('Edition', 'Edição'), 'Atlas Infinite') +
    row(tx('AZs up', 'AZs ativas'), `${k.upAZ}/3`) +
    row(tx('Primary', 'Primário'), k.prim ? '✓' : (S.ha.failingOver ? tx('failing over', 'em failover') : '✕')) +
    row(tx('Read-only/analytics', 'Read-only/analytics'), `${S.extra.filter(n => n.state === 'UP').length}/5`) +
    row('Storage', k.storage.blocked ? tx('writes blocked', 'escritas bloqueadas') : `${Math.round(k.storage.r * 100)}% ${tx('of limit', 'do limite')}`);
}
