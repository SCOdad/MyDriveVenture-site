(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;

  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const loaded=new Set();
  let inflight=false;

  function visibleCards(){
    return [...document.querySelectorAll('.family-driver-card[data-driver-id]:not([hidden])')]
      .filter(card=>!loaded.has(String(card.dataset.driverId||'')));
  }

  function normalizeMap(body){
    if(body?.avatars&&typeof body.avatars==='object')return body.avatars;
    if(Array.isArray(body?.drivers))return Object.fromEntries(body.drivers.map(d=>[String(d.driver_id||d.id),d.avatar_url||d.signed_url||d.headshot_signed_url]).filter(([,url])=>!!url));
    return {};
  }

  function showAvatar(card,url){
    const host=card.querySelector('[data-avatar-host]');
    if(!host||!url)return false;
    const img=new Image();
    img.alt='';
    img.loading='lazy';
    img.onload=()=>{
      host.replaceChildren(img);
      host.classList.add('has-avatar');
      card.dataset.avatarFallback='false';
    };
    img.onerror=()=>{
      card.dataset.avatarFallback='true';
    };
    img.src=url;
    return true;
  }

  async function load(){
    if(inflight)return;
    const cards=visibleCards();
    if(!cards.length)return;
    inflight=true;
    try{
      const session=(await client.auth.getSession()).data.session;
      if(!session?.access_token)return;
      const ids=[...new Set(cards.map(card=>String(card.dataset.driverId||'')).filter(Boolean))];
      const response=await fetch(`${cfg.supabaseUrl}/functions/v1/family-avatar-map`,{
        method:'POST',
        headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey},
        body:JSON.stringify({driver_ids:ids})
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok||body.ok!==true)return;
      const avatars=normalizeMap(body);
      for(const card of cards){
        const id=String(card.dataset.driverId||'');
        const url=avatars[id];
        if(url&&showAvatar(card,url))loaded.add(id);
      }
    }catch(error){
      console.warn('Family avatar map unavailable; keeping fallback avatars',error);
    }finally{
      inflight=false;
    }
  }

  const schedule=()=>setTimeout(load,0);
  const observer=new MutationObserver(schedule);
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
})();
