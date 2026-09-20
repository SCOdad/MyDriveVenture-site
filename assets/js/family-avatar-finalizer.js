(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.DV_SUPABASE_CLIENT=client;

  function cards(){
    return [...document.querySelectorAll('.family-driver-card[data-driver-id]:not([hidden])')];
  }

  function ids(){
    return [...new Set(cards().map(card=>String(card.dataset.driverId||'').trim()).filter(Boolean))];
  }

  async function avatarMap(driverIds){
    const session=(await client.auth.getSession()).data.session;
    if(!session?.access_token||!driverIds.length)return {};
    const response=await fetch(`${cfg.supabaseUrl}/functions/v1/family-avatar-map`,{
      method:'POST',
      headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey},
      body:JSON.stringify({driver_ids:driverIds})
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.ok!==true)throw new Error(`family-avatar-map ${response.status}`);
    return body.avatars&&typeof body.avatars==='object'?body.avatars:{};
  }

  function apply(card,url){
    const id=String(card.dataset.driverId||'');
    const host=card.querySelector('[data-avatar-host]');
    if(!host||!url)return;
    const current=host.querySelector('img[data-dv-avatar-finalizer="true"]');
    if(current&&current.dataset.dvAvatarDriver===id&&current.src===url){
      card.dataset.avatarFinalizerStatus='loaded';
      return;
    }
    const img=new Image();
    img.alt='';
    img.loading='lazy';
    img.decoding='async';
    img.dataset.dvAvatarFinalizer='true';
    img.dataset.dvAvatarDriver=id;
    img.style.width='100%';
    img.style.height='100%';
    img.style.objectFit='cover';
    img.style.objectPosition='center center';
    img.onload=()=>{
      host.replaceChildren(img);
      host.classList.add('has-avatar');
      card.dataset.avatarLoaded='true';
      card.dataset.avatarFallback='false';
      card.dataset.avatarFinalizerStatus='loaded';
      host.dataset.avatarFinalizerStatus='loaded';
    };
    img.onerror=()=>{
      card.dataset.avatarFinalizerStatus='image-error';
      host.dataset.avatarFinalizerStatus='image-error';
    };
    card.dataset.avatarFinalizerStatus='loading';
    img.src=url;
  }

  async function run(){
    const driverIds=ids();
    if(!driverIds.length)return;
    try{
      const avatars=await avatarMap(driverIds);
      for(const card of cards()){
        const id=String(card.dataset.driverId||'');
        const url=avatars[id];
        if(url)apply(card,String(url));
        else card.dataset.avatarFinalizerStatus='no-avatar';
      }
    }catch(error){
      console.warn('Family avatar finalizer unavailable',error);
      for(const card of cards())card.dataset.avatarFinalizerStatus='exception';
    }
  }

  function schedule(){setTimeout(run,125)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  let attempts=0;
  const timer=setInterval(()=>{attempts+=1;run();if(attempts>=12)clearInterval(timer)},500);
  window.DVFamilyAvatarFinalizer={run};
})();
