(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.DV_SUPABASE_CLIENT=client;
  const loadAttempts=new Map();

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

  function setStatus(card,host,status){
    card.dataset.avatarFinalizerStatus=status;
    if(host)host.dataset.avatarFinalizerStatus=status;
  }

  function apply(card,url){
    const id=String(card.dataset.driverId||'');
    const host=card.querySelector('[data-avatar-host]');
    if(!host||!url)return;
    const current=host.querySelector('img[data-dv-avatar-finalizer="true"]');
    if(current&&current.dataset.dvAvatarDriver===id&&current.src===url){
      setStatus(card,host,'loaded');
      return;
    }
    const attempt=Number(loadAttempts.get(id)||0)+1;
    loadAttempts.set(id,attempt);
    const img=new Image();
    let done=false;
    const finish=status=>{
      if(done)return;
      done=true;
      clearTimeout(timeout);
      setStatus(card,host,status);
    };
    const timeout=setTimeout(()=>{
      finish('image-timeout');
      if(attempt<4)setTimeout(run,300);
    },2500);
    img.alt='';
    img.loading='eager';
    img.decoding='auto';
    img.dataset.dvAvatarFinalizer='true';
    img.dataset.dvAvatarDriver=id;
    img.style.width='100%';
    img.style.height='100%';
    img.style.objectFit='cover';
    img.style.objectPosition='center center';
    img.onload=()=>{
      if(done)return;
      done=true;
      clearTimeout(timeout);
      host.replaceChildren(img);
      host.classList.add('has-avatar');
      card.dataset.avatarLoaded='true';
      card.dataset.avatarFallback='false';
      setStatus(card,host,'loaded');
      loadAttempts.delete(id);
    };
    img.onerror=()=>{
      finish('image-error');
      if(attempt<4)setTimeout(run,300);
    };
    setStatus(card,host,'loading-image');
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
        else setStatus(card,card.querySelector('[data-avatar-host]'),'no-avatar');
      }
    }catch(error){
      console.warn('Family avatar finalizer unavailable',error);
      for(const card of cards())setStatus(card,card.querySelector('[data-avatar-host]'),'exception');
    }
  }

  function schedule(){setTimeout(run,125)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  let attempts=0;
  const timer=setInterval(()=>{attempts+=1;run();if(attempts>=12)clearInterval(timer)},500);
  window.DVFamilyAvatarFinalizer={run,loadAttempts};
})();
