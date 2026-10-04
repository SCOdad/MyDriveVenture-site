const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const js=fs.readFileSync('assets/js/join-v2.js','utf8');

test('referral query parameters become bounded acquisition attribution',()=>{
  assert.match(js,/requestedSource=String\(params\.get\('source'\)\|\|''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(js,/requestedReferrer=String\(params\.get\('referrer'\)\|\|''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(js,/isReferral=requestedSource==='REFERRAL'&&\/\^\[A-Z0-9\]\[A-Z0-9_-\]\{0,39\}\$\//);
  assert.match(js,/source=isReferral\?'REFERRAL':configuredSource/);
  assert.match(js,/referrer=isReferral\?requestedReferrer:''/);
});

test('referral flow storage is scoped by referrer and sent on view and submit',()=>{
  assert.match(js,/dv:acquisition:v2:flow:referral:/);
  assert.match(js,/const attribution=referrer\?\{referrer\}:\{\}/);
  assert.match(js,/action:'view',flow_id:flowId,source,\.\.\.attribution/);
  assert.match(js,/action:'submit',flow_id:flowId,source,\.\.\.attribution,name,email,website/);
});

test('invalid or incomplete referral query falls back to the configured acquisition source',()=>{
  assert.match(js,/isReferral=requestedSource==='REFERRAL'&&/);
  assert.match(js,/source=isReferral\?'REFERRAL':configuredSource/);
});
