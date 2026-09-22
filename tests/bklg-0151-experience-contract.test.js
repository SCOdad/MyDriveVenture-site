const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');

test('DV01 is retired to the current experience', () => {
  const source = read('log/DV01/index.html');
  assert.match(source, /location\.replace\('\/log\/' \+ location\.search \+ location\.hash\)/);
  assert.doesNotMatch(source, /dv\.log\.skin','dv01/);
});

test('shared drive RPC retains BKLG-0151 behavior for legacy supported views', () => {
  const source = read('assets/js/log-drive-rpc.js');
  assert.match(source, /log-driving-log-v1\.js\?v=20260922-0005-uat1/);
  assert.match(source, /sameChanged\(requested,data\.drive,edit\.original\)/);
  assert.match(source, /if\(edit\)edit\.draft=values\(\)/);
});

test('BKLG-0180 browser save no longer monkey-patches drive-ops into multi-call skill choreography', () => {
  const controls = read('assets/js/log-driving-log-v1.js');
  assert.doesNotMatch(controls, /slug === 'drive-ops' && \['log_drive', 'edit_drive'\]/);
  assert.doesNotMatch(controls, /originalInvoke\('drive-skill-ops'/);
  const rpc = read('assets/js/log-drive-rpc.js');
  assert.match(rpc, /returnedIds=sortedIds\(data\?\.lesson_ids\|\|data\?\.drive\?\.lesson_ids\|\|\[\]\)/);
  assert.doesNotMatch(rpc, /functions\.invoke\('drive-skill-ops'/);
  assert.match(rpc, /operation:'CREATE'/);
  assert.match(rpc, /operation:'EDIT'/);
  assert.match(rpc, /expected_revision:edit\.revision/);
});

test('BKLG-0180 Drive Log renders Skills Practiced from the backend context read model', () => {
  const controls = read('assets/js/log-driving-log-v1.js');
  const dashboard = read('assets/js/log-dashboard-entry-v5.js');
  const presenter = read('assets/js/log-prepilot-v2.js');
  assert.match(controls, /renderDriveSkillSummaries\(data\.drive_skill_summaries\)/);
  assert.match(controls, /querySelector\(':scope > div'\)/);
  assert.match(controls, /Skills Practiced: \$\{names\.join\(', '\)\}/);
  assert.match(controls, /refreshContext: loadContext/);
  assert.match(dashboard, /Road notes: \$\{esc\(d\.notes\)\}/);
  assert.match(presenter, /Road notes: \$\{esc\(d\.notes\)\}/);
});

test('CREATE verifies the authoritative saved drive and returns to ordinary log mode', () => {
  const rpc = read('assets/js/log-drive-rpc.js');
  assert.match(rpc, /const reread=await authoritativeDrive\(driverId,id\)/);
  assert.match(rpc, /app\.detailDrives\[id\]=reread\.drive;clearPending\(\);clearSubmissionId\(\);resetAfterCreate\(\)/);
  assert.match(rpc, /function resetNewDriveForm\(\)\{clearEditUi\(\)/);
  assert.match(rpc, /function resetAfterCreate\(\)\{if\(edit\)return;resetNewDriveForm\(\)\}/);
  assert.match(rpc, /function resetAfterEdit\(\)\{resetNewDriveForm\(\)\}/);
  assert.doesNotMatch(rpc, /app\.detailDrives\[id\]=reread\.drive;enterEdit\(reread\.drive/);
  assert.match(rpc, /if\(edit\?\.id===id\)\{form\.scrollIntoView/);
  assert.match(rpc, /\['drive-start','drive-end','drive-destination','drive-notes'\]/);
});

test('supported experiences load the current CREATE rehydration and failure-recovery contract', () => {
  for (const path of ['log/index.html', 'log/DV02/index.html', 'log/DV00/index.html']) {
    const source=read(path);
    assert.match(source, /drive-save-recovery\.js\?v=20260920-0194-recovery1/);
    assert.match(source, /log-drive-rpc\.js\?v=20260920-0194-recovery1/);
    assert.ok(source.indexOf('drive-save-recovery.js') < source.indexOf('log-drive-rpc.js'));
  }
});

test('supported experiences load the current driving-log summary contract directly', () => {
  for (const path of ['log/index.html', 'log/DV02/index.html', 'log/DV00/index.html']) {
    const source = read(path);
    assert.match(source, /log-driving-log-v1\.js\?v=20260922-0005-uat1/);
  }
});

test('shared driving-log controls define the durable supported experience taxonomy', () => {
  const source = read('assets/js/log-driving-log-v1.js');
  assert.match(source, /Current Experience/);
  assert.match(source, /Old Experience/);
  assert.match(source, /Classic Experience/);
  assert.match(source, /href="\/log\/DV00\/">Classic Experience/);
  assert.match(source, /No-frills base experience/);
  assert.doesNotMatch(source, /Default Experience/);
  assert.doesNotMatch(source, /Prior Experience/);
  assert.doesNotMatch(source, /New Experience[^\n]*href/);
});

test('skills checkbox styling contains checkbox and text in responsive cards', () => {
  const source = read('assets/js/log-driving-log-v1.js');
  assert.match(source, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(source, /@media\(max-width:620px\)\{\.drive-skill-grid\{grid-template-columns:1fr\}\}/);
  assert.match(source, /\.drive-skill-option>span/);
  assert.match(source, /overflow-wrap:anywhere/);
  assert.match(source, /\.drive-skill-option>input\[type=checkbox\]/);
});

test('Classic receives missing supervisor skills notes and export controls dynamically', () => {
  const source = read('assets/js/log-driving-log-v1.js');
  for (const id of ['drive-lesson-select-wrap','drive-supervisor','drive-supervisor-other-wrap','drive-log-export','drive-notes-meta']) {
    assert.match(source, new RegExp(id));
  }
  assert.match(source, /notes\.maxLength = 500/);
});

test('PDF export state clears when the selected driver changes', () => {
  const source = read('assets/js/log-driving-log-v1.js');
  assert.match(source, /window\.addEventListener\('dv:driver-changing',[\s\S]*setExportStatus\(''\)[\s\S]*showBuild\(false\)/);
  assert.match(source, /exportController\?\.abort\(\)/);
});

test('PDF download filename uses backend content disposition with driver-date fallback', () => {
  const source = read('assets/js/log-driving-log-v1.js');
  assert.match(source, /content-disposition/);
  assert.match(source, /drive-venture-\$\{safeDownloadPart\(driver\?\.display_name \|\| 'driver'\)\}-driving-log-\$\{localDownloadDate\(\)\}\.pdf/);
  assert.match(source, /a\.download = responseDownloadFilename\(response, driverId\)/);
});
