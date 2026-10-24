// BKLG-0208: shared Family-scoped commercial purchase launcher.
// Never decides price, authorization, jurisdiction, or fulfillment in the browser.
(()=>{
'use strict';
const cfg=window.DV_APP_CONFIG||{};
const dev=window.DV_ENVIRONMENT_CONFIG?.name==='dev';
const params=new URLSearchParams(location.search);
const run=dev?params.get('dev_test_run'):null;
const testFamily=run?params.get('test_family'):null;
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
let client,session,contexts=[],catalog=null,quote=null,purchaseId=null,checkoutToken=null,nonce=null,busy=false;
let host,notice,select,offer,state,terms,quoteButton,payButton,summary,diagnostics;
const text=(el,s)=>{if(el)el.textContent=s;};
const currentFamily=()=>contexts.find(c=>String(c.family_id)===select?.value);
const chosenOffer=()=>offer?.value||'';
const eligible=(code,c)=>!!c?.is_license_holder&&(code==='FAMILY_LICENSE'?c.commercial_state!=='PAID':code==='ADDITIONAL_DRIVER_CAPACITY'&&c.commercial_state==='PAID');
function message(value){text(notice,value);}
function reset(){quote=null;purchaseId=null;checkoutToken=null;nonce=null;terms.checked=false;terms.disabled=true;payButton.disabled=true;text(summary,'Request a quote to review the total and approved policies.');}
async function invoke(endpoint,action,body={}){
 const auth=(await client.auth.getSession()).data?.session;
 if(!auth?.access_token)throw Error('Sign in before purchasing.');
 const res=await fetch(cfg.supabaseUrl+'/functions/v1/'+endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+auth.access_token,apikey:cfg.publishableKey},body:JSON.stringify({action,...(run?{dev_test_run_id:run,family_id:testFamily}:{}),...body})});
 const data=await res.json().catch(()=>({}));
 if(!res.ok||data.ok!==true)throw Error(data.error||'Purchase service unavailable.');
 return data;
}
function updateOffer(){
 reset();
 const c=currentFamily();offer.replaceChildren(new Option('Choose an available product',''));
 for(const o of catalog?.offers||[]){
  if(!eligible(o.offer_code,c))continue;
  offer.add(new Option(String(o.display_name||o.offer_code)+' — '+money(o.unit_cents),o.offer_code));
 }
 const allowed=!!catalog?.checkout_enabled&&!!c&&(!catalog.test_context||String(c.family_id)===String(catalog.test_context.family_id));
 offer.disabled=!allowed;state.disabled=!allowed;quoteButton.disabled=!allowed;
 message(!catalog?.checkout_enabled?(catalog?.disabled_reason||'Purchases are paused.'):'Choose a product and billing state to request a quote.');
}
function render(){
 host=document.getElementById('dv-commercial-purchase');
 if(!host)return;
 host.hidden=false;
 host.innerHTML=`<h2>Family purchases</h2><p class="family-explainer">One-time purchases belong to the selected Family. Drive Venture verifies payment before granting capacity.</p><label>Family <select id="dv-buy-family"></select></label><label>Product <select id="dv-buy-offer" disabled></select></label><label>Billing state <select id="dv-buy-state" disabled><option value="">Choose your billing state</option></select></label><button id="dv-buy-quote" class="button secondary" disabled>Review total</button><p id="dv-buy-summary" role="status" aria-live="polite"></p><label><input id="dv-buy-terms" type="checkbox" disabled> I agree to the <a href="/terms/" target="_blank" rel="noopener">Terms</a> and acknowledge the <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</label><p><button id="dv-buy-pay" class="button primary" disabled>Continue to Helcim secure payment</button></p><p id="dv-buy-notice" role="status" aria-live="polite"></p><div id="dv-buy-diagnostics" hidden><h3>DEV operator diagnostics</h3><button type="button" data-commercial-check="developer_connection_test">Test provider connection</button> <button type="button" data-commercial-check="developer_initialize_test">Test standard initialization</button> <button type="button" data-commercial-check="developer_initialize_test" data-variant="fee_saver">Test Fee Saver initialization</button><p id="dv-buy-diagnostic-result" role="status"></p></div>`;
 select=host.querySelector('#dv-buy-family');offer=host.querySelector('#dv-buy-offer');state=host.querySelector('#dv-buy-state');terms=host.querySelector('#dv-buy-terms');
 quoteButton=host.querySelector('#dv-buy-quote');payButton=host.querySelector('#dv-buy-pay');summary=host.querySelector('#dv-buy-summary');notice=host.querySelector('#dv-buy-notice');diagnostics=host.querySelector('#dv-buy-diagnostics');
 select.add(new Option('Select Family',''));
 for(const c of contexts.filter(c=>c.is_license_holder&&(!catalog?.test_context||String(c.family_id)===String(catalog.test_context.family_id))))
  select.add(new Option((c.license_holder_name||'Your')+' Family · '+(c.commercial_state||'—'),String(c.family_id)));
 if(select.options.length===2)select.selectedIndex=1;
 for(const item of catalog?.billing_states||[])state.add(new Option(item.code==='MI'?'Michigan (MI)':item.code,item.code));
 select.onchange=updateOffer;offer.onchange=reset;state.onchange=reset;
 quoteButton.onclick=()=>void quotePurchase();terms.onchange=()=>{payButton.disabled=!(quote&&terms.checked&&!busy)};
 payButton.onclick=()=>void launch();
 if(dev){diagnostics.hidden=false;diagnostics.querySelectorAll('[data-commercial-check]').forEach(b=>b.onclick=async()=>{
 const output=diagnostics.querySelector('#dv-buy-diagnostic-result');b.disabled=true;text(output,'Running non-charging DEV diagnostic…');
 try{const result=await invoke('commercial-operator',b.dataset.commercialCheck,b.dataset.variant?{variant:b.dataset.variant}:{});
 text(output,JSON.stringify({ok:result.ok,connected:result.connected,initialized:result.initialized,mode:result.mode,payment_initiated:result.payment_initiated,provider_http_status:result.provider_http_status,diagnostic:result.diagnostic}));}
 catch(_){text(output,'Diagnostic unavailable. No charge started by this control.');}finally{b.disabled=false;}
 });}
 updateOffer();
}
async function quotePurchase(){
 if(!catalog?.checkout_enabled||!currentFamily()||!chosenOffer()||!state.value||busy)return;
 busy=true;quoteButton.disabled=true;reset();message('Checking authoritative price and billing policy…');
 try{const data=await invoke('commercial-checkout','quote',{family_id:select.value,offer_code:chosenOffer(),billing_country:'US',billing_state:state.value});
 const q=data.quote;
 if(!q||q.family_id!==select.value||q.offer_code!==chosenOffer()||q.billing_state!==state.value||!Number.isSafeInteger(q.subtotal_cents)||!Number.isSafeInteger(q.tax_cents)||q.total_cents!==q.subtotal_cents+q.tax_cents||!q.terms_version||!q.terms_digest||!q.privacy_version||new Date(q.expires_at).getTime()<=Date.now())throw Error('Quote verification failed.');
 quote=q;terms.disabled=false;text(summary,'Product: '+String(q.display_name||q.offer_code)+' · Subtotal '+money(q.subtotal_cents)+' · Tax '+money(q.tax_cents)+' · Total '+money(q.total_cents)+' · Terms '+q.terms_version+' · Privacy '+q.privacy_version);
 message('Review the price and linked policies, then accept before continuing.');
 }catch(e){message(String(e.message||'Quote unavailable.').slice(0,200));}
 finally{busy=false;quoteButton.disabled=false;}
}
async function status(){
 if(!purchaseId)return false;
 try{const result=await invoke('commercial-checkout','status',{purchase_id:purchaseId,family_id:select.value});
 if(result.status==='FULFILLED'){message('Payment independently verified. Family entitlement updated.');payButton.disabled=true;window.dispatchEvent(new CustomEvent('dv:commercial-fulfilled',{detail:{family_id:select.value}}));return true;}
 if(['DECLINED','ABANDONED','RECONCILIATION_REQUIRED'].includes(result.status)){message('Payment not confirmed. Contact support before retrying.');payButton.disabled=true;return true;}
 }catch(_){}return false;
}
async function poll(){
 for(let i=0;i<20;i++){if(await status())return;await new Promise(resolve=>setTimeout(resolve,2000));}
 message('Payment verification remains pending. Do not retry payment; contact support if needed.');
}
async function launch(){
 if(!quote||!terms.checked||!catalog?.checkout_enabled||busy||quote.family_id!==select.value||quote.offer_code!==chosenOffer()||quote.billing_state!==state.value||new Date(quote.expires_at).getTime()<=Date.now())return;
 busy=true;payButton.disabled=true;
 try{if(!nonce)nonce=crypto.randomUUID();const data=await invoke('commercial-checkout','start',{family_id:select.value,quote_id:quote.quote_id,offer_code:chosenOffer(),client_idempotency_key:nonce,accepted_terms_version:quote.terms_version,accept_terms:true});
 if(!data.purchase_id||!data.checkout_token||typeof window.appendHelcimPayIframe!=='function')throw Error('Secure payment interface unavailable.');
 purchaseId=String(data.purchase_id);checkoutToken=String(data.checkout_token);
 message('Complete payment in Helcim. Entitlements update only after provider verification.');
 window.appendHelcimPayIframe(checkoutToken);
 }catch(e){message(String(e.message||'Payment launch failed.').slice(0,200));}
 finally{busy=false;}
}
window.addEventListener('message',e=>{
 if(!checkoutToken||!purchaseId||e.data?.eventName!==`helcim-pay-js-${checkoutToken}`)return;
 if(e.data.eventStatus==='SUCCESS'){message('Helcim reported completion; verifying payment…');void poll();}
 else if(e.data.eventStatus==='ABORTED'||e.data.eventStatus==='HIDE')void status();
});
async function init(){
 if(!document.getElementById('dv-commercial-purchase')||new URLSearchParams(location.search).has('invite'))return;
 if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey)return;
 client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 session=(await client.auth.getSession()).data?.session;if(!session)return;
 try{
 const response=await invoke('family-api','overview');
 contexts=(response.overview?.family_contexts||response.family_contexts||[]).filter(c=>c.is_license_holder);
 if(!contexts.length)return;
 catalog=await invoke('commercial-checkout','catalog');
 render();
 }catch(_){/* Existing Family management must remain usable if commerce is unavailable. */}
}
async function open({family_id,offer_code}={}){
 if(!document.getElementById('dv-commercial-purchase')){
  const main=document.querySelector('main');
  if(!main)throw Error('Purchase surface is not available.');
  const panel=document.createElement('section');
  panel.id='dv-commercial-purchase';
  panel.className='form-card';
  panel.hidden=true;
  main.appendChild(panel);
 }
 if(!host)await init();
 if(!host)throw Error('Sign in as an authorized Family License Holder to purchase.');
 if(family_id){select.value=String(family_id);updateOffer();}
 if(offer_code&&[...offer.options].some(o=>o.value===offer_code)){offer.value=offer_code;reset();}
 host.scrollIntoView({behavior:'smooth',block:'start'});
 return {available:!!catalog?.checkout_enabled, family_id:select.value, offer_code:offer.value};
}
window.DVCommercialPurchase={init,open};
document.addEventListener('DOMContentLoaded',()=>void init());
})();