const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('BKLG-0249/0250 Family Hub names License Holder instead of Primary grown-up',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js');
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/Family profiles/);
  assert.match(html,/License Holder/);
  assert.match(js,/is_license_holder/);
  assert.match(js,/license_holder_name/);
  assert.doesNotMatch(js,/Only a primary grown-up/);
  assert.doesNotMatch(js,/g\.is_primary\?'Primary'/);
  assert.doesNotMatch(js,/primary\.has\(/);
});

test('multi-family Add Driver selects the entitlement and identifies its License Holder',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js');
  assert.match(html,/id="driver-family-context"/);
  assert.match(js,/function syncDriverFamilyContext/);
  assert.match(js,/name="family_id"/);
  assert.match(js,/Use which Family/);
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

test('driver transfer inbox supports acceptance and source cancellation without License Holder transfer',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js');
  assert.match(html,/id="family-transfer-requests"/);
  assert.match(js,/transfer_requests/);
  assert.match(js,/accept_driver_transfer/);
  assert.match(js,/resolve_driver_transfer/);
  assert.doesNotMatch(js,/accept_license_holder_transfer/);
  assert.doesNotMatch(js,/transferLicenseHolder/);
});


test('Family Profiles merges owned license summary and Other Account Access',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js');
  assert.match(html,/id="owned-family-section"/);
  assert.match(html,/id="other-account-access"/);
  assert.match(js,/Your Family/);
  assert.match(js,/Other account access|family-other-account-group/);
  assert.match(js,/publicCommercialState/);
  assert.doesNotMatch(js,/FREE_EXHAUSTED/);
  assert.doesNotMatch(js,/driver slots used/);
});

test('grown-up first onboarding and instructor role are supported',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js');
  assert.match(html,/Role \/ relationship/);
  assert.match(html,/DRIVER_ED_INSTRUCTOR/);
  assert.doesNotMatch(html,/name="relationship" required/);
  assert.match(js,/No drivers yet\. You can invite this grown-up now/);
  assert.doesNotMatch(js,/Choose at least one driver/);
});

test('Add Driver explicitly selects existing grown-up access',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js');
  assert.match(html,/id="driver-grownup-access"/);
  assert.match(html,/Who should have access/);
  assert.match(js,/renderDriverAccessChoices/);
  assert.match(js,/guardian_person_ids/);
});

test('driver mobile edit pencil is beside phone value rather than Text Parker action row',()=>{
  const js=read('assets/js/family.js');
  const card=js.slice(js.indexOf('function driverCard'),js.indexOf('function grownupCard'));
  const phoneValue=card.indexOf('family-driver-phone-value');
  const phonePencil=card.indexOf('data-inline-edit="mobile"',phoneValue);
  const smsLine=card.indexOf('family-driver-sms-line',phoneValue);
  assert.ok(phoneValue>=0&&phonePencil>phoneValue&&phonePencil<smsLine);
});


test('Add Driver can stage a new or existing grown-up invitation without granting access early',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js');
  assert.match(html,/invite_guardian_email/);
  assert.match(html,/Invite another grown-up to this driver/);
  assert.match(js,/inviteCall\('lookup',\{email:inviteEmail\}\)/);
  assert.match(js,/driver_ids:\[result\.driver_id\]/);
  assert.match(js,/pending acceptance/);
});


test('UAT: Add Driver is scoped to owned Families and Other Account Access has no Add Driver control',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/const contexts=ownedContexts\(\)/);
  assert.match(js,/const available=owned\.filter\(x=>x\.can_add_driver\)/);
  const other=js.slice(js.indexOf('const otherContexts='),js.indexOf("document.querySelectorAll('.manage-access')"));
  assert.doesNotMatch(other,/data-open-panel="driver"/);
});

test('UAT: current grown-up is not duplicated in Other Account Access',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/String\(g\.person_id\)!==String\(overview\.current_person_id\)/);
});

test('UAT: zero-driver owned Family uses only the large Add Driver CTA',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/addDriver\.hidden=ownedDrivers\.length===0/);
  assert.match(js,/Add your driver/);
});

test('UAT: prior-practice validation has visible error text and refocuses night hours',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/status\('driver-status',message,message\?'error':''\)/);
  assert.match(js,/Night hours cannot exceed total prior practice hours/);
  assert.match(js,/prior_night_hours\?\.focus\(\)/);
});

test('UAT: successful grown-up invitation closes the form and distinguishes delivery failures',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/document\.getElementById\('grownup-panel'\)\.hidden=true/);
  assert.match(js,/DEV email delivery is blocked/);
  assert.match(js,/email delivery failed/);
});


test('UAT: dynamically rendered Add Driver CTA uses delegated panel opening',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/function openFamilyPanel/);
  assert.match(js,/app\.addEventListener\('click',e=>\{const b=e\.target\.closest\?\.\('\[data-open-panel\]'\)/);
  assert.match(js,/openFamilyPanel\(b\.dataset\.openPanel/);
  assert.match(js,/Add your driver/);
});
