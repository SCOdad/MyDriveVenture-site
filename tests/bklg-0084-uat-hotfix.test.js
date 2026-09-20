const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const join = fs.readFileSync(path.join(root, 'assets/js/join.js'), 'utf8');
const drive = fs.readFileSync(path.join(root, 'assets/js/log-drive-rpc.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'assets/css/log-dashboard-v3.css'), 'utf8');
const legacyJoinHtml = fs.readFileSync(path.join(root, 'join/v1/index.html'), 'utf8');
const currentHtml = fs.readFileSync(path.join(root, 'log/index.html'), 'utf8');
const oldHtml = fs.readFileSync(path.join(root, 'log/DV02/index.html'), 'utf8');

test('prior practice travels with canonical onboarding and has no second browser save', () => {
  assert.match(join, /prior_practice: priorPractice/);
  assert.doesNotMatch(join, /public-prior-practice-credit/);
  assert.doesNotMatch(join, /savePriorPracticeCredit/);
});

test('drive creation has bounded failure handling and always leaves busy state', () => {
  assert.match(drive, /Promise\.race/);
  assert.match(drive, /DV_SAVE_TIMEOUT/);
  assert.match(drive, /recovery\.timeoutMs\(\)/);
  assert.match(drive, /finally\{if\(!pendingForCurrentDriver\(\)\)setSubmitting\(false\)\}/);
  assert.match(drive, /setStatus\(`Drive: \$\{info\.message\}/);
});

test('dashboard heading wraps long driver names at desktop and mobile sizes', () => {
  assert.match(dashboard, /\.app-topline>div:first-child\{min-width:0;flex:1\}/);
  assert.match(dashboard, /overflow-wrap:anywhere/);
  assert.match(dashboard, /\.app-topline h1\{font-size:36px;line-height:1\.05\}/);
});

test('hotfix assets use fresh cache keys on supported entry points', () => {
  assert.match(legacyJoinHtml, /join\.js\?v=20260919-bklg0084-hotfix/);
  for (const html of [currentHtml, oldHtml]) {
    assert.match(html, /log-dashboard-v3\.css\?v=20260919-0084-hotfix/);
    assert.match(html, /drive-save-recovery\.js\?v=20260920-0194-recovery1/);
    assert.match(html, /log-drive-rpc\.js\?v=20260920-0194-recovery1/);
  }
});
