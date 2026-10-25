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
