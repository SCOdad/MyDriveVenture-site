const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'weather-context-shadow.js'), 'utf8');
const driverId = '11111111-1111-4111-8111-111111111111';

function harness({ invoke = async () => ({ data: { ok: true }, error: null }), storageThrows = false } = {}) {
  const listeners = new Map();
  const storage = new Map();
  const calls = [];
  const timers = [];
  const window = {
    addEventListener: (name, callback) => listeners.set(name, callback),
    setTimeout: callback => {
      timers.push(callback);
      return timers.length;
    },
    sessionStorage: {
      getItem: key => {
        if (storageThrows) throw new Error('storage unavailable');
        return storage.get(key) || null;
      },
      setItem: (key, value) => {
        if (storageThrows) throw new Error('storage unavailable');
        storage.set(key, value);
      },
    },
    DV_LOG_APP: {
      client: {
        functions: {
          invoke: async (name, options) => {
            calls.push({ name, options });
            return await invoke(name, options);
          },
        },
      },
      getDriverId: () => null,
    },
  };
  vm.runInNewContext(source, { window, Set, Promise });
  return {
    calls,
    window,
    fire: id => listeners.get('dv:dashboard-rendered')({ detail: { driverId: id ?? driverId } }),
    runNextTimer: () => timers.shift()?.(),
    timerCount: () => timers.length,
  };
}

test('dashboard weather shadow invokes drive-ops once per driver per session', async () => {
  const h = harness();
  h.fire();
  h.fire();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].name, 'drive-ops');
  assert.equal(JSON.stringify(h.calls[0].options.body), JSON.stringify({ action: 'weather_context_shadow', driver_id: driverId }));

  h.fire('22222222-2222-4222-8222-222222222222');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.length, 2);
});


test('weather shadow retries boundedly when app readiness is late', async () => {
  const h = harness();
  assert.equal(h.calls.length, 0);
  assert.equal(h.timerCount(), 1);

  h.window.DV_LOG_APP.getDriverId = () => driverId;
  h.runNextTimer();
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].name, 'drive-ops');
  assert.equal(h.timerCount(), 0);
});

test('weather shadow late retry and dashboard event still invoke only once', async () => {
  const h = harness();
  h.window.DV_LOG_APP.getDriverId = () => driverId;
  h.runNextTimer();
  h.fire();
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(h.calls.length, 1);
});

test('weather shadow remains bounded when session storage is unavailable', async () => {
  const h = harness({ storageThrows: true });
  assert.doesNotThrow(() => h.fire());
  assert.doesNotThrow(() => h.fire());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.length, 1);
});

test('weather shadow backend failure never escapes into dashboard execution', async () => {
  const h = harness({ invoke: async () => { throw new Error('backend unavailable'); } });
  assert.doesNotThrow(() => h.fire());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.length, 1);
  assert.equal(source.includes('navigator.geolocation'), false);
});

test('environment configuration loads the weather collector only on log routes', () => {
  const config = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'environment-config.js'), 'utf8');
  assert.match(config, /weather-context-shadow\.js\?v=20260926-0100-lateinit2/);
  assert.match(config, /data-dv-weather-context-shadow/);
});

test('log page cache-busts environment configuration for production collector changes', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'log', 'index.html'), 'utf8');
  assert.match(html, /environment-config\.js\?v=20260926-0100-prod1/);
});
