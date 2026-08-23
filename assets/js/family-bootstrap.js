(()=>{
  const params=new URLSearchParams(location.search), invite=params.get('invite');
  if(!invite){
    const s=document.createElement('script');
    s.src='/assets/js/family.js?v=20260823-1';
    document.body.appendChild(s);
    return;
  }
  document.documentElement.setAttribute('data-family-invite-mode','');
  const hero=document.querySelector('.family-hero');if(hero)hero.hidden=true;
  const cfg=window.DV_APP_CONFIG||{}, loading=document.getElementById('family-loading'), app=document.getElementById('family-app'), authNeeded=document.getElementById('family-auth-needed'), box=document.getElementById('invite-acceptance'), msg=document.getElementById('invite-acceptance-message'), status=document.getElementById('invite-acceptance-status'), button=document.getElementById('accept-family-invite');
  const show=(text,kind='')=>{status.textContent=text||'';status.classList.toggle('family-success',kind==='success');status.classList.toggle('family-error',kind==='error')};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey){loading.innerHTML='<p>Family invitation sign-in is not configured.</p>';return}
  const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.DV_SUPABASE_CLIENT=client;
  async function invokeAccept(currentSession){
    const {data,error}=await client.functions.invoke('family-invite-api',{body:{action:'accept',invite_token:invite},headers:{Authorization:`Bearer ${currentSession.access_token}`}});
    if(error)throw error;
    if(!data||data.ok!==true)throw new Error(data?.error||'Invitation could not be accepted');
    return data;
  }
  async function accept(initialSession){
    button.disabled=true;show('Accepting invitation…');
    try{
      let current=initialSession;
      try{await invokeAccept(current)}catch(first){
        const refreshed=await client.auth.refreshSession();
        if(refreshed.error||!refreshed.data.session)throw first;
        current=refreshed.data.session;
        await invokeAccept(current);
      }
      show('Invitation accepted. Opening your family…','success');
      setTimeout(()=>location.replace('/family/'),350);
    }catch(e){
      console.error('family invitation acceptance failed',e);
      const raw=String(e?.message||e||'');
      const friendly=/load failed|failed to fetch|network/i.test(raw)?'We could not reach Drive Venture to accept the invitation. Please try again.':raw||'Invitation could not be accepted.';
      show(friendly,'error');button.disabled=false;
    }
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