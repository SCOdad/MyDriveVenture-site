const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const canonicalPath = 'assets/images/dv-logo-primary.png';
const archivePath = 'assets/images/archive/dv-logo-primary-pre-bklg-0289.png';

test('BKLG-0289: canonical PNG is the approved replacement format', () => {
  const image = fs.readFileSync(canonicalPath);
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(image.readUInt32BE(16), 1536);
  assert.equal(image.readUInt32BE(20), 1024);
  assert.ok(fs.existsSync(archivePath));
  assert.notDeepEqual(image, fs.readFileSync(archivePath));
});

test('BKLG-0289: homepage variants reference only the canonical logo', () => {
  for (const path of ['index.html', 'indexV2.html']) {
    const html = fs.readFileSync(path, 'utf8');
    assert.ok(html.includes('src="/assets/images/dv-logo-primary.png"'), path);
    assert.ok(!html.includes('src="/assets/images/indexv2-logo.webp"'), path);
  }
});

test('BKLG-0289: navigation and footer contain the replacement artwork', () => {
  const css = fs.readFileSync('assets/css/site.css', 'utf8');
  assert.ok(css.includes('.brand img { display: block;') && css.includes('object-fit: contain;'));
  assert.ok(css.includes('.footer-brand img {') && css.includes('height: 5.6rem; object-fit: contain;'));
});

test('BKLG-0289: staging and canonical PNG use the same approved artwork', () => {
  assert.deepEqual(fs.readFileSync('staging/dv-logo-primary.png'), fs.readFileSync(canonicalPath));
});

test('BKLG-0289: canonical artwork is revalidated by clients', () => {
  const headers = fs.readFileSync('_headers', 'utf8');
  assert.ok(headers.includes('/assets/images/dv-logo-primary.png'));
  assert.ok(headers.includes('Cache-Control: no-cache, must-revalidate'));
});
