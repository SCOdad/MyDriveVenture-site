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

test('BKLG-0005 DV00 and DV03 both have explicit overlap visual treatment',()=>{
  const dv00=fs.readFileSync('log/DV00/index.html','utf8');
  const dv03=fs.readFileSync('log/index.html','utf8');
  const classicCss=fs.readFileSync('assets/css/log.css','utf8');
  const dv03Css=fs.readFileSync('assets/css/log-game-dv03.css','utf8');
  assert.match(dv00,/assets\/css\/log\.css/);
  assert.match(dv03,/assets\/css\/log-game-dv03\.css/);
  assert.match(classicCss,/\.drive-item-overlap/);
  assert.match(classicCss,/\.drive-overlap-eyebrow/);
  assert.match(dv03Css,/\.dv03-body \.drive-item-overlap/);
  assert.match(dv03Css,/\.dv03-body \.drive-overlap-eyebrow/);
});


test('overlap preflight is wired before create and edit mutation persistence',()=>{
  const rpc=fs.readFileSync('assets/js/log-drive-rpc.js','utf8');
  const editWarning=rpc.indexOf("confirmOverlapWarning(driverId,requested,edit.id)");
  const editMutation=rpc.indexOf("operation:'EDIT'");
  const createWarning=rpc.indexOf("confirmOverlapWarning(driverId,requested,null)");
  const createMutation=rpc.indexOf("operation:'CREATE'");
  assert.ok(editWarning>=0&&editMutation>=0&&editWarning<editMutation,'edit overlap warning must run before the edit mutation is persisted');
  assert.ok(createWarning>=0&&createMutation>=0&&createWarning<createMutation,'create overlap warning must run before the create mutation is persisted');
});

test('reconciled dashboard keeps overlap hydration asynchronous and generation guarded',()=>{
  const dashboard=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');
  assert.match(dashboard,/render\(generation\);\s*ensureOverlapSummary\(nextDriverId\)\.then/);
  assert.match(dashboard,/generation===renderGeneration&&currentDriverId===nextDriverId/);
  assert.doesNotMatch(dashboard,/await ensureOverlapSummary\(nextDriverId\)/);
});

test('presentation layer preserves hydrated overlap warnings in Recent Drives',()=>{
  const presenter=fs.readFileSync('assets/js/log-prepilot-v2.js','utf8');
  assert.match(presenter,/overlap=d\.overlap\|\|null/);
  assert.match(presenter,/drive-overlap-eyebrow/);
  assert.match(presenter,/drive-item\$\{warning\?' drive-item-overlap':''\}/);
});

test('Current Experience links Classic directly to DV00',()=>{
  const controls=fs.readFileSync('assets/js/log-driving-log-v1.js','utf8');
  assert.match(controls,/route === 'dv03'[\s\S]*href="\/log\/DV00\/"[\s\S]*Classic Experience/);
  assert.doesNotMatch(controls,/route === 'dv03'[\s\S]*href="\/log\/DV02\/"[\s\S]*Old Experience/);
  const classic=fs.readFileSync('log/DV00/index.html','utf8');
  assert.match(classic,/data-dv-route="dv00"/);
  assert.doesNotMatch(classic,/data-experience="game"/);
});
