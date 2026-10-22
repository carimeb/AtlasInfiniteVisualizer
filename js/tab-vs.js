// ─── TAB 3 — VERTICAL SCALING, AUTO-SCALING & STORAGE ───────────────────────

const VP = {};
const VS_WIN = 72;          // ticks shown in the chart (1 tick = 10 simulated minutes)
const VS_PERIOD = 36;       // "daily" pattern period, time-compressed for the demo
let vsTimer = null;

function vsTiers() { return TIERS[S.vs.cls]; }
function vsIdx(t) { return TIERS.general.indexOf(t); }

// ── Vertical scaling diagram ─────────────────────────────────────────────────

function vsBox(cx, cy, tier, role, state, label) {
  const k = vsIdx(tier), w = 74 + k * 13, h = 64 + k * 8;
  const fill = state === 'PROVISIONING' ? C.offwhite : C.white;
  const dash = state === 'PROVISIONING' ? 'stroke-dasharray="5 4"' : '';
  return `<g class="${state === 'PROVISIONING' ? 'prov' : (role === 'PRIMARY' ? 'gnod' : '')}">
    <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${C.slate}" stroke-width="${role === 'PRIMARY' ? 2.6 : 1.6}" ${dash}/>
    ${mdbNodeIcon(cx, cy - 8, 36, state === 'PROVISIONING' ? 'PROVISIONING' : 'UP', role)}
    <text x="${cx}" y="${cy + h / 2 - 9}" text-anchor="middle" font-size="12" font-weight="800" fill="${C.slate}">${tier}</text></g>
    ${roleBadge(cx, cy + h / 2 + 6, role, state, label)}`;
}

function vsRender(extra) {
  const e = extra || {};
  let s = `<svg viewBox="0 0 760 296" width="100%" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="8" width="740" height="186" rx="12" fill="${C.mist}" stroke="rgba(0,104,74,.35)" stroke-width="1.4"/>
    <text x="24" y="27" font-size="10" font-weight="800" fill="${C.forest}" letter-spacing="1">${tx('COMPUTE LAYER — SIZED BY THE CLUSTER TIER', 'CAMADA DE COMPUTE — DIMENSIONADA PELO TIER')}</text>
    <text x="736" y="27" text-anchor="end" font-size="9" fill="${C.t2}">${tx('tier = vCPU, RAM and IOPS for each node', 'tier = vCPU, RAM e IOPS de cada nó')}</text>
    <rect x="10" y="206" width="740" height="84" rx="12" fill="${C.lavender}" stroke="${C.line}" stroke-width="1.4"/>
    <text x="24" y="225" font-size="10" font-weight="800" fill="${C.slate}" letter-spacing="1">${tx('STORAGE LAYER — INDEPENDENT OF THE TIER', 'CAMADA DE STORAGE — INDEPENDENTE DO TIER')}</text>`;
  VP.log = [190, 256]; VP.page = [250, 256];
  s += logIcon(190, 256, false) + pageIcon(250, 256, false);
  s += `<text x="300" y="240" font-size="11" font-weight="700" fill="${C.slate}">${fmtTB(S.vs.dataTB)} ${tx('of data', 'de dados')} · ${tx('capacity up to', 'capacidade até')} 128 TB</text>
    <text x="300" y="257" font-size="9.5" fill="${C.t2}">${tx('Same storage capacity at every tier — changing the tier never moves data', 'Mesma capacidade de storage em todos os tiers — mudar o tier nunca move dados')}</text>
    <text x="300" y="273" font-size="9.5" fill="${e.noMove ? C.forest : C.t3}" font-weight="${e.noMove ? 700 : 400}">${e.noMove ? tx('✓ resize in progress — 0 bytes copied', '✓ resize em andamento — 0 bytes copiados') : tx('billed by consumption', 'cobrado por consumo')}</text>`;
  const pt = e.primTier || S.vs.tier, st = e.stbyTier || S.vs.tier;
  VP.prim = [170, 100]; VP.stby = [370, 100]; VP.ghost = [600, 100];
  s += vsBox(170, 100, pt, 'PRIMARY', 'UP', e.primLabel || tx('PRIMARY', 'PRIMÁRIO'));
  s += vsBox(370, 100, st, 'STANDBY', e.stbyState || 'UP', e.stbyLabel || 'STANDBY');
  if (e.ghost) s += vsBox(600, 100, e.ghost, 'PRIMARY', e.ghostState || 'PROVISIONING', e.ghostLabel || tx('NEW NODE', 'NOVO NÓ'));
  else s += `<text x="600" y="96" text-anchor="middle" font-size="9.5" fill="${C.t3}">${tx('pick a tier to resize →', 'escolha um tier para redimensionar →')}</text>
    <text x="600" y="110" text-anchor="middle" font-size="8.5" fill="${C.t3}">${tx('(ladder on the right)', '(escada à direita)')}</text>`;
  s += `</svg>`;
  $('vs-svg').innerHTML = s;
  $('vs-tier-label').textContent = `${S.vs.tier} · ${S.vs.cls === 'general' ? 'General' : 'Low-CPU'}`;
}

function vsRenderLadder() {
  $('vs-ladder').innerHTML = TIERS.general.map(t => {
    const allowed = vsTiers().includes(t);
    return `<button class="${t === S.vs.tier ? 'on' : ''}" ${allowed && !S.vs.resizing ? '' : 'disabled'} onclick="vsResize('${t}')">${t}</button>`;
  }).join('') + `<button disabled title="${tx('Not available in public preview', 'Não disponível no public preview')}">M80+</button>`;
  const opts = sel => vsTiers().map(t => `<option ${t === sel ? 'selected' : ''}>${t}</option>`).join('');
  $('vs-min').innerHTML = opts(S.vs.minTier);
  $('vs-max').innerHTML = opts(S.vs.maxTier);
  document.querySelectorAll('#vs-class-seg button').forEach(b => b.classList.toggle('on', b.dataset.cls === S.vs.cls));
  if (!S.vs.resizing) vsTierDesc();
}

function vsTierDesc() {
  $('vs-tier-desc').innerHTML = tx(
    `Public preview tiers: <strong>General M10–M60</strong> and <strong>Low-CPU M40–M60</strong>; M80+ not available yet.${src('D1', 'D3')} The tier sets compute only — storage capacity is the same at every tier.${src('D2', 'D4')}<br>Resize mechanism (engineering blog): a new node launches, tails the committed oplog from the Log Service, reads pages from the already-warm Page Service, then takes over as primary while the old node steps aside — <strong>in under a minute</strong>.${src('B4')}`,
    `Tiers do public preview: <strong>General M10–M60</strong> e <strong>Low-CPU M40–M60</strong>; M80+ ainda não disponível.${src('D1', 'D3')} O tier define apenas o compute — a capacidade de storage é a mesma em todos os tiers.${src('D2', 'D4')}<br>Mecanismo de resize (blog de engenharia): um novo nó sobe, acompanha o oplog confirmado no Log Service, lê páginas do Page Service já aquecido e assume como primário enquanto o nó antigo sai — <strong>em menos de um minuto</strong>.${src('B4')}`);
}

function vsSetClass(cls) {
  if (S.vs.resizing) return;
  S.vs.cls = cls;
  const t = vsTiers();
  if (!t.includes(S.vs.tier)) S.vs.tier = t[0];
  if (!t.includes(S.vs.minTier)) S.vs.minTier = t[0];
  if (!t.includes(S.vs.maxTier)) S.vs.maxTier = t[t.length - 1];
  if (vsIdx(S.vs.minTier) > vsIdx(S.vs.tier)) S.vs.minTier = S.vs.tier;
  log('INFO', 'TIER', tx(`Tier class: ${cls === 'general' ? 'General (M10–M60)' : 'Low-CPU (M40–M60)'} — auto-scaling stays within one class`, `Classe de tier: ${cls === 'general' ? 'General (M10–M60)' : 'Low-CPU (M40–M60)'} — o auto-scaling fica dentro de uma classe`));
  vsRenderLadder(); vsRender(); vsDrawChart();
}

async function vsResize(target, auto) {
  if (S.vs.resizing || target === S.vs.tier) return;
  if (!auto && S.vs.running && S.vs.asOn) {
    S.vs.running = false; vsSetTimer();
    log('INFO', 'AUTOSCALE', tx('Simulation paused so the manual resize isn\'t overridden — press ▶ Run to resume', 'Simulação pausada para o resize manual não ser sobrescrito — clique em ▶ Rodar para retomar'));
  }
  const from = S.vs.tier, up = vsIdx(target) > vsIdx(from);
  S.vs.resizing = true;
  vsRenderLadder();
  const steps = [
    tx(`<b>New ${target} node launches.</b> No data to copy — it starts empty.`, `<b>Novo nó ${target} sobe.</b> Nenhum dado a copiar — começa vazio.`),
    tx('<b>Catches up from the Log Service.</b> Tails the committed oplog to reach the present.', '<b>Atualiza-se pelo Log Service.</b> Acompanha o oplog confirmado até chegar ao presente.'),
    tx('<b>Reads pages from the warm Page Service.</b> No cold cache, no disk restore.', '<b>Lê páginas do Page Service aquecido.</b> Sem cache frio, sem restore de disco.'),
    tx(`<b>Takes over as primary.</b> The old ${from} node steps aside; drivers follow the new primary.`, `<b>Assume como primário.</b> O nó ${from} antigo sai; os drivers seguem o novo primário.`),
    tx(`<b>Standby at ${target} too.</b> The tier applies to every node in the cluster.`, `<b>Standby também em ${target}.</b> O tier vale para todos os nós do cluster.`),
  ];
  $('vs-tier-desc').innerHTML = `<ol class="steps" id="vs-steps"></ol><div style="margin-top:6px;font-size:10.5px;color:var(--text3)">${tx('Sequence per the MongoDB engineering blog; animation speed is illustrative.', 'Sequência conforme o blog de engenharia da MongoDB; a velocidade da animação é ilustrativa.')}${src('B4')}</div>`;
  renderSteps('vs-steps', steps);
  log('INFO', 'TIER', tx(`${auto ? 'Auto-scaling' : 'Manual'} resize ${from} → ${target} (${up ? 'scale up' : 'scale down'}) — compute only, storage untouched`, `Resize ${auto ? 'automático' : 'manual'} ${from} → ${target} (${up ? 'scale up' : 'scale down'}) — só compute, storage intocado`));
  const sp = auto ? 0.5 : 1;
  setStep('vs-steps', 0, 'active');
  vsRender({ ghost: target, noMove: true, stbyTier: from });
  await sleep(700 * sp);
  setStep('vs-steps', 0, 'done'); setStep('vs-steps', 1, 'active');
  await Promise.all([0, 1, 2].map(i => sleep(i * 160).then(() => fly('vs-svg', [[VP.log[0], VP.log[1] - 20], [VP.log[0], 160], [VP.ghost[0] - 40, 150], VP.ghost], 900 * sp, C.evergreen, 5))));
  setStep('vs-steps', 1, 'done'); setStep('vs-steps', 2, 'active');
  await Promise.all([0, 1, 2].map(i => sleep(i * 140).then(() => fly('vs-svg', [[VP.page[0], VP.page[1] - 20], [VP.page[0], 170], [VP.ghost[0], 150], VP.ghost], 850 * sp, C.forest, 5))));
  setStep('vs-steps', 2, 'done'); setStep('vs-steps', 3, 'active');
  vsRender({ ghost: target, ghostState: 'UP', ghostLabel: tx('READY', 'PRONTO'), noMove: true, stbyTier: from });
  await sleep(500 * sp);
  S.vs.tier = target;
  vsRender({ primTier: target, stbyTier: from, ghost: from, ghostState: 'PROVISIONING', ghostLabel: tx('STEPPING ASIDE', 'SAINDO'), noMove: true });
  flash('vs-svg', VP.prim[0] + 100, 62, tx('new primary', 'novo primário'), C.forest);
  await sleep(900 * sp);
  setStep('vs-steps', 3, 'done'); setStep('vs-steps', 4, 'active');
  vsRender({ primTier: target, stbyTier: target, stbyState: 'PROVISIONING', stbyLabel: tx('RESIZING', 'REDIMENSIONANDO'), noMove: true });
  await sleep(900 * sp);
  setStep('vs-steps', 4, 'done');
  S.vs.resizing = false;
  vsRender();
  vsRenderLadder();
  log('SUCCESS', 'TIER', tx(`Cluster now ${target} — no data moved, storage unchanged (${fmtTB(S.vs.dataTB)})`, `Cluster agora em ${target} — nenhum dado movido, storage inalterado (${fmtTB(S.vs.dataTB)})`));
  updateCAP();
}

// ── Auto-scaling simulation ──────────────────────────────────────────────────

function vsSetAS() {
  S.vs.asOn = $('vs-as-on').checked;
  S.vs.predOn = $('vs-pred-on').checked;
  let mn = $('vs-min').value, mx = $('vs-max').value;
  if (vsIdx(mn) > vsIdx(mx)) [mn, mx] = [mx, mn];
  S.vs.minTier = mn; S.vs.maxTier = mx;
  $('vs-pred-on').disabled = !S.vs.asOn;
  vsRenderLadder();
  log('INFO', 'AUTOSCALE', S.vs.asOn
    ? tx(`Compute auto-scaling ON · ${mn} ↔ ${mx} · predictive ${S.vs.predOn ? 'ON' : 'OFF'}`, `Auto-scaling de compute ATIVO · ${mn} ↔ ${mx} · preditivo ${S.vs.predOn ? 'ATIVO' : 'DESATIVADO'}`)
    : tx('Compute auto-scaling OFF — the tier only changes when you change it', 'Auto-scaling de compute DESATIVADO — o tier só muda quando você muda'));
  vsDrawChart();
}

function vsPattern(p) {
  S.vs.pattern = p;
  S.vs.spikeAt = S.vs.t + 4;
  log('INFO', 'WORKLOAD', { steady: tx('Steady workload', 'Workload estável'), spike: tx('AI agents burst — sudden, unpredictable spike', 'Rajada de agentes de IA — pico repentino e imprevisível'), daily: tx('Recurring daily peak (time-compressed) — predictable pattern', 'Pico diário recorrente (tempo comprimido) — padrão previsível') }[p]);
}

function vsDemand(t) {
  const n = (Math.sin(t * 1.7) + Math.sin(t * 0.63)) * 0.18;
  if (S.vs.pattern === 'steady') return 2.6 + n;
  if (S.vs.pattern === 'daily') {
    const ph = (t % VS_PERIOD) / VS_PERIOD;
    const peak = Math.exp(-Math.pow((ph - 0.6) / 0.1, 2));
    return 2.2 + 17 * peak + n;
  }
  // spike: burst every ~40 ticks, unpredictable height/length
  const since = t - (S.vs.spikeAt || 0);
  if (since >= 0 && since < 14) {
    const h = 21 + 5 * Math.sin((S.vs.spikeAt || 1) * 3.1);
    const env = since < 3 ? since / 3 : since > 10 ? (14 - since) / 4 : 1;
    return 2.4 + h * env + n;
  }
  if (since >= 40) S.vs.spikeAt = t + 6 + Math.round(Math.abs(Math.sin(t)) * 10);
  return 2.4 + n;
}

function vsTick(force) {
  if (!force && S.tab !== 'vs') return;   // the simulation only advances while its tab is visible
  const v = S.vs;
  v.t++;
  const d = Math.max(0.3, vsDemand(v.t));
  let tier = v.tier, ev = null;
  const cap = TIER_CAP[tier];
  const last = v.series.slice(-3);
  const tiers = vsTiers(), i = tiers.indexOf(tier);
  const lo = tiers.indexOf(v.minTier), hi = tiers.indexOf(v.maxTier);
  if (v.asOn && !v.resizing && i >= 0 && (v.t - (v.lastScale || -99)) > 3) {
    // predictive scale-up: forecast from the previous cycle of a recurring pattern
    if (v.predOn && v.pattern === 'daily' && v.t > VS_PERIOD + 6) {
      const fc = Math.max(vsDemand(v.t + 4 - VS_PERIOD), vsDemand(v.t + 6 - VS_PERIOD));
      if (fc > TIER_CAP[tier] * 0.8 && i < hi) {
        let j = i;
        while (j < hi && j < i + 2 && TIER_CAP[tiers[j]] * 0.8 < fc) j++;
        if (j > i) { tier = tiers[j]; ev = { kind: 'pred', to: tier }; }
      }
    }
    // reactive scale-up: sustained high utilization
    if (!ev && last.length === 3 && last.every(p => p.d / TIER_CAP[p.tier] > 0.85) && d / cap > 0.85 && i < hi) {
      tier = tiers[i + 1]; ev = { kind: 'up', to: tier };
    }
    // reactive scale-down: sustained low utilization AND the next tier down would still be comfortable
    const last8 = v.series.slice(-8);
    if (!ev && i > lo && last8.length === 8 && last8.every(p => p.d / TIER_CAP[p.tier] < 0.35) && d / TIER_CAP[tiers[i - 1]] < 0.6) {
      tier = tiers[i - 1]; ev = { kind: 'down', to: tier };
    }
  }
  if (ev) {
    v.lastScale = v.t;
    const msg = {
      pred: tx(`Predictive scale-up ${v.tier} → ${tier}: forecast spike based on historical pattern`, `Scale-up preditivo ${v.tier} → ${tier}: pico previsto com base no padrão histórico`),
      up: tx(`Reactive scale-up ${v.tier} → ${tier}: sustained high utilization`, `Scale-up reativo ${v.tier} → ${tier}: utilização alta sustentada`),
      down: tx(`Reactive scale-down ${v.tier} → ${tier}: sustained low utilization`, `Scale-down reativo ${v.tier} → ${tier}: utilização baixa sustentada`),
    }[ev.kind];
    log(ev.kind === 'down' ? 'INFO' : 'SUCCESS', 'AUTOSCALE', msg);
    v.tier = tier;
    if (S.tab === 'vs') { vsRender(); vsRenderLadder(); flash('vs-svg', VP.prim[0] + 100, 62, (ev.kind === 'down' ? '▼ ' : '▲ ') + tier, C.forest); }
  }
  v.series.push({ t: v.t, d, tier: v.tier, ev });
  if (v.series.length > VS_WIN) v.series.shift();
  if (S.tab === 'vs') vsDrawChart();
}

function vsToggleRun() {
  S.vs.running = !S.vs.running;
  vsSetTimer();
}
function vsSetTimer() {
  clearInterval(vsTimer);
  if (S.vs.running) vsTimer = setInterval(vsTick, 320);
  $('vs-run').textContent = S.vs.running ? tx('⏸ Pause', '⏸ Pausar') : tx('▶ Run', '▶ Rodar');
}
function vsResetSim() {
  S.vs.series = []; S.vs.t = 0; S.vs.lastScale = -99; S.vs.spikeAt = 10;
  if (!S.vs.resizing) {
    const t = vsTiers(), start = t.includes('M30') ? 'M30' : t[0];
    S.vs.tier = vsIdx(start) < vsIdx(S.vs.minTier) ? S.vs.minTier : vsIdx(start) > vsIdx(S.vs.maxTier) ? S.vs.maxTier : start;
  }
  for (let k = 0; k < 8; k++) vsTick(true);
  vsRender(); vsRenderLadder(); vsDrawChart();
}

function vsDrawChart() {
  const W = 720, H = 230, L = 40, R = 104, T = 14, B = 26;
  const ser = S.vs.series;
  const maxY = Math.max(36, ...ser.map(p => Math.max(p.d, TIER_CAP[p.tier]))) * 1.05;
  const x = i => L + (i / (VS_WIN - 1)) * (W - L - R);
  const y = v => T + (1 - v / maxY) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" id="vs-chart-svg">`;
  // grid & axis
  [0, 8, 16, 24, 32].forEach(v => {
    s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(255,255,255,.1)"/>
      <text x="${L - 6}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="rgba(255,255,255,.55)">${v}</text>`;
  });
  s += `<text x="${L}" y="${H - 6}" font-size="9" fill="rgba(255,255,255,.55)">−12h</text>
    <text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="9" fill="rgba(255,255,255,.55)">${tx('now', 'agora')}</text>
    <text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.4)">${tx('simulated time · relative capacity units (illustrative)', 'tempo simulado · unidades relativas de capacidade (ilustrativo)')}</text>`;
  if (ser.length > 1) {
    const off = VS_WIN - ser.length;
    // saturation band (demand above capacity)
    let sat = '';
    ser.forEach((p, i) => {
      const c = TIER_CAP[p.tier];
      if (p.d > c) sat += `<rect x="${x(off + i) - 4}" y="${y(p.d)}" width="8" height="${y(c) - y(p.d)}" fill="rgba(0,210,255,.22)"/>`;
    });
    s += sat;
    // capacity step line
    let cp = '';
    ser.forEach((p, i) => {
      const cy = y(TIER_CAP[p.tier]), cx = x(off + i);
      cp += i === 0 ? `M${cx},${cy}` : ` H${cx} V${cy}`;
    });
    s += `<path d="${cp}" fill="none" stroke="${C.spring}" stroke-width="2"/>`;
    // demand line
    const dp = ser.map((p, i) => `${i ? 'L' : 'M'}${x(off + i).toFixed(1)},${y(p.d).toFixed(1)}`).join(' ');
    s += `<path d="${dp}" fill="none" stroke="${C.sky}" stroke-width="2" stroke-linejoin="round"/>`;
    // scale events
    ser.forEach((p, i) => {
      if (!p.ev || i > ser.length - 4) return;   // keep the right edge free for the direct labels
      const cx = x(off + i), cy = y(TIER_CAP[p.tier]);
      const up = p.ev.kind !== 'down';
      s += `<path d="M${cx - 6},${cy + (up ? 10 : -10)} L${cx + 6},${cy + (up ? 10 : -10)} L${cx},${cy + (up ? 1 : -1)} Z" fill="${C.spring}" stroke="${C.slate}" stroke-width="1"/>
        <text x="${cx}" y="${cy + (up ? -6 : 18)}" text-anchor="middle" font-size="9" font-weight="700" fill="${C.white}">${p.ev.kind === 'pred' ? '⚡' : ''}${p.tier}</text>`;
    });
    // direct labels at the right edge
    const lp = ser[ser.length - 1];
    let ly1 = y(lp.d), ly2 = y(TIER_CAP[lp.tier]);
    if (Math.abs(ly1 - ly2) < 14) { if (ly1 < ly2) { ly1 -= 7; ly2 += 7; } else { ly1 += 7; ly2 -= 7; } }
    s += `<circle cx="${x(VS_WIN - 1)}" cy="${y(lp.d)}" r="4" fill="${C.sky}" stroke="${C.slate}" stroke-width="2"/>
      <text x="${W - R + 10}" y="${ly1 + 3}" font-size="10" font-weight="700" fill="${C.white}">${tx('Demand', 'Demanda')} ${lp.d.toFixed(1)}</text>
      <text x="${W - R + 10}" y="${ly2 + 3}" font-size="10" font-weight="700" fill="${C.white}">${lp.tier} · ${TIER_CAP[lp.tier]}</text>`;
    VP.chart = { ser, off, x, y, L, R, W, H, T, B };
  }
  s += `<line id="vs-cross" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="rgba(255,255,255,.5)" stroke-dasharray="3 3" style="display:none"/>
    <rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent" onmousemove="vsHover(evt)" onmouseleave="vsHoverOut()"/></svg>`;
  $('vs-chart').innerHTML = s;
  const cur = ser[ser.length - 1];
  const util = cur ? Math.round(100 * cur.d / TIER_CAP[cur.tier]) : 0;
  $('vs-as-label').textContent = cur ? `${cur.tier} · ${tx('utilization', 'utilização')} ${util}%` : '';
  $('vs-chart-legend').innerHTML = `
    <div class="li-leg"><span class="ln-sw" style="background:${C.sky}"></span> ${tx('Demand (AI agents & apps)', 'Demanda (agentes de IA e apps)')}</div>
    <div class="li-leg"><span class="ln-sw" style="background:${C.spring}"></span> ${tx('Provisioned compute (tier)', 'Compute provisionado (tier)')}</div>
    <div class="li-leg"><span class="ls-sq" style="background:rgba(0,210,255,.35)"></span> ${tx('Demand above capacity', 'Demanda acima da capacidade')}</div>
    <div class="li-leg">▲ ${tx('scale event', 'evento de scaling')} · ⚡ ${tx('predictive', 'preditivo')}</div>`;
}

function vsHover(evt) {
  const c = VP.chart; if (!c) return;
  const svg = $('vs-chart-svg'), r = svg.getBoundingClientRect();
  const sx = (evt.clientX - r.left) * (c.W / r.width);
  const i = Math.round((sx - c.L) / (c.W - c.L - c.R) * (VS_WIN - 1)) - c.off;
  const p = c.ser[clamp(i, 0, c.ser.length - 1)];
  if (!p) return;
  const px = c.x(c.off + c.ser.indexOf(p));
  const cr = $('vs-cross'); cr.setAttribute('x1', px); cr.setAttribute('x2', px); cr.style.display = '';
  const tip = $('vs-chart-tip');
  const mins = (c.ser.length - 1 - c.ser.indexOf(p)) * 10;
  tip.innerHTML = `<b>${mins ? '−' + (mins >= 60 ? Math.floor(mins / 60) + 'h' + (mins % 60 ? String(mins % 60).padStart(2, '0') : '') : mins + 'min') : tx('now', 'agora')}</b><br>
    ${tx('Demand', 'Demanda')}: <b>${p.d.toFixed(1)}</b><br>${tx('Tier', 'Tier')}: <b>${p.tier}</b> (${TIER_CAP[p.tier]})<br>${tx('Utilization', 'Utilização')}: <b>${Math.round(100 * p.d / TIER_CAP[p.tier])}%</b>${p.ev ? `<br>${p.ev.kind === 'pred' ? tx('⚡ predictive scale-up', '⚡ scale-up preditivo') : p.ev.kind === 'up' ? tx('▲ reactive scale-up', '▲ scale-up reativo') : tx('▼ reactive scale-down', '▼ scale-down reativo')}` : ''}`;
  tip.style.display = 'block';
  const wrap = $('vs-chart-wrap').getBoundingClientRect();
  let left = evt.clientX - wrap.left + 14;
  if (left + 170 > wrap.width) left = evt.clientX - wrap.left - 180;
  tip.style.left = left + 'px'; tip.style.top = (evt.clientY - wrap.top - 20) + 'px';
}
function vsHoverOut() { $('vs-chart-tip').style.display = 'none'; const cr = $('vs-cross'); if (cr) cr.style.display = 'none'; }

// ── Storage ──────────────────────────────────────────────────────────────────

function vsStorageState() {
  const r = S.vs.dataTB / S.vs.limitTB;
  return { r, alert: r >= 0.9, blocked: r >= 0.97 };
}

function vsSetLimit(v) {
  S.vs.limitTB = +v;
  log('INFO', 'STORAGE', tx(`Max storage limit set to ${fmtTB(S.vs.limitTB)} (can be raised or lowered any time)`, `Limite máximo de storage definido em ${fmtTB(S.vs.limitTB)} (pode subir ou descer a qualquer momento)`));
  vsUpdateStorage(true);
}

function vsIngest(dir) {
  const before = vsStorageState();
  if (dir > 0 && before.blocked) { log('ERROR', 'STORAGE', tx('Write rejected — cluster is at its max storage limit (reads still served)', 'Escrita rejeitada — cluster no limite máximo de storage (leituras seguem atendidas)')); return; }
  const step = Math.max(S.vs.limitTB * 0.09, 0.05);
  S.vs.dataTB = clamp(S.vs.dataTB + dir * step, 0.05, S.vs.limitTB * 0.975);
  log('INFO', 'STORAGE', dir > 0 ? tx(`Ingested data — logical size ${fmtTB(S.vs.dataTB)}; storage grew automatically, no tier change`, `Dados ingeridos — tamanho lógico ${fmtTB(S.vs.dataTB)}; storage cresceu sozinho, sem mudar de tier`)
    : tx(`Deleted data — logical size ${fmtTB(S.vs.dataTB)}`, `Dados apagados — tamanho lógico ${fmtTB(S.vs.dataTB)}`));
  vsUpdateStorage(true);
}

function vsUpdateStorage(announce) {
  const st = vsStorageState(), prevA = S.vs.wasAlert, prevB = S.vs.wasBlocked;
  $('vs-limit').value = String(S.vs.limitTB);
  $('vs-gauge-fill').style.width = Math.min(100, st.r * 100) + '%';
  $('vs-gauge-fill').style.background = st.blocked ? C.bad : st.alert ? C.warn : C.forest;
  $('vs-gauge-90').style.left = '90%';
  $('vs-gauge-lbl').textContent = st.r > 1 ? `${fmtTB(S.vs.dataTB)} / ${fmtTB(S.vs.limitTB)} — ${tx('over the limit', 'acima do limite')}` : `${fmtTB(S.vs.dataTB)} / ${fmtTB(S.vs.limitTB)} (${Math.round(st.r * 100)}%)`;
  $('vs-gauge-max').textContent = tx(`90% alert ▲ · max ${fmtTB(S.vs.limitTB)}`, `alerta 90% ▲ · máx ${fmtTB(S.vs.limitTB)}`);
  $('vs-bn-block').classList.toggle('show', st.blocked);
  if (announce && st.alert && !prevA) log('WARN', 'ALERT', tx('Atlas alert: logical data size exceeded 90% of the max storage limit', 'Alerta do Atlas: tamanho lógico dos dados passou de 90% do limite máximo de storage'));
  if (announce && st.blocked && !prevB) log('ERROR', 'STORAGE', tx('Approaching max storage limit — writes blocked, reads still served', 'Aproximando do limite máximo de storage — escritas bloqueadas, leituras seguem atendidas'));
  if (announce && !st.blocked && prevB) log('SUCCESS', 'STORAGE', tx('Below the limit again — writes resume', 'Abaixo do limite novamente — escritas retomadas'));
  S.vs.wasAlert = st.alert; S.vs.wasBlocked = st.blocked;
  $('vs-storage-desc').innerHTML = tx(
    `• Atlas <strong>expands storage as data grows</strong> — no disk size to pick, no storage auto-scaling to configure.${src('D4')}<br>
     • Optional <strong>max storage limit</strong>: 1 GB – 128 TB (logical); unset = up to 128 TB. Adjustable any time.${src('D4')}<br>
     • Alert by default above <strong>90%</strong>; near the limit Atlas <strong>blocks writes but keeps serving reads</strong>.${src('D4')}<br>
     • Preview: Atlas <strong>might throttle writes before</strong> the limit to preserve availability.${src('D4')}<br>
     • Billed by consumption; replica sets hold <strong>10× the data</strong> of Atlas Core replica sets (vendor claim).${src('B2', 'B7')}`,
    `• O Atlas <strong>expande o storage conforme os dados crescem</strong> — sem escolher tamanho de disco, sem configurar auto-scaling de storage.${src('D4')}<br>
     • <strong>Limite máximo de storage</strong> opcional: 1 GB – 128 TB (lógico); sem definir = até 128 TB. Ajustável a qualquer momento.${src('D4')}<br>
     • Alerta padrão acima de <strong>90%</strong>; perto do limite o Atlas <strong>bloqueia escritas mas continua atendendo leituras</strong>.${src('D4')}<br>
     • Preview: o Atlas <strong>pode limitar (throttle) escritas antes</strong> do limite para preservar a disponibilidade.${src('D4')}<br>
     • Cobrado por consumo; replica sets comportam <strong>10× os dados</strong> de replica sets do Atlas Core (afirmação do fabricante).${src('B2', 'B7')}`);
  if (S.tab === 'vs' && !S.vs.resizing) vsRender();
  updateCAP();
}
