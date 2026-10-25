// Shared Family-scoped purchasing. Server quotes, authority and fulfillment are definitive.
(()=>{
'use strict';
const cfg=window.DV_APP_CONFIG||{};
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
let client,dialog,active=null,opening=false,mountGenerations=new WeakMap();
const expectedOffer=s=>['FREE','FREE_EXHAUSTED'].includes(s)?'FAMILY_LICENSE':s==='PAID'?'ADDITIONAL_DRIVER_CAPACITY':null;
const label=code=>code==='FAMILY_LICENSE'?'Buy Full License':'Add Driver Capacity';
const say=s=>{if(dialog)dialog.querySelector('[data-notice]').textContent=s;};
async function invoke(endpoint,action,body={}){
 client ||= window.DV_SUPABASE_CLIENT||window.supabase?.createClient(cfg.supabaseUrl,cfg.publishableKey);
 const auth=(await client?.auth.getSession())?.data?.session;
 if(!auth?.access_token)throw Error('Sign in as this Family’s License Holder.');
 const res=await fetch(cfg.supabaseUrl+'/functions/v1/'+endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+auth.access_token,apikey:cfg.publishableKey},body:JSON.stringify({action,...body})});
 const data=await res.json().catch(()=>({}));
 if(!res.ok||data.ok!==true)throw Error(data.error||'Purchasing is unavailable. Please try again later.');
 return data;
}
async function context(family_id){
 if(typeof family_id!=='string'||!family_id)throw Error('Open purchasing from a specific Family.');
 const data=await invoke('commercial-checkout','catalog',{family_id});
 const code=expectedOffer(data.commercial_state);
 if(data.family_id!==family_id||!code||data.offers?.length!==1||data.offers[0].offer_code!==code)throw Error('No eligible purchase is available for this Family.');
 return data;
}
function ensureDialog(){
 if(dialog)return;
 if(!document.querySelector('link[data-commercial-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/css/commercial-purchase.css?v=hub2';link.dataset.commercialStyle='';document.head.append(link);}
 dialog=document.createElement('dialog');dialog.className='commercial-dialog';dialog.setAttribute('aria-labelledby','dv-purchase-title');
 dialog.innerHTML='<h2 id="dv-purchase-title"></h2><p data-description></p><label data-billing>United States billing state <select data-state><option value="">Choose your billing state</option></select></label><p data-summary aria-live="polite"></p><label class="commercial-consent"><input data-consent type="checkbox" disabled> <span>I agree to the <a href="/terms/" target="_blank" rel="noopener">Terms</a> and acknowledge the <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</span></label><p data-notice role="status" aria-live="polite"></p><div class="commercial-actions"><button class="button secondary" data-close type="button">Cancel</button><button class="button primary" data-pay type="button" disabled>Continue to secure payment</button></div><button data-recheck type="button" hidden>Check payment status</button>';
 document.body.append(dialog);
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{if(active&&!active.started){active=null;} });
 dialog.querySelector('[data-state]').onchange=()=>void getQuote(active);
 dialog.querySelector('[data-consent]').onchange=()=>sync();
 dialog.querySelector('[data-pay]').onclick=()=>void launch(active);
 dialog.querySelector('[data-recheck]').onclick=()=>void poll(active);
}
function sync(){
 const a=active,q=a?.quote;
 dialog.querySelector('[data-pay]').disabled=!(q&&Date.parse(q.expires_at)>Date.now()&&dialog.querySelector('[data-consent]').checked&&!a.busy&&!a.started);
}
async function getQuote(a){
 if(!a||a!==active||a.started)return;
 const state=dialog.querySelector('[data-state]').value,revision=++a.revision;
 a.quote=null;dialog.querySelector('[data-consent]').checked=false;dialog.querySelector('[data-consent]').disabled=true;dialog.querySelector('[data-summary]').textContent='';sync();
 if(!state){say('Choose your billing state to check availability and tax.');return;}
 if(state==='UNSUPPORTED'){say('Purchasing is not yet available for this billing jurisdiction.');return;}
 say('Checking current price and tax…');
 try{
  const data=await invoke('commercial-checkout','quote',{family_id:a.family_id,offer_code:a.code,billing_country:'US',billing_state:state});
  if(a!==active||revision!==a.revision)return;
  const q=data.quote,expiry=Date.parse(q?.expires_at);
  if(!q||q.family_id!==a.family_id||q.offer_code!==a.code||q.billing_state!==state||q.currency!=='USD'||!Number.isSafeInteger(q.subtotal_cents)||q.subtotal_cents<0||!Number.isSafeInteger(q.tax_cents)||q.tax_cents<0||!Number.isSafeInteger(q.total_cents)||q.total_cents!==q.subtotal_cents+q.tax_cents||!q.quote_id||!q.terms_version||!q.terms_digest||!q.privacy_version||!q.privacy_digest||!Number.isFinite(expiry)||expiry<=Date.now())throw Error('The quote could not be verified. Close and reopen purchasing for a fresh quote.');
  a.quote=q;dialog.querySelector('[data-summary]').textContent=`Subtotal ${money(q.subtotal_cents)} · Sales tax ${money(q.tax_cents)} · Total ${money(q.total_cents)}. One-time purchase.`;
  dialog.querySelector('[data-consent]').disabled=false;
  say('Review the total and policies before continuing. Any provider fee must be disclosed in secure payment before you submit.');
  setTimeout(()=>{if(active===a&&a.quote===q&&!a.started){sync();say('This quote expired. Close and reopen purchasing to review a fresh total.');}},Math.max(0,expiry-Date.now()));
 }catch(e){if(a===active&&revision===a.revision)say(e.message);}
}
async function open({family_id}={}){
 if(opening) return {available:false};
 if(dialog?.open){if(active?.family_id===family_id)return {available:true,family_id};throw Error('Close the current Family popup before opening another.');}
 if(active?.started){if(active.family_id!==family_id)throw Error('Finish verifying the current Family payment before starting another.');dialog.showModal();return {available:true,pending:true,family_id};}
 opening=true;
 try{
  const data=await context(family_id);
  if(data.pending_purchase)throw Error('An existing Family payment needs verification. Contact support before paying again.');
  if(!data.checkout_enabled)throw Error(data.disabled_reason||'Purchases are paused.');
  ensureDialog();
  active={family_id,code:data.offers[0].offer_code,revision:0,quote:null,busy:false,started:false,nonce:crypto.randomUUID()};
  dialog.querySelector('h2').textContent=label(active.code);
  dialog.querySelector('[data-description]').textContent=active.code==='FAMILY_LICENSE'?'Full Family license with capacity for three drivers.':'Add capacity for one more driver to this Family.';
  const state=dialog.querySelector('[data-state]');state.replaceChildren(new Option('Choose your billing state',''));state.disabled=false;
  for(const item of data.billing_states||[])state.add(new Option(item.code==='MI'?'Michigan':item.code,item.code));
  state.add(new Option('Another state or country','UNSUPPORTED'));
  dialog.querySelector('[data-consent]').disabled=true;dialog.querySelector('[data-consent]').checked=false;
  dialog.querySelector('[data-summary]').textContent='';dialog.querySelector('[data-recheck]').hidden=true;sync();
  say('Choose your billing state to check availability and tax.');dialog.showModal();
  return {available:true,family_id,offer_code:active.code};
 }finally{opening=false;}
}
async function launch(a){
 sync();if(a!==active||dialog.querySelector('[data-pay]').disabled)return;
 a.busy=true;a.started=true;sync();dialog.querySelector('[data-state]').disabled=true;dialog.querySelector('[data-consent]').disabled=true;
 // After a start request, an uncertain response must not create a second purchase.
 try{
  if(typeof window.appendHelcimPayIframe!=='function')throw Error('Secure payment could not load. No session was requested.');
  const q=a.quote,data=await invoke('commercial-checkout','start',{family_id:a.family_id,quote_id:q.quote_id,offer_code:a.code,client_idempotency_key:a.nonce,accepted_terms_version:q.terms_version,accept_terms:true});
  if(!data.purchase_id||!data.checkout_token)throw Error('Payment session response is incomplete. Contact support before retrying.');
  a.purchase_id=String(data.purchase_id);a.token=String(data.checkout_token);
  say('Complete secure payment. Drive Venture will independently verify payment before updating your Family.');
  dialog.close();window.appendHelcimPayIframe(a.token);void poll(a);
 }catch(e){say(e.message+' Do not retry an uncertain payment; contact support.');}
 finally{a.busy=false;dialog.querySelector('[data-recheck]').hidden=!a.purchase_id;}
}
async function poll(a){
 if(!a?.purchase_id||a.polling||a.done)return;a.polling=true;
 try{
  for(let i=0;i<20;i++){
   try{
    const result=await invoke('commercial-checkout','status',{purchase_id:a.purchase_id,family_id:a.family_id});
    if(result.status==='FULFILLED'){
     a.done=true;a.token=null;a.started=false;
     if(active===a){dialog.close();active=null;}
     window.dispatchEvent(new CustomEvent('dv:commercial-fulfilled',{detail:{family_id:a.family_id,purchase_id:a.purchase_id}}));
     const panel=document.getElementById('dv-commercial-purchase');if(panel)panel.textContent='Payment verified. Refreshing your Family…';
     await init();return;
    }
    if(['DECLINED','ABANDONED','RECONCILIATION_REQUIRED'].includes(result.status)){say('Payment not confirmed. Contact support before retrying.');a.done=true;if(!dialog.open)dialog.showModal();return;}
   }catch(_){/* A network failure is not a failed payment. Keep the same purchase. */}
   await new Promise(resolve=>setTimeout(resolve,2000));
  }
  say('Payment verification remains pending. Do not pay again. Check status here or contact support.');if(!dialog.open)dialog.showModal();
 }finally{a.polling=false;}
}
window.addEventListener('message',e=>{
 const a=active;if(!a?.token||e.data?.eventName!==`helcim-pay-js-${a.token}`)return;
 if(['SUCCESS','ABORTED','HIDE'].includes(e.data.eventStatus)){say('Checking payment status with the server…');if(!dialog.open)dialog.showModal();void poll(a);}
});
async function mount(element,{family_id}={}){
 const generation=(mountGenerations.get(element)||0)+1;mountGenerations.set(element,generation);element.replaceChildren();element.hidden=false;
 try{
  const data=await context(family_id);if(generation!==mountGenerations.get(element))return;
  const button=document.createElement('button');button.className='button primary';button.type='button';const offer=data.offers[0];if(offer.currency!=='USD'||!Number.isSafeInteger(offer.unit_cents)||offer.unit_cents<=0)throw Error('Purchase price is unavailable.');button.textContent=(offer.offer_code==='ADDITIONAL_DRIVER_CAPACITY'?'Upgrade to add driver':label(offer.offer_code))+' — '+money(offer.unit_cents);button.disabled=!data.checkout_enabled||!!data.pending_purchase;
  const explanation=document.createElement('p');explanation.className='family-explainer';explanation.textContent=data.pending_purchase?'An existing Family payment needs verification. Contact support before paying again.':data.checkout_enabled?'One-time purchase for this Family. Review the total before payment.':data.disabled_reason||'Purchases are paused.';
  button.onclick=()=>void open({family_id}).catch(e=>{explanation.textContent=e.message;});element.append(button,explanation);
 }catch(e){if(generation===mountGenerations.get(element))element.textContent=e.message;}
}
async function init(){
 const host=document.getElementById('dv-commercial-purchase');if(!host||new URLSearchParams(location.search).has('invite'))return;
 try{
  const result=await invoke('family-api','overview');const overview=result.overview||result;
  const contexts=(overview.family_contexts||[]).filter(c=>c.is_license_holder===true);
  const addDriver=document.querySelector('#owned-family-actions .family-driver-capacity-hint .family-action');
  if(contexts.length!==1){
   host.hidden=false;host.textContent=contexts.length?'Purchasing is temporarily unavailable: this account is assigned as License Holder for multiple Families. Contact Drive Venture support to correct the account.':'Only the Family License Holder can purchase.';
   return;
  }
  const c=contexts[0];
  // Keep the ordinary Add Driver control when capacity remains. On reaching
  // capacity replace it with the one Family-scoped purchase action, not
  // an independent checkout section.
  const full=Number.isFinite(Number(c.driver_count))&&Number.isFinite(Number(c.driver_capacity))&&Number(c.driver_count)>=Number(c.driver_capacity);
  if(c.commercial_state==='PAID'&&!full){host.hidden=true;host.replaceChildren();return;}
  if(addDriver)addDriver.hidden=true;
  await mount(host,{family_id:String(c.family_id)});
 }catch(_){host.hidden=false;host.textContent='Purchasing is unavailable. Family management remains available.';}
}
window.DVCommercialPurchase=Object.freeze({init,mount,open});
window.addEventListener('dv:family-rendered',()=>void init());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init());else void init();
})();
