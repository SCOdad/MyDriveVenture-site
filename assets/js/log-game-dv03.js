(() => {
  const FALLBACK_URL='/assets/images/dv03/hero/parker-seated.png';
  const DERIVATIVE_FILENAME='avatar-dv03.png';
  let currentDetail=null, featuredAwards=[], featuredTimer=null, skyTimer=null;
  let restingSign='';
  const signedUrlCache=new Map();
  let renderToken=0;

  function hero(){return document.getElementById('dv03-hero')}
  function derivativePath(assignment){
    if(assignment?.dv03_storage_path)return assignment.dv03_storage_path;
    const path=String(assignment?.storage_path||'');
    const slash=path.lastIndexOf('/');
    return slash>=0?`${path.slice(0,slash+1)}${DERIVATIVE_FILENAME}`:DERIVATIVE_FILENAME;
  }
  function showFallback(driverName='Driver'){
    const image=hero();if(!image)return;
    image.src=FALLBACK_URL;
    image.alt=`Parker seated in the driver's seat for ${driverName}`;
    image.dataset.dvHeroSource='parker';
    image.classList.remove('dv03-hero-loading');
  }
  function applyResolved(url,driverName,driverId,token){
    const image=hero(),app=window.DV_LOG_APP;if(!image||token!==renderToken||app?.getDriverId?.()!==driverId)return;
    const probe=new Image();
    probe.onload=()=>{if(token!==renderToken||app?.getDriverId?.()!==driverId)return;image.src=url;image.alt=`${driverName} seated in the driver's seat`;image.dataset.dvHeroSource='custom';image.classList.remove('dv03-hero-loading')};
    probe.onerror=()=>{if(token===renderToken)showFallback(driverName)};
    probe.src=url;
  }
  async function resolveThroughApi(client,driverId){
    const{data,error}=await client.functions.invoke('driver-hero-url',{body:{driver_id:driverId}});
    return !error&&data?.ok&&data?.signed_url?data.signed_url:null;
  }
  async function resolveHero(detail){
    const token=++renderToken,driverId=detail?.driverId,driverName=detail?.driver?.display_name||'Driver';
    showFallback(driverName);
    const image=hero();if(image)image.classList.add('dv03-hero-loading');
    if(detail?.driver?.dv03_hero_url){applyResolved(detail.driver.dv03_hero_url,driverName,driverId,token);return}
    const assignment=(detail?.model?.avatar_assignments||[]).find(row=>row.driver_id===driverId);
    const client=window.DV_LOG_APP?.client;
    if(!assignment||!client){showFallback(driverName);return}
    const path=derivativePath(assignment),key=`${assignment.storage_bucket}:${path}`;
    let url=signedUrlCache.get(key);
    if(!url){
      url=await resolveThroughApi(client,driverId);
      if(!url){const {data,error}=await client.storage.from(assignment.storage_bucket).createSignedUrl(path,3600);url=!error&&data?.signedUrl?data.signedUrl:null}
      if(!url){showFallback(driverName);return}
      signedUrlCache.set(key,url);
    }
    applyResolved(url,driverName,driverId,token);
  }
  function renderSky(){
    const sky=document.querySelector('.dv03-sky');
    if(sky)sky.dataset.dvSky=window.DV03_PRESENTATION.skyAt(currentDetail?.presentationNow||new Date(),currentDetail?.driver?.timezone);
  }
  function renderScene(detail){
    const layer=document.getElementById('dv03-scene-layer');if(!layer||!window.DV03_PRESENTATION)return;
    currentDetail=detail;
    const view=window.DV03_PRESENTATION.resolve({awards:detail?.model?.quest_awards||[],driverId:detail?.driverId,newAwards:featuredAwards});
    layer.innerHTML='';
    layer.style.backgroundImage=view.scenery?`url("${view.scenery.src}")`:'';
    layer.dataset.dvScene=view.scenery?.key||'none';
    layer.dataset.dvPersistentScene=window.DV03_PRESENTATION.SCENERY[view.persistent?.quest_key]?.key||'none';
    const landscape=document.querySelector('.dv03-landscape');
    if(landscape)landscape.hidden=Boolean(view.scenery);
    const signLayer=document.querySelector('.dv03-sign-layer');
    if(signLayer){signLayer.hidden=!view.showBillboard;const label=signLayer.querySelector('.hours-sign > span');if(label)label.textContent=view.featured&&view.showBillboard?'ACHIEVEMENT EARNED':'NEXT LICENSE MILESTONE'}
    const sign=document.getElementById('hours-sign');
    if(sign&&view.featured&&view.showBillboard)sign.textContent=view.featured.quest?.name||view.featured.name||view.featured.quest_key;
    layer.dataset.dvFeatured=view.featured?.quest_key||'';
    renderSky();
    if(!skyTimer)skyTimer=setInterval(renderSky,30000);
  }
  function endFeatured(){
    clearTimeout(featuredTimer);featuredTimer=null;featuredAwards=[];
    const sign=document.getElementById('hours-sign');if(sign&&restingSign)sign.textContent=restingSign;
    if(currentDetail)renderScene(currentDetail);
  }
  function featureDrive(detail){
    if(!currentDetail||detail?.driverId!==currentDetail.driverId)return;
    endFeatured();
    const keys=new Set((detail.awards||[]).map(a=>a.quest_key));
    featuredAwards=(currentDetail.model.quest_awards||[]).filter(a=>a.driver_id===detail.driverId&&a.drive_id===detail.driveId&&keys.has(a.quest_key));
    if(!featuredAwards.length)return;
    restingSign=document.getElementById('hours-sign')?.textContent||'';
    renderScene(currentDetail);
    featuredTimer=setTimeout(endFeatured,window.DV03_PRESENTATION.FEATURED_MS);
  }
  function clearScene(){
    clearTimeout(featuredTimer);clearInterval(skyTimer);featuredTimer=null;skyTimer=null;featuredAwards=[];currentDetail=null;
    const layer=document.getElementById('dv03-scene-layer');if(layer){layer.innerHTML='';layer.style.backgroundImage='';delete layer.dataset.dvScene;delete layer.dataset.dvPersistentScene;delete layer.dataset.dvFeatured}
    const landscape=document.querySelector('.dv03-landscape'),sign=document.querySelector('.dv03-sign-layer');
    if(landscape)landscape.hidden=false;if(sign)sign.hidden=false;
    const sky=document.querySelector('.dv03-sky');if(sky)delete sky.dataset.dvSky;
  }
  window.addEventListener('dv:driver-changing',event=>{renderToken+=1;showFallback(event.detail?.driverName||'Driver');clearScene()});
  window.addEventListener('dv:dashboard-rendered',event=>{
    if(currentDetail?.driverId!==event.detail?.driverId){featuredAwards=[];clearTimeout(featuredTimer)}
    restingSign=document.getElementById('hours-sign')?.textContent||'';
    renderScene(event.detail);resolveHero(event.detail).catch(()=>showFallback(event.detail?.driver?.display_name||'Driver'));
  });
  window.addEventListener('dv:license-status-updated',()=>{restingSign=document.getElementById('hours-sign')?.textContent||'';if(currentDetail)renderScene(currentDetail)});
  window.addEventListener('dv:drive-awarded',event=>featureDrive(event.detail));
  window.addEventListener('focus',()=>{if(currentDetail)renderSky()});
  window.DV_GAME_DV03=Object.freeze({FALLBACK_URL,DERIVATIVE_FILENAME,derivativePath,showFallback,renderScene,resolveHero,endFeatured,featureDrive});
})();
