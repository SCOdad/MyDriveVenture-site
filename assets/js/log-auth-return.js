(()=>{
  const cfg=window.DV_APP_CONFIG||{},params=new URLSearchParams(location.search),raw=params.get('return');
  if(!raw||!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  let target='';
  try{const u=new URL(raw,location.origin);if(u.origin===location.origin&&u.pathname==='/family/'&&u.searchParams.has('invite'))target=u.pathname+u.search}catch{return}
  if(!target)return;
  const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.DV_SUPABASE_CLIENT=client;
  let redirecting=false;
  const go=()=>{if(redirecting)return;redirecting=true;location.replace(target)};
  client.auth.onAuthStateChange((_event,session)=>{if(session)go()});
  client.auth.getSession().then(({data})=>{if(data.session)go()});
  const form=document.getElementById('login-form');
  form?.addEventListener('submit',async e=>{
    e.preventDefault();e.stopImmediatePropagation();
    const email=document.getElementById('login-email')?.value.trim(),status=document.getElementById('login-status'),button=form.querySelector('button');
    if(!email)return;
    if(status){status.textContent='Sending sign-in link…';status.className='app-status'}
    button.disabled=true;
    try{
      const redirect=`${location.origin}/log/?return=${encodeURIComponent(target)}`;
      const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirect,shouldCreateUser:false}});
      if(error)throw error;
      if(status){status.textContent='Check your email for a secure sign-in link. After sign-in, we’ll return you to the family invitation.';status.className='app-status success'}
    }catch{
      if(status){status.textContent='We could not send a sign-in link right now. Please try again.';status.className='app-status error'}
    }finally{button.disabled=false}
  },true);
})();
