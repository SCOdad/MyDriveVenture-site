// BKLG-0213: Active public identity surfaces must not present the former sole-proprietor operator.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const activePublicPages = [
  'index.html', 'privacy/index.html', 'terms/index.html',
  'sms-consent/index.html', 'faq/index.html', 'feedback/index.html',
  'help/index.html', 'research/index.html', 'research/teen-drowsy-driving/index.html', 'text-parker/index.html',
  'FAQ/index.html',
  '404.html',
];

test('BKLG-0213 active public pages do not identify a sole proprietor as the operator', () => {
  for (const page of activePublicPages) {
    const html = readFileSync(resolve(root, page), 'utf8');
    assert.doesNotMatch(html, /Drive Venture is operated by Michael Stefaniak|Michigan sole proprietor/i, page);
  }
});

test('BKLG-0213 Terms and Privacy identify SCOCRAFT LLC as operator', () => {
  for (const page of ['privacy/index.html', 'terms/index.html']) {
    const html = readFileSync(resolve(root, page), 'utf8');
    assert.match(html, /Drive Venture is operated by SCOCRAFT LLC/, page);
  }
});

// The public operator attribution is intentional on these pages, not merely an absence of old copy.
test('BKLG-0213 active legal and informational surfaces retain SCOCRAFT LLC attribution', () => {
  const attributedPages = [
    'index.html', 'privacy/index.html', 'terms/index.html',
    'sms-consent/index.html', 'faq/index.html', 'FAQ/index.html',
    'feedback/index.html', 'help/index.html', 'research/index.html',
    'research/teen-drowsy-driving/index.html', 'text-parker/index.html', '404.html',
  ];
  for (const page of attributedPages) {
    const html = readFileSync(resolve(root, page), 'utf8');
    assert.match(html, /Drive Venture is operated by SCOCRAFT LLC/, page);
  }
});
