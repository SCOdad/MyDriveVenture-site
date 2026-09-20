(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;

  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const loaded=new Set();
  const failed=new Map();
  let inflight=false;

  function visibleCards(){
    return [...document.querySelectorAll('.family-driver-card[data-driver-id]:not([hidden])')]
      .filter(card=>{
        const id=String(card.dataset.driverId||'');
        if(!id||loaded.has(id))return false;
        const failures=Number(failed.get(id)||0);
        return failures<5;
      });
  }

  function normalizeMap(body){
    if(body?.avatars&&typeof body.avatars==='object')return body.avatars;
    if(Array.isArray(body?.drivers))return Object.fromEntries(body.drivers.map(d=>[String(d.driver_id||d.id),d.avatar_url||d.signed_url||d.headshot_signed_url]).filter(([,url])=>!!url));
    return {};
  }

  function markStatus(card,status){
    card.dataset.avatarMapStatus=status;
    const host=card.querySelector('[data-avatar-host]');
    if(host)host.dataset.avatarMapStatus=status;
  }

  function showAvatar(card,url){
    return new Promise(resolve=>{
      const id=String(card.dataset.driverId||'');
      const host=card.querySelector('[data-avatar-host]');
      if(!host||!url){resolve(false);return;}
      const img=new Image();
      img.alt='';
      img.loading='lazy';
      img.decoding='async';
      img.onload=()=>{
        host.replaceChildren(img);
        host.classList.add('has-avatar');
        card.dataset.avatarFallback='false';
        markStatus(card,'loaded');
        loaded.add(id);
        failed.delete(id);
        resolve(true);
      };
      img.onerror=()=>{
        failed.set(id,Number(failed.get(id)||0)+1);
        card.dataset.avatarFallback='true';
        markStatus(card,'image-error');
        resolve(false);
      };
      markStatus(card,'loading-image');
      img.src=url;
    });
  }

  async function load(){
    if(inflight)return;
    const cards=visibleCards();
    if(!cards.length)return;
    inflight=true;
    try{
      const session=(await client.auth.getSession()).data.session;
      if(!session?.access_token){
        cards.forEach(card=>markStatus(card,'no-session'));
        return;
      }
      const ids=[...new Set(cards.map(card=>String(card.dataset.driverId||'')).filter(Boolean))];
      cards.forEach(card=>markStatus(card,'fetching'));
      const response=await fetch(`${cfg.supabaseUrl}/functions/v1/family-avatar-map`,{
        method:'POST',
        headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey},
        body:JSON.stringify({driver_ids:ids})
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok||body.ok!==true){
        cards.forEach(card=>{
          const id=String(card.dataset.driverId||'');
          failed.set(id,Number(failed.get(id)||0)+1);
          markStatus(card,`endpoint-${response.status}`);
        });
        console.warn('Family avatar map response was not usable',{status:response.status,body});
        return;
      }
      const avatars=normalizeMap(body);
      await Promise.all(cards.map(async card=>{
        const id=String(card.dataset.driverId||'');
        const url=avatars[id];
        if(!url){
          markStatus(card,'no-avatar');
          return;
        }
        await showAvatar(card,url);
      }));
    }catch(error){
      cards.forEach(card=>{
        const id=String(card.dataset.driverId||'');
        failed.set(id,Number(failed.get(id)||0)+1);
        markStatus(card,'exception');
      });
      console.warn('Family avatar map unavailable; keeping fallback avatars',error);
    }finally{
      inflight=false;
    }
  }

  function schedule(){setTimeout(load,50)}
  const observer=new MutationObserver(schedule);
  if(document.body)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-driver-id']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  window.DVFamilyAvatarMap={reload:()=>{failed.clear();setTimeout(load,0)},loaded,failed};
})();
