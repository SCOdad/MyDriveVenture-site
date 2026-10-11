const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const routes=['log/index.html','log/DV00/index.html','log/DV02/index.html'];
const entry=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');
const headers=fs.readFileSync('_headers','utf8');
const version='20261011-bklg0258-cache1';

test('BKLG-0258: all driver console entry pages use the refreshed login script URL',()=>{
  for(const route of routes){
    const html=fs.readFileSync(route,'utf8');
    const matches=[...html.matchAll(/src="\/assets\/js\/log-dashboard-entry-v5\.js\?v=([^"]+)"/g)];
    assert.equal(matches.length,1,route);
    assert.equal(matches[0][1],version,route);
    assert.ok(!html.includes('20260924-0111-canonical2'),route);
  }
});

test('BKLG-0258: Cloudflare Pages revalidates login HTML after deployment',()=>{
  assert.match(headers,/\/log\/\*\s*\n\s+Cache-Control:\s*no-cache,\s*must-revalidate/i);
});

test('BKLG-0258: versioned script retains the authorized zero-driver handoff',()=>{
  assert.match(entry,/async function routeZeroDriverGrownup\(/);
  assert.ok(entry.includes("location.replace('/family/')"));
});
