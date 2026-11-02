import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const script=fs.readFileSync('assets/js/commercial-purchase.js','utf8');
const css=fs.readFileSync('assets/css/commercial-purchase.css','utf8');
test('receipt email and address confirmed before Helcim checkout',()=>{
 for(const key of ['data-billing-email','data-billing-street','data-billing-city','data-billing-zip','data-billing-confirm','data-billing-state'])assert.match(script,new RegExp(key));
 assert.match(script,/receipt_contact:\{/);
 assert.match(script,/client\?\.auth\.getUser\(\)/);
 assert.match(script,/validBilling/);
 assert.match(script,/a\.billing_state=q\.billing_state/);
 assert.match(css,/commercial-billing/);
});
