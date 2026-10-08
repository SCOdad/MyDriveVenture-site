// BKLG-0213: Active public identity surfaces must not present the former sole-proprietor operator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const activePublicPages = [
  'index.html', 'privacy/index.html', 'terms/index.html',
  'sms-consent/index.html', 'faq/index.html', 'feedback/index.html',
  'help/index.html', 'research/index.html', 'text-parker/index.html',
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
