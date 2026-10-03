const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('homepage does not present the pilot as Michigan-only', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /Join the Michigan pilot/i);
  assert.doesNotMatch(html, /Starting in Michigan\. Built for every road\./i);
  assert.match(html, /Join Now/i);
  assert.match(html, /Drive logging is available nationwide/i);
  assert.match(html, /Michigan and Kansas/i);
});

test('requirements map distinguishes supported rulesets from nationwide product availability', () => {
  const html = read('archive/homepage-2026-10-03/index.html');
  const svg = read('assets/images/state-requirements-map.svg');
  assert.match(html, /Drive Venture state-specific ruleset supported/i);
  assert.match(html, /Michigan and Kansas/i);
  assert.match(html, /other categories describe licensing requirements/i);
  assert.match(svg, /Michigan and Kansas are bright yellow where Drive Venture has a supported state-specific ruleset/i);
  assert.match(svg, /id="KS" class="state supported"/);
});

test('legitimate Michigan legal identity remains', () => {
  const html = read('index.html');
  assert.match(html, /Michigan sole proprietor/);
});
