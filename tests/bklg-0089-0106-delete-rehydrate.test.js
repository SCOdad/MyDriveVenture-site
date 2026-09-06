const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('BKLG-0089 driver deep link is honored and later manual switches update the URL',()=>{
  const js=read('assets/js/log-drive-review.js');
  assert.match(js,/applyInitialDriverLink/);
  assert.match(js,/new URLSearchParams\(location\.search\)\.get\('driver'\)/);
  assert.match(js,/app\.selectDriver\(requested,\{persist:true\}\)/);
  assert.match(js,/dv:driver-changing/);
  assert.match(js,/syncDriverUrl\(driverId,\{manual:true\}\)/);
  assert.match(js,/searchParams\.set\('driver',driverId\)/);
});

test('BKLG-0106 delete refreshes authoritative dashboard and verifies drive absence',()=>{
  const js=read('assets/js/log-drive-review.js');
  assert.match(js,/await app\.refreshDashboard\(\)/);
  assert.match(js,/stillOperational/);
  assert.match(js,/d\.status==='COMPLETE'/);
  assert.match(js,/Drive deleted\. Dashboard totals, progress, achievements, and drive history have been refreshed/);
});

test('BKLG-0106 inactive drives are removed defensively even when absent from the model',()=>{
  const js=read('assets/js/log-drive-review.js');
  assert.match(js,/if\(!drive\|\|drive\.status!==['"]COMPLETE['"]\)/);
});

test('BKLG-0089 and BKLG-0106 behavior is loaded by all supported experiences',()=>{
  for(const page of ['log/DV00/index.html','log/DV02/index.html','log/index.html']){
    assert.match(read(page),/log-drive-review\.js/);
  }
});
