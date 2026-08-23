(()=>{
  const params=new URLSearchParams(location.search), invite=params.get('invite');
  if(!invite){
    const s=document.createElement('script');
    s.src='/assets/js/family.js?v=20260823-1';
    document.body.appendChild(s);
    return;
  }
  const cfg=window.DV_APP_CONFIG||{}, loading=document.getElementById('family-loading'), app=document.getElementById('family-app'), authNeeded=document.getElementById('family-auth-needed'), box=document.getElementById('invite-acceptance'), msg=document.getElementById('invite-acceptance-message'), status=document.getElementById('invite-acceptance-status'), button=document.getElementById('accept-family-invite');
  const show=(text,kind='')=>{status.textContent=text||'';status.classList.toggle('family-success',kind==='success');status.classList.toggle('family-error',kind==='error')};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey){loading.innerHTML='<p>Family invitation sign-in is not configured.</p>';return}
  const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.DV_SUPABASE_CLIENT=client;
  async function accept(session){
    button.disabled=true;show('Accepting invitation…');
    try{
      const r=await fetch(`${cfg.supabaseUrl}/functions/v1/family-invite-api`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey},body:JSON.stringify({action:'accept',invite_token:invite})});
      const b=await r.json().catch(()=>({}));
      if(!r.ok||b.ok!==true)throw new Error(b.error||'Invitation could not be accepted');
      show('Invitation accepted. Opening your family…','success');
      setTimeout(()=>location.replace('/family/'),350);
    }catch(e){show(e?.message||String(e),'error');button.disabled=false}
  }
  (async()=>{
    const {data}=await client.auth.getSession(), session=data.session;
    loading.hidden=true;
    if(!session){
      authNeeded.hidden=false;
      authNeeded.querySelector('h2').textContent='Sign in to accept your invitation';
      authNeeded.querySelector('p').textContent='Use the email address that received this invitation. After sign-in, we’ll bring you back here to accept it.';
      const returnTo=`/family/?invite=${encodeURIComponent(invite)}`;
      const link=authNeeded.querySelector('a');
      link.href=`/log/game/?return=${encodeURIComponent(returnTo)}`;
      link.textContent='Sign in to continue';
      return;
    }
    box.hidden=false;
    msg.textContent='You’re signed in. Accept this invitation to join the family and receive the selected driver access.';
    button.hidden=false;
    button.onclick=()=>accept(session);
    app.hidden=true;
  })().catch(e=>{loading.hidden=false;loading.innerHTML=`<p>${String(e?.message||e)}</p>`});
})()