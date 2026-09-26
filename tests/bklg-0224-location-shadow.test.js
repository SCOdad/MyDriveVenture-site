const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'location-shadow.js'), 'utf8');
const driverId = '11111111-1111-4111-8111-111111111111';

function harness(geolocation, endpointStatus = 204) {
  const listeners = new Map();
  const storage = new Map();
  const calls = [];
  const window = {
    addEventListener: (name, callback) => listeners.set(name, callback),
    crypto: { randomUUID: () => '22222222-2222-4222-8222-222222222222' },
    navigator: { geolocation },
    fetch: async () => ({ status: endpointStatus }),
    DV_ENVIRONMENT_CONFIG: {
      publishableKey: 'test-key',
      functionUrl: slug => `https://example.test/functions/v1/${slug}`,
    },
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    DV_LOG_APP: {
      client: { functions: { invoke: async (name, options) => calls.push({ name, options }) } },
      getDriverId: () => null,
    },
  };
  vm.runInNewContext(source, { window, Uint8Array, Array, Date, Promise });
  return { calls, fire: () => listeners.get('dv:dashboard-rendered')({ detail: { driverId } }) };
}

test('granted and poor-accuracy browser location is sent once per session', async () => {
  const h = harness({
    getCurrentPosition: success => success({
      coords: { latitude: 42.735492, longitude: -83.418172, accuracy: 2500 },
      timestamp: Date.parse('2026-09-25T16:00:00Z'),
    }),
  });
  h.fire();
  h.fire();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].name, 'browser-location-snapshot');
  assert.equal(h.calls[0].options.body.driver_id, driverId);
  assert.equal(h.calls[0].options.body.accuracy_m, 2500);
});

test('denied browser location is silent and does not invoke the backend', async () => {
  const h = harness({ getCurrentPosition: (_success, failure) => failure({ code: 1 }) });
  assert.doesNotThrow(() => h.fire());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.length, 0);
});

test('unavailable geolocation and backend failures do not affect dashboard execution', async () => {
  const unavailable = harness(undefined);
  assert.doesNotThrow(() => unavailable.fire());
  assert.equal(unavailable.calls.length, 0);

  const failing = harness({
    getCurrentPosition: success => success({
      coords: { latitude: 42, longitude: -83, accuracy: 10 },
      timestamp: Date.now(),
    }),
  });
  failing.fire();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(failing.calls.length, 1);
  assert.equal(source.includes('watchPosition'), false);
  assert.equal(source.includes('timeout: 30000'), true);
});

test('missing collection endpoint does not request browser permission', async () => {
  let permissionRequests = 0;
  const h = harness({ getCurrentPosition: () => { permissionRequests += 1; } }, 404);
  h.fire();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(permissionRequests, 0);
  assert.equal(h.calls.length, 0);
});
