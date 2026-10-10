(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.DV_SUPABASE_CLIENT=client;
  const states=new Map();
  let inflight=false,timer=null,generation=0,lastRequestKey='';
  const REQUEST_TIMEOUT=10000,IMAGE_TIMEOUT=10000,MAX_RETRIES=3,AVATAR_URL_TTL=55*60*1000;
  // Retain resolved avatars until an explicit reload; a routine card rerender must not
  // fetch a multi-megabyte image again when its in-memory data URL is still valid.

  function cards(){return [...document.querySelectorAll('.family-driver-card[data-driver-id]:not([hidden])')]}
  function mark(card,status){card.dataset.avatarMapStatus=status;const host=card.querySelector('[data-avatar-host]');if(host)host.dataset.avatarMapStatus=status}
  function schedule(delay=75){clearTimeout(timer);timer=setTimeout(load,delay)}
  function normalizeMap(body){
    if(body?.avatars&&typeof body.avatars==='object')return body.avatars;
    if(Array.isArray(body?.drivers))return Object.fromEntries(body.drivers.map(d=>[String(d.driver_id||d.id),d.avatar_url||d.signed_url||d.headshot_signed_url]).filter(([,url])=>!!url));
    return {};
  }
  async function avatarMap(ids){
    const controller=new AbortController();let timeout;
    // Bound auth restoration, fetch and body parsing together, so every attempt settles.
    try{return await Promise.race([(async()=>{
      const session=(await client.auth.getSession()).data.session;
      if(!session?.access_token)throw new Error('no-session');
      const response=await fetch(`${cfg.supabaseUrl}/functions/v1/family-avatar-map`,{
        method:'POST',signal:controller.signal,
        headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey},
        body:JSON.stringify({driver_ids:ids})
      });
      const body=await response.json();
      if(!response.ok||body.ok!==true)throw new Error(`avatar-map-${response.status}`);
      return normalizeMap(body);
    })(),new Promise((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(new Error('avatar-map-timeout'))},REQUEST_TIMEOUT)})])}
    finally{clearTimeout(timeout)}
  }
  function showAvatar(card,url,version){
    return new Promise(resolve=>{
      const id=String(card.dataset.driverId),host=card.querySelector('[data-avatar-host]');
      if(!host||!card.isConnected){resolve('stale');return}
      const current=host.querySelector('img[data-dv-avatar-driver]');
      if(current?.dataset.dvAvatarDriver===id&&current.src===url){mark(card,'loaded');resolve('loaded');return}
      const img=new Image();let done=false;
      const finish=status=>{
        if(done)return;done=true;clearTimeout(timeout);img.onload=null;img.onerror=null;
        if(version!==generation||!card.isConnected||card.dataset.driverId!==id||card.querySelector('[data-avatar-host]')!==host){resolve('stale');return}
        if(status==='loaded'){
          host.replaceChildren(img);host.classList.add('has-avatar');
          card.dataset.avatarLoaded='true';card.dataset.avatarFallback='false';
        }else if(!host.querySelector('img')){
          card.dataset.avatarLoaded='false';card.dataset.avatarFallback='true';
        }
        mark(card,status);resolve(status);
      };
      const timeout=setTimeout(()=>finish('image-timeout'),IMAGE_TIMEOUT);
      img.alt='';img.loading='eager';img.decoding='async';img.dataset.dvAvatarDriver=id;
      Object.assign(img.style,{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center center'});
      img.onload=()=>finish('loaded');img.onerror=()=>finish('image-error');
      mark(card,'loading-image');img.src=url;
    });
  }
  function failed(id,previous={}){
    const attempts=(previous.attempts||0)+1;
    // Stop automatic network attempts after bounded failures. Explicit reload or online
    // reconnection resets this state, allowing manual recovery without a retry storm.
    states.set(id,{attempts,retryAt:attempts>=MAX_RETRIES?null:Date.now()+Math.min(30000,1000*2**attempts),blocked:attempts>=MAX_RETRIES});
  }
  async function load(){
    timer=null;if(inflight)return;
    const visible=cards(),now=Date.now();
    const pending=visible.filter(card=>{
      const state=states.get(String(card.dataset.driverId));
      return !state||(!state.blocked&&(!state.retryAt||state.retryAt<=now)&&(!state.url||!card.querySelector('[data-avatar-host] img')));
    });
    if(!pending.length){planRetry();return}
    inflight=true;const version=generation;
    try{
      const ids=[...new Set(pending.map(card=>String(card.dataset.driverId)))];
      const needed=ids.filter(id=>!states.get(id)?.url||(states.get(id)?.expires??0)<=now);
      if(needed.length){
        pending.forEach(card=>mark(card,'fetching'));
        const avatars=await avatarMap(needed);
        if(version!==generation)return;
        lastRequestKey=needed.slice().sort().join('|');
        for(const id of needed){
          const url=avatars[id];
          states.set(id,typeof url==='string'&&url?{url,expires:Date.now()+AVATAR_URL_TTL,attempts:0}:{retryAt:Date.now()+30000,attempts:(states.get(id)?.attempts||0)+1,missing:true,blocked:(states.get(id)?.attempts||0)+1>=MAX_RETRIES});
        }
      }
      await Promise.all(pending.map(async card=>{
        const id=String(card.dataset.driverId),state=states.get(id);
        if(!state?.url){mark(card,'no-avatar');return}
        const result=await showAvatar(card,state.url,version);
        if(result!=='loaded'&&result!=='stale')failed(id,state);
      }));
    }catch(error){
      if(version===generation){
        for(const card of pending){const id=String(card.dataset.driverId);failed(id,states.get(id));mark(card,'exception')}
        console.warn('Family avatar map unavailable; retry scheduled',error);
      }
    }finally{inflight=false;schedule(version!==generation?0:75)}
  }
  function planRetry(){
    const times=cards().map(card=>states.get(String(card.dataset.driverId))).filter(state=>state&&!state.blocked&&state.retryAt).map(state=>state.retryAt);
    if(times.length)schedule(Math.max(75,Math.min(...times)-Date.now()));
  }
  function reload(){generation++;states.clear();schedule(0)}
  // Observe only the driver-card container, not unrelated document mutations.
  const observer=new MutationObserver(()=>schedule());
  const driverCardsHost=typeof document.getElementById==='function' ? document.getElementById('family-drivers') : null;
  if(driverCardsHost)observer.observe(driverCardsHost,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-driver-id']});
  window.addEventListener('dv:family-rendered',()=>schedule());
  window.addEventListener('online',reload);
  window.addEventListener('focus',()=>{for(const [id,state] of states)if(!state.url)states.delete(id);schedule()});
  window.DVFamilyAvatarMap={load:()=>schedule(0),reload,get lastRequestKey(){return lastRequestKey}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(),{once:true});else schedule();
})();
