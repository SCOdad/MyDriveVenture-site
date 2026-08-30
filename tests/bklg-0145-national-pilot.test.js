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
  assert.match(html, /Join the pilot/i);
  assert.match(html, /Michigan and Kansas/i);
});

test('requirements map distinguishes pilot availability from licensing categories', () => {
  const html = read('index.html');
  const svg = read('assets/images/state-requirements-map.svg');
  assert.match(html, /Drive Venture pilot currently available/i);
  assert.match(html, /Michigan and Kansas/i);
  assert.match(html, /map’s other categories describe licensing requirements/i);
  assert.match(svg, /Michigan and Kansas are bright yellow where the Drive Venture pilot is currently available/i);
  assert.match(svg, /id="KS" class="state supported"/);
});

test('legitimate Michigan legal identity remains', () => {
  const html = read('index.html');
  assert.match(html, /Michigan sole proprietor/);
});
