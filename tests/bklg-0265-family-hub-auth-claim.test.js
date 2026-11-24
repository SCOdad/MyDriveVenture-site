const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const family = readFileSync('assets/js/family.js', 'utf8');

test('Family Hub claims verified email on direct authenticated load before overview', () => {
  const start = family.indexOf('async function init(){');
  const claim = family.indexOf("client.rpc('claim_authenticated_access_v1')", start);
  const overview = family.indexOf('await viewerProfileMode()', start);
  assert.ok(start >= 0 && claim > start && overview > claim, 'authenticated access claim must precede Family Hub profile reads');
});
test('email verification synchronization failure does not prevent existing Family Hub access', () => {
  assert.match(family, /if\(claimError\)console\.warn/);
  assert.match(family, /catch\(claimFailure\)\{console\.warn/);
});
