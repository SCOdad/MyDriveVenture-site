const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const source = fs.readFileSync('assets/js/environment-config.js', 'utf8');
function load(hostname) { const window = { location: { hostname } }; vm.runInNewContext(source, { window, URL, Set, Object, Error, String }); return window.DV_ENVIRONMENT_CONFIG; }
test('production hosts are pinned to PROD', () => { const c=load('mydriveventure.com'); assert.equal(c.name,'prod'); assert.equal(c.projectRef,'cayoyqwrmouxuttloemc'); });
test('localhost is pinned to DEV', () => { const c=load('localhost'); assert.equal(c.name,'dev'); assert.equal(c.projectRef,'safwylxxhywbsfxpmchd'); assert.match(c.functionUrl('driver-api'),/^https:\/\/safwylxxhywbsfxpmchd\./); });
test('unknown hosts fail closed', () => assert.throws(() => load('example.com'), /refuses unknown deployment host/));
test('invalid function slugs fail closed', () => assert.throws(() => load('localhost').functionUrl('../prod'), /Invalid Edge Function slug/));
