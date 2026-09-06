const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('BKLG-0106 delete refreshes authoritative dashboard and verifies drive absence',()=>{
  const js=read('assets/js/log-drive-review.js');
  assert.match(js,/await app\.refreshDashboard\(\)/);
  assert.match(js,/stillOperational/);
  assert.match(js,/d\.status==='COMPLETE'/);
  assert.match(js,/Drive deleted\. Dashboard totals, progress, achievements, and drive history have been refreshed/);
});

test('BKLG-0106 inactive drives are removed defensively when absent or non-operational',()=>{
  const js=read('assets/js/log-drive-review.js');
  assert.match(js,/if\(!drive\|\|drive\.status!==['"]COMPLETE['"]\)/);
});

test('BKLG-0106 delete behavior is loaded by all supported experiences',()=>{
  for(const page of ['log/DV00/index.html','log/DV02/index.html','log/index.html']){
    assert.match(read(page),/log-drive-review\.js/);
  }
});
