const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/family-avatar-map.js'), 'utf8');

test('family avatar loader parses', () => {
  assert.doesNotThrow(() => new vm.Script(source));
});

test('avatar requests are bounded and existing image URLs are reused', () => {
  assert.match(source, /MAX_RETRIES=3/);
  assert.match(source, /state\.blocked/);
  assert.match(source, /states\.get\(id\)\?\.url/);
  assert.match(source, /AVATAR_URL_TTL=55\*60\*1000/);
});

test('avatar observer is limited to the driver-card host', () => {
  assert.match(source, /getElementById\('family-drivers'\)/);
  assert.doesNotMatch(source, /observer\.observe\(document\.body/);
});
