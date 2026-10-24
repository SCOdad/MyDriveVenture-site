import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const family=fs.readFileSync('family/index.html','utf8');
const shared=fs.readFileSync('assets/js/commercial-purchase.js','utf8');
test('standalone checkout route and old page-specific assets are removed',()=>{
 for(const path of ['checkout/index.html','assets/js/checkout.js','assets/css/checkout.css'])assert.equal(fs.existsSync(path),false,path);
 assert.doesNotMatch(family,/href="\/checkout\//);
 assert.match(family,/id="dv-commercial-purchase"/);
 assert.match(family,/commercial-purchase\.js/);
});
test('Family Hub checkout always uses server authority and does not price products locally',()=>{
 assert.match(shared,/commercial-checkout/);
 assert.match(shared,/family-api/);
 for(const action of ["'catalog'","'quote'","'start'","'status'"])assert.ok(shared.includes(action),action);
 assert.doesNotMatch(shared,/\$24\.99|\$9\.99|2499|999/);
 assert.match(shared,/is_license_holder/);
 assert.match(shared,/quote\.family_id!==select\.value/);
 assert.match(shared,/client_idempotency_key/);
});
test('browser event never grants entitlement without server-confirmed fulfillment',()=>{
 assert.match(shared,/result\.status==='FULFILLED'/);
 assert.match(shared,/dv:commercial-fulfilled/);
 assert.match(shared,/e\.data\.eventStatus==='SUCCESS'/);
 assert.match(shared,/void poll\(\)/);
 assert.doesNotMatch(shared,/eventStatus==='SUCCESS'[^}]*dv:commercial-fulfilled/);
});
test('DEV operator diagnostics are isolated from purchase authorization',()=>{
 assert.match(shared,/window\.DV_ENVIRONMENT_CONFIG\?\.name==='dev'/);
 assert.match(shared,/commercial-operator/);
 assert.match(shared,/developer_connection_test/);
 assert.match(shared,/developer_initialize_test/);
 assert.match(shared,/data-variant="fee_saver"/);
 assert.match(shared,/dev_test_run_id/);
});
test('checkout policy links, consent and billing jurisdiction remain explicit',()=>{
 assert.match(shared,/href="\/terms\//);
 assert.match(shared,/href="\/privacy\//);
 assert.match(shared,/accept_terms:true/);
 assert.match(shared,/accepted_terms_version:quote\.terms_version/);
 assert.match(shared,/billing_state:state\.value/);
});
