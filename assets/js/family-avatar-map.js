(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;

  const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.DV_SUPABASE_CLIENT=client;

  const failed=new Map();
  const avatarCache=new Map();
  let inflight=false;
  let lastRequestKey='';

  function normalizeMap(body){
    if(body?.avatars&&typeof body.avatars==='object')return body.avatars;
    if(Array.isArray(body?.drivers))return Object.fromEntries(body.drivers.map(d=>[String(d.driver_id||d.id),d.avatar_url||d.signed_url||d.headshot_signed_url]).filter(([,url])=>!!url));
    return {};
  }

  async function avatarMap(ids){
    const wanted=[...new Set(ids.map(String).filter(Boolean))];
    if(!wanted.length)return {};
    const session=(await client.auth.getSession()).data.session;
    if(!session?.access_token)throw new Error('no-session');
    const response=await window.__dvAvatarOriginalFetch(`${cfg.supabaseUrl}/functions/v1/family-avatar-map`,{
      method:'POST',
      headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey},
      body:JSON.stringify({driver_ids:wanted})
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.ok!==true)throw new Error(`avatar-map-${response.status}`);
    const avatars=normalizeMap(body);
    for(const [id,url] of Object.entries(avatars))if(url)avatarCache.set(String(id),String(url));
    return avatars;
  }

  if(!window.__dvAvatarOriginalFetch){
    window.__dvAvatarOriginalFetch=window.fetch.bind(window);
    window.fetch=async(input,init={})=>{
      const url=typeof input==='string'?input:String(input?.url||'');
      if(url.includes('/functions/v1/driver-hero-url')){
        return new Response(JSON.stringify({ok:true,signed_url:null,headshot_signed_url:null,avatar_deferred_to:'family-avatar-map'}),{status:200,headers:{'content-type':'application/json'}});
      }
      return window.__dvAvatarOriginalFetch(input,init);
    };
  }

  function visibleCards(){
    return [...document.querySelectorAll('.family-driver-card[data-driver-id]:not([hidden])')].filter(card=>{
      const id=String(card.dataset.driverId||'');
      return !!id && Number(failed.get(id)||0)<6;
    });
  }

  function markStatus(card,status){
    card.dataset.avatarMapStatus=status;
    const host=card.querySelector('[data-avatar-host]');
    if(host)host.dataset.avatarMapStatus=status;
  }

  function needsApply(card,url){
    const id=String(card.dataset.driverId||'');
    const img=card.querySelector('[data-avatar-host] img[data-dv-avatar-driver]');
    return !img || img.dataset.dvAvatarDriver!==id || img.src!==url;
  }

  function showAvatar(card,url){
    return new Promise(resolve=>{
      const id=String(card.dataset.driverId||'');
      const host=card.querySelector('[data-avatar-host]');
      if(!host||!url){resolve(false);return;}
      if(!needsApply(card,url)){
        markStatus(card,'loaded');
        card.dataset.avatarFallback='false';
        resolve(true);
        return;
      }
      const img=new Image();
      img.alt='';
      img.loading='lazy';
      img.decoding='async';
      img.dataset.dvAvatarDriver=id;
      img.style.width='100%';
      img.style.height='100%';
      img.style.objectFit='cover';
      img.style.objectPosition='center center';
      img.onload=()=>{
        host.replaceChildren(img);
        host.classList.add('has-avatar');
        card.dataset.avatarFallback='false';
        card.dataset.avatarLoaded='true';
        markStatus(card,'loaded');
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
    const ids=cards.map(card=>String(card.dataset.driverId||'')).filter(Boolean);
    const requestKey=ids.slice().sort().join('|');
    inflight=true;
    try{
      cards.forEach(card=>markStatus(card,'fetching'));
      const avatars=await avatarMap(ids);
      lastRequestKey=requestKey;
      await Promise.all(cards.map(async card=>{
        const id=String(card.dataset.driverId||'');
        const url=avatars[id]||avatarCache.get(id);
        if(!url){markStatus(card,'no-avatar');return;}
        await showAvatar(card,url);
      }));
    }catch(error){
      cards.forEach(card=>{const id=String(card.dataset.driverId||'');failed.set(id,Number(failed.get(id)||0)+1);markStatus(card,'exception')});
      console.warn('Family avatar map unavailable; keeping fallback avatars',error);
    }finally{inflight=false;}
  }

  function schedule(){setTimeout(load,75)}
  const observer=new MutationObserver(schedule);
  if(document.body)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-driver-id','data-avatar-loaded','data-avatar-fallback']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  let reconcileCount=0;
  const reconcile=setInterval(()=>{
    reconcileCount+=1;
    load();
    if(reconcileCount>=24)clearInterval(reconcile);
  },500);
  window.DVFamilyAvatarMap={reload:()=>{failed.clear();avatarCache.clear();setTimeout(load,0)},failed,avatarCache,get lastRequestKey(){return lastRequestKey}};
})();
