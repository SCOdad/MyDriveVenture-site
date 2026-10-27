// Shared Family-scoped purchasing. Server quotes, authority and fulfillment are definitive.
(()=>{
'use strict';
const cfg=window.DV_APP_CONFIG||{};
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
let client,dialog,active=null,opening=false,mountGenerations=new WeakMap();
const expectedOffer=s=>['FREE','FREE_EXHAUSTED'].includes(s)?'FAMILY_LICENSE':s==='PAID'?'ADDITIONAL_DRIVER_CAPACITY':null;
const label=code=>code==='FAMILY_LICENSE'?'Buy Full License':'Add Driver Capacity';
const say=s=>{if(dialog)dialog.querySelector('[data-notice]').textContent=s;};
function renderSummary(code,subtotal,tax,total,preview=false){
 const el=dialog.querySelector('[data-summary]');el.replaceChildren();
 const row=(title,amount,cls='',detail='')=>{const line=document.createElement('div');line.className='commercial-price-row '+cls;const left=document.createElement('span');left.textContent=title;if(detail){const small=document.createElement('small');small.textContent=detail;left.append(small);}const right=document.createElement('strong');right.textContent=money(amount);line.append(left,right);el.append(line);};
 row(code==='FAMILY_LICENSE'?'Full Family License':'Additional Driver Capacity',subtotal,'',''+(code==='FAMILY_LICENSE'?'Up to three drivers':'One additional driver'));
 if(preview){const note=document.createElement('p');note.className='commercial-preview-note';note.textContent='DEV preview · base price only; tax and total not quoted.';el.append(note);return;}
 row('Sales Tax',tax,'commercial-tax');row('TOTAL',total,'commercial-total');
}
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
 if(!document.querySelector('link[data-commercial-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/css/commercial-purchase.css?v=hub3';link.dataset.commercialStyle='';document.head.append(link);}
 dialog=document.createElement('dialog');dialog.className='commercial-dialog';dialog.setAttribute('aria-labelledby','dv-purchase-title');
 dialog.innerHTML='<h2 id="dv-purchase-title"></h2><p data-description></p><div class="commercial-summary" data-summary aria-live="polite"></div><label class="commercial-consent"><input data-consent type="checkbox" disabled> <span>I agree to the <a href="/terms/" target="_blank" rel="noopener">Terms</a> and acknowledge the <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</span></label><p data-notice role="status" aria-live="polite"></p><div class="commercial-actions"><button class="button secondary" data-close type="button">Cancel</button><button class="button primary" data-pay type="button" disabled>Continue to secure payment</button></div><button data-recheck type="button" hidden>Check payment status</button>';
 document.body.append(dialog);
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{if(active&&!active.started){active=null;} });
 dialog.querySelector('[data-consent]').onchange=()=>sync();
 dialog.querySelector('[data-pay]').onclick=()=>void launch(active);
 dialog.querySelector('[data-recheck]').onclick=()=>void checkStatus(active);
}
// Read-only, DEV-only UX preview. Does not request quotes, create purchase intents,
// initialize Helcim, or authorize payment; never represents tax as a live quote.
function openReadOnlyPreview(data){
 if(window.DV_ENVIRONMENT_CONFIG?.name!=='dev')return;
 ensureDialog();
 active=null;
 dialog.querySelector('h2').textContent=data.offers[0].offer_code==='FAMILY_LICENSE'?'Full Family License':'+1 Driver';
 dialog.querySelector('[data-description]').textContent=data.offers[0].offer_code==='FAMILY_LICENSE'?'Includes three active driver slots. One-time purchase.':'One additional active driver slot. One-time purchase.';
 renderSummary(data.offers[0].offer_code,data.offers[0].unit_cents,0,0,true);
 dialog.querySelector('[data-consent]').checked=false;dialog.querySelector('[data-consent]').disabled=true;
 dialog.querySelector('[data-pay]').disabled=true;
 dialog.querySelector('[data-recheck]').hidden=true;
 say('DEV visual preview only. Purchasing remains disabled. Consent and payment cannot be submitted.');
 dialog.showModal();
}
function sync(){
 const a=active,q=a?.quote;
 dialog.querySelector('[data-pay]').disabled=!(q&&Date.parse(q.expires_at)>Date.now()&&dialog.querySelector('[data-consent]').checked&&!a.busy&&!a.started);
}
async function getQuote(a){
 if(!a||a!==active||a.started)return;
 const revision=++a.revision;
 a.quote=null;dialog.querySelector('[data-consent]').checked=false;dialog.querySelector('[data-consent]').disabled=true;dialog.querySelector('[data-summary]').textContent='';sync();
 say('Checking current price and tax…');
 try{
  const data=await invoke('commercial-checkout','quote',{family_id:a.family_id,offer_code:a.code,billing_country:'US'});
  if(a!==active||revision!==a.revision)return;
  const q=data.quote,expiry=Date.parse(q?.expires_at);
  if(!q||q.family_id!==a.family_id||q.offer_code!==a.code||q.currency!=='USD'||!Number.isSafeInteger(q.subtotal_cents)||q.subtotal_cents<0||!Number.isSafeInteger(q.tax_cents)||q.tax_cents<0||!Number.isSafeInteger(q.total_cents)||q.total_cents!==q.subtotal_cents+q.tax_cents||!q.quote_id||!q.terms_version||!q.terms_digest||!q.privacy_version||!q.privacy_digest||!Number.isFinite(expiry)||expiry<=Date.now())throw Error('The quote could not be verified. Close and reopen purchasing for a fresh quote.');
  a.quote=q;renderSummary(a.code,q.subtotal_cents,q.tax_cents,q.total_cents);
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
  dialog.querySelector('h2').textContent=active.code==='FAMILY_LICENSE'?'Full Family License':'+1 Driver';
  dialog.querySelector('[data-description]').textContent=active.code==='FAMILY_LICENSE'?'Full Family license with capacity for three drivers.':'Add capacity for one more driver to this Family.';
  dialog.querySelector('[data-consent]').disabled=true;dialog.querySelector('[data-consent]').checked=false;
  dialog.querySelector('[data-summary]').textContent='';dialog.querySelector('[data-recheck]').hidden=true;sync();
  say('Confirm the product, final price and policies.');dialog.showModal();void getQuote(active);
  return {available:true,family_id,offer_code:active.code};
 }finally{opening=false;}
}
async function launch(a){
 sync();if(a!==active||dialog.querySelector('[data-pay]').disabled)return;
 a.busy=true;a.started=true;sync();dialog.querySelector('[data-consent]').disabled=true;
 // After a start request, an uncertain response must not create a second purchase.
 try{
  if(typeof window.appendHelcimPayIframe!=='function')throw Error('Secure payment could not load. No session was requested.');
  const q=a.quote,data=await invoke('commercial-checkout','start',{family_id:a.family_id,quote_id:q.quote_id,offer_code:a.code,client_idempotency_key:a.nonce,accepted_terms_version:q.terms_version,accept_terms:true});
  if(!data.purchase_id||!data.checkout_token)throw Error('Payment session response is incomplete. Contact support before retrying.');
  a.purchase_id=String(data.purchase_id);a.token=String(data.checkout_token);
  say('Complete secure payment. Drive Venture will independently verify payment before updating your Family.');
  dialog.close();window.appendHelcimPayIframe(a.token);
  // Poll the authoritative server while Helcim stays in control of its hosted form.
  // Polling must never reopen our dialog over a validation error or decline.
  void poll(a);
 }catch(e){say(e.message+' Do not retry an uncertain payment; contact support.');}
 finally{a.busy=false;dialog.querySelector('[data-recheck]').hidden=!a.purchase_id;}
}
// Refresh the authoritative Family view before remounting checkout controls.
// A separate concurrent checkout refresh can otherwise briefly leave Add Driver disabled.
async function refreshFamilyAfterFulfillment(a){
 const panel=document.getElementById('dv-commercial-purchase');
 if(panel)panel.textContent='Payment verified. Refreshing your Family…';
 let refreshed=false;
 try{
  if(typeof window.DVFamily?.refresh==='function'){
   await window.DVFamily.refresh();
   refreshed=true;
  }
 }catch(e){console.warn('Family entitlement refresh pending',e);}
 window.dispatchEvent(new CustomEvent('dv:commercial-fulfilled',{detail:{family_id:a.family_id,purchase_id:a.purchase_id,refreshed}}));
 if(!refreshed&&panel)panel.textContent='Payment verified. Refresh this page to see your updated Family access.';
 await init();
}
async function checkStatus(a){
 if(!a?.purchase_id){say('No payment session is available to check.');return;}
 const button=dialog.querySelector('[data-recheck]');
 if(button.disabled)return;
 button.disabled=true;button.textContent='Checking…';say('Checking payment status with Drive Venture…');
 try{
  const result=await invoke('commercial-checkout','recover-abandoned',{purchase_id:a.purchase_id,family_id:a.family_id});
  if(result.status==='FULFILLED'){say('Payment verified. Refreshing your Family…');a.done=true;a.started=false;a.token=null;dialog.close();active=null;await refreshFamilyAfterFulfillment(a);}
  else if(result.status==='ABANDONED'){say('The expired checkout was safely closed after Helcim verification. Close this popup to start again.');a.started=false;a.done=true;a.token=null;button.hidden=true;dialog.querySelector('[data-pay]').disabled=true;await init();}
  else if(result.status==='DECLINED'){say('Payment was declined. Contact support before retrying.');a.done=true;}
  else if(result.status==='RECONCILIATION_REQUIRED'){say('Payment requires manual verification. Do not pay again; contact support.');}
  else if(result.recovery==='PROVIDER_ACTIVITY_REQUIRES_REVIEW')say('Helcim shows a transaction attempt for this checkout. No new payment is permitted until it is reviewed. Contact support.');
  else if(result.recovery==='SESSION_STILL_PROTECTED'){const when=new Date(result.safe_after);say('Checkout is still protected. Check again after '+(Number.isFinite(when.getTime())?when.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'the payment session expires')+'. Do not pay again.');}
  else say('Payment is not yet confirmed. The checkout remains protected. Do not start another payment.');
 }catch(e){say('Payment status could not be checked: '+e.message+' Do not pay again until verified.');}
 finally{button.disabled=false;button.textContent='Check payment status';}
}
async function poll(a){
 if(!a?.purchase_id||a.polling||a.done)return;a.polling=true;
 try{
  for(let i=0;i<20;i++){
   if(a.done)return;
   try{
    const result=await invoke('commercial-checkout','status',{purchase_id:a.purchase_id,family_id:a.family_id});
    if(a.done)return;
    if(result.status==='FULFILLED'){
     a.done=true;a.token=null;a.started=false;
     if(active===a){dialog.close();active=null;}
     await refreshFamilyAfterFulfillment(a);return;
    }
    if(['DECLINED','ABANDONED','RECONCILIATION_REQUIRED'].includes(result.status)){
     a.done=true;
     const panel=document.getElementById('dv-commercial-purchase');
     if(panel)panel.textContent='Payment not confirmed. Contact support before retrying.';
     // Do not display our dialog on top of Helcim's error/validation screen.
     return;
    }
   }catch(_){/* A network failure is not a failed payment. Keep the same purchase. */}
   await new Promise(resolve=>setTimeout(resolve,2000));
  }
  // The secure Helcim iframe may still be accepting payment; polling timeout is NOT an exit event.
  // Do not obscure an active hosted payment form merely because status is still pending.
  if(dialog.open)say('Payment verification remains pending. Do not pay again. Check status here or contact support.');
 }finally{a.polling=false;}
}
window.addEventListener('message',e=>{
 const a=active;if(!a?.token||e.data?.eventName!==`helcim-pay-js-${a.token}`)return;
 // Helcim can emit ABORTED while displaying its own recoverable errors.
 // HIDE is a user dismissal, not payment evidence. Neither may reopen our dialog.
 if(e.data.eventStatus==='SUCCESS'){
  // Browser success is only a hint: fulfillment still requires server verification.
  void poll(a);
 }
});
async function mount(element,{family_id,driver_count}={}){
 const generation=(mountGenerations.get(element)||0)+1;mountGenerations.set(element,generation);element.replaceChildren();element.hidden=false;
 try{
  const data=await context(family_id);if(generation!==mountGenerations.get(element))return;
  const button=document.createElement('button');button.className='button primary';button.type='button';const offer=data.offers[0];if(offer.currency!=='USD'||!Number.isSafeInteger(offer.unit_cents)||offer.unit_cents<=0)throw Error('Purchase price is unavailable.');button.textContent=offer.offer_code==='ADDITIONAL_DRIVER_CAPACITY'||(offer.offer_code==='FAMILY_LICENSE'&&Number(driver_count)>0)?'Upgrade to add driver':label(offer.offer_code);button.disabled=(!data.checkout_enabled && window.DV_ENVIRONMENT_CONFIG?.name!=='dev')||!!data.pending_purchase;
  const explanation=document.createElement('p');explanation.className='family-explainer';explanation.textContent=data.pending_purchase?'An existing Family payment needs verification. Contact support before paying again.':data.checkout_enabled?'One-time purchase for this Family. Review the total before payment.':window.DV_ENVIRONMENT_CONFIG?.name==='dev'?'DEV preview only — purchases paused.':'Purchases temporarily paused.';
  button.onclick=()=>{if(!data.checkout_enabled && window.DV_ENVIRONMENT_CONFIG?.name==='dev'){openReadOnlyPreview(data);return;}void open({family_id}).catch(e=>{explanation.textContent=e.message;});};element.append(button,explanation);
  if(data.pending_purchase?.id && window.DV_ENVIRONMENT_CONFIG?.name==='dev'){
    const check=document.createElement('button');check.type='button';check.className='button secondary';check.textContent='Check previous checkout';check.style.marginTop='0.75rem';
    check.onclick=async()=>{
      check.disabled=true;check.textContent='Checking…';explanation.textContent='Checking the previous checkout with Drive Venture and Helcim…';
      try{
        const result=await invoke('commercial-checkout','recover-abandoned',{family_id,purchase_id:data.pending_purchase.id});
        if(result.status==='ABANDONED'){explanation.textContent='Expired test checkout safely closed. Refreshing Family access…';await init();return;}
        if(result.status==='FULFILLED'){explanation.textContent='Payment verified. Refreshing Family access…';await init();return;}
        if(result.recovery==='PROVIDER_ACTIVITY_REQUIRES_REVIEW')explanation.textContent='Helcim found payment activity. Checkout remains locked for review; do not pay again.';
        else if(result.recovery==='SESSION_STILL_PROTECTED')explanation.textContent='This payment session is still protected. Try checking again after its expiration window.';
        else explanation.textContent='Payment remains unresolved ('+result.status+'). Contact support before retrying.';
      }catch(e){explanation.textContent='Verification unavailable: '+e.message+' Checkout remains locked.';}
      finally{check.disabled=false;check.textContent='Check previous checkout';}
    };element.append(check);
  }
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
  if(Number(c.driver_count)===0){if(addDriver?.parentElement)addDriver.parentElement.style.display='';host.hidden=true;host.replaceChildren();return;}
  if(c.commercial_state==='PAID'&&!full){if(addDriver?.parentElement)addDriver.parentElement.style.display='';host.hidden=true;host.replaceChildren();return;}
  if(addDriver?.parentElement)addDriver.parentElement.style.display='none';
  await mount(host,{family_id:String(c.family_id),driver_count:Number(c.driver_count)});
 }catch(_){host.hidden=false;host.textContent='Purchasing is unavailable. Family management remains available.';}
}
window.DVCommercialPurchase=Object.freeze({init,mount,open});
window.addEventListener('dv:family-rendered',()=>void init());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init());else void init();
})();
