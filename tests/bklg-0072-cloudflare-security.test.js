const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

const headers=fs.readFileSync('_headers','utf8');
const redirects=fs.readFileSync('_redirects','utf8');

test('BKLG-0072 publishes the approved low-risk Cloudflare Pages security headers',()=>{
  assert.match(headers,/\/\*\s*[\r\n]+\s+X-Frame-Options: SAMEORIGIN/);
  assert.match(headers,/Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
});

test('BKLG-0072 does not silently activate HSTS or CSP',()=>{
  assert.doesNotMatch(headers,/Strict-Transport-Security/i);
  assert.doesNotMatch(headers,/Content-Security-Policy/i);
});

test('BKLG-0072 leaves Cloudflare Pages default nosniff and referrer policy authoritative',()=>{
  assert.doesNotMatch(headers,/X-Content-Type-Options/i);
  assert.doesNotMatch(headers,/Referrer-Policy/i);
});

test('BKLG-0072 canonicalizes /join/v2 to the current /join route with permanent redirects',()=>{
  assert.match(redirects,/^\/join\/v2\/\s+\/join\/\s+301$/m);
  assert.match(redirects,/^\/join\/v2\/\*\s+\/join\/:splat\s+301$/m);
});

test('BKLG-0072 preserves legacy onboarding and FAQ redirects',()=>{
  assert.doesNotMatch(redirects,/\/join\/v1\/\s+\/join\//);
  assert.match(redirects,/^\/FAQ\/\s+\/faq\/\s+301$/m);
  assert.match(redirects,/^\/FAQ\/\*\s+\/faq\/:splat\s+301$/m);
});
