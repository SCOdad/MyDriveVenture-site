import {test, expect} from '@playwright/test';

// Live, public, read-only receipt-checkout deployment check.
// No authentication, no commercial API calls, no Helcim initialization.
test('BKLG-0206 production serves confirmed-email and billing checkout assets',async({request})=>{
  const stamp=Date.now();
  const page=await request.get('/family/?receiptcheck='+stamp,{headers:{'cache-control':'no-cache'}});
  expect(page.ok(),'production Family Hub reachable').toBe(true);
  const html=await page.text();
  expect(html).toMatch(/\/assets\/js\/commercial-purchase\.js\?v=[a-zA-Z0-9_-]+/);

  const js=await request.get('/assets/js/commercial-purchase.js?receiptcheck='+stamp,{headers:{'cache-control':'no-cache'}});
  expect(js.ok(),'receipt checkout JavaScript reachable').toBe(true);
  const code=await js.text();
  for(const marker of ['data-billing-email','data-billing-street','data-billing-city',
      'data-billing-zip','data-billing-confirm','receipt_contact:',
      'a.billing_state=q.billing_state','client?.auth.getUser()'])
    expect(code,marker+' absent in live purchase asset').toContain(marker);

  const css=await request.get('/assets/css/commercial-purchase.css?receiptcheck='+stamp,{headers:{'cache-control':'no-cache'}});
  expect(css.ok(),'receipt checkout CSS reachable').toBe(true);
  expect(await css.text()).toContain('.commercial-billing');
});
