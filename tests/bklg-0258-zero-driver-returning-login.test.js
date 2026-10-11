const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const entry=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');

test('BKLG-0258: zero-driver return flow remains syntactically valid',()=>{
  assert.doesNotThrow(()=>new Function(entry));
});

test('BKLG-0258: returning grown-ups are routed only after authorized Family overview',()=>{
  assert.match(entry,/no active driver is linked to this account yet/i);
  assert.match(entry,/functions\\/v1\\/family-api/);
  assert.match(entry,/action:'overview'/);
  assert.match(entry,/family\\?\\.ok!==true/);
  assert.match(entry,/!family\\.current_person_id/);
  assert.match(entry,/!\\(family\\.family_contexts\\|\\|\\[\\]\\)\\.length/);
  assert.match(entry,/location\\.replace\\('\/family\/'\\)/);
});

test('BKLG-0258: driver dashboard errors are not otherwise swallowed',()=>{
  assert.match(entry,/if\\(await routeZeroDriverGrownup\\(error\\)\\)return;throw error/);
  assert.match(entry,/client\\.rpc\\('get_authenticated_dashboard_v1'\\)/);
});
