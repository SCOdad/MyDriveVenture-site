// BKLG-0203/0252: review-stage disclosure and existing-page consistency checks.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

test('public Terms and Privacy retain the canonical operator and mutual navigation', () => {
  for (const file of ['terms/index.html', 'privacy/index.html']) {
    const html = read(file);
    assert.match(html, /Drive Venture is operated by SCOCRAFT LLC/, file);
  }
  assert.match(read('terms/index.html'), /href="\/privacy\/"/);
  assert.match(read('privacy/index.html'), /href="\/terms\/"/);
});

test('SMS evidence page does not misrepresent the current Join form as SMS consent', () => {
  const html = read('sms-consent/index.html');
  assert.match(html, /Join.*does not collect SMS consent/);
  assert.match(html, /approved Text Parker enrollment path/);
  assert.match(html, /Reply STOP/);
  assert.match(html, /HELP/);
  assert.match(html, /consent-text version and timestamp/);
  assert.doesNotMatch(html, /working controls are on the.*pilot onboarding page/i);
});

test('source-controlled review package is explicitly nonpublic and tracks open decisions', () => {
  const draft = read('docs/bklg-0203-0252-owner-wording-review.md');
  assert.match(draft, /Unapproved working copy/);
  assert.match(draft, /seven days/);
  assert.match(draft, /Refunds and billing questions/);
  assert.match(draft, /Retention/);
  assert.match(draft, /SCOCRAFT LLC/);
  assert.match(draft, /20 hours/);
  assert.match(draft, /Feedback/);
});

test('BKLG-0208 handoff preserves one-time pricing, consent provenance, and transaction safety', () => {
  const contract = read('docs/bklg-0203-0252-checkout-disclosure-contract.md');
  assert.match(contract, /\$24\.99 USD/);
  assert.match(contract, /\$9\.99 USD/);
  assert.match(contract, /no subscription|No subscription/i);
  assert.match(contract, /stable Terms version/);
  assert.match(contract, /UTC timestamp/);
  assert.match(contract, /HMAC/);
  assert.match(contract, /idempotent/);
  assert.match(contract, /\$34\.98/);
});

test('Privacy and Billing feedback choices exist in public and operator forms', () => {
  const publicPage = read('feedback/index.html');
  const operator = read('operator/feedback/index.html');
  for (const category of ['PRIVACY', 'BILLING']) {
    assert.match(publicPage, new RegExp('<option value="' + category + '">'));
    assert.match(operator, new RegExp('<option>' + category + '</option>'));
  }
  assert.match(publicPage, /select <strong>Keep me updated<\/strong>/);
});
