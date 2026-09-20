(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;

  const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.DV_SUPABASE_CLIENT=client;
  const loaded=new Set();
  const failed=new Map();
  let inflight=false;

  function normalizeMap(body){
    if(body?.avatars&&typeof body.avatars==='object')return body.avatars;
    if(Array.isArray(body?.drivers))return Object.fromEntries(body.drivers.map(d=>[String(d.driver_id||d.id),d.avatar_url||d.signed_url||d.headshot_signed_url]).filter(([,url])=>!!url));
    return {};
  }

  async function avatarMap(ids){
    const session=(await client.auth.getSession()).data.session;
    if(!session?.access_token)throw new Error('no-session');
    const response=await window.__dvAvatarOriginalFetch(`${cfg.supabaseUrl}/functions/v1/family-avatar-map`,{
      method:'POST',
      headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey},
      body:JSON.stringify({driver_ids:[...new Set(ids.map(String).filter(Boolean))]})
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.ok!==true)throw new Error(`avatar-map-${response.status}`);
    return normalizeMap(body);
  }

  if(!window.__dvAvatarOriginalFetch){
    window.__dvAvatarOriginalFetch=window.fetch.bind(window);
    window.fetch=async(input,init={})=>{
      const url=typeof input==='string'?input:String(input?.url||'');
      if(url.includes('/functions/v1/driver-hero-url')){
        let driverId='';
        try{driverId=String(JSON.parse(init?.body||'{}').driver_id||'')}catch{}
        try{
          const avatars=await avatarMap([driverId]);
          const avatar=avatars[driverId]||null;
          if(!avatar)return new Response(JSON.stringify({ok:false,error:'No current avatar assignment'}),{status:404,headers:{'content-type':'application/json'}});
          return new Response(JSON.stringify({ok:true,signed_url:avatar,headshot_signed_url:avatar}),{status:200,headers:{'content-type':'application/json'}});
        }catch(error){
          console.warn('Drive Venture avatar shim failed',error);
          return new Response(JSON.stringify({ok:false,error:'Driver Hero is unavailable'}),{status:500,headers:{'content-type':'application/json'}});
        }
      }
      return window.__dvAvatarOriginalFetch(input,init);
    };
  }

  function visibleCards(){
    return [...document.querySelectorAll('.family-driver-card[data-driver-id]:not([hidden])')].filter(card=>{
      const id=String(card.dataset.driverId||'');
      if(!id||loaded.has(id))return false;
      return Number(failed.get(id)||0)<5;
    });
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
      img.onload=()=>{host.replaceChildren(img);host.classList.add('has-avatar');card.dataset.avatarFallback='false';markStatus(card,'loaded');loaded.add(id);failed.delete(id);resolve(true)};
      img.onerror=()=>{failed.set(id,Number(failed.get(id)||0)+1);card.dataset.avatarFallback='true';markStatus(card,'image-error');resolve(false)};
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
      const ids=cards.map(card=>String(card.dataset.driverId||'')).filter(Boolean);
      cards.forEach(card=>markStatus(card,'fetching'));
      const avatars=await avatarMap(ids);
      await Promise.all(cards.map(async card=>{
        const id=String(card.dataset.driverId||'');
        const url=avatars[id];
        if(!url){markStatus(card,'no-avatar');return;}
        await showAvatar(card,url);
      }));
    }catch(error){
      cards.forEach(card=>{const id=String(card.dataset.driverId||'');failed.set(id,Number(failed.get(id)||0)+1);markStatus(card,'exception')});
      console.warn('Family avatar map unavailable; keeping fallback avatars',error);
    }finally{inflight=false;}
  }

  function schedule(){setTimeout(load,50)}
  const observer=new MutationObserver(schedule);
  if(document.body)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-driver-id']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  window.DVFamilyAvatarMap={reload:()=>{failed.clear();loaded.clear();setTimeout(load,0)},loaded,failed};
})();
