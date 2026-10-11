const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const entry=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');

test('BKLG-0258: zero-driver return flow remains syntactically valid',()=>{
  assert.doesNotThrow(()=>new Function(entry));
});

test('BKLG-0258: returning grown-ups are routed only after authorized Family overview',()=>{
  assert.match(entry,/no active driver is linked to this account yet/i);
  assert.ok(entry.includes('/functions/v1/family-api'));
  assert.ok(entry.includes("action:'overview'"));
  assert.ok(entry.includes('family?.ok!==true'));
  assert.ok(entry.includes('!family.current_person_id'));
  assert.ok(entry.includes('!(family.family_contexts||[]).length'));
  assert.ok(entry.includes("location.replace('/family/')"));
});

test('BKLG-0258: driver dashboard errors are not otherwise swallowed',()=>{
  assert.ok(entry.includes('if(await routeZeroDriverGrownup(error))return;throw error'));
  assert.ok(entry.includes("client.rpc('get_authenticated_dashboard_v1')"));
});
