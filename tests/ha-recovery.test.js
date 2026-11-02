const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  let afterCallback = () => {};
  const schedule = (fn, delay, interval = 0) => {
    const id = nextId++;
    timers.set(id, { id, fn, due: now + Math.max(0, Number(delay) || 0), interval });
    return id;
  };
  const nextTimer = () => [...timers.values()].sort((a, b) => a.due - b.due || a.id - b.id)[0];
  const fire = timer => {
    now = timer.due;
    if (timer.interval) timer.due += timer.interval;
    else timers.delete(timer.id);
    timer.fn();
    afterCallback();
  };
  return {
    get now() { return now; },
    get nextAt() { return nextTimer()?.due; },
    setTimeout: (fn, ms) => schedule(fn, ms),
    clearTimeout: id => timers.delete(id),
    setInterval: (fn, ms) => schedule(fn, ms, Math.max(1, Number(ms) || 1)),
    clearInterval: id => timers.delete(id),
    onCallback(fn) { afterCallback = fn; },
    advance(ms) {
      const until = now + ms;
      let count = 0;
      while (nextTimer()?.due <= until) {
        assert.ok(++count < 2000, 'timer callbacks must converge');
        fire(nextTimer());
      }
      now = until;
    },
    until(predicate, message) {
      const deadline = now + 60000;
      let count = 0;
      while (!predicate()) {
        const timer = nextTimer();
        assert.ok(timer && ++count < 2000 && timer.due <= deadline, message);
        fire(timer);
      }
    },
    settle() {
      const deadline = now + 60000;
      let count = 0;
      while (timers.size) {
        const timer = nextTimer();
        assert.ok(++count < 2000 && timer.due <= deadline, 'HA recovery must settle within the simulated minute');
        fire(timer);
      }
    },
  };
}

function element() {
  const classes = new Set();
  return {
    children: [], options: [], innerHTML: '', textContent: '', value: '',
    className: '', style: {}, dataset: {},
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : force;
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      },
    },
  };
}

function simulation({ autoHeal = true } = {}) {
  const clock = fakeClock();
  const elements = new Map();
  const observations = [];
  const capacityEvents = [];
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  let context;
  const state = () => JSON.parse(vm.runInContext('JSON.stringify(S.ha)', context));
  const observe = label => observations.push({ at: clock.now, label, state: state() });
  const sandbox = {
    console,
    setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
    setInterval: clock.setInterval, clearInterval: clock.clearInterval,
    $: getElement,
    tx: (_en, pt) => pt,
    src: () => '',
    log: () => {},
    syncAll: () => observe('syncAll'),
    stepHTML: text => text,
    renderSteps(id, steps, states) {
      getElement(id).children = steps.map((text, index) => ({ ...element(), innerHTML: text, className: states?.[index] || '' }));
    },
    setStep(id, index, status) {
      const parent = getElement(id);
      if (!parent.children[index]) parent.children[index] = element();
      parent.children[index].className = status;
      if (id === 'ha-steps' && index === 5 && status === 'done') {
        capacityEvents.push({ at: clock.now, state: state() });
      }
    },
  };
  context = vm.createContext(sandbox);
  for (const file of ['state.js', 'tab-ha.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context, { filename: file });
  }
  // Keep the production state machine and timers; replace only its visual shell.
  context.recordRender = () => observe('render');
  vm.runInContext(`haRender = () => recordRender(); S.lang = 'pt'; S.ha.autoHeal = ${autoHeal}; haInitNodes(); renderSteps('ha-steps', haFoSteps());`, context);
  clock.onCallback(() => observe('timer'));
  observe('initial');
  return {
    clock, state, observations, capacityEvents,
    toggleAZ(az) {
      vm.runInContext(`haToggleAZ(${az})`, context);
      observe(`toggle AZ ${az}`);
    },
    clickNode(id) {
      vm.runInContext(`haClickNode(${JSON.stringify(id)})`, context);
      observe(`click node ${id}`);
    },
    testFailover() {
      vm.runInContext('haTestFailover()', context);
      observe('test failover');
    },
    setAutoHeal(enabled) {
      vm.runInContext(`haSetAutoHeal(${Boolean(enabled)})`, context);
      observe(`autoHeal ${enabled}`);
    },
    reset() {
      vm.runInContext('haReset()', context);
      observe('reset');
    },
    steps: () => getElement('ha-steps').children.map(child => ({ state: child.className, text: child.innerHTML })),
    capacityState: () => getElement('ha-steps').children[5]?.className,
  };
}

const active = state => state.nodes.filter(node => node.state === 'UP' || node.state === 'PROVISIONING');
const healthyPair = state => {
  const nodes = state.nodes.filter(node => node.state === 'UP');
  return nodes.length === 2 &&
    nodes.filter(node => node.role === 'PRIMARY').length === 1 &&
    nodes.filter(node => node.role === 'STANDBY').length === 1 &&
    nodes[0].az !== nodes[1].az && nodes.every(node => !state.azDown[node.az]);
};

function assertTopologyThroughout(sim) {
  for (const observation of sim.observations) {
    const { state, at, label } = observation;
    const nodes = active(state);
    const where = `at ${at} ms (${label}): ${JSON.stringify(state.nodes)}`;
    assert.ok(nodes.every(node => !state.azDown[node.az]), `active compute must not remain in a failed AZ ${where}`);
    assert.ok(nodes.length <= 2, `at most two electable nodes may be active/attaching ${where}`);
    assert.equal(new Set(nodes.map(node => node.az)).size, nodes.length, `active electable nodes must use separate AZs ${where}`);
    assert.ok(nodes.filter(node => node.state === 'UP' && node.role === 'PRIMARY').length <= 1, `at most one primary may be UP ${where}`);
  }
}

function loseAThenB(sim) {
  sim.toggleAZ(0);
  sim.clock.settle();
  assert.ok(healthyPair(sim.state()), 'after AZ-a fails, the primary and replacement standby must recover');
  assert.deepEqual(sim.state().nodes.filter(node => node.state === 'UP').map(node => [node.role, node.az]).sort(), [
    ['PRIMARY', 1], ['STANDBY', 2],
  ]);
  sim.toggleAZ(1);
  sim.clock.settle();
}

test('restoring only AZ-a after consecutive AZ-a/AZ-b failures rebuilds the HA pair', () => {
  const sim = simulation();
  loseAThenB(sim);
  sim.toggleAZ(0);
  sim.clock.settle();
  assert.ok(healthyPair(sim.state()), `restored AZ-a must receive the missing standby: ${JSON.stringify(sim.state().nodes)}`);
  assert.deepEqual(sim.state().nodes.filter(node => node.state === 'UP').map(node => [node.role, node.az]).sort(), [
    ['PRIMARY', 2], ['STANDBY', 0],
  ]);
  assert.equal(sim.capacityState(), 'done', 'capacity completes once the healthy pair exists');
  assertTopologyThroughout(sim);
});

test('capacity-restored step completes only when a healthy primary/standby pair exists', () => {
  const sim = simulation();
  loseAThenB(sim);
  assert.notEqual(sim.capacityState(), 'done', 'one surviving compute node is not restored HA capacity');
  for (const event of sim.capacityEvents) {
    assert.ok(healthyPair(event.state), `capacity was marked done too early at ${event.at} ms: ${JSON.stringify(event.state.nodes)}`);
  }
  sim.toggleAZ(0);
  sim.clock.settle();
  assert.equal(sim.capacityState(), 'done');
  for (const event of sim.capacityEvents) assert.ok(healthyPair(event.state));
});

test('a recovered AZ dropping again during attachment cannot revive its node in the failed AZ', () => {
  const sim = simulation({ autoHeal: false });
  sim.toggleAZ(1);
  sim.toggleAZ(1);
  assert.ok(sim.state().nodes.some(node => node.az === 1 && node.state === 'PROVISIONING'));
  sim.toggleAZ(1);
  sim.clock.settle();
  assertTopologyThroughout(sim);
  assert.deepEqual(sim.state().nodes.filter(node => node.state === 'UP').map(node => node.az), [0]);
});

test('replacement callbacks stay safe when restored and provisioning zones fail again', () => {
  const sim = simulation();
  sim.toggleAZ(1);
  sim.clock.until(() => sim.state().nodes.some(node => node.az === 2 && node.state === 'PROVISIONING'), 'replacement must start attaching in AZ-c');
  sim.toggleAZ(1); // AZ-b is available for a new replacement.
  sim.toggleAZ(2); // The in-flight AZ-c replacement is lost.
  sim.clock.until(() => sim.state().nodes.some(node => node.az === 1 && node.state === 'PROVISIONING'), 'replacement must start attaching in restored AZ-b');
  sim.toggleAZ(1); // Fail the replacement zone while attachment is in progress.
  sim.clock.settle();
  assertTopologyThroughout(sim);
  assert.deepEqual(sim.state().nodes.filter(node => node.state === 'UP').map(node => node.az), [0]);
});

test('autoHeal off does not automatically provision replacement compute', () => {
  const sim = simulation({ autoHeal: false });
  sim.toggleAZ(0);
  sim.clock.settle();
  assert.deepEqual(sim.state().nodes.map(node => node.id).sort(), ['node-1', 'node-2']);
  assert.deepEqual(sim.state().nodes.filter(node => node.state === 'UP').map(node => [node.role, node.az]), [['PRIMARY', 1]]);
  assert.ok(sim.observations.every(({ state }) => !state.nodes.some(node => node.state === 'PROVISIONING')), 'automatic replacement must remain disabled');
  assert.notEqual(sim.capacityState(), 'done', 'HA capacity remains degraded with auto-heal disabled');
  assertTopologyThroughout(sim);
});

test('Test Primary Failover rebuilds its original pair even with autoHeal off', () => {
  const sim = simulation({ autoHeal: false });
  const initial = sim.state().nodes;
  const formerPrimary = initial.find(node => node.role === 'PRIMARY');
  const formerStandby = initial.find(node => node.role === 'STANDBY');
  sim.testFailover();
  sim.clock.settle();
  const final = sim.state();
  assert.ok(healthyPair(final));
  assert.equal(final.nodes.find(node => node.role === 'PRIMARY').id, formerStandby.id);
  assert.equal(final.nodes.find(node => node.role === 'STANDBY').id, formerPrimary.id);
  assert.equal(final.autoHeal, false);
  assert.equal(sim.capacityState(), 'done');
  assert.ok(sim.capacityEvents.every(event => healthyPair(event.state)));
  assertTopologyThroughout(sim);
});

test('enabling autoHeal after a zone loss provisions the missing standby', () => {
  const sim = simulation({ autoHeal: false });
  const standby = sim.state().nodes.find(node => node.role === 'STANDBY');
  sim.toggleAZ(standby.az);
  sim.clock.settle();
  assert.equal(active(sim.state()).length, 1, 'capacity stays degraded until automatic recovery is enabled');
  sim.setAutoHeal(true);
  sim.clock.settle();
  assert.ok(healthyPair(sim.state()));
  assert.ok(sim.state().nodes.filter(node => node.state === 'UP').every(node => node.az !== standby.az));
  assertTopologyThroughout(sim);
});

test('reset during recovery cancels callbacks and preserves the reset topology and timeline', () => {
  const sim = simulation();
  const initialNodes = sim.state().nodes;
  const standby = initialNodes.find(node => node.role === 'STANDBY');
  sim.toggleAZ(standby.az);
  sim.clock.until(() => sim.state().nodes.some(node => node.state === 'PROVISIONING'), 'replacement must be attaching before reset');
  sim.reset();
  const resetState = sim.state();
  const resetSteps = sim.steps();
  const eventsAtReset = sim.capacityEvents.length;
  sim.clock.settle();
  sim.clock.advance(10000);
  assert.deepEqual(sim.state(), resetState, 'a callback from before reset cannot mutate the reset state');
  assert.deepEqual(sim.state().nodes, initialNodes);
  assert.deepEqual(sim.state().azDown, [false, false, false]);
  assert.deepEqual(sim.steps(), resetSteps, 'old callbacks cannot complete steps on the reset timeline');
  assert.equal(sim.capacityEvents.length, eventsAtReset);
  assertTopologyThroughout(sim);
});

test('restoring the same node twice cannot finish the second recovery on the first timer', () => {
  const sim = simulation({ autoHeal: false });
  const standby = sim.state().nodes.find(node => node.role === 'STANDBY');
  sim.toggleAZ(standby.az);
  sim.toggleAZ(standby.az);
  const firstDeadline = sim.clock.nextAt;
  assert.ok(firstDeadline > sim.clock.now, 'first recovery must schedule its completion');
  sim.clock.advance((firstDeadline - sim.clock.now) / 2);
  sim.toggleAZ(standby.az);
  sim.toggleAZ(standby.az);
  assert.equal(sim.state().nodes.find(node => node.id === standby.id).state, 'PROVISIONING');
  sim.clock.advance(firstDeadline - sim.clock.now);
  assert.equal(sim.state().nodes.find(node => node.id === standby.id).state, 'PROVISIONING', 'the obsolete first completion cannot finish the new attachment');
  sim.clock.settle();
  assert.ok(healthyPair(sim.state()), 'the second recovery completes on its own callback');
  assertTopologyThroughout(sim);
});

test('a second primary failure after reconnection cannot receive the first failover callbacks', () => {
  const sim = simulation();
  sim.testFailover();
  // Reconnection opens interactions before the old failover reaches capacity recovery.
  sim.clock.until(() => !sim.state().failingOver, 'first failover must finish reconnecting the driver');
  const oldPostReconnectAt = sim.clock.nextAt;
  assert.notEqual(sim.capacityState(), 'done');
  const promoted = sim.state().nodes.find(node => node.role === 'PRIMARY' && node.state === 'UP');
  sim.clickNode(promoted.id);
  const secondSteps = sim.steps();
  assert.equal(secondSteps[1].state, 'fail', 'the second primary loss has no standby to promote yet');
  // A legitimate recovery may start before the earlier failover's next callback.
  sim.clock.advance(oldPostReconnectAt - sim.clock.now - 1);
  const stepsBeforeOldCallback = sim.steps();
  const nodesBeforeOldCallback = sim.state().nodes;
  sim.clock.advance(1);
  assert.deepEqual(sim.steps(), stepsBeforeOldCallback, 'the old failover cannot advance the newer timeline');
  assert.deepEqual(sim.state().nodes, nodesBeforeOldCallback, 'the old failover cannot recover or promote a node');
  sim.clock.settle();
  assert.ok(healthyPair(sim.state()), 'the current recovery must eventually restore the HA pair');
  assert.equal(sim.capacityState(), 'done');
  assert.ok(sim.capacityEvents.every(event => healthyPair(event.state)));
  assertTopologyThroughout(sim);
});
