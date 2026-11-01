// ─── MAIN — UI WIRING & INITIALISATION ───────────────────────────────────────

const TABS = ['arch', 'ha', 'vs', 'hs', 'bk', 'lim'];

function renderTab(name) {
  if (name === 'arch') { archRender(); archUpdateInfo(); }
  if (name === 'ha') haRender();
  if (name === 'vs') { if (!S.vs.resizing) vsRender(); vsRenderLadder(); vsDrawChart(); vsUpdateStorage(); }
  if (name === 'hs') hsUpdate();
  if (name === 'bk') { bkRender(); bkUpdate(); }
  if (name === 'lim') limRender();
}

function switchTab(name) {
  archResetPlayback();
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
}

// Shared settings — every tab reads them
function setWC(v) { archResetPlayback(); S.wc = v; log('INFO', 'CONCERNS', `writeConcern → ${{ w0: 'w:0', w1: 'w:1', wmaj: 'w:"majority"', wnum: 'w:3' }[v]}${v === 'wnum' ? tx(' (mapped to "majority" on Atlas Infinite)', ' (mapeado para "majority" no Atlas Infinite)') : ''}`); syncAll(); }
function setRC(v) { archResetPlayback(); S.rc = v; log('INFO', 'CONCERNS', `readConcern → ${v}`); syncAll(); }
function setRP(v) { archResetPlayback(); S.rp = v; log('INFO', 'CONCERNS', `readPreference → ${v}`); syncAll(); }

// Keep selects in sync and refresh whatever is visible
function syncAll() {
  document.querySelectorAll('.sync-wc').forEach(s => { s.value = S.wc; });
  document.querySelectorAll('.sync-rc').forEach(s => { s.value = S.rc; });
  document.querySelectorAll('.sync-rp').forEach(s => { s.value = S.rp; });
  if (S.tab === 'arch' && !S.arch.busy) { archRender(); archUpdateInfo(); }
  if (S.tab === 'arch' && S.arch.busy) archUpdateInfo();
  if (S.tab === 'ha') haRender();
  if (S.tab === 'hs') hsUpdate();
}

// Language switch — re-render every tab so hidden ones are ready too
function rerenderAll() {
  archResetPlayback();
  TABS.forEach(renderTab);
  document.querySelectorAll('.tc').forEach(el => el.classList.toggle('active', el.id === 'tab-' + S.tab));
  renderSteps('arch-steps', []);
  $('arch-steps-label').textContent = '';
  if (!S.ha.failingOver) { renderSteps('ha-steps', haFoSteps()); haUpdateCapacityStep(); }
  vsSetTimer();
  footRender();
}

window.addEventListener('load', () => {
  initView();
  initLang();
  haInitNodes();
  S.vs.spikeAt = 10;
  vsResetSim();
  vsSetTimer();
  renderSteps('ha-steps', haFoSteps());
  footRender();
  TABS.forEach(renderTab);
  let tab = 'arch';
  try { tab = new URL(location.href).searchParams.get('tab') || 'arch'; } catch (e) { /* ignore */ }
  switchTab(tab);
  setInterval(hsPulse, 650);
});
