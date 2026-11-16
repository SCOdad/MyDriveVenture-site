const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const canonicalPath = 'assets/images/dv-logo-primary.png';
const archivePath = 'assets/images/archive/dv-logo-primary-pre-bklg-0289.png';

// BKLG-0289: verify the canonical binary and guard against replacing it
// with the historical logo or retaining cropped legacy header artwork.
test('BKLG-0289: canonical PNG is the approved replacement format', () => {
  const image = fs.readFileSync(canonicalPath);
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(image.readUInt32BE(16), 1536);
  assert.equal(image.readUInt32BE(20), 1024);
  assert.ok(fs.existsSync(archivePath));
  assert.notDeepEqual(image, fs.readFileSync(archivePath));
});

test('BKLG-0289: live homepage variants reference the canonical asset', () => {
  for (const path of ['index.html', 'indexV2.html']) {
    const html = fs.readFileSync(path, 'utf8');
    assert.match(html, /src="\\/assets\\/images\\/dv-logo-primary\\.png"/);
    assert.doesNotMatch(html, /src="\\/assets\\/images\\/indexv2-logo\\.webp"/);
  }
});

test('BKLG-0289: shared navigation and footer contain the updated artwork', () => {
  const css = fs.readFileSync('assets/css/site.css', 'utf8');
  assert.match(css, /\\.brand img \\{[^}]*object-fit: contain/);
  assert.match(css, /\\.footer-brand img \\{[^}]*object-fit: contain/);
});
