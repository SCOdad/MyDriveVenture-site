const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');

test('Family is the canonical people and profile surface',()=>{
  const html=read('family/index.html');
  const profile=read('profile/index.html');
  const header=read('assets/js/canonical-header.js');
  assert.match(html,/Family &amp; Profiles/);
  assert.match(html,/id="family-profile-editor"/);
  assert.match(html,/id="profile-sms-state"/);
  assert.match(html,/id="profile-sms-action"/);
  assert.doesNotMatch(html,/<a href="\/profile\/"[^>]*>Profile/);
  assert.match(profile,/location\.replace/);
  assert.match(profile,/\/family\//);
  assert.doesNotMatch(header,/href=\"\/profile\/\"/);
  assert.match(header,/Family &amp; Profiles/);
  assert.match(header,/My Profile/);
});

test('driver cards stay in place while grown-up cards retain profile selection',()=>{
  const js=read('assets/js/family.js');
  assert.doesNotThrow(()=>new vm.Script(js));
  assert.doesNotMatch(js,/openProfile\(\{driver_id:card\.dataset\.driverId\}\)/);
  assert.match(js,/dv:driver-expand-toggle/);
  assert.match(js,/data-open-console/);
  assert.match(js,/openDriver\(consoleButton\.dataset\.openConsole\)/);
  assert.match(js,/family-grownup-self/);
  assert.match(js,/data-profile-person-id/);
});

test('grown-up profile edits suppress ZIP without suppressing driver profile controls',()=>{
  const js=read('assets/js/profile.js');
  const html=read('family/index.html');
  assert.doesNotThrow(()=>new vm.Script(js));
  assert.match(js,/zipWrap\)zipWrap\.hidden=!driver/);
  assert.match(js,/if\(s\.kind==='DRIVER'\)payload\.home_zip=zipInput\.value/);
  assert.match(html,/id="profile-zip-wrap"/);
  assert.match(html,/id="license-card"/);
  assert.match(html,/id="avatar-card"/);
});

test('Text Parker status and explicit consent actions are part of Contact Information',()=>{
  const js=read('assets/js/profile.js');
  for(const state of ['NO_MOBILE','VERIFICATION_PENDING','MOBILE_UNVERIFIED','VERIFIED_NOT_ENROLLED','OPTED_IN','OPTED_OUT']){
    assert.ok(js.includes(state),state+' should be represented');
  }
  assert.match(js,/action:'sms_consent_state'/);
  assert.match(js,/action:'set_sms_consent'/);
  assert.match(js,/Message frequency varies/);
  assert.match(js,/Reply HELP for help or STOP to opt out/);
});

test('driver account mode keeps the unified surface self-focused and skips Family data',()=>{
  const js=read('assets/js/profile.js');
  const family=read('assets/js/family.js');
  const css=read('assets/css/family.css');
  assert.match(js,/driverOnly=Boolean/);
  assert.match(js,/family-driver-profile-mode/);
  assert.match(family,/viewerProfileMode/);
  assert.match(family,/if\(mode\.driverOnly&&!hasInvite\)/);
  const initStart=family.indexOf('async function init');const initSource=family.slice(initStart,family.indexOf('bindPanelOpeners',initStart));
  assert.ok(initSource.indexOf('viewerProfileMode')<initSource.indexOf('await refresh()'),'driver role must be checked before Family overview');
  assert.match(css,/body\.family-driver-profile-mode \.family-hub-stack/);
  assert.match(css,/body\.family-driver-profile-mode \.family-people-section/);
  assert.match(css,/#grownup-panel/);
  assert.match(css,/#driver-panel/);
});

test('operator account navigation and operator tools remain available',()=>{
  const header=read('assets/js/canonical-header.js');
  assert.match(header,/role==='OPERATOR'/);
  assert.match(header,/Family &amp; Profiles/);
  for(const label of ['Operator Home','Operator Feedback','Backlog','Dictionary','Quests','Classification','Product Themes','Visual Assets','Nudges']){
    assert.ok(header.includes(label),label+' must remain in operator menu');
  }
});

test('profile editor remains usable when contact-change status is unavailable',()=>{
  const js=read('assets/js/profile.js');
  assert.match(js,/Contact-change status unavailable; continuing with profile editing/);
  assert.match(js,/try\{const pending=await contactCall\(\{action:'pending_changes'\}\)/);
});

test('approved people-grid amendment uses landscape grown-ups and portrait drivers in one people section',()=>{
  const html=read('family/index.html'),css=read('assets/css/family.css');
  assert.match(html,/family-people-section/);
  assert.match(html,/family-grownup-grid/);
  assert.match(html,/family-driver-grid/);
  assert.match(css,/family-grownup-landscape/);
  assert.match(css,/--family-person-card-axis:340px/);
  assert.match(css,/family-grownup-landscape\{min-height:168px;width:min\(100%,var\(--family-person-card-axis\)\)/);
  assert.match(css,/family-driver-card\{min-height:var\(--family-person-card-axis\)/);
});
test('Add Grown-up and Add Driver share one action area',()=>{
  const html=read('family/index.html');
  const section=html.slice(html.indexOf('family-people-actions'),html.indexOf('family-grownups'));
  assert.match(section,/data-open-panel="grownup"/);
  assert.match(section,/data-open-panel="driver"/);
});
test('Text Parker is nested within Mobile and disabled when mobile is unavailable',()=>{
  const html=read('family/index.html'),js=read('assets/js/profile.js'),css=read('assets/css/family.css');
  assert.match(html,/id="mobile-contact-block"/);
  assert.match(html,/id="text-parker-mobile"/);
  assert.match(js,/Add and verify a mobile number to use Text Parker/);
  assert.match(js,/smsAction\.disabled=!actionable/);
  assert.match(js,/smsMobile\.classList\.toggle\('is-disabled',!actionable\)/);
  assert.match(css,/\.text-parker-mobile\.is-disabled/);
});

test('card-first profiles move editable identity and license summary into cards',()=>{
  const family=read('assets/js/family.js'),html=read('family/index.html'),card=read('assets/js/family-card-profile.js'),css=read('assets/css/family.css');
  assert.doesNotThrow(()=>new vm.Script(family));
  assert.doesNotThrow(()=>new vm.Script(card));
  for(const field of ['name','home_zip','email','mobile','license_effective_date']) assert.ok(family.includes('data-inline-edit="'+field+'"'),field);
  assert.match(family,/family-readonly-card/);
  assert.match(family,/family-role-pill/);
  assert.match(family,/family-driver-hours/);
  assert.match(family,/data-other-requirements/);
  assert.match(card,/api\('profile-api','license_overview'/);
  assert.match(card,/api\('profile-api','update_license_effective_date'/);
  assert.match(card,/request_contact_change/);
  assert.match(card,/family-card-progress/);
  assert.match(html,/family-promoted-profile-form" hidden/);
  assert.match(css,/family-license-profile-card\.has-driver-accent/);
});
test('lower licensing section retains actions but removes duplicated progress display',()=>{
  const js=read('assets/js/profile.js'),html=read('family/index.html');
  assert.match(html,/Licensing actions/);
  assert.match(html,/Current stage, effective date, and progress now live on the driver card/);
  assert.match(js,/allReqs\.filter\(r=>!r\.met&&\/needs confirmation\/i/);
  assert.match(js,/No manual licensing confirmations are currently required/);
});

test('compact driver card keeps pencils but separates summary, communications, hours and aggregate requirements',()=>{
  const family=read('assets/js/family.js'),card=read('assets/js/family-card-profile.js'),css=read('assets/css/family.css');
  for(const field of ['name','home_zip','email','mobile','license_effective_date']) assert.ok(family.includes('data-inline-edit="'+field+'"'),field+' pencil');
  assert.match(family,/family-driver-comms/);
  assert.match(family,/data-card-value="sms_state"/);
  assert.match(family,/family-driver-hours/);
  assert.match(family,/data-other-requirements/);
  assert.match(family,/Expand full profile/);
  assert.match(card,/HOUR_TYPES=new Set/);
  assert.match(card,/other\.filter\(r=>r\.met\)\.length/);
  assert.match(css,/body:not\(\.family-driver-profile-mode\) #license-card/);
});
test('expanded driver profile includes favorite color and preserves expansion through edits',()=>{
  const family=read('assets/js/family.js'),card=read('assets/js/family-card-profile.js');
  assert.match(family,/data-expanded-color-picker/);
  assert.match(card,/DV_DRIVER_PALETTES/);
  assert.match(card,/favorite_color:chosen/);
  assert.match(card,/expandedDrivers/);
  assert.match(card,/Collapse full profile/);
});

test('grown-up managed family view removes obsolete lower shared profile editor',()=>{
  const css=read('assets/css/family.css'),family=read('assets/js/family.js'),card=read('assets/js/family-card-profile.js');
  assert.match(css,/body:not\(\.family-driver-profile-mode\) #family-profile-editor\{display:none!important\}/);
  assert.match(family,/family-grownup-sms/);
  assert.match(card,/Grown-up Text Parker status unavailable/);
});
test('density cleanup stacks communications and constrains avatar, requirements and color controls',()=>{
  const css=read('assets/css/family.css'),family=read('assets/js/family.js');
  assert.match(css,/\.family-driver-comms\{grid-template-columns:1fr!important/);
  assert.match(css,/\.family-parker-silhouette\{display:none!important\}/);
  assert.match(css,/\.family-expanded-requirement\{display:grid!important/);
  assert.match(css,/\.family-expanded-color-swatches \.dv-palette-swatch\{min-width:36px!important/);
  assert.match(family,/data-expanded-avatar-upload/);
});
test('expanded driver profile contains licensing actions instead of lower page licensing panel',()=>{
  const card=read('assets/js/family-card-profile.js');
  assert.match(card,/data-confirm-requirement/);
  assert.match(card,/record_license_requirement/);
  assert.match(card,/data-advance-stage/);
  assert.match(card,/advance_license_stage/);
});

test('grown-up and driver cards use distinct landscape and portrait regions',()=>{
  const html=read('family/index.html'),css=read('assets/css/family.css');
  assert.match(html,/family-grownup-region/);
  assert.match(html,/Grown-up profiles/);
  assert.match(html,/family-driver-region/);
  assert.match(html,/Driver profiles/);
  assert.match(css,/family-grownup-grid\{display:grid!important;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css,/family-driver-width:340px/);
  assert.match(css,/family-driver-grid\{display:grid!important;grid-template-columns:repeat\(auto-fill,minmax/);
});
test('shared 340px axis coupling no longer controls grown-up width',()=>{
  const css=read('assets/css/family.css');
  assert.match(css,/--family-grownup-min:420px/);
  assert.match(css,/family-grownup-landscape\{width:100%!important/);
  assert.match(css,/family-driver-card\{width:min\(100%,var\(--family-driver-width\)\)/);
});

test('grown-up cards use role pill and compact mobile/email rows',()=>{
  const family=read('assets/js/family.js'),css=read('assets/css/family.css');
  assert.doesNotMatch(family,/Guardian status/);
  assert.match(family,/family-role-pill/);
  assert.match(family,/\| YOU/);
  assert.match(family,/family-grownup-mobile-row/);
  assert.match(family,/family-grownup-email-row/);
  assert.match(css,/family-grownup-mobile-row.*grid-template-columns:74px/s);
});
test('driver card density pass compresses issue and communications while preserving pencils',()=>{
  const family=read('assets/js/family.js'),css=read('assets/css/family.css');
  assert.match(family,/family-driver-issue-row/);
  assert.match(family,/family-driver-comm-row/);
  assert.match(family,/family-inline-sms-label/);
  assert.match(family,/family-ellipsis-value/);
  assert.match(css,/family-driver-field-label/);
  assert.match(css,/text-overflow:ellipsis/);
  for(const field of ['name','home_zip','email','mobile','license_effective_date']) assert.ok(family.includes('data-inline-edit="'+field+'"'),field);
});
test('expand full profile is button-styled and driver console action is suppressed',()=>{
  const family=read('assets/js/family.js'),css=read('assets/css/family.css');
  const cardSource=family.slice(family.indexOf('function driverCard'),family.indexOf('function grownupCard'));
  assert.match(cardSource,/button secondary family-expand-profile/);
  assert.doesNotMatch(cardSource,/Open console/);
  assert.match(css,/family-expand-profile.*border:1px/s);
});

test('grown-up self landscape card includes inline editable name',()=>{
  const family=read('assets/js/family.js'),css=read('assets/css/family.css');
  assert.match(family,/family-grownup-name-row/);
  assert.match(family,/data-inline-edit="name"/);
  assert.match(css,/family-grownup-name-row/);
});
test('driver self mode renders the same driver card without fetching family overview',()=>{
  const family=read('assets/js/family.js'),css=read('assets/css/family.css');
  assert.match(family,/function renderDriverSelf\(subjects\)/);
  assert.match(family,/renderDriverSelf\(mode\.subjects\)/);
  assert.match(family,/dv:family-rendered/);
  assert.match(css,/body\.family-driver-profile-mode \.family-people-section\{display:block!important\}/);
  assert.match(css,/body\.family-driver-profile-mode \.family-grownup-region/);
});

test('contact verification page verifies against canonical contact endpoint API in its configured environment',()=>{
  const verify=read('assets/js/verify-contact.js'),html=read('verify-contact/index.html');
  assert.match(verify,/contact-endpoint-api\?token=/);
  assert.doesNotMatch(verify,/contact-endpoint-verify\?token=/);
  assert.match(html,/verify-contact\.js\?v=20261006-bklg0240a/);
});

test('pending contact changes replace inline editor with channel-specific verification state',()=>{
  const card=read('assets/js/family-card-profile.js'),css=read('assets/css/family.css');
  assert.match(card,/loadPendingChanges/);
  assert.match(card,/pending_changes/);
  assert.match(card,/Check your texts/);
  assert.match(card,/Check your email/);
  assert.match(card,/return 'PENDING'/);
  assert.match(card,/row\.innerHTML=original;await enrichCards\(\)/);
  assert.match(css,/family-contact-pending/);
});
test('verified mobile stays on one line while Text Parker controls compact around it',()=>{
  const card=read('assets/js/family-card-profile.js'),css=read('assets/css/family.css');
  assert.match(card,/prettyPhone/);
  assert.match(css,/\[data-card-value="mobile"\]\{white-space:nowrap!important/);
  assert.match(css,/\[data-card-sms-action\]\{font-size:\.66rem!important/);
  assert.match(css,/--family-driver-width:360px/);
});

test('driver phone row separates verified number from Text Parker controls',()=>{
  const family=read('assets/js/family.js'),css=read('assets/css/family.css');
  assert.match(family,/family-driver-phone-value/);
  assert.match(family,/family-driver-sms-line/);
  const row=family.slice(family.indexOf('family-driver-phone-row'),family.indexOf('family-driver-hours'));
  assert.ok(row.indexOf('family-driver-phone-value') < row.indexOf('family-driver-sms-line'));
  assert.match(css,/family-driver-phone-stack\{display:grid!important/);
  assert.match(css,/family-driver-sms-line\{flex-wrap:nowrap!important/);
});
