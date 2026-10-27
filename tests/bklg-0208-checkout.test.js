import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const family=fs.readFileSync('family/index.html','utf8');
const shared=fs.readFileSync('assets/js/commercial-purchase.js','utf8');
test('standalone checkout and legacy enrollment parameters cannot revive purchasing',()=>{
 for(const path of ['checkout/index.html','assets/js/checkout.js','assets/css/checkout.css'])assert.equal(fs.existsSync(path),false,path);
 assert.match(fs.readFileSync('_redirects','utf8'),/\/checkout\/\* \/family\/ 302/);
 assert.doesNotMatch(shared,/dev_test_run|test_family|commercial-operator|developer_initialize_test/);
 assert.match(family,/commercial-purchase\.js/);
});
test('shared launcher has no hardcoded prices or permanent product/Family selectors',()=>{
 assert.doesNotMatch(shared,/\$24\.99|\$9\.99|2499|999|dv-buy-family|dv-buy-offer/);
 assert.match(shared,/Object\.freeze\(\{init,mount,open\}\)/);
});

test('capacity upgrade is placed in Family Hub top actions, not a second purchasing section',()=>{
 assert.match(family, /id="owned-family-actions"[\s\S]*id="dv-commercial-purchase"/);
 assert.match(family, /id="dv-commercial-purchase" class="family-commercial-action"/);
 assert.doesNotMatch(family, /id="dv-commercial-purchase" class="form-card"/);
 assert.match(shared, /Upgrade to add driver/);
 assert.doesNotMatch(shared, /button\.textContent=.*money\(offer\.unit_cents\)/);
 assert.match(shared, /parentElement\.style\.display='none'/);
 assert.match(shared, /Purchases temporarily paused/);
 assert.match(shared, /driver_count/);
 assert.match(shared, /driver_capacity/);
});

test('Family Hub action row has secondary grown-up and separated primary upgrade styling',()=>{
 const css=fs.readFileSync('assets/css/commercial-purchase.css','utf8');
 assert.match(css, /#owned-family-actions\{display:flex;align-items:center;justify-content:space-between/);
 assert.match(css, /#owned-family-actions \[data-open-panel="grownup"\]/);
 assert.match(css, /#owned-family-actions \.family-commercial-action:not\(\[hidden\]\)\{margin-left:auto/);
});

test('unpaid Family uses first-driver onboarding then a full-license driver upgrade',()=>{
 const familyJs=fs.readFileSync('assets/js/family.js','utf8');
 assert.match(familyJs,/addDriver\.hidden=false/);
 assert.match(familyJs,/classList\.toggle\('primary',ownedDrivers\.length===0\)/);
 assert.match(shared,/if\(Number\(c\.driver_count\)===0\)/);
 assert.match(shared,/offer\.offer_code==='FAMILY_LICENSE'&&Number\(driver_count\)>0/);
 assert.match(shared,/await mount\(host,\{family_id:String\(c\.family_id\),driver_count:Number\(c\.driver_count\)\}\)/);
});
test('exhausted drive form is visibly read-only, while edit mode may remain available',()=>{
 const js=fs.readFileSync('assets/js/log-entitlements.js','utf8');
 const css=fs.readFileSync('assets/css/log-dashboard-v3.css','utf8');
 assert.match(js,/form\.dataset\.dvEntitlementBlocked = unavailable \? 'true' : 'false'/);
 assert.match(js,/setFieldsBlocked\(unavailable\)/);
 assert.match(js,/if \(blocked\) \{[\s\S]*?el\.disabled = true/);
 assert.match(js,/const unavailable = !!blocked && !editMode\(\)/);
 assert.match(css,/#drive-form\[data-dv-entitlement-blocked="true"\] input/);
});

test('returning from an existing drive edit hides the Exit edit action under exhausted entitlement',()=>{
 const driveUi=fs.readFileSync('assets/js/log-drive-rpc.js','utf8');
 const css=fs.readFileSync('assets/css/log-dashboard-v3.css','utf8');
 assert.match(driveUi,/if\(cancel\)cancel\.hidden=true/);
 assert.match(css,/#drive-edit-cancel\[hidden\]\{display:none!important\}/);
});

test('itemized quote summary uses authoritative cents and DV total styling',()=>{
 const css=fs.readFileSync('assets/css/commercial-purchase.css','utf8');
 assert.match(shared,/function renderSummary\(code,subtotal,tax,total,preview=false\)/);
 assert.match(shared,/row\('Sales Tax',tax,'commercial-tax'\)/);
 assert.match(shared,/row\('TOTAL',total,'commercial-total'\)/);
 assert.match(shared,/renderSummary\(a\.code,q\.subtotal_cents,q\.tax_cents,q\.total_cents\)/);
 assert.match(shared,/q\.total_cents!==q\.subtotal_cents\+q\.tax_cents/);
 assert.match(css,/\.commercial-total strong/);
 assert.match(css,/commercial-price-row/);
});
test('pending checkout status and expired-session recovery provide visible feedback and no payment restart',()=>{
 assert.match(shared,/async function checkStatus\(a\)/);
 assert.match(shared,/button\.disabled=true;button\.textContent='Checking…'/);
 assert.match(shared,/recover-abandoned/);
 assert.match(shared,/SESSION_STILL_PROTECTED/);
 assert.match(shared,/PROVIDER_ACTIVITY_REQUIRES_REVIEW/);
 assert.match(shared,/if\(result\.status==='ABANDONED'\)/);
 assert.match(shared,/a\.started=false;a\.done=true;a\.token=null/);
 assert.match(shared,/check\.disabled=true;check\.textContent='Checking…'/);
 assert.doesNotMatch(shared,/setInterval\([\s\S]*?recover-abandoned/);
});


test('no retired lifetime DEV session-budget gate; pending purchase still prevents duplicates',()=>{
 assert.doesNotMatch(shared,/test_budget_exhausted|DEV payment-test session allowance exhausted/);
 assert.match(shared,/button\.disabled=\(!data\.checkout_enabled/);
 assert.match(shared,/\|\|!!data\.pending_purchase/);
 assert.match(shared,/if\(data\.pending_purchase\)/);
 assert.match(shared,/recover-abandoned/);
});

test('Helcim recoverable error and dismissal events never reopen the Family dialog',()=>{
 assert.match(shared,/if\(e\.data\.eventStatus==='SUCCESS'\)/);
 assert.doesNotMatch(shared,/\['SUCCESS','ABORTED','HIDE'\]\.includes/);
 assert.doesNotMatch(shared,/dialog\.close\(\);window\.appendHelcimPayIframe\(a\.token\);void poll\(a\)/);
 const eventBlock=shared.slice(shared.indexOf("window.addEventListener('message'"),shared.indexOf('async function mount('));
 assert.doesNotMatch(eventBlock,/dialog\.showModal\(/);
 assert.doesNotMatch(eventBlock,/ABORTED'\s*\|\|/);
 assert.match(eventBlock,/void poll\(a\)/);
});

test('fulfilled payment refreshes Family before updating checkout controls',()=>{
 const familyJs=fs.readFileSync('assets/js/family.js','utf8');
 assert.match(shared,/async function refreshFamilyAfterFulfillment\(a\)/);
 const handler=shared.slice(shared.indexOf('async function refreshFamilyAfterFulfillment(a)'),shared.indexOf('async function checkStatus(a)'));
 assert.match(handler,/await window\.DVFamily\.refresh\(\)/);
 assert.ok(handler.indexOf('await window.DVFamily.refresh()')<handler.indexOf('await init()'));
 assert.match(handler,/refreshed:true|refreshed\}\}\)/);
 assert.match(familyJs,/if\(e\.detail\?\.refreshed===true\)return/);
 assert.match(shared,/Refresh this page to see your updated Family access/);
});
