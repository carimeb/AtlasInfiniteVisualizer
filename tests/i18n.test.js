const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const read = name => fs.readFileSync(path.join(root, 'js', name), 'utf8');

function element({ id = '', dataset = {}, innerHTML = '' } = {}) {
  const classes = new Set();
  const attrs = {};
  return {
    id, dataset, innerHTML, textContent: '', children: [],
    classList: {
      add: name => classes.add(name),
      contains: name => classes.has(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
    },
    getAttribute: name => name === 'data-i18n' ? dataset.i18n : attrs[name],
    setAttribute: (name, value) => { attrs[name] = String(value); },
    appendChild(child) { this.children.push(child); return child; },
  };
}

function setup(url = 'https://example.test/AtlasInfiniteVisualizer/') {
  const copy = [...html.matchAll(/<([a-z]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)]
    .map(([, , key, value]) => element({ dataset: { i18n: key }, innerHTML: value }));
  const langButtons = ['en', 'pt', 'es'].map(lang => element({ dataset: { lang } }));
  const viewButtons = ['basic', 'detailed'].map(view => element({ dataset: { view } }));
  const tabs = ['arch', 'ha', 'vs', 'hs', 'bk', 'lim'].map(tab => element({ id: `tab-${tab}` }));
  const langGroup = element(), viewGroup = element();
  const svgContainer = element();
  svgContainer.svg = element();
  svgContainer.querySelectorAll = () => svgContainer.svg.children;
  svgContainer.querySelector = () => svgContainer.svg;
  const label = element();
  const selectors = {
    '[data-i18n]': copy, 'a.src[data-src]': [], '.lang button': langButtons,
    '.view-toggle button': viewButtons, '.lang': [langGroup], '.view-toggle': [viewGroup], '.tc': tabs,
  };
  const document = {
    documentElement: {}, body: element(),
    querySelectorAll: selector => {
      assert.ok(selector in selectors, `Unexpected selector: ${selector}`);
      return selectors[selector];
    },
    getElementById: id => {
      if (id === 'arch-svg') return svgContainer;
      if (id === 'arch-steps-label') return label;
      throw new Error(`Unexpected element: ${id}`);
    },
  };
  const location = { href: url };
  const calls = { reset: 0, refresh: 0, haRefresh: 0, steps: [] };
  const context = vm.createContext({
    document, location, URL,
    navigator: { language: 'es-ES', languages: ['es-ES', 'en'] },
    localStorage: { getItem: () => 'en' },
    history: { replaceState: (_state, _title, next) => { location.href = String(next); } },
    window: { addEventListener() {} },
  });
  for (const file of ['state.js', 'utils.js', 'i18n.js', 'main.js']) vm.runInContext(read(file), context, { filename: file });
  Object.assign(context, {
    archResetPlayback() { calls.reset++; },
    archRefreshLanguage() { calls.refresh++; },
    haRefreshLanguage() { calls.haRefresh++; },
    archRender() { svgContainer.svg = element(); },
    archUpdateInfo() {}, haRender() {}, vsRender() {}, vsRenderLadder() {}, vsDrawChart() {}, vsUpdateStorage() {},
    hsUpdate() {}, bkRender() {}, bkUpdate() {}, limRender() {},
    renderSteps(id, steps) { calls.steps.push([id, steps]); },
    haFoSteps: () => [], haUpdateCapacityStep() {}, vsSetTimer() {}, footRender() {},
  });
  const evaluate = source => vm.runInContext(source, context);
  return { evaluate, state: evaluate('S'), context, document, copy, langButtons, location, calls, tabs, svgContainer, label };
}

test('plain and invalid links default to Portuguese and Essentials independently of browser or previous state', () => {
  for (const suffix of ['', '?lang=fr&view=unknown']) {
    const app = setup(`https://example.test/AtlasInfiniteVisualizer/${suffix}`);
    app.state.lang = 'en';
    app.state.view = 'detailed';
    app.evaluate('initLang(); initView();');
    assert.equal(app.state.lang, 'pt');
    assert.equal(app.state.view, 'basic');
    assert.equal(app.state.tab, 'arch');
    assert.equal(app.document.documentElement.lang, 'pt-BR');
  }
});

test('explicit English, Portuguese and Spanish links set copy, document language and toggle state', () => {
  for (const [lang, docLang, text] of [
    ['en', 'en', 'Educational material, not official MongoDB documentation'],
    ['pt', 'pt-BR', 'Material educativo, não é documentação oficial da MongoDB'],
    ['es', 'es', 'Material educativo, no es documentación oficial de MongoDB'],
  ]) {
    const app = setup(`https://example.test/?lang=${lang}&view=detailed`);
    app.evaluate('initLang(); initView();');
    assert.equal(app.state.lang, lang);
    assert.equal(app.state.view, 'detailed');
    assert.equal(app.document.documentElement.lang, docLang);
    assert.equal(app.copy.find(el => el.dataset.i18n === 'hdr.sub').innerHTML, text);
    for (const button of app.langButtons) {
      assert.equal(button.classList.contains('on'), button.dataset.lang === lang);
      assert.equal(button.getAttribute('aria-pressed'), String(button.dataset.lang === lang));
    }
    assert.match(html, new RegExp(`data-lang="${lang}"[^>]*aria-label="[^"]+"`));
  }
});

test('every static translation key has Portuguese and Spanish copy with the same source references', () => {
  const app = setup();
  const pt = app.evaluate('PT'), es = app.evaluate('ES');
  const keys = [...new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]))];
  for (const tab of ['arch', 'ha', 'vs', 'hs', 'bk', 'lim']) assert.ok(keys.includes(`tab.${tab}`));
  assert.deepEqual(Object.keys(es).sort(), Object.keys(pt).sort());
  for (const key of keys) {
    assert.equal(typeof pt[key], 'string', `Missing PT: ${key}`);
    assert.equal(typeof es[key], 'string', `Missing ES: ${key}`);
    assert.ok(es[key].trim(), `Empty ES: ${key}`);
    const sources = text => [...text.matchAll(/data-src="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(sources(es[key]), sources(pt[key]), `Source references changed: ${key}`);
  }
});

test('switching languages round trips English HTML and preserves configuration, topology, tab and URL parameters', () => {
  const app = setup('https://example.test/?tab=ha&view=detailed&preview=abc#timeline');
  Object.assign(app.state, { lang: 'en', tab: 'ha', view: 'detailed', wc: 'w1', rc: 'majority', rp: 'secondary' });
  app.state.extra = [{ id: 'ro-1', type: 'READ_ONLY', state: 'UP', az: 2 }];
  app.state.ha.azDown = [true, false, false];
  app.state.ha.failingOver = true;
  app.state.vs.tier = 'M50';
  app.state.bk.point = 777;
  const before = JSON.stringify({ ...app.state, lang: null });
  const originals = app.copy.map(el => el.innerHTML);
  app.evaluate('applyStaticLang(); setLang("es"); setLang("pt"); setLang("en");');
  assert.equal(JSON.stringify({ ...app.state, lang: null }), before);
  assert.deepEqual(app.copy.map(el => el.innerHTML), originals);
  const resultURL = new URL(app.location.href);
  assert.equal(resultURL.searchParams.get('lang'), 'en');
  assert.equal(resultURL.searchParams.get('tab'), 'ha');
  assert.equal(resultURL.searchParams.get('view'), 'detailed');
  assert.equal(resultURL.searchParams.get('preview'), 'abc');
  assert.equal(resultURL.hash, '#timeline');
  assert.equal(app.tabs.find(el => el.classList.contains('active')).id, 'tab-ha');
  assert.equal(app.calls.reset, 0, 'a language switch must not cancel the manual lesson');
  assert.equal(app.calls.haRefresh, 3, 'the active failover timeline must translate with each language switch');
  assert.ok(app.calls.steps.every(([id]) => id !== 'ha-steps'), 'language changes must not reset completed failover steps');
});

test('Spanish dynamic copy falls back to English only when a translation is missing', () => {
  const app = setup();
  app.state.lang = 'es';
  assert.equal(app.evaluate('tx("Read", "Ler", "Leer")'), 'Leer');
  assert.equal(app.evaluate('tx("Read", "Ler")'), 'Read');
  assert.equal(app.evaluate('tx("Read", "Ler", "")'), '');
  app.state.lang = 'pt';
  assert.equal(app.evaluate('tx("Read", "Ler", "Leer")'), 'Ler');
  app.state.lang = 'en';
  assert.equal(app.evaluate('tx("Read", "Ler", "Leer")'), 'Read');
});

test('saved lesson text can change language in place without rebuilding a plan', () => {
  const app = setup();
  app.state.lang = 'pt';
  app.evaluate('tx("Write accepted", "Escrita aceita", "Escritura aceptada")');
  app.state.lang = 'es';
  assert.equal(app.evaluate('translateKnownText("Escrita aceita")'), 'Escritura aceptada');
  app.state.lang = 'en';
  assert.equal(app.evaluate('translateKnownText("Escritura aceptada")'), 'Write accepted');
  assert.equal(app.evaluate('translateKnownText("MongoDB")'), 'MongoDB');
});

test('language redraw keeps the same animation elements and current stage label; view redraw retains its reset behavior', () => {
  const app = setup();
  const motion = element();
  app.svgContainer.svg.appendChild(motion);
  app.label.textContent = '2 / 4';
  app.state.arch.busy = true;
  app.evaluate('setLang("es")');
  assert.equal(app.state.arch.busy, true);
  assert.equal(app.calls.reset, 0);
  assert.equal(app.calls.refresh, 1);
  assert.equal(app.svgContainer.svg.children[0], motion, 'pending animation frames keep their original DOM target');
  assert.equal(app.label.textContent, '2 / 4');
  assert.ok(app.calls.steps.every(([id]) => id !== 'arch-steps'));
  app.evaluate('setView("detailed")');
  assert.equal(app.calls.reset, 1);
  assert.equal(app.label.textContent, '');
});
