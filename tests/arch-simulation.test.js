const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ArchPlayback } = require('../js/arch-playback.js');

const stateSource = fs.readFileSync(path.join(__dirname, '../js/state.js'), 'utf8');
const simulationSource = fs.readFileSync(path.join(__dirname, '../js/arch-simulation.js'), 'utf8');

async function flush() {
  for (let i = 0; i < 16; i++) await Promise.resolve();
}

function clock() {
  let now = 0, id = 0;
  const pending = new Map();
  return {
    get now() { return now; },
    scheduler: {
      now: () => now,
      requestFrame(fn) { pending.set(++id, fn); return id; },
      cancelFrame(frame) { pending.delete(frame); },
    },
    async advance(ms) {
      const end = now + ms;
      while (now < end) {
        now = Math.min(end, now + 20);
        const frames = [...pending.values()];
        pending.clear();
        frames.forEach(fn => fn(now));
        await flush();
      }
    },
  };
}

// Deliberately distinct coordinates let the tests identify compute, local disk,
// log replicas, Page Service and object storage without depending on SVG layout.
function positions() {
  return {
    client: [400, 46],
    core: [[160, 175], [400, 175], [640, 175]],
    nodes: { primary: [210, 140], standby: [590, 140], analytics: [710, 235] },
    log: [[110, 350], [370, 350], [630, 350]],
    materializer: [[110, 410], [370, 410], [630, 410]],
    page: [[190, 440], [450, 440], [710, 440]],
    s3: [[110, 501], [370, 501], [630, 501]],
  };
}

function simulation({ mode = 'infinite', wc = 'wmaj', cache = 'miss', rc = 'local', rp = 'primary', azDown = [false, false, false] } = {}) {
  const time = clock(), events = [], AP = positions();
  const playback = new ArchPlayback({ scheduler: time.scheduler });
  playback.setSpeed(1);
  const record = (kind, data = {}) => {
    const event = { kind, seq: events.length, time: time.now, stage: playback.index, ...data };
    events.push(event);
    return event;
  };
  const context = vm.createContext({
    AP, ArchPlayback,
    C: { spring: 'spring', slate: 'slate', forest: 'forest' },
    tx: en => en,
    Math: Object.assign(Object.create(Math), { random: () => 0 }),
    log: (level, target, message) => record('log', { level, target, message }),
  });
  vm.runInContext(stateSource, context, { filename: 'state.js' });
  const state = vm.runInContext('S', context);
  Object.assign(state, { wc, rc, rp });
  Object.assign(state.arch, { mode, readCache: cache });
  state.ha.azDown = azDown.slice();
  state.ha.nodes = [
    { id: 'primary', role: 'PRIMARY', az: 0, state: 'UP' },
    { id: 'standby', role: 'STANDBY', az: 1, state: 'UP' },
  ];
  context.archUpAZ = az => !state.ha.azDown[az];
  vm.runInContext(simulationSource, context, { filename: 'arch-simulation.js' });

  // Use the actual plans and ACK implementation. Only the drawing functions are
  // replaced: every packet still awaits the real shared playback clock.
  context.archFly = async (play, points, ms = 800, color = 'spring') => {
    const route = JSON.parse(JSON.stringify(points));
    record('flight-start', { points: route, color });
    await play.wait(ms);
    record('flight-end', { points: route, color });
  };
  context.archHalo = () => {};
  context.archLabel = (x, y, label) => record('label', { x, y, label });

  return {
    AP, events, state, playback, time,
    async run(operation = 'write') {
      const name = operation === 'read' ? 'archReadPlan' : mode === 'core' ? 'archCoreWritePlan' : 'archInfiniteWritePlan';
      const stages = vm.runInContext(`${name}()`, context);
      let settled = false, failure;
      playback.start(stages).then(
        () => { settled = true; },
        error => { failure = error; settled = true; },
      );
      await flush();
      for (let elapsed = 0; !settled && elapsed < 60000; elapsed += 100) await time.advance(100);
      assert.ok(settled, `${name} must finish or block without hanging`);
      if (failure) throw failure;
    },
  };
}

function samePoint(a, b) { return a[0] === b[0] && a[1] === b[1]; }
function last(points) { return points[points.length - 1]; }
function flights(sim, kind = 'flight-start') { return sim.events.filter(e => e.kind === kind); }
function labels(sim, value) { return sim.events.filter(e => e.kind === 'label' && e.label === value); }
function acks(sim) { return sim.events.filter(e => e.kind === 'label' && /^ACK/.test(e.label)); }
function ackFlights(sim) { return flights(sim).filter(e => samePoint(last(e.points), sim.AP.client)); }
function one(events, message) {
  assert.equal(events.length, 1, message);
  return events[0];
}
function before(a, b, message) {
  assert.ok(a && b, `Missing event: ${message}`);
  assert.ok(a.seq < b.seq, message);
}

for (const mode of ['core', 'infinite']) {
  test(`${mode}: w:0 completes replication without an ACK`, async () => {
    const sim = simulation({ mode, wc: 'w0' });
    await sim.run();
    assert.equal(sim.playback.status, 'completed');
    one(labels(sim, '3/3'), 'all three replicas eventually record the write');
    assert.deepEqual(acks(sim), []);
    assert.deepEqual(ackFlights(sim), [], 'no packet carrying an ACK may go to the application');
    assert.deepEqual(sim.events.filter(e => e.kind === 'log' && e.target === 'CLIENT'), []);
  });

  test(`${mode}: w:1 sends exactly one ACK before replication starts`, async () => {
    const sim = simulation({ mode, wc: 'w1' });
    await sim.run();
    assert.equal(sim.playback.status, 'completed');
    const ack = one(acks(sim), 'w:1 has one client ACK');
    assert.match(ack.label, /w:1/);
    one(ackFlights(sim), 'w:1 has one ACK packet');
    const replicationFlights = flights(sim).filter(e => e.stage === 2);
    assert.ok(replicationFlights.length >= 2, 'both remote replicas must receive the write');
    for (const event of replicationFlights) before(ack, event, 'w:1 returns before replication starts');
    before(ack, one(labels(sim, '3/3')), 'replication continues after the w:1 ACK');
  });

  test(`${mode}: majority ACK starts at 2/3 and returns before the third replica finishes`, async () => {
    const sim = simulation({ mode, wc: 'wmaj' });
    await sim.run();
    assert.equal(sim.playback.status, 'completed');
    const second = one(labels(sim, '2/3'));
    const third = one(labels(sim, '3/3'));
    const send = one(ackFlights(sim), 'majority sends exactly one ACK packet');
    const received = one(acks(sim), 'majority has one client ACK');
    assert.match(received.label, /majority/);
    before(second, send, 'two replicas hold the write before ACK transmission');
    assert.equal(second.time, send.time, 'the ACK does not wait for a later replication phase');
    before(send, received, 'the ACK must reach the client before it is reported');
    before(received, third, 'the third replica must not gate the majority ACK');
  });

  for (const cache of ['hit', 'miss']) {
    test(`${mode}: cache ${cache} ${cache === 'hit' ? 'avoids storage' : 'fetches from the correct storage layer'}`, async () => {
      const sim = simulation({ mode, cache });
      await sim.run('read');
      assert.equal(sim.playback.status, 'completed');
      const pos = mode === 'core' ? sim.AP.core[0] : sim.AP.nodes.primary;
      const request = [sim.AP.client, [pos[0], pos[1] - 26]];
      const result = [[pos[0], pos[1] - 26], sim.AP.client];
      const expected = [request];
      if (cache === 'miss') {
        const from = [pos[0], mode === 'core' ? 226 : pos[1] + 62];
        const storage = mode === 'core' ? [pos[0], 272] : [sim.AP.page[0][0], sim.AP.page[0][1] - 22];
        expected.push([from, storage], [storage, from]);
      }
      expected.push(result);
      assert.deepEqual(flights(sim).map(e => e.points), expected);
      one(labels(sim, `cache ${cache}`));
      const returned = one(labels(sim, 'result ✓'));
      before(last(flights(sim, 'flight-end')), returned, 'report a result only after its packet returns');
    });
  }

  test(`${mode}: linearizable with a non-primary read preference blocks before sending the query`, async () => {
    for (const rp of ['secondary', 'secondaryPreferred', 'primaryPreferred', 'nearest']) {
      const sim = simulation({ mode, rc: 'linearizable', rp });
      await sim.run('read');
      assert.equal(sim.playback.status, 'blocked', rp);
      assert.match(sim.playback.message, /linearizable requires readPreference primary/);
      assert.deepEqual(flights(sim), [], `${rp} must not issue a query`);
      assert.deepEqual(labels(sim, 'result ✓'), []);
    }
  });

  test(`${mode}: linearizable with primary is accepted`, async () => {
    const sim = simulation({ mode, rc: 'linearizable', rp: 'primary', cache: 'hit' });
    await sim.run('read');
    assert.equal(sim.playback.status, 'completed');
    one(labels(sim, 'result ✓'));
  });
}

test('core: numeric w:3 waits for all three nodes before sending its ACK', async () => {
  const sim = simulation({ mode: 'core', wc: 'wnum' });
  await sim.run();
  assert.equal(sim.playback.status, 'completed');
  const second = one(labels(sim, '2/3')), third = one(labels(sim, '3/3'));
  const send = one(ackFlights(sim)), received = one(acks(sim));
  before(second, third, 'replication is observable at 2/3 before it reaches 3/3');
  before(third, send, 'w:3 cannot send its ACK with only two copies');
  before(send, received, 'the w:3 ACK reaches the application');
  assert.match(received.label, /w:3/);
});

test('infinite: numeric w:3 maps to majority and does not wait for the third storage replica', async () => {
  const sim = simulation({ wc: 'wnum' });
  await sim.run();
  assert.equal(sim.playback.status, 'completed');
  const second = one(labels(sim, '2/3')), third = one(labels(sim, '3/3'));
  const send = one(ackFlights(sim)), received = one(acks(sim));
  before(second, send, 'numeric w waits for the storage majority');
  assert.equal(second.time, send.time);
  before(received, third, 'numeric w does not introduce a three-AZ ACK requirement');
  assert.match(received.label, /majority/);
});

test('infinite: two available storage AZs suffice for a majority ACK', async () => {
  const sim = simulation({ azDown: [false, true, false] });
  await sim.run();
  assert.equal(sim.playback.status, 'completed');
  const second = one(labels(sim, '2/3'));
  before(second, one(ackFlights(sim)), 'ACK requires both surviving log replicas');
  one(acks(sim));
  assert.deepEqual(labels(sim, '3/3'), [], 'a failed AZ must not become a third durable replica');
});

test('infinite: losing the storage majority blocks without an ACK or later background work', async () => {
  for (const wc of ['wmaj', 'wnum']) {
    const sim = simulation({ wc, azDown: [false, true, true] });
    await sim.run();
    assert.equal(sim.playback.status, 'blocked', wc);
    assert.match(sim.playback.message, /Fewer than 2 of 3 storage AZs/);
    assert.deepEqual(acks(sim), []);
    assert.deepEqual(ackFlights(sim), []);
    assert.deepEqual(labels(sim, '2/3'), []);
    assert.ok(flights(sim).every(e => e.stage < 3), 'the blocked plan must not enter background work');
  }
});

test('infinite: a missing primary blocks the write before any packet or ACK', async () => {
  const sim = simulation();
  sim.state.ha.nodes[0].state = 'DOWN';
  await sim.run();
  assert.equal(sim.playback.status, 'blocked');
  assert.match(sim.playback.message, /No primary is available/);
  assert.deepEqual(flights(sim), []);
  assert.deepEqual(acks(sim), []);
});

test('infinite: materializers send to Page Service and object storage in parallel', async () => {
  const sim = simulation();
  await sim.run();
  assert.equal(sim.playback.status, 'completed');
  for (let az = 0; az < 3; az++) {
    const [mx, my] = sim.AP.materializer[az], [px, py] = sim.AP.page[az];
    const page = one(flights(sim).filter(e => samePoint(e.points[0], [mx + 50, my]) && samePoint(last(e.points), [px - 22, py])));
    const object = one(flights(sim).filter(e => samePoint(e.points[0], [mx, my + 16]) && samePoint(last(e.points), sim.AP.s3[az])));
    assert.equal(page.time, object.time, `AZ ${az}: object storage must not wait for Page Service`);
  }
});

test('infinite: a secondary read fetches pages for the selected standby and returns its result', async () => {
  const sim = simulation({ rp: 'secondary' });
  await sim.run('read');
  assert.equal(sim.playback.status, 'completed');
  const pos = sim.AP.nodes.standby;
  const requests = flights(sim);
  assert.deepEqual(requests[0].points, [sim.AP.client, [pos[0], pos[1] - 26]]);
  assert.deepEqual(last(requests[1].points), [sim.AP.page[1][0], sim.AP.page[1][1] - 22]);
  assert.deepEqual(last(requests).points, [[pos[0], pos[1] - 26], sim.AP.client]);
  one(labels(sim, 'result ✓'));
});

test('infinite: read preference without an eligible node blocks without returning a result', async () => {
  const sim = simulation({ rp: 'secondary' });
  sim.state.ha.nodes[1].state = 'DOWN';
  await sim.run('read');
  assert.equal(sim.playback.status, 'blocked');
  assert.match(sim.playback.message, /No eligible node matches this readPreference/);
  assert.deepEqual(flights(sim), []);
  assert.deepEqual(labels(sim, 'result ✓'), []);
});

test('infinite: primaryPreferred falls back to an eligible standby', async () => {
  const sim = simulation({ rp: 'primaryPreferred', cache: 'hit' });
  sim.state.ha.nodes[0].state = 'DOWN';
  await sim.run('read');
  assert.equal(sim.playback.status, 'completed');
  const pos = sim.AP.nodes.standby;
  assert.deepEqual(flights(sim)[0].points, [sim.AP.client, [pos[0], pos[1] - 26]]);
  one(labels(sim, 'result ✓'));
});
