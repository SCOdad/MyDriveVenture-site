// BKLG-0208: browser UI only. The backend is the sole purchase, tax and
// entitlement authority. Until the corresponding endpoint is ready and the
// server's purchase controls are enabled, this page fails closed.
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const ui={
    status:$('checkout-status'),signin:$('checkout-signin'),app:$('checkout-app'),
    family:$('checkout-family'),familySummary:$('checkout-family-summary'),
    offers:$('checkout-offers'),state:$('checkout-state'),
    quoteButton:$('checkout-quote'),product:$('checkout-product'),
    subtotal:$('checkout-subtotal'),tax:$('checkout-tax'),total:$('checkout-total'),
    quoteExpires:$('checkout-quote-expires'),consent:$('checkout-consent'),
    pay:$('checkout-pay'),devPanel:$('checkout-dev-diagnostics'),
    devConnect:$('checkout-dev-connect'),devInit:$('checkout-dev-init'),
    devResult:$('checkout-dev-result'),
  };
  const cfg=window.DV_APP_CONFIG||{};
  const state={
    client:null,session:null,contexts:[],catalog:null,quote:null,
    token:null,purchaseId:null,purchaseKey:null,busy:false,
  };
  const USD=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
  const usd=cents=>USD.format(cents/100);
  const errorMessage=e=>String(e?.message||e||'Unable to continue.').slice(0,230);
  function notice(text,kind=''){
    ui.status.textContent=text;
    ui.status.className='checkout-alert'+(kind?' '+kind:'');
  }
  function resetQuote(){
    state.quote=null;state.token=null;state.purchaseId=null;state.purchaseKey=null;
    ui.product.textContent='—';ui.subtotal.textContent='—';
    ui.tax.textContent='—';ui.total.textContent='—';
    ui.quoteExpires.textContent='';
    ui.consent.checked=false;ui.consent.disabled=true;ui.pay.disabled=true;
    updateQuoteButton();
  }
  function selectedFamily(){return state.contexts.find(c=>String(c.family_id)===ui.family.value)||null;}
  function selectedOffer(){return ui.offers.querySelector('input[name="offer"]:checked')?.value||null;}
  function allowedByContext(code,context){
    if(!context?.is_license_holder)return false;
    const paid=context.commercial_state==='PAID';
    return code==='FAMILY_LICENSE'?!paid:code==='ADDITIONAL_DRIVER_CAPACITY'?paid:false;
  }
  function updateQuoteButton(){
    ui.quoteButton.disabled=state.busy||!selectedFamily()||!selectedOffer()||
      !/^[A-Z]{2}$/.test(ui.state.value.trim().toUpperCase())||
      !state.catalog?.checkout_enabled;
  }
  async function api(action,payload={}){
    if(!state.session?.access_token||!cfg.supabaseUrl||!cfg.publishableKey)
      throw new Error('Sign in again to continue.');
    const res=await fetch(`${cfg.supabaseUrl}/functions/v1/commercial-checkout`,{
      method:'POST',
      headers:{'content-type':'application/json',authorization:`Bearer ${state.session.access_token}`,apikey:cfg.publishableKey},
      body:JSON.stringify({action,...payload}),
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.ok!==true)throw new Error(data.error||'Checkout service is not available.');
    return data;
  }
  async function familyOverview(){
    const res=await fetch(`${cfg.supabaseUrl}/functions/v1/family-api`,{
      method:'POST',
      headers:{'content-type':'application/json',authorization:`Bearer ${state.session.access_token}`,apikey:cfg.publishableKey},
      body:JSON.stringify({action:'overview'}),
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.ok!==true)throw new Error('Unable to load your Family access.');
    return data;
  }
  async function testDeveloperConnection(){
    if(!state.session?.access_token||window.DV_ENVIRONMENT_CONFIG?.name!=='dev')return;
    ui.devConnect.disabled=true;
    ui.devResult.textContent='Checking isolated Helcim developer API connectivity (no payment)…';
    try{
      const res=await fetch(`${cfg.supabaseUrl}/functions/v1/commercial-operator`,{
        method:'POST',
        headers:{'content-type':'application/json',
          authorization:`Bearer ${state.session.access_token}`,apikey:cfg.publishableKey},
        body:JSON.stringify({action:'developer_connection_test'}),
      });
      const result=await res.json().catch(()=>({}));
      if(res.status===403){
        ui.devResult.textContent='This check requires platform operator access in DEV.';
      }else if(!res.ok||result.ok!==true){
        ui.devResult.textContent='Connection diagnostic unavailable. No payment was started.';
      }else if(result.connected===true&&result.mode==='DEVELOPER_TEST'){
        ui.devResult.textContent='PASS: Helcim developer API connected. No payment was started.';
      }else{
        ui.devResult.textContent=`Not connected. Provider HTTP status: ${Number(result.provider_http_status)||'unavailable'}. No payment was started.`;
      }
    }catch(_){
      ui.devResult.textContent='Unable to reach DEV connection diagnostic. No payment was started.';
    }finally{ui.devConnect.disabled=false;}
  }
  function renderFamilies(){
    ui.family.replaceChildren(new Option('Choose the Family you administer',''));
    for(const c of state.contexts){
      if(!c.is_license_holder)continue;
      const label=`${c.license_holder_name||'Your'} Family · ${c.commercial_state||'—'} · ${c.driver_count||0} of ${c.driver_capacity||0} drivers`;
      ui.family.add(new Option(label,String(c.family_id)));
    }
    if(ui.family.options.length===2)ui.family.selectedIndex=1;
    renderOffers();
  }
  function renderOffers(){
    resetQuote();
    ui.offers.replaceChildren();
    const family=selectedFamily();
    if(!family){ui.familySummary.textContent='Select the Family that will own the purchase.';return;}
    ui.familySummary.textContent=`Only this Family receives purchased capacity. License Holder: ${family.license_holder_name||'your account'}.`;
    const offers=(state.catalog?.offers||[]).filter(o=>allowedByContext(o.offer_code,family));
    if(!offers.length){
      const p=document.createElement('p');
      p.className='checkout-helper';
      p.textContent=family.commercial_state==='PAID'
        ?'Your Family already has paid capability. Only additional-seat purchases are applicable.'
        :'No checkout offers are available for this Family at present.';
      ui.offers.append(p);return;
    }
    for(const offer of offers){
      // Product display names and prices arrive exclusively from server config.
      const label=document.createElement('label');label.className='checkout-offer';
      const input=document.createElement('input');input.type='radio';input.name='offer';
      input.value=String(offer.offer_code);input.disabled=!state.catalog.checkout_enabled;
      const body=document.createElement('span');body.className='offer-label';
      const title=document.createElement('strong');title.textContent=String(offer.display_name||offer.offer_code);
      const help=document.createElement('small');
      help.textContent=`One-time charge: ${Number.isSafeInteger(offer.unit_cents)?usd(offer.unit_cents):'price unavailable'} before applicable tax`;
      body.append(title,help);label.append(input,body);ui.offers.append(label);
    }
  }
  async function calculateQuote(){
    if(!selectedFamily()||!selectedOffer())return;
    state.busy=true;resetQuote();updateQuoteButton();
    notice('Calculating your server-verified total…');
    try{
      const data=await api('quote',{
        family_id:ui.family.value,offer_code:selectedOffer(),
        billing_country:'US',billing_state:ui.state.value.trim().toUpperCase(),
      });
      const q=data.quote||{};
      if(!q.quote_id||!q.currency||q.currency!=='USD'||
         !Number.isSafeInteger(q.subtotal_cents)||!Number.isSafeInteger(q.tax_cents)||
         !Number.isSafeInteger(q.total_cents)||
         q.subtotal_cents+q.tax_cents!==q.total_cents||
         !q.terms_version||!q.terms_digest||!q.privacy_version){
        throw new Error('The checkout quote is incomplete. No payment was started.');
      }
      state.quote=q;
      ui.product.textContent=String(q.display_name||selectedOffer());
      ui.subtotal.textContent=usd(q.subtotal_cents);
      ui.tax.textContent=usd(q.tax_cents);
      ui.total.textContent=usd(q.total_cents);
      ui.quoteExpires.textContent=q.expires_at?`Quote expires: ${new Date(q.expires_at).toLocaleString()}`:'';
      ui.consent.disabled=false;
      notice('Review your total and the current Terms, then agree before continuing.');
    }catch(e){notice(errorMessage(e),'error');}
    finally{state.busy=false;updateQuoteButton();}
  }
  function consentReady(){
    const q=state.quote;
    return Boolean(q&&ui.consent.checked&&!ui.consent.disabled&&
      selectedFamily()&&selectedOffer()&&
      q.family_id===ui.family.value&&q.offer_code===selectedOffer()&&
      q.billing_state===ui.state.value.trim().toUpperCase()&&
      new Date(q.expires_at).getTime()>Date.now()&&
      state.catalog?.checkout_enabled&&!state.busy);
  }
  function syncPay(){ui.pay.disabled=!consentReady();}
  async function refreshFulfillmentStatus(){
    if(!state.purchaseId)return;
    try{
      const data=await api('status',{purchase_id:state.purchaseId,family_id:ui.family.value});
      if(data.status==='FULFILLED'){
        notice('Payment verified and your Family entitlement updated. Thank you!','success');
        ui.pay.disabled=true;return true;
      }
      if(['DECLINED','ABANDONED','RECONCILIATION_REQUIRED'].includes(data.status)){
        notice('Your payment has not been confirmed. Please use Feedback for billing help; do not repeatedly pay.','error');
        ui.pay.disabled=true;return true;
      }
    }catch(_){/* A temporary status error cannot turn a callback into success. */}
    return false;
  }
  async function pollStatus(){
    for(let i=0;i<20;i++){
      if(await refreshFulfillmentStatus())return;
      await new Promise(r=>setTimeout(r,2000));
    }
    notice('Payment verification is still pending. Your Family rights will update only after verification. Do not pay again; check back or contact Billing through Feedback.');
  }
  async function openPayment(){
    if(!consentReady())return;
    state.busy=true;ui.pay.disabled=true;ui.quoteButton.disabled=true;
    notice('Preparing your Helcim secure payment window…');
    try{
      if(!state.purchaseKey)state.purchaseKey=crypto.randomUUID();
      const data=await api('start',{
        family_id:ui.family.value,quote_id:state.quote.quote_id,
        offer_code:selectedOffer(),client_idempotency_key:state.purchaseKey,
        accepted_terms_version:state.quote.terms_version,
        accept_terms:ui.consent.checked,
      });
      if(!data.purchase_id||!data.checkout_token||typeof window.appendHelcimPayIframe!=='function'){
        throw new Error('Secure payment setup is unavailable. No new charge was initiated by this page.');
      }
      state.purchaseId=String(data.purchase_id);
      state.token=String(data.checkout_token);
      notice('Complete payment in Helcim. Your Family entitlement will update only after server verification.');
      window.appendHelcimPayIframe(state.token);
    }catch(e){notice(errorMessage(e),'error');}
    finally{state.busy=false;updateQuoteButton();syncPay();}
  }
  window.addEventListener('message',e=>{
    // The Helcim iframe event is *never* an entitlement or payment authority.
    if(!state.token||!state.purchaseId||!e.data||
       e.data.eventName!==`helcim-pay-js-${state.token}`)return;
    if(e.data.eventStatus==='SUCCESS'){
      notice('Helcim reported a payment. Checking the authoritative purchase record…');
      ui.pay.disabled=true;void pollStatus();
    }else if(e.data.eventStatus==='ABORTED'){
      notice('Payment not completed. No entitlement has been granted. Check Billing before retrying.','error');
      void refreshFulfillmentStatus();
    }else if(e.data.eventStatus==='HIDE'){
      void refreshFulfillmentStatus();
    }
  });
  async function testDeveloperInitialize(){
    if(!state.session?.access_token||window.DV_ENVIRONMENT_CONFIG?.name!=='dev')return;
    ui.devInit.disabled=true;
    ui.devResult.textContent='Initializing isolated HelcimPay.js developer session (no card, no charge)…';
    try{
      const res=await fetch(`${cfg.supabaseUrl}/functions/v1/commercial-operator`,{
        method:'POST',headers:{'content-type':'application/json',
          authorization:`Bearer ${state.session.access_token}`,apikey:cfg.publishableKey},
        body:JSON.stringify({action:'developer_initialize_test'}),
      });
      const data=await res.json().catch(()=>({}));
      if(res.status===403){
        ui.devResult.textContent='Only a DEV platform operator may run the initialization test.';
      }else if(!res.ok||data.ok!==true){
        ui.devResult.textContent='DEV initialization test unavailable. No payment was started.';
      }else if(data.initialized===true&&data.mode==='DEVELOPER_TEST'&&data.payment_initiated===false){
        ui.devResult.textContent='PASS: HelcimPay.js developer checkout session initialized. No payment was started.';
      }else{
        ui.devResult.textContent=`Initialization did not pass. Provider HTTP status: ${Number(data.provider_http_status)||'unavailable'}. No payment was started.`;
      }
    }catch(_){
      ui.devResult.textContent='DEV initialization diagnostic could not be reached. No payment was started.';
    }finally{ui.devInit.disabled=false;}
  }
  ui.devConnect.addEventListener('click',()=>void testDeveloperConnection());
  ui.devInit.addEventListener('click',()=>void testDeveloperInitialize());
  ui.family.addEventListener('change',renderOffers);
  ui.offers.addEventListener('change',()=>{resetQuote();});
  ui.state.addEventListener('input',()=>{ui.state.value=ui.state.value.toUpperCase();resetQuote();});
  ui.quoteButton.addEventListener('click',()=>void calculateQuote());
  ui.consent.addEventListener('change',syncPay);
  ui.pay.addEventListener('click',()=>void openPayment());
  (async()=>{
    if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey)
      throw new Error('Secure Family sign-in is not configured.');
    state.client=window.DV_SUPABASE_CLIENT||
      window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,
        {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const result=await state.client.auth.getSession();state.session=result.data?.session||null;
    if(!state.session){ui.signin.hidden=false;notice('Please sign in to continue.');return;}
    if(window.DV_ENVIRONMENT_CONFIG?.name==='dev')ui.devPanel.hidden=false;
    const families=await familyOverview();
    state.contexts=(families.overview?.family_contexts||families.family_contexts||[])
      .filter(c=>c.is_license_holder);
    ui.app.hidden=false;
    if(!state.contexts.length){
      notice('No Family for which you are the License Holder was found. Checkout is unavailable.','error');return;
    }
    // If missing or disabled, the catalog cannot enable any payable control.
    try{
      state.catalog=await api('catalog');
    }catch(_){
      state.catalog={checkout_enabled:false,offers:[]};
      notice('Online checkout is being prepared. No payment can be initiated yet.');
      renderFamilies();return;
    }
    renderFamilies();
    notice(state.catalog.checkout_enabled
      ?'Select your Family and product to request a current quote.'
      :'New purchases are currently disabled. Your existing Family access remains available.');
  })().catch(e=>{notice(errorMessage(e),'error');ui.pay.disabled=true;});
})();
