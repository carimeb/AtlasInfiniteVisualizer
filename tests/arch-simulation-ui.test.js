const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sources = ['state.js', 'utils.js', 'arch-playback.js', 'arch-simulation.js']
  .map(name => [name, fs.readFileSync(path.join(root, 'js', name), 'utf8')]);

async function flush() {
  for (let i = 0; i < 16; i++) await Promise.resolve();
}

// Only the DOM surface used by the architecture UI is emulated. Drawing,
// playback, plans, translation and step rendering all use production code.
class Element {
  constructor(tag, attributes = {}) {
    this.tagName = tag.toLowerCase();
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.style = {};
    this.dataset = {};
    this._html = '';
    this._text = '';
    this.disabled = false;
    this.hidden = false;
    this.scrolls = [];
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle: (name, force) => {
        const enabled = force === undefined ? !classes.has(name) : force;
        enabled ? classes.add(name) : classes.delete(name);
        return enabled;
      },
    };
    Object.entries(attributes).forEach(([name, value]) => this.setAttribute(name, value));
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'class') this.classList.add(...String(value).split(/\s+/).filter(Boolean));
    if (name === 'hidden' || name === 'disabled') this[name] = true;
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'hidden' || name === 'disabled') this[name] = false;
  }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
    this.parentElement = null;
  }
  set innerHTML(value) {
    this._html = String(value);
    this._text = '';
    this.children.forEach(child => { child.parentElement = null; });
    this.children = [];
  }
  get innerHTML() { return this._html; }
  set textContent(value) { this._text = String(value); this._html = ''; }
  get textContent() { return this._text || this._html.replace(/<[^>]*>/g, ''); }
  querySelectorAll(selector) {
    const match = element => selector === '[data-arch-motion]'
      ? element.hasAttribute('data-arch-motion')
      : element.tagName === selector;
    return this.children.flatMap(child => [...(match(child) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) {
    if (selector[0] === '.' && this.classList.contains(selector.slice(1))) return this;
    return this.parentElement?.closest(selector) || null;
  }
  scrollIntoView(options) { this.scrolls.push(options); }
}

function makeDOM() {
  const elements = new Map();
  for (const [, tag, raw] of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const attrs = {};
    for (const [, name, double, single, bare] of raw.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      attrs[name] = double ?? single ?? bare ?? '';
    }
    if (attrs.id) elements.set(attrs.id, new Element(tag, attrs));
  }
  const get = id => {
    assert.ok(elements.has(id), `The real index.html must provide #${id}`);
    return elements.get(id);
  };
  const guide = new Element('div', { class: 'arch-guide' });
  const now = guide.appendChild(new Element('div', { class: 'sim-now' }));
  now.appendChild(get('arch-now'));
  const controls = now.appendChild(new Element('div', { class: 'sim-controls' }));
  for (const id of ['arch-next', 'arch-next-hint']) if (elements.has(id)) controls.appendChild(get(id));
  const svg = get('arch-svg').appendChild(new Element('svg'));
  const staticGroup = svg.appendChild(new Element('g', { 'data-test-static': 'node' }));
  const staticPath = svg.appendChild(new Element('path', { d: 'M0,0 L100,100' }));
  const settings = ['wc', 'rc', 'rp'].map(name => new Element('select', { class: `sync-${name}` }));
  return {
    get, elements, svg, staticGroup, staticPath, settings,
    document: {
      getElementById: get,
      createElement: tag => new Element(tag),
      createElementNS: (_namespace, tag) => new Element(tag),
      querySelectorAll: selector => {
        assert.match(selector, /#tab-arch \.sync-/);
        return settings;
      },
    },
  };
}

function setup({ mode = 'infinite', lang = 'en' } = {}) {
  const dom = makeDOM();
  let now = 0, frameId = 0;
  const frames = new Map();
  const context = vm.createContext({
    document: dom.document,
    performance: { now: () => now },
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    Math: Object.assign(Object.create(Math), { random: () => 0 }),
    seen: [],
    AP: {
      client: [400, 46], core: [[160, 175], [400, 175], [640, 175]],
      nodes: { primary: [210, 140], standby: [590, 140] },
      log: [[110, 350], [370, 350], [630, 350]],
      materializer: [[110, 410], [370, 410], [630, 410]],
      page: [[190, 440], [450, 440], [710, 440]],
      s3: [[110, 501], [370, 501], [630, 501]],
    },
  });
  for (const [name, source] of sources) vm.runInContext(source, context, { filename: name });
  const state = vm.runInContext('S', context);
  state.lang = lang;
  state.arch.mode = mode;
  state.ha.nodes = [
    { id: 'primary', role: 'PRIMARY', az: 0, state: 'UP' },
    { id: 'standby', role: 'STANDBY', az: 1, state: 'UP' },
  ];
  context.archUpAZ = az => !state.ha.azDown[az];
  context.log = () => {};
  const evaluate = source => vm.runInContext(source, context);
  const player = evaluate('archGetPlayer()');
  const sim = {
    ...dom, state, player, context, evaluate,
    motion: () => dom.svg.querySelectorAll('[data-arch-motion]'),
    async advance(ms) {
      const end = now + ms;
      while (now < end) {
        now = Math.min(end, now + 20);
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach(callback => callback(now));
        await flush();
      }
    },
    async until(predicate, description) {
      await flush();
      for (let elapsed = 0; !predicate() && elapsed < 30000; elapsed += 100) await sim.advance(100);
      assert.ok(predicate(), description || `Expected UI state, found ${player.status}`);
    },
    start(stages, label = 'UI regression') {
      context.testStages = stages;
      context.testLabel = label;
      return evaluate('archStart(testStages, testLabel)');
    },
    fixtureStages(count = 2, duration = 200) {
      return evaluate(`Array.from({length: ${count}}, (_, i) => ({
        title: 'Lesson ' + (i + 1), detail: 'Explanation ' + (i + 1),
        run: async play => {
          seen.push(i + 1);
          archHalo(20 + i, 20);
          await archFly(play, [[10, 10], [100, 100]], ${duration});
          archLabel(20 + i, 20, 'stage ' + (i + 1));
        }
      }))`);
    },
    assertStaticSVG() {
      assert.ok(dom.svg.children.includes(dom.staticGroup), 'static compute SVG must survive cleanup');
      assert.ok(dom.svg.children.includes(dom.staticPath), 'static connections must survive cleanup');
      assert.equal(dom.staticPath.getAttribute('d'), 'M0,0 L100,100');
    },
  };
  return sim;
}

function visible(element) { return !element.hidden && element.style.display !== 'none' && element.getAttribute('aria-hidden') !== 'true'; }
function assertReleased(sim) {
  assert.equal(sim.state.arch.busy, false);
  for (const id of ['arch-btn-w', 'arch-btn-r', 'arch-cache']) assert.equal(sim.get(id).disabled, false, id);
  for (const setting of sim.settings) assert.equal(setting.disabled, false);
  assert.equal(sim.get('arch-next').disabled, true);
  assert.equal(visible(sim.get('arch-next')), false);
  const lesson = sim.get('arch-now').closest('.sim-now');
  assert.ok(lesson, 'updating the explanation must preserve its surrounding lesson panel');
  assert.equal(sim.get('arch-next').closest('.sim-now'), lesson, 'the stable Next control remains in the lesson panel');
  assert.equal(lesson.dataset.state, sim.player.status);
  assert.deepEqual(sim.motion(), []);
  sim.assertStaticSVG();
}

test('architecture UI has one manual flow without playback, speed, pause or stop controls', () => {
  const sim = setup();
  assert.equal(sim.player.manual, true, 'the UI must create playback in step-by-step mode');
  assert.equal(sim.evaluate('archGetPlayer()'), sim.player, 'the UI reuses its player');
  for (const id of ['arch-play-mode', 'arch-speed', 'arch-pause', 'arch-stop']) {
    assert.equal(sim.elements.has(id), false, `#${id} must be absent from the HTML`);
  }
  assert.ok(sim.get('arch-next-hint'));
  sim.evaluate('archPlaybackUI()');
  assert.match(sim.get('arch-now').textContent, /Simulate Write|Simulate Read/);
  assert.equal(visible(sim.get('arch-next')), false);
  assert.equal(visible(sim.get('arch-next-hint')), false);
});

test('a completed stage stays visible until Next, which advances exactly one stage', async () => {
  const sim = setup();
  const done = sim.start(sim.fixtureStages(3));
  await flush();
  assert.equal(sim.player.status, 'playing');
  assert.equal(sim.get('arch-next').disabled, true);
  assert.equal(sim.state.arch.busy, true);
  for (const setting of sim.settings) assert.equal(setting.disabled, true);
  await sim.until(() => sim.player.status === 'waiting');
  assert.deepEqual(sim.context.seen, [1]);
  assert.equal(visible(sim.get('arch-next')), true);
  assert.equal(sim.get('arch-next').disabled, false);
  assert.match(sim.get('arch-now').textContent, /Lesson 1/);
  assert.match(sim.get('arch-next').textContent, /2\s+of\s+3/);
  assert.match(sim.get('arch-next-hint').textContent, /next|continue|advance/i);
  assert.ok(sim.motion().length > 0, 'the current explanation retains its stage overlays while waiting');
  const firstStageMotion = sim.motion();
  await sim.advance(10000);
  assert.equal(sim.player.status, 'waiting');
  assert.deepEqual(sim.context.seen, [1], 'elapsed time cannot advance a manual lesson');
  sim.evaluate('archNext(); archNext();');
  await flush();
  assert.deepEqual(sim.context.seen, [1, 2], 'double clicks cannot skip a stage');
  assert.ok(firstStageMotion.every(element => element.parentElement === null), 'the previous stage overlays clear before the new stage is drawn');
  assert.equal(sim.get('arch-next').disabled, true);
  await sim.until(() => sim.player.status === 'waiting');
  assert.match(sim.get('arch-now').textContent, /Lesson 2/);
  assert.match(sim.get('arch-next').textContent, /last.*3\s+of\s+3/i);
  sim.evaluate('archNext()');
  await sim.until(() => sim.player.status === 'completed');
  await done;
  assert.deepEqual(sim.context.seen, [1, 2, 3]);
  assertReleased(sim);
  assert.match(sim.get('arch-now').textContent, /complete/i);
});

test('finishing the last stage needs no extra click and clears only animation overlays', async () => {
  const sim = setup();
  const done = sim.start(sim.fixtureStages(1));
  await flush();
  assert.ok(sim.motion().length > 0);
  await sim.until(() => sim.player.status === 'completed');
  await done;
  assertReleased(sim);
  assert.match(sim.get('arch-now').textContent, /complete/i);
  sim.evaluate('archNext()');
  await sim.advance(5000);
  assert.deepEqual(sim.context.seen, [1]);
  assertReleased(sim);
});

test('blocked playback clears its overlays and presents the reason without advancing', async () => {
  const sim = setup();
  const stages = sim.evaluate(`[
    {title: 'Blocked lesson', detail: 'Original explanation', run: async play => {
      archHalo(20, 20); await play.wait(100); return play.block('No storage quorum');
    }},
    {title: 'Must not run', detail: '', run: async () => { seen.push('unexpected'); }}
  ]`);
  const done = sim.start(stages);
  await sim.until(() => sim.player.status === 'blocked');
  await done;
  assert.match(sim.get('arch-now').textContent, /No storage quorum/);
  assert.deepEqual(sim.context.seen, []);
  assertReleased(sim);
  sim.evaluate('archNext()');
  await sim.advance(5000);
  assert.deepEqual(sim.context.seen, []);
});

test('cancellation during a packet clears overlays and releases the lesson controls', async () => {
  const sim = setup();
  const done = sim.start(sim.fixtureStages(2, 5000));
  await flush();
  await sim.advance(100);
  assert.ok(sim.motion().length > 0);
  sim.player.cancel();
  await done;
  assert.equal(sim.player.status, 'cancelled');
  assertReleased(sim);
  await sim.advance(15000);
  assert.deepEqual(sim.context.seen, [1]);
  assertReleased(sim);
});

test('reset during motion restores idle UI and old callbacks cannot erase a restarted lesson', async () => {
  const sim = setup();
  const old = sim.start(sim.fixtureStages(2, 5000), 'Old lesson');
  await flush();
  await sim.advance(100);
  const oldMotion = sim.motion();
  assert.ok(oldMotion.length > 0);
  sim.evaluate('archResetPlayback()');
  assert.equal(sim.player.status, 'idle');
  assert.equal(sim.player.index, -1);
  assert.equal(sim.player.stages.length, 0);
  assert.equal(sim.player.message, '');
  assert.equal(sim.player.manual, true);
  assert.equal(sim.state.arch.busy, false);
  assert.deepEqual(sim.motion(), []);
  assert.doesNotMatch(sim.get('arch-now').textContent, /Old lesson|Lesson 1/);
  sim.assertStaticSVG();
  const fresh = sim.start(sim.fixtureStages(2), 'Fresh lesson');
  await flush();
  const freshMotion = sim.motion();
  assert.ok(freshMotion.length > 0);
  assert.ok(freshMotion.every(element => !oldMotion.includes(element)));
  await old;
  assert.ok(freshMotion.every(element => element.parentElement === sim.svg), 'old cleanup cannot remove fresh SVG overlays');
  await sim.until(() => sim.player.status === 'waiting');
  assert.match(sim.get('arch-now').textContent, /Fresh lesson/);
  sim.evaluate('archNext()');
  await sim.until(() => sim.player.status === 'completed');
  await fresh;
  assertReleased(sim);
});

test('restarting after a blocked plan removes the old reason and remains manual', async () => {
  const sim = setup();
  const blocked = sim.evaluate(`[{title: 'Failure', detail: '', run: async play => play.block('Old failure reason')}]`);
  await sim.start(blocked);
  assert.equal(sim.player.status, 'blocked');
  const done = sim.start(sim.fixtureStages(2), 'Recovered lesson');
  await sim.until(() => sim.player.status === 'waiting');
  assert.equal(sim.player.manual, true);
  assert.equal(sim.player.message, '');
  assert.match(sim.get('arch-now').textContent, /Recovered lesson/);
  assert.doesNotMatch(sim.get('arch-now').textContent, /Old failure reason/);
  sim.evaluate('archNext()');
  await sim.until(() => sim.player.status === 'completed');
  await done;
  assertReleased(sim);
});

test('Portuguese guidance names the next step, identifies the last step and makes completion explicit', async () => {
  const sim = setup({ lang: 'pt' });
  sim.evaluate('archPlaybackUI()');
  assert.match(sim.get('arch-btn-w').textContent, /4 etapas/);
  assert.match(sim.get('arch-btn-r').textContent, /3 etapas/);
  const done = sim.start(sim.fixtureStages(3), 'Exemplo de leitura');
  await sim.until(() => sim.player.status === 'waiting');
  assert.match(sim.get('arch-now').textContent, /Etapa 1 de 3/);
  assert.match(sim.get('arch-now').textContent, /Aguardando seu clique/);
  assert.match(sim.get('arch-next').textContent, /Ir para etapa 2 de 3/);
  sim.evaluate('archNext()');
  await sim.until(() => sim.player.status === 'waiting');
  assert.match(sim.get('arch-next').textContent, /Ver última etapa \(3 de 3\)/);
  sim.evaluate('archNext()');
  await flush();
  assert.match(sim.get('arch-next-hint').textContent, /última etapa/);
  await sim.until(() => sim.player.status === 'completed');
  await done;
  assert.match(sim.get('arch-now').textContent, /Simulação concluída/);
  assert.match(sim.get('arch-next-hint').textContent, /3 etapas foram exibidas/);
  assert.match(sim.get('arch-next-hint').textContent, /começar novamente/);
  assertReleased(sim);
});

for (const mode of ['core', 'infinite']) {
  for (const operation of ['write', 'read']) {
    test(`${mode} ${operation}: the real plan completes via Next and leaves a clean static SVG`, async () => {
      const sim = setup({ mode });
      const plan = operation === 'read' ? 'archReadPlan()' : mode === 'core' ? 'archCoreWritePlan()' : 'archInfiniteWritePlan()';
      const stages = sim.evaluate(plan);
      const done = sim.start(stages, `${mode} ${operation}`);
      let clicks = 0;
      while (sim.player.status !== 'completed') {
        await sim.until(() => ['waiting', 'completed', 'blocked'].includes(sim.player.status));
        assert.notEqual(sim.player.status, 'blocked');
        if (sim.player.status === 'waiting') {
          assert.equal(sim.get('arch-next').disabled, false);
          assert.equal(visible(sim.get('arch-next')), true);
          assert.ok(sim.motion().length > 0);
          assert.ok(++clicks < stages.length, 'completion must not require an extra Next click');
          sim.evaluate('archNext()');
        }
      }
      await done;
      assert.equal(clicks, stages.length - 1);
      assertReleased(sim);
      assert.match(sim.get('arch-now').textContent, /complete/i);
    });
  }
}
