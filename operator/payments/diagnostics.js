(async()=>{
'use strict';
const output=document.getElementById('payment-result'),controls=document.getElementById('payment-checks'),cfg=window.DV_APP_CONFIG||{};
if(window.DV_ENVIRONMENT_CONFIG?.name!=='dev'){output.textContent='Available only in DEV.';return;}
const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey);
if(!(await client.auth.getSession()).data?.session){output.textContent='Sign in with your registered DEV operator account.';return;}
controls.hidden=false;output.textContent='Choose a non-charging diagnostic. The server verifies operator authorization on every request.';
controls.querySelectorAll('button').forEach(button=>button.onclick=async()=>{
 button.disabled=true;output.textContent='Checking…';
 try{
  const session=(await client.auth.getSession()).data?.session;if(!session)throw Error('Sign in again.');
  const response=await fetch(cfg.supabaseUrl+'/functions/v1/commercial-operator',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+session.access_token,apikey:cfg.publishableKey},body:JSON.stringify({action:button.dataset.action,...(button.dataset.variant?{variant:button.dataset.variant}:{})})});
  const result=await response.json();if(!response.ok||!result.ok)throw Error('Diagnostic unavailable or operator access denied.');
  output.textContent=JSON.stringify({connected:result.connected,initialized:result.initialized,payment_initiated:result.payment_initiated,provider_http_status:result.provider_http_status,diagnostic:result.diagnostic});
 }catch(e){output.textContent=e.message;}finally{button.disabled=false;}
});
})();
