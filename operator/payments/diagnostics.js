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
  if(button.dataset.action==='exceptions'){
   // Display only server-authorized operational identifiers and state;
   // never render event payloads, free-form metadata or card details.
   const holds=Array.isArray(result.items)?result.items:[];
   const stalled=Array.isArray(result.stalled_purchases)?result.stalled_purchases:[];
   const lines=[`Review holds: ${holds.length}; stalled sessions: ${stalled.length}.`];
   for(const p of holds)lines.push(`Hold ${String(p.id||'').slice(0,36)} · ${String(p.status||'').slice(0,40)} · ${String(p.offer_code||'').slice(0,50)}`);
   for(const p of stalled)lines.push(`Stalled ${String(p.id||'').slice(0,36)} · ${String(p.status||'').slice(0,40)}`);
   lines.push('Exception history is retained by the server; zero open holds does not prove no past exceptions.');
   output.textContent=lines.join('\n');
  }else output.textContent=JSON.stringify({connected:result.connected,initialized:result.initialized,payment_initiated:result.payment_initiated,provider_http_status:result.provider_http_status,diagnostic:result.diagnostic});
 }catch(e){output.textContent=e.message;}finally{button.disabled=false;}
});
})();
