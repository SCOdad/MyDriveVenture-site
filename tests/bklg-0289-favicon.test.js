const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('BKLG-0289 favicon is the approved speedometer motif on active and staging paths', () => {
  const active = fs.readFileSync('favicon.svg', 'utf8');
  const staging = fs.readFileSync('staging/favicon.svg', 'utf8');
  assert.equal(active, staging);
  assert.match(active, /viewBox="0 0 64 64"/);
  assert.match(active, /Drive Venture speedometer/);
  assert.match(active, /#f5f8ff/i);  // white/silver gauge rim
  assert.match(active, /#ffb900/i);  // yellow needle
  assert.match(active, /#080b0e/i); // canonical dark grounding
  assert.doesNotMatch(active, /M3 32 13 20h7|M26 18h10/); // previous chevron/DV motif
});

test('BKLG-0289 favicon revalidates after canonical cutover', () => {
  const headers = fs.readFileSync('_headers', 'utf8');
  for (const prefix of ['/favicon.svg', '/staging/favicon.svg']) {
    assert.ok(headers.includes(prefix + '\n  Cache-Control: no-cache, must-revalidate'));
  }
});

test('BKLG-0289 active pages use the shared favicon rather than historical alternatives', () => {
  const root = '.';
  let count = 0;
  function scan(dir) {
    for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
      if (ent.isDirectory()) {
        if (['.git', 'node_modules', 'archive', 'staging', 'test-results', 'playwright-report'].includes(ent.name)) continue;
        scan(path.join(dir, ent.name));
        continue;
      }
      if (!ent.name.endsWith('.html')) continue;
      const html = fs.readFileSync(path.join(dir, ent.name), 'utf8');
      const icons = [...html.matchAll(/<link\b[^>]*\brel=["'](?:shortcut )?icon["'][^>]*>/gi)].map(m=>m[0]);
      for (const icon of icons) {
        count++;
        assert.match(icon, /href=["']\/favicon\.svg["']/i, ent.name);
      }
    }
  }
  scan(root);
  assert.ok(count >= 10, 'expected active site favicon references');
});
