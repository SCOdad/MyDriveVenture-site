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
  assert.match(source, /log-driving-log-v1\.js\?v=20260904-0151-uat4/);
  assert.match(source, /sameChanged\(requested,data\.drive,edit\.original\)/);
  assert.match(source, /if\(edit\)edit\.draft=values\(\)/);
});

test('supported experiences load the current PDF cleanup contract directly', () => {
  for (const path of ['log/index.html', 'log/DV02/index.html', 'log/DV00/index.html']) {
    const source = read(path);
    assert.match(source, /log-driving-log-v1\.js\?v=20260905-0151-cleanup/);
  }
});

test('shared driving-log controls define the durable supported experience taxonomy', () => {
  const source = read('assets/js/log-driving-log-v1.js');
  assert.match(source, /Current Experience/);
  assert.match(source, /Old Experience/);
  assert.match(source, /Classic/);
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
