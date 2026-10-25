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
