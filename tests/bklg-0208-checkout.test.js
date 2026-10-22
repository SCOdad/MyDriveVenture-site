import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const page=fs.readFileSync('checkout/index.html','utf8')
const script=fs.readFileSync('assets/js/checkout.js','utf8')
const css=fs.readFileSync('assets/css/checkout.css','utf8')

test('checkout is a non-indexed authenticated page with payments initially disabled',()=>{
  assert.match(page,/name="robots" content="noindex,nofollow"/)
  assert.match(page,/id="checkout-signin"/)
  assert.match(page,/id="checkout-family"/)
  assert.match(page,/id="checkout-quote"[^>]*disabled/)
  assert.match(page,/id="checkout-consent"[^>]*disabled/)
  assert.match(page,/id="checkout-pay"[^>]*disabled/)
  assert.match(script,/state\.session/)
  assert.match(script,/family-api/)
  assert.match(script,/is_license_holder/)
})
test('all payable prices and quote totals originate from the backend, never browser constants',()=>{
  assert.match(script,/commercial-checkout/)
  assert.match(script,/api\('catalog'\)/)
  assert.match(script,/api\('quote'/)
  assert.match(script,/api\('start'/)
  assert.match(script,/api\('status'/)
  assert.match(script,/new Date\(q\.expires_at\)\.getTime\(\)>Date\.now\(\)/)
  assert.doesNotMatch(page+script,/\$24\.99|\$9\.99|2499|999/)
})
test('Family ownership, one-time policy consent and card-provider iframe remain explicit',()=>{
  assert.match(page,/SCOCRAFT LLC/)
  assert.match(page,/Family's License Holder/)
  assert.match(page,/href="\/terms\//)
  assert.match(page,/href="\/privacy\//)
  assert.match(page,/One-time charge/)
  assert.match(script,/q\.family_id===ui\.family\.value/)
  assert.match(script,/q\.offer_code===selectedOffer\(\)/)
  assert.match(script,/accepted_terms_version/)
  assert.match(page,/secure\.helcim\.app\/helcim-pay\/services\/start\.js/)
  assert.match(script,/appendHelcimPayIframe/)
  assert.match(script,/api\('status'/)
  assert.doesNotMatch(page,/meta-pixel|ga4|facebook|google-analytics/i)
})
test('backend receives explicit affirmative consent, not only a Terms version',()=>{
  assert.match(script,/accept_terms:ui\.consent\.checked/)
  assert.match(script,/ui\.consent\.checked/)
})
test('browser success cannot grant entitlements; no raw card entry in Drive Venture form',()=>{
  assert.match(script,/eventStatus==='SUCCESS'/)
  assert.match(script,/refreshFulfillmentStatus/)
  assert.match(script,/data\.status==='FULFILLED'/)
  assert.doesNotMatch(script,/from\(['"]family_entitlements|update\(['"]family_entitlements/)
  assert.doesNotMatch(page,/(?:name|id)="(?:cvv|cardnumber|card-number|expiry|pan)"/i)
  assert.match(css,/focus-visible/)
})

test('DEV-only operator diagnostic makes read-only Helcim connection test without revealing credentials',()=>{
  assert.match(page,/id="checkout-dev-diagnostics"[^>]*hidden/)
  assert.match(page,/id="checkout-dev-connect"/)
  assert.match(script,/DV_ENVIRONMENT_CONFIG\?\.name==='dev'/)
  assert.match(script,/action:'developer_connection_test'/)
  assert.match(script,/commercial-operator/)
  assert.match(script,/result\.connected===true&&result\.mode==='DEVELOPER_TEST'/)
  assert.doesNotMatch(script,/HELCIM_API_TOKEN|HELCIM_WEBHOOK_VERIFIER_TOKEN/)
})
