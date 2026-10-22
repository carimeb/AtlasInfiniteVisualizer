// ─── MAIN — UI WIRING & INITIALISATION ───────────────────────────────────────

const TABS = ['arch', 'ha', 'vs', 'hs', 'bk', 'lim'];

function toggleCAPPanel() {
  const open = $('main').classList.toggle('cap-visible');
  $('cap').classList.toggle('cap-visible', open);
  $('cap-toggle-btn').classList.toggle('active', open);
  capButtonLabel();
  if (open) updateCAP();
}
function capButtonLabel() {
  const open = $('cap').classList.contains('cap-visible');
  $('cap-toggle-btn').textContent = open ? tx('✕ Hide CAP', '✕ Ocultar CAP') : tx('⬡ CAP Positioning', '⬡ Posição no CAP');
}

function renderTab(name) {
  if (name === 'arch') { archRender(); archUpdateInfo(); }
  if (name === 'ha') haRender();
  if (name === 'vs') { if (!S.vs.resizing) vsRender(); vsRenderLadder(); vsDrawChart(); vsUpdateStorage(); }
  if (name === 'hs') hsUpdate();
  if (name === 'bk') { bkRender(); bkUpdate(); }
  if (name === 'lim') limRender();
}

function switchTab(name) {
  if (!TABS.includes(name)) name = 'arch';
  S.tab = name;
  document.querySelectorAll('.tc').forEach(el => el.classList.toggle('active', el.id === 'tab-' + name));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  try {
    const u = new URL(location.href);
    u.searchParams.set('tab', name);
    history.replaceState(null, '', u);
  } catch (e) { /* file:// may refuse */ }
  renderTab(name);
  $('viz').scrollTop = 0;
  updateCAP();
}

// Shared settings — every tab and the CAP panel read them
function setWC(v) { S.wc = v; log('INFO', 'CONCERNS', `writeConcern → ${{ w0: 'w:0', w1: 'w:1', wmaj: 'w:"majority"', wnum: 'w:3' }[v]}${v === 'wnum' ? tx(' (mapped to "majority" on Atlas Infinite)', ' (mapeado para "majority" no Atlas Infinite)') : ''}`); syncAll(); }
function setRC(v) { S.rc = v; log('INFO', 'CONCERNS', `readConcern → ${v}`); syncAll(); }
function setRP(v) { S.rp = v; log('INFO', 'CONCERNS', `readPreference → ${v}`); syncAll(); }

// Keep selects in sync and refresh whatever is visible
function syncAll() {
  document.querySelectorAll('.sync-wc').forEach(s => { s.value = S.wc; });
  document.querySelectorAll('.sync-rc').forEach(s => { s.value = S.rc; });
  document.querySelectorAll('.sync-rp').forEach(s => { s.value = S.rp; });
  if (S.tab === 'arch' && !S.arch.busy) { archRender(); archUpdateInfo(); }
  if (S.tab === 'arch' && S.arch.busy) archUpdateInfo();
  if (S.tab === 'ha') haRender();
  if (S.tab === 'hs') hsUpdate();
  updateCAP();
}

// Language switch — re-render every tab so hidden ones are ready too
function rerenderAll() {
  TABS.forEach(renderTab);
  document.querySelectorAll('.tc').forEach(el => el.classList.toggle('active', el.id === 'tab-' + S.tab));
  renderSteps('arch-steps', []);
  $('arch-steps-label').textContent = '';
  if (!S.ha.failingOver) renderSteps('ha-steps', haFoSteps());
  vsSetTimer();
  footRender();
  capButtonLabel();
  updateCAP();
}

window.addEventListener('load', () => {
  initLang();
  haInitNodes();
  S.vs.spikeAt = 10;
  vsResetSim();
  vsSetTimer();
  renderSteps('ha-steps', haFoSteps());
  footRender();
  capButtonLabel();
  TABS.forEach(renderTab);
  let tab = 'arch';
  try { tab = new URL(location.href).searchParams.get('tab') || 'arch'; } catch (e) { /* ignore */ }
  switchTab(tab);
  log('INFO', 'SYSTEM', tx('Atlas Infinite Visualizer ready — every claim links to its official source (lavender/mint chips)', 'Atlas Infinite Visualizer pronto — cada afirmação aponta para a fonte oficial (chips lavanda/menta)'));
  setInterval(hsPulse, 650);
  setInterval(() => {
    if (S.tab === 'ha' && !S.ha.failingOver && haPrimary() && Math.random() > 0.6)
      log('INFO', 'LOG-SVC', tx(`Heartbeat — ${haUpAZ()}/3 log replicas healthy`, `Heartbeat — ${haUpAZ()}/3 réplicas do log saudáveis`));
  }, 9000);
});
