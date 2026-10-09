import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('operator/lifecycle/index.html', 'utf8');
const script = readFileSync('operator/lifecycle/operator.js', 'utf8');

test('BKLG-0239 lifecycle page exposes read-only previews', () => {
  assert.match(page, /id="lifecycle-form"/);
  assert.match(page, /id="lifecycle-kind"/);
  assert.match(page, /id="lifecycle-id"/);
  assert.match(page, /id="lifecycle-result"/);
  assert.match(page, /operator\/lifecycle\/operator\.js/);
  assert.match(page, /not enabled/i);
});

test('BKLG-0239 lifecycle browser calls only preview actions', () => {
  assert.match(script, /preview_/);
  assert.match(script, /auth\.getSession\(\)/);
  assert.match(script, /authorization/i);
  assert.doesNotMatch(script, /execute_family_deletion_v1|delete\(|purge_|inactivate_|reactivate_/);
  assert.doesNotMatch(page, /type="submit"[^>]*>\s*(?:Purge|Delete|Inactivate|Reactivate)/i);
});
