(()=>{
  const form=document.getElementById('dv-acquisition-v2-form');
  if(!form)return;
  const cfg=window.DV_ENVIRONMENT_CONFIG||{},message=document.getElementById('acquisition-v2-message'),button=document.getElementById('acquisition-v2-submit'),success=document.getElementById('acquisition-v2-success');
  if(!cfg.supabaseUrl||!cfg.functionUrl){message.textContent='Drive Venture account setup is not configured.';message.classList.add('error');button.disabled=true;return}
  const endpoint=cfg.functionUrl('public-acquisition-v2'),params=new URLSearchParams(window.location.search),configuredSource=String(form.dataset.acquisitionSource||'JOIN_V2').trim().toUpperCase(),requestedSource=String(params.get('source')||'').trim().toUpperCase(),requestedReferrer=String(params.get('referrer')||'').trim().toUpperCase(),isReferral=requestedSource==='REFERRAL'&&/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(requestedReferrer),source=isReferral?'REFERRAL':configuredSource,referrer=isReferral?requestedReferrer:'',storageKey=source==='JOIN_V2'?'dv:acquisition:v2:flow':source==='REFERRAL'?'dv:acquisition:v2:flow:referral:'+referrer.toLowerCase():'dv:acquisition:v2:flow:'+source.toLowerCase(),idleLabel=button.textContent,busyLabel=form.dataset.busyLabel||'Sending secure link…';
  let flowId='';
  try{flowId=sessionStorage.getItem(storageKey)||''}catch(_){}
  if(!/^[0-9a-f-]{36}$/i.test(flowId)){flowId=crypto.randomUUID();try{sessionStorage.setItem(storageKey,flowId)}catch(_){}}
  const request=(body,token='')=>fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}).then(async r=>{const b=await r.json().catch(()=>({}));if(!r.ok||b.ok!==true)throw new Error(typeof b.error==='string'?b.error:'Drive Venture could not complete this step.');return b});
  const attribution=referrer?{referrer}:{};
  request({action:'view',flow_id:flowId,source,...attribution}).catch(()=>{});
  const trackMetaCompleteRegistration=()=>{
   if(source!=='PAID_RECRUITMENT'||typeof window.fbq!=='function')return;
   const key='dv:meta:CompleteRegistration:'+flowId;
   let alreadyTracked=false;
   try{alreadyTracked=sessionStorage.getItem(key)==='1'}catch(_){}
   if(alreadyTracked)return;
   window.fbq('track','CompleteRegistration');
   try{sessionStorage.setItem(key,'1')}catch(_){}
 };

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    message.textContent='';message.classList.remove('error');
    if(!form.reportValidity())return;
    const fd=new FormData(form),name=String(fd.get('name')||'').trim(),email=String(fd.get('email')||'').trim(),website=String(fd.get('website')||'').trim();
    button.disabled=true;button.textContent=busyLabel;
    try{
      await request({action:'submit',flow_id:flowId,source,...attribution,name,email,website});
      trackMetaCompleteRegistration();
      const nameTarget=document.getElementById('acquisition-v2-name'),emailTarget=document.getElementById('acquisition-v2-email');
      if(nameTarget)nameTarget.textContent=name;
      if(emailTarget)emailTarget.textContent=email;
      form.hidden=true;success.hidden=false;success.focus();
    }catch(error){
      message.textContent=error.message||String(error);message.classList.add('error');
    }finally{button.disabled=false;button.textContent=idleLabel}
  });
})();
