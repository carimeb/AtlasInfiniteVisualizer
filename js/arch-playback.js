// Active-time clock shared by every animation in an architecture demonstration.
// A stage receives a run-scoped view so a cancelled run cannot control its successor.
class ArchPlayback {
  constructor({ onChange = () => {}, scheduler = {} } = {}) {
    this.status = 'idle';
    this.index = -1;
    this.stages = [];
    this.speed = 0.5;
    this.manual = false;
    this.message = '';
    this._onChange = onChange;
    this._clock = {
      now: scheduler.now || (() => performance.now()),
      requestFrame: scheduler.requestFrame || (fn => requestAnimationFrame(fn)),
      cancelFrame: scheduler.cancelFrame || (id => cancelAnimationFrame(id)),
    };
    this._run = null;
  }

  start(stages) {
    if (!Array.isArray(stages) || stages.some(stage => !stage || typeof stage.run !== 'function')) {
      return Promise.reject(new TypeError('Each playback stage must provide a run function.'));
    }
    this.cancel();
    const abort = this._deferred();
    const run = { abort, stopped: false, waiters: new Set(), frame: null, lastTime: null, gate: null, resumeGate: null };
    this._run = run;
    this.stages = stages.slice();
    this.index = -1;
    this.message = '';
    this.status = 'playing';
    return this._drive(run, this.stages);
  }

  wait(ms, onProgress) {
    return this._wait(this._run, ms, onProgress);
  }

  pause() {
    const run = this._run;
    if (!run || this.status !== 'playing') return;
    this._advance(run);
    if (!this._active(run)) return;
    this.status = 'paused';
    run.resumeGate = this._deferred();
    this._cancelFrame(run);
    this._notify();
  }

  resume() {
    const run = this._run;
    if (!run || this.status !== 'paused') return;
    this.status = 'playing';
    const gate = run.resumeGate;
    run.resumeGate = null;
    gate?.resolve();
    this._schedule(run);
    this._notify();
  }

  next() {
    const run = this._run;
    if (!run || this.status !== 'waiting' || !run.gate) return;
    const gate = run.gate;
    run.gate = null;
    this.status = 'playing'; // Synchronous guard against repeated Next clicks.
    gate.resolve();
    this._notify();
  }

  cancel() {
    if (this._run) this._stop(this._run, 'cancelled');
  }

  block(message) {
    if (this._run) this._stop(this._run, 'blocked', String(message || 'Playback blocked.'));
  }

  setSpeed(speed) {
    if (![0.25, 0.5, 1].includes(speed)) throw new RangeError('Playback speed must be 0.25, 0.5 or 1.');
    if (this._run && this.status === 'playing') this._advance(this._run);
    this.speed = speed;
    this._notify();
  }

  setManual(manual) {
    this.manual = Boolean(manual);
    if (!this.manual && this.status === 'waiting') this.next();
    else this._notify();
  }

  async _drive(run, stages) {
    const view = this._view(run);
    try {
      this._notify();
      for (let index = 0; index < stages.length; index++) {
        await this._resumed(run);
        this._check(run);
        this.index = index;
        this._notify();
        await Promise.race([
          Promise.resolve().then(async () => {
            await this._resumed(run);
            this._check(run);
            return stages[index].run(view);
          }),
          run.abort.promise,
        ]);
        this._check(run);
        await this._wait(run, 1200);
        await this._resumed(run);
        this._check(run);
        if (index < stages.length - 1 && this.manual) {
          const gate = run.gate = this._deferred();
          this.status = 'waiting';
          this._notify();
          await Promise.race([gate.promise, run.abort.promise]);
        }
      }
      this._check(run);
      this._stop(run, 'completed');
    } catch (error) {
      if (error && error.archPlaybackAbort === run) return;
      if (this._active(run)) this._stop(run, 'blocked', error?.message || String(error));
      throw error;
    }
  }

  _view(run) {
    const owner = this;
    return Object.freeze({
      wait: (ms, progress) => owner._wait(run, ms, progress),
      block: message => { if (owner._active(run)) owner._stop(run, 'blocked', String(message || 'Playback blocked.')); },
      get status() { return owner._active(run) ? owner.status : run.finalStatus; },
      get index() { return owner._active(run) ? owner.index : run.finalIndex; },
      get stages() { return owner.stages; },
      get speed() { return owner.speed; },
      get manual() { return owner.manual; },
      get message() { return owner._active(run) ? owner.message : run.finalMessage; },
    });
  }

  _wait(run, ms, onProgress) {
    const deferred = this._deferred();
    try {
      this._check(run);
      if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Wait duration must be a non-negative finite number.');
      if (onProgress !== undefined && typeof onProgress !== 'function') throw new TypeError('Progress must be a function.');
      onProgress?.(0);
      this._check(run);
      if (ms === 0) {
        onProgress?.(1);
        deferred.resolve();
      } else {
        run.waiters.add({ duration: ms, elapsed: 0, progress: onProgress, ...deferred });
        this._schedule(run);
      }
    } catch (error) {
      deferred.reject(error);
    }
    return deferred.promise;
  }

  async _resumed(run) {
    this._check(run);
    while (this.status === 'paused') {
      await Promise.race([run.resumeGate.promise, run.abort.promise]);
      this._check(run);
    }
  }

  _schedule(run) {
    if (!this._active(run) || this.status !== 'playing' || !run.waiters.size || run.frame !== null) return;
    run.lastTime = this._clock.now();
    const frame = this._clock.requestFrame(() => {
      if (!this._active(run) || run.frame !== frame) return;
      run.frame = null;
      this._advance(run);
      this._schedule(run);
    });
    run.frame = frame;
  }

  _advance(run) {
    if (!this._active(run) || this.status !== 'playing' || run.lastTime === null || run.advancing) return;
    const now = this._clock.now();
    // A background tab may skip frames for seconds. Do not jump over the lesson.
    const delta = Math.min(100, Math.max(0, now - run.lastTime)) * this.speed;
    run.lastTime = now;
    run.advancing = true;
    try {
      for (const waiter of [...run.waiters]) {
        if (!this._active(run) || this.status !== 'playing') break;
        waiter.elapsed = Math.min(waiter.duration, waiter.elapsed + delta);
        try {
          waiter.progress?.(waiter.elapsed / waiter.duration);
          if (waiter.elapsed >= waiter.duration) {
            run.waiters.delete(waiter);
            waiter.resolve();
          }
        } catch (error) {
          run.waiters.delete(waiter);
          waiter.reject(error);
        }
      }
    } finally {
      run.advancing = false;
    }
  }

  _stop(run, status, message = '') {
    if (!this._active(run)) return;
    run.stopped = true;
    run.finalStatus = status;
    run.finalIndex = this.index;
    run.finalMessage = message;
    this._cancelFrame(run);
    const error = new Error(`Playback ${status}.`);
    error.archPlaybackAbort = run;
    run.abortError = error;
    run.abort.reject(error);
    for (const waiter of run.waiters) waiter.reject(error);
    run.waiters.clear();
    run.gate?.reject(error);
    run.resumeGate?.reject(error);
    run.gate = run.resumeGate = null;
    this._run = null;
    this.status = status;
    this.message = message;
    this._notify();
  }

  _cancelFrame(run) {
    if (run.frame !== null) this._clock.cancelFrame(run.frame);
    run.frame = null;
    run.lastTime = null;
  }

  _active(run) { return Boolean(run && this._run === run && !run.stopped); }

  _check(run) {
    if (!this._active(run)) {
      if (run?.abortError) throw run.abortError;
      throw new Error('No active playback.');
    }
  }

  _deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    // Cancellation may precede a consumer's next microtask or Promise.all call.
    promise.catch(() => {});
    return { promise, resolve, reject };
  }

  _notify() { this._onChange(this); }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { ArchPlayback };
