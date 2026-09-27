const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('operator/dictionary/index.html', 'utf8');
const js = fs.readFileSync('operator/dictionary/operator.js', 'utf8');
const config = fs.readFileSync('operator/config.js', 'utf8');
const dashboard = fs.readFileSync('operator/index.html', 'utf8');

test('BKLG-0181 uses dictionary naming and never the rejected text-dictionary route', () => {
  for (const source of [html, js, config, dashboard]) assert.doesNotMatch(source, /text-dictionary/);
  assert.match(config, /DV_OPERATOR_DICTIONARY_ENDPOINT/);
  assert.match(config, /functionUrl\('operator-dictionary'\)/);
  assert.match(dashboard, /\/operator\/dictionary\//);
  assert.match(html, /<h1>Dictionary<\/h1>/);
});

test('BKLG-0181 operator UI includes destination aliases profanity policy and unclassified discoveries', () => {
  assert.match(html, /Unclassified drives/);
  assert.match(html, /Destinations/);
  assert.match(html, /Profanity policy/);
  assert.match(js, /disposition_discovery/);
  assert.match(js, /save_category/);
  assert.match(js, /save_alias/);
  assert.match(js, /save_policy_term/);
  assert.match(js, /save_allowlist/);
  assert.match(js, /classify_preview/);
});

test('BKLG-0181 uses autosave rather than category or policy Save buttons', () => {
  assert.match(js, /debounce\('category',saveCategory/);
  assert.match(js, /debounce\('policy-term',savePolicyTerm/);
  assert.match(js, /debounce\('allowlist',saveAllowlist/);
  assert.match(html, /category-save-state/);
  assert.match(html, /policy-save-state/);
  assert.match(html, /allowlist-save-state/);
  assert.doesNotMatch(html, />Save category</);
  assert.doesNotMatch(html, />Save term</);
  assert.doesNotMatch(html, />Save exception</);
});

test('policy term editor exposes review status and creates candidates pending and inactive', () => {
  assert.match(html, /name="review_status"[\s\S]*value="PENDING"[\s\S]*value="REVIEWED"[\s\S]*value="REJECTED"/);
  assert.match(js, /review_status:form\.elements\.review_status\.value/);
  assert.match(js, /form\.elements\.review_status\.value='PENDING'/);
  assert.match(js, /form\.elements\.is_active\.checked=false/);
  assert.match(js, /\$\{esc\(t\.review_status\|\|'PENDING'\)\}/);
});

test('BKLG-0181 exposes historical impact preview and controlled retroactive awards', () => {
  assert.match(html, /Historical quest impact/);
  assert.match(html, /Preview impact/);
  assert.match(html, /Apply previewed awards/);
  assert.match(js, /impact_preview/);
  assert.match(js, /apply_impact/);
  assert.match(js, /preview_token/);
  assert.match(js, /Existing awards will not be revoked or duplicated/);
});
