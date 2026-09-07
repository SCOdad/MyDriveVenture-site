const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('BKLG-0151 all supported experiences load focused drive review controls',()=>{
  for(const page of ['log/DV00/index.html','log/DV02/index.html','log/index.html']){
    const html=read(page);
    assert.match(html,/log-drive-review\.js\?v=20260906-soft-delete1/);
  }
});

test('BKLG-0151 review mode dims page and exposes retained Delete Drive action',()=>{
  const js=read('assets/js/log-drive-review.js');
  const css=read('assets/css/log-drive-edit.css');
  assert.match(js,/dv-drive-review-active/);
  assert.match(js,/Delete drive/);
  assert.match(js,/functions\.invoke\('drive-delete'/);
  assert.match(css,/body\.dv-drive-review-active::before/);
  assert.match(css,/rgba\(0,0,0,\.68\)/);
});

test('BKLG-0151 review controls never overwrite a newly started follow-up edit after save success',()=>{
  const js=read('assets/js/log-drive-review.js');
  assert.doesNotMatch(js,/MutationObserver/);
  assert.doesNotMatch(js,/drive-detail-api/);
  assert.doesNotMatch(js,/drive-notes/);
});

test('BKLG-0151 retained VOID drives are removed from the operational trip list',()=>{
  const js=read('assets/js/log-drive-review.js');
  assert.match(js,/dv:dashboard-rendered/);
  assert.match(js,/drive\.status!==['"]COMPLETE['"]/);
  assert.match(js,/data-drive-detail-id/);
});

test('BKLG-0151 delete copy explains retained audit behavior',()=>{
  const js=read('assets/js/log-drive-review.js');
  assert.match(js,/retain an audit record/);
  assert.match(js,/removed from your driving totals, achievements, printable log, and certification queue/);
  assert.doesNotMatch(js,/hard delete/i);
});
