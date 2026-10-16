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

test('published policy pages show final dated content and correct distinct refund thresholds', () => {
  const terms = read('terms/index.html');
  const privacy = read('privacy/index.html');
  assert.match(terms, /data-policy-version="terms-2026-10-16"/);
  assert.match(privacy, /data-policy-version="privacy-2026-10-16"/);
  for (const html of [terms, privacy]) {
    assert.match(html, /Last updated:<\/strong> October 16, 2026/);
    assert.match(html, /href="https:\/\/feedback\.mydriveventure\.com\//);
    assert.doesNotMatch(html, /mailto:mike@mydriveventure\.com/);
    assert.doesNotMatch(html, /Draft for pilot review|Open verification gates|proposed beta policy/);
  }
  assert.match(terms, /\$24\.99 USD one-time Family License/);
  assert.match(terms, /\$9\.99 USD/);
  assert.match(terms, /within seven days of that specific purchase/);
  assert.match(terms, /Family has logged no more than 20 total hours/);
  assert.match(terms, /specific driver receiving that additional seat/);
  assert.match(terms, /other drivers&#39; hours do not count/);
  assert.match(terms, /drives later deleted/);
  assert.match(privacy, /Privacy<\/strong>/);
  assert.match(privacy, /Billing<\/strong>/);
  assert.match(privacy, /inactive pilot registration and driving records are deleted or de-identified within 12 months/i);
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
  assert.match(draft, /Family has logged no more than 20 total hours/);
  assert.match(draft, /specific driver receiving that additional seat/);
  assert.match(draft, /other drivers' hours do not count/);
  assert.match(draft, /drives later deleted/);
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
  assert.match(contract, /Family as a whole.*20 cumulative hours/);
  assert.match(contract, /that specific driver.*20 cumulative hours/);
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
