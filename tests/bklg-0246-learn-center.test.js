const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = ['/', '/learn/', '/learn/requirements/', '/learn/getting-started/', '/learn/practice/', '/learn/logging/', '/learn/research/', '/learn/research/teen-drowsy-driving/'];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
test('BKLG-0246: Learn pages have canonical URLs and useful document structure', () => {
  for (const url of pages.slice(1)) {
    const html = read(url.slice(1) + 'index.html');
    assert.match(html, /<main\\b/, url);
    assert.match(html, /<h1\\b/, url);
    assert.ok(html.includes('rel="canonical" href="https://mydriveventure.com' + url + '"'), url);
    assert.ok(html.includes('href="/learn/'), url);
  }
});
test('BKLG-0246: legacy research paths redirect permanently', () => {
  const lines = read('_redirects');
  assert.ok(lines.split('\n').includes('/research/ /learn/research/ 301'));
  assert.ok(lines.split('\n').includes('/research/teen-drowsy-driving/ /learn/research/teen-drowsy-driving/ 301'));
});
test('BKLG-0246: sitemap only advertises canonical Learn destinations', () => {
  const xml = read('sitemap.xml');
  for (const url of pages) assert.ok(xml.includes('<loc>https://mydriveventure.com' + url + '</loc>'), url);
  assert.ok(!xml.includes('<loc>https://mydriveventure.com/research/'));
});
test('BKLG-0246: requirements retain 51 official state references', () => {
  const html = read('learn/requirements/index.html');
  const rows = [...html.matchAll(/<tr><th scope="row">/g)];
  assert.equal(rows.length, 51);
  assert.ok(html.includes('state-requirements-map.svg'));
  assert.ok(html.includes('state-requirements.csv'));
});
