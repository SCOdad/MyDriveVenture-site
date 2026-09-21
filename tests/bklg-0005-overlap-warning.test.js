const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('BKLG-0005 preflight warns but allows overlapping create and edit',()=>{
  const source=fs.readFileSync('assets/js/log-drive-rpc.js','utf8');
  assert.match(source,/get_authenticated_drive_overlap_conflicts_v1/);
  assert.match(source,/Potential time conflict/);
  assert.match(source,/Overlapping drives are allowed and both will continue to count/);
  assert.match(source,/confirmOverlapWarning\(driverId,requested,edit\.id\)/);
  assert.match(source,/confirmOverlapWarning\(driverId,requested,null\)/);
  assert.match(source,/adjust this drive so its recorded time falls outside the window/);
});

test('BKLG-0005 recent drives and detail surface overlap warnings',()=>{
  const dashboard=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');
  const detail=fs.readFileSync('assets/js/log-drive-detail-v4.js','utf8');
  const css=fs.readFileSync('assets/css/log-drive-detail-v4.css','utf8');
  assert.match(dashboard,/get_authenticated_driver_overlap_summary_v1/);
  assert.match(dashboard,/drive-overlap-eyebrow/);
  assert.match(dashboard,/Overlaps \$\{Number\(overlap\.conflict_count\)\}/);
  assert.match(detail,/drive-overlap-notice/);
  assert.match(detail,/The recorded hours still count/);
  assert.match(css,/drive-item-overlap/);
  assert.match(css,/drive-overlap-eyebrow/);
});

test('BKLG-0005 dashboard overlap hydration does not block initial render',()=>{
  const source=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');
  assert.match(source,/render\(generation\);\s*ensureOverlapSummary\(nextDriverId\)\.then/);
});
