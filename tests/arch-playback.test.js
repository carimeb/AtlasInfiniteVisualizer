const test = require('node:test');
const assert = require('node:assert/strict');
const { ArchPlayback } = require('../js/arch-playback.js');

async function flush() {
  for (let i = 0; i < 16; i++) await Promise.resolve();
}

function clock() {
  let now = 0, id = 0;
  const pending = new Map(), history = new Map();
  return {
    scheduler: {
      now: () => now,
      requestFrame(fn) { pending.set(++id, fn); history.set(id, fn); return id; },
      cancelFrame(frame) { pending.delete(frame); },
    },
    get frames() { return [...pending.keys()]; },
    replay(frame) { history.get(frame)?.(now); },
    async advance(ms, frameSize = 10) {
      const end = now + ms;
      while (now < end) {
        now = Math.min(end, now + frameSize);
        const callbacks = [...pending.values()];
        pending.clear();
        callbacks.forEach(fn => fn(now));
        await flush();
      }
    },
  };
}

const stage = run => ({ title: 'Stage', detail: 'Explanation', run });
const setup = () => {
  const time = clock();
  const changes = [];
  const playback = new ArchPlayback({ scheduler: time.scheduler, onChange: p => changes.push([p.status, p.index]) });
  return { playback, time, changes };
};

test('defaults and final dwell use active time at half speed', async () => {
  const { playback: p, time } = setup();
  assert.equal(p.status, 'idle');
  assert.equal(p.speed, 0.5);
  assert.equal(p.manual, false);
  const done = p.start([stage(async () => {})]);
  await flush();
  await time.advance(2390);
  assert.equal(p.status, 'playing');
  await time.advance(10);
  await done;
  assert.equal(p.status, 'completed');
  assert.equal(p.index, 0);
  assert.deepEqual(time.frames, []);
});

test('automatic playback runs stages in order with a dwell after each', async () => {
  const { playback: p, time } = setup();
  p.setSpeed(1);
  const seen = [];
  const done = p.start([
    stage(async v => { seen.push('first'); await v.wait(100); }),
    stage(async v => { seen.push('second'); await v.wait(50); }),
  ]);
  await flush();
  await time.advance(1290);
  assert.deepEqual(seen, ['first']);
  await time.advance(10);
  assert.deepEqual(seen, ['first', 'second']);
  await time.advance(1250);
  await done;
  assert.equal(p.status, 'completed');
});

test('pause freezes parallel waits and resumes without counting paused time', async () => {
  const { playback: p, time } = setup();
  p.setSpeed(1);
  const progress = [0, 0], finished = [];
  const done = p.start([stage(v => Promise.all([
    v.wait(200, n => { progress[0] = n; }).then(() => finished.push('short')),
    v.wait(400, n => { progress[1] = n; }).then(() => finished.push('long')),
  ]))]);
  await flush();
  await time.advance(100);
  p.pause();
  const frozen = progress.slice();
  await time.advance(1000);
  assert.deepEqual(progress, frozen);
  assert.deepEqual(finished, []);
  assert.deepEqual(time.frames, []);
  p.resume();
  await time.advance(100);
  assert.deepEqual(finished, ['short']);
  await time.advance(200);
  assert.deepEqual(finished, ['short', 'long']);
  p.pause(); // The shared clock must also pause the explanatory dwell.
  await time.advance(5000);
  assert.equal(p.status, 'paused');
  p.resume();
  await time.advance(1200);
  await done;
});

test('speed changes apply to an in-flight animation', async () => {
  const { playback: p, time } = setup();
  let progress = 0;
  const done = p.start([stage(v => v.wait(1000, n => { progress = n; }))]);
  await flush();
  await time.advance(400);
  assert.equal(progress, 0.2);
  p.setSpeed(1);
  await time.advance(400);
  assert.equal(progress, 0.6);
  p.setSpeed(0.25);
  await time.advance(1600);
  assert.equal(progress, 1);
  assert.throws(() => p.setSpeed(2), RangeError);
  p.cancel();
  await done;
});

test('manual Next advances exactly once and the final stage completes without an extra click', async () => {
  const { playback: p, time } = setup();
  p.setSpeed(1);
  p.setManual(true);
  const seen = [];
  const done = p.start([stage(async v => { seen.push(1); await v.wait(100); }), stage(async v => { seen.push(2); await v.wait(100); })]);
  await flush();
  p.next(); // Ignored while the first stage is playing.
  await time.advance(100);
  assert.equal(p.status, 'waiting');
  await time.advance(5000);
  assert.deepEqual(seen, [1]);
  p.next();
  p.next();
  await flush();
  assert.deepEqual(seen, [1, 2]);
  await time.advance(1200);
  await done;
  assert.equal(p.status, 'completed');
});

test('manual mode can be enabled during a stage and disabled while waiting', async () => {
  const { playback: p, time } = setup();
  p.setSpeed(1);
  const seen = [];
  const done = p.start([stage(async v => { seen.push(1); await v.wait(100); }), stage(async () => { seen.push(2); })]);
  await flush();
  await time.advance(50);
  p.setManual(true);
  await time.advance(1250);
  assert.equal(p.status, 'waiting');
  p.setManual(false);
  await flush();
  assert.deepEqual(seen, [1, 2]);
  await time.advance(1200);
  await done;
});

test('pause immediately after Next prevents the next stage from running', async () => {
  const { playback: p, time } = setup();
  p.setSpeed(1);
  p.setManual(true);
  const seen = [];
  const done = p.start([stage(async () => { seen.push(1); }), stage(async () => { seen.push(2); })]);
  await flush();
  await time.advance(1200);
  p.next();
  p.pause();
  await flush();
  await time.advance(1000);
  assert.deepEqual(seen, [1]);
  p.resume();
  await flush();
  assert.deepEqual(seen, [1, 2]);
  await time.advance(1200);
  await done;
});

test('cancel settles start and rejects every parallel waiter without running later stages', async () => {
  const { playback: p, time } = setup();
  let waits, later = false;
  const done = p.start([
    stage(v => { waits = [v.wait(1000), v.wait(2000)]; return Promise.all(waits); }),
    stage(async () => { later = true; }),
  ]);
  await flush();
  p.cancel();
  await done;
  const results = await Promise.allSettled(waits);
  assert.ok(results.every(result => result.status === 'rejected'));
  await time.advance(10000);
  assert.equal(p.status, 'cancelled');
  assert.equal(later, false);
  assert.deepEqual(time.frames, []);
});

test('a new start is isolated from old waiters, frame callbacks and stage views', async () => {
  const { playback: p, time } = setup();
  p.setSpeed(1);
  let oldView, progress = 0;
  const first = p.start([stage(v => { oldView = v; return v.wait(10000); })]);
  await flush();
  const staleFrame = time.frames[0];
  const second = p.start([stage(v => v.wait(100, n => { progress = n; }))]);
  await first;
  await flush();
  oldView.block('Old run must not block the new run');
  await assert.rejects(oldView.wait(1), /cancelled/);
  time.replay(staleFrame);
  assert.equal(p.status, 'playing');
  assert.equal(progress, 0);
  await time.advance(1300);
  await second;
  assert.equal(p.status, 'completed');
  assert.equal(progress, 1);
});

test('block stops parallel animations, keeps its message and skips future stages', async () => {
  const { playback: p, time } = setup();
  p.setSpeed(1);
  let later = false;
  const done = p.start([
    stage(v => Promise.all([
      v.wait(50).then(() => v.block('Storage quorum unavailable')),
      v.wait(5000),
    ])),
    stage(async () => { later = true; }),
  ]);
  await flush();
  await time.advance(50);
  await done;
  assert.equal(p.status, 'blocked');
  assert.equal(p.message, 'Storage quorum unavailable');
  assert.equal(later, false);
  assert.deepEqual(time.frames, []);
});

test('real stage and progress errors reject start', async () => {
  const { playback: p, time } = setup();
  await assert.rejects(p.start([stage(async () => { throw new Error('Stage failed'); })]), /Stage failed/);
  assert.equal(p.status, 'blocked');
  assert.equal(p.message, 'Stage failed');
  const done = p.start([stage(v => v.wait(50, n => { if (n > 0) throw new Error('Drawing failed'); }))]);
  const rejection = assert.rejects(done, /Drawing failed/);
  await flush();
  await time.advance(20);
  await rejection;
  assert.equal(p.message, 'Drawing failed');
});

test('a long background frame advances only a bounded amount of animation time', async () => {
  const { playback: p, time } = setup();
  p.setSpeed(1);
  let progress = 0;
  const done = p.start([stage(v => v.wait(1000, n => { progress = n; }))]);
  await flush();
  await time.advance(10000, 10000);
  assert.equal(progress, 0.1);
  assert.equal(p.status, 'playing');
  p.cancel();
  await done;
});

test('cancel also interrupts a stage that waits for an external unresolved promise', async () => {
  const { playback: p } = setup();
  const done = p.start([stage(() => new Promise(() => {}))]);
  await flush();
  p.cancel();
  await done;
  assert.equal(p.status, 'cancelled');
});

test('a cancelled frame from before pause cannot replace the resumed clock', async () => {
  const { playback: p, time } = setup();
  p.setSpeed(1);
  const done = p.start([stage(v => v.wait(1000))]);
  await flush();
  const staleFrame = time.frames[0];
  p.pause();
  p.resume();
  const resumedFrames = time.frames;
  time.replay(staleFrame);
  assert.deepEqual(time.frames, resumedFrames);
  p.cancel();
  await done;
});

test('onChange can turn off manual mode as the waiting state is entered', async () => {
  const time = clock();
  const p = new ArchPlayback({ scheduler: time.scheduler, onChange: current => {
    if (current.status === 'waiting') current.setManual(false);
  } });
  p.setSpeed(1);
  p.setManual(true);
  const done = p.start([stage(async () => {}), stage(async () => {})]);
  await flush();
  await time.advance(2400);
  await done;
  assert.equal(p.status, 'completed');
});

test('a progress callback can pause without recursively advancing the clock', async () => {
  const { playback: p, time } = setup();
  const done = p.start([stage(v => v.wait(100, n => { if (n > 0) p.pause(); }))]);
  await flush();
  await time.advance(10);
  assert.equal(p.status, 'paused');
  p.cancel();
  await done;
});
