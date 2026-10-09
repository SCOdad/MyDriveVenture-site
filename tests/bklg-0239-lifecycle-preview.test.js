import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('operator/lifecycle/index.html', 'utf8');
const client = readFileSync('operator/lifecycle/operator.js', 'utf8');

test('BKLG-0239 operator page exposes preview and explicit driver confirmation', () => {
  for (const id of ['lifecycle-form', 'lifecycle-kind', 'lifecycle-id', 'lifecycle-result',
    'driver-transition-panel', 'driver-transition-confirm','driver-transition-reason',
    'lifecycle-summary'])
    assert.ok(page.includes('id="' + id + '"'), 'missing ' + id);
  assert.match(page, /Family transitions and permanent purge remain disabled/);
  assert.match(page, /operator\/lifecycle\/operator\.js/);
});

test('BKLG-0239 prevents stale driver status and mismatched confirmation', () => {
  assert.match(client, /expected_status:\s*driver.status/);
  assert.match(client, /confirmation !== driver.display_name/);
  assert.match(client, /transition_driver/);
  assert.match(client, /auth.refreshSession\(\)/);
  assert.match(client, /transitionPanel.hidden = true/);
  assert.doesNotMatch(client, /execute_family_deletion|transition_family|purge_driver|purge_family/);
});

test('BKLG-0239 UI does not expose permanent deletion controls', () => {
  assert.doesNotMatch(page, /<button[^>]*>\s*(?:Delete|Purge)\b/i);
  assert.doesNotMatch(client, /action:\s*['"](?:purge|delete)/);
});

test('BKLG-0239 renders operator-readable impact safely', () => {
  assert.match(client, /function showSummary/);
  assert.match(client, /createElement\('li'\)/);
  assert.match(client, /textContent = name/);
  assert.match(client, /showSummary\(kind, preview\)/);
  assert.match(page, /View complete preview JSON/);
});
