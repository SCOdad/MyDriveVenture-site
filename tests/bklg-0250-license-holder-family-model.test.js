const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('BKLG-0249/0250 Family Hub names License Holder instead of Primary grown-up',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js');
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/Family licenses/);
  assert.match(html,/License Holder/);
  assert.match(js,/is_license_holder/);
  assert.match(js,/license_holder_name/);
  assert.doesNotMatch(js,/Only a primary grown-up/);
  assert.doesNotMatch(js,/g\.is_primary\?'Primary'/);
});

test('multi-family Add Driver selects the entitlement and identifies its License Holder',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js');
  assert.match(html,/id="driver-family-context"/);
  assert.match(js,/function syncDriverFamilyContext/);
  assert.match(js,/name="family_id"/);
  assert.match(js,/Family entitlement/);
  assert.match(js,/License Holder will automatically have access/);
  assert.match(js,/driver_capacity/);
});

test('prior-practice validation clears live after correction',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/function wirePriorPracticeValidation/);
  assert.match(js,/addEventListener\('input',\(\)=>validatePriorPractice\(form\)\)/);
  assert.match(js,/wirePriorPracticeValidation\(\)/);
});

test('License Holder controls grown-up access and removal with transfer choices',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/heldFamilyIds/);
  assert.match(js,/Manage access/);
  assert.match(js,/Remove grown-up/);
  assert.match(js,/transfer_driver_ids/);
  assert.match(js,/read-only/);
  assert.match(js,/family_id:familyId,guardian_person_id:personId/);
});

test('driver transfer inbox supports acceptance and source cancellation',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js');
  assert.match(html,/id="family-transfer-requests"/);
  assert.match(js,/transfer_requests/);
  assert.match(js,/accept_driver_transfer/);
  assert.match(js,/resolve_driver_transfer/);
  assert.match(js,/accept_license_holder_transfer/);
});
