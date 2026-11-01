const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sources = ['state.js', 'tab-vs.js'].map(name => [name,
  fs.readFileSync(path.join(__dirname, '../js', name), 'utf8')]);

// One sample represents 10 minutes. M40 has 8 illustrative capacity units;
// its next lower tier, M30, has 4. No browser, timers or SVG are needed here.
function evaluate({ demand = 2, history = Array(143).fill(2), overrides = {}, lang = 'en' } = {}) {
  const context = vm.createContext({ tx: (en, pt) => lang === 'pt' ? pt : en });
  for (const [name, source] of sources) vm.runInContext(source, context, { filename: name });
  const state = vm.runInContext('S.vs', context);
  Object.assign(state, {
    tier: 'M40', minTier: 'M30', maxTier: 'M60', asOn: true, predOn: false,
    t: 400, lastUp: -1000, lastDown: -1000, ...overrides,
  });
  state.hist = history.map((d, i) => ({ t: state.t - history.length + i, tier: state.tier, d }));
  context.input = state;
  context.demand = demand;
  return JSON.parse(JSON.stringify(vm.runInContext('vsEvaluate(input, demand)', context)));
}

function assertDown(result) {
  assert.deepEqual(result.ev, { kind: 'down', to: 'M30' });
}

test('operational scale-down ignores high utilization before the last four hours', () => {
  // The old 24-hour average is >70%, but the latest four hours are at 25%.
  const history = [...Array(120).fill(6.4), ...Array(23).fill(2)];
  assertDown(evaluate({ history }));
});

test('the four-hour CPU condition uses an average, not an uninterrupted low run', () => {
  const history = Array(23).fill(1.6);
  history[13] = 4; // An older 50% CPU sample; recent averages and projection are low.
  assertDown(evaluate({ history, demand: 1.6 }));
});

test('scale-down requires the full four-hour window', () => {
  const short = evaluate({ history: Array(22).fill(2) });
  assert.equal(short.ev, null);
  assertDown(evaluate({ history: Array(23).fill(2) }));
});

test('scale-down cooldown blocks before 24 hours and allows it at 24 hours', () => {
  assert.equal(evaluate({ overrides: { lastDown: 257 } }).ev, null); // 143 ticks
  assertDown(evaluate({ overrides: { lastDown: 256 } })); // 144 ticks
});

test('the latest ten-minute CPU average must be strictly below 45%', () => {
  const atLimit = evaluate({ demand: 3.6 });
  assert.equal(atLimit.ev, null);
  assert.ok(atLimit.why.some(reason => reason.includes('average CPU')));
  const below = evaluate({ demand: 3.599 });
  assert.ok(below.why.every(reason => !reason.includes('average CPU')));
  // The projected-memory proxy independently blocks these high current loads.
});

test('a recent low CPU sample does not bypass a high four-hour CPU average', () => {
  const result = evaluate({ history: Array(23).fill(4), demand: 2 });
  assert.equal(result.ev, null);
  assert.ok(result.why.some(reason => reason.includes('average CPU')));
});

test('the latest projected utilization must be strictly below 60%', () => {
  const atLimit = evaluate({ demand: 2.4 });
  assert.equal(atLimit.ev, null);
  assert.ok(atLimit.why.every(reason => !reason.includes('average CPU')));
  assertDown(evaluate({ demand: 2.399 }));
});

test('the projected utilization also checks the four-hour window', () => {
  assert.equal(evaluate({ history: Array(23).fill(2.6), demand: 2 }).ev, null);
  assertDown(evaluate({ history: Array(23).fill(2.3), demand: 2 }));
});

test('the minimum tier and the auto-scaling switch still prevent reductions', () => {
  assert.equal(evaluate({ overrides: { minTier: 'M40' } }).ev, null);
  assert.equal(evaluate({ overrides: { asOn: false } }).ev, null);
});

test('predictive scaling retains the M30 minimum required by this down-scaling scenario', () => {
  const history = Array(432).fill(2);
  for (const offset of [6, 8, 10, 12]) {
    for (const day of [1, 2]) {
      const time = 400 + offset - day * 144;
      history[time - (400 - history.length)] = 8;
    }
  }
  const eligible = evaluate({ history, overrides: { predOn: true } });
  assert.deepEqual(eligible.ev, { kind: 'pred', to: 'M50' });
  const ineligible = evaluate({ history, overrides: { predOn: true, minTier: 'M20' } });
  assert.notEqual(ineligible.ev?.kind, 'pred');
});

test('an imminent predictive scale-up still defers reactive scale-down', () => {
  const history = Array(432).fill(2);
  for (const offset of [0, 2, 4, 6]) {
    for (const day of [1, 2]) {
      const time = 400 + offset - day * 144;
      history[time - (400 - history.length)] = 3.2;
    }
  }
  assert.equal(evaluate({ history, overrides: { predOn: true } }).ev, null);
  assertDown(evaluate({ history, overrides: { predOn: false } }));
});
