(()=>{
  const cfg=window.DV_ENVIRONMENT_CONFIG||window.DV_APP_CONFIG||{};
  const params=new URLSearchParams(location.search);
  const tokenHash=(params.get('token_hash')||'').trim();
  const title=document.getElementById('auth-title');
  const message=document.getElementById('auth-message');
  const actions=document.getElementById('auth-actions');
  const retry=document.getElementById('auth-retry');
  let working=false;

  const showRecovery=(text)=>{
    title.textContent='We hit a roadblock';
    message.textContent=text;
    actions.hidden=false;
  };

  if(!tokenHash||!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase){
    showRecovery('This secure link is incomplete or can’t be verified here. Request a fresh sign-in link and we’ll get you back on the road.');
    return;
  }

  const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  window.DV_SUPABASE_CLIENT=client;

  async function verify(){
    if(working)return;
    working=true;
    actions.hidden=true;
    title.textContent='Opening Drive Venture…';
    message.textContent='We’re verifying your secure sign-in link. This normally takes only a moment.';
    try{
      const {data,error}=await client.auth.verifyOtp({token_hash:tokenHash,type:'email'});
      if(error)throw error;
      if(!data?.session)throw new Error('No authenticated session was returned.');
      title.textContent='You’re in!';
      message.textContent='Secure sign-in complete. Opening your driver console…';
      location.replace('/log/');
    }catch(error){
      console.error('welcome auth handoff failed',error);
      const text=String(error?.message||'').toLowerCase();
      const expired=text.includes('expired')||text.includes('invalid')||text.includes('token has expired');
      showRecovery(expired
        ? 'This one-time link has expired or was already used. Request a fresh sign-in link and we’ll get you back on the road.'
        : 'The sign-in service didn’t finish the handoff. Your account is safe. Try this link again, or request a fresh sign-in link if the problem continues.');
    }finally{working=false}
  }

  retry.addEventListener('click',verify);
  verify();
})();
