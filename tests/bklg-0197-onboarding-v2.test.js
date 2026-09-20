const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('join v2 asks only for grown-up name and email',()=>{
  const html=read('join/v2/index.html');
  assert.match(html,/name="name"/);
  assert.match(html,/name="email"/);
  assert.doesNotMatch(html,/driverName|driverBirthDate|homeZip|licenseStage|vehicleName/);
  assert.match(html,/noindex,nofollow/);
});

test('join v2 records view and submits to the acquisition endpoint',()=>{
  const js=read('assets/js/join-v2.js');
  assert.match(js,/public-acquisition-v2/);
  assert.match(js,/action:'view'/);
  assert.match(js,/action:'submit'/);
  assert.match(js,/crypto\.randomUUID/);
});

test('welcome handoff can return acquisition users to Family Hub',()=>{
  const js=read('assets/js/auth-welcome-handoff.js');
  assert.match(js,/\/family\//);
  assert.match(js,/public-acquisition-v2/);
  assert.match(js,/action:'authenticated'/);
});

test('Family Hub records acquisition arrival without blocking rendering',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/acq_flow/);
  assert.match(js,/family_reached/);
  assert.match(js,/public-acquisition-v2/);
});
