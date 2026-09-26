const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('operator/dictionary/index.html', 'utf8');
const js = fs.readFileSync('operator/dictionary/operator.js', 'utf8');
const config = fs.readFileSync('operator/config.js', 'utf8');
const dashboard = fs.readFileSync('operator/index.html', 'utf8');

test('BKLG-0181 uses dictionary naming and never the rejected text-dictionary route', () => {
  for (const source of [html, js, config, dashboard]) {
    assert.doesNotMatch(source, /text-dictionary/);
  }
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
  assert.match(js, /classify_preview/);
  assert.match(js, /data\.profanity\?\.terms/);
});
