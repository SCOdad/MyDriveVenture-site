(()=>{
  // BKLG-0287: required licensing registration review on authenticated entry.
  // Only the backend decides if a review is pending; local state never clears it.
  if(location.pathname.startsWith('/registration-review/'))return;
  const cfg=window.DV_APP_CONFIG||{};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let checking=false;
  async function check(session){
    if(checking||!session?.access_token)return;
    checking=true;
    try{
      const response=await fetch(cfg.supabaseUrl+'/functions/v1/profile-api',{
        method:'POST',
        headers:{apikey:cfg.publishableKey,
          authorization:'Bearer '+session.access_token,
          'content-type':'application/json'},
        body:JSON.stringify({action:'registration_reviews'})
      });
      if(!response.ok)return; // Basic state-neutral logging remains available on outage.
      const body=await response.json();
      const pending=body?.pending_reviews;
      if(!Array.isArray(pending)||pending.length===0)return;
      const first=pending[0];
      // Driver-only temporary practice entry is permitted; no licensing confirmation bypass.
      if(first.can_complete===false && location.pathname.startsWith('/log/')
        && new URLSearchParams(location.search).get('continue_practice')==='1')return;
      if(!/^[0-9a-f-]{36}$/i.test(String(first.review_id||'')))return;
      const current=location.pathname+location.search;
      const target='/registration-review/?review='+encodeURIComponent(first.review_id)
        +'&return='+encodeURIComponent(current);
      location.replace(target);
    }catch(error){
      console.warn('Licensing registration check unavailable',error);
    }finally{checking=false;}
  }
  void client.auth.getSession().then(({data})=>check(data?.session)).catch(()=>{});
  client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')void check(session);
  });
})();