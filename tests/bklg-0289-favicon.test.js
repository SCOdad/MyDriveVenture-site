const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const APPROVED_SOURCE_SHA256 = 'cd402c5dd08c41429342b932af571db33ff606fe8ce968fab364c1759c80e4fc';

test('BKLG-0289 favicon embeds the exact approved DV-LOGO-ALTERNATE-2026-10 PNG', () => {
  const live = fs.readFileSync('favicon.svg', 'utf8');
  const staging = fs.readFileSync('staging/favicon.svg', 'utf8');
  assert.equal(live, staging);
  assert.match(live, /viewBox="0 0 512 512"/);
  assert.match(live, /<title>Drive Venture<\/title>/);
  assert.match(live, /preserveAspectRatio="xMidYMid meet"/);
  const match = live.match(/href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/);
  assert.ok(match, 'favicon must be self-contained for browser compatibility');
  const bytes = Buffer.from(match[1], 'base64');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), APPROVED_SOURCE_SHA256);
  assert.deepEqual(bytes, fs.readFileSync('assets/images/dv-logo-primary.png'), 'favicon uses current approved logo bytes');
  assert.doesNotMatch(live, /M3 32 13 20h7|M26 18h10/); // old vector DV glyph is gone
});

test('BKLG-0289 favicon is cache-revalidated', () => {
  const headers = fs.readFileSync('_headers', 'utf8');
  for (const route of ['/favicon.svg', '/staging/favicon.svg']) {
    assert.ok(headers.includes(route + '\n  Cache-Control: no-cache, must-revalidate'));
  }
});

test('BKLG-0289 active pages reference the shared favicon', () => {
  let count = 0;
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (entry.isDirectory()) {
        if (['.git', 'node_modules', 'archive', 'staging', 'test-results', 'playwright-report'].includes(entry.name)) continue;
        scan(path.join(dir, entry.name));
      } else if (entry.name.endsWith('.html')) {
        const html = fs.readFileSync(path.join(dir, entry.name), 'utf8');
        const links = [...html.matchAll(/<link\b[^>]*\brel=["'](?:shortcut )?icon["'][^>]*>/gi)].map(m => m[0]);
        for (const link of links) {
          count++;
          assert.match(link, /href=["']\/favicon\.svg["']/i, entry.name);
        }
      }
    }
  }
  scan('.');
  assert.ok(count >= 10);
});
