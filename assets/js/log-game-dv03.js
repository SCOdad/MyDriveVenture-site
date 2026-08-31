(() => {
  const FALLBACK_URL='/assets/images/dv03/hero/parker-seated.png';
  const DERIVATIVE_FILENAME='avatar-dv03.png';
  const SCENE_RECENCY_DAYS=14;
  const SCENE_RULES=Object.freeze({Q000035:'PARK',Q000012:'CONSTRUCTION'});
  const SCENE_MARKUP=Object.freeze({
    PARK:'<div class="dv03-scene-park"><i class="tree-a"></i><i class="tree-b"></i><b>PARK</b></div>',
    CONSTRUCTION:'<div class="dv03-scene-construction"><i class="cone-a"></i><i class="cone-b"></i><b>ROAD<br>WORK</b></div>'
  });
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
      const {data,error}=await client.storage.from(assignment.storage_bucket).createSignedUrl(path,3600);
      if(error||!data?.signedUrl){showFallback(driverName);return}
      url=data.signedUrl;signedUrlCache.set(key,url);
    }
    applyResolved(url,driverName,driverId,token);
  }
  function clearScene(){const layer=document.getElementById('dv03-scene-layer');if(layer){layer.innerHTML='';delete layer.dataset.dvScene}}
  function renderScene(detail){
    const layer=document.getElementById('dv03-scene-layer');if(!layer)return;
    const cutoff=Date.now()-SCENE_RECENCY_DAYS*86400000;
    const award=(detail?.model?.quest_awards||[]).filter(row=>row.driver_id===detail.driverId&&SCENE_RULES[row.quest_key]&&Date.parse(row.awarded_at)>=cutoff).sort((a,b)=>Date.parse(b.awarded_at)-Date.parse(a.awarded_at))[0];
    const scene=award?SCENE_RULES[award.quest_key]:null;
    layer.innerHTML=scene?SCENE_MARKUP[scene]:'';
    if(scene)layer.dataset.dvScene=scene.toLowerCase();else delete layer.dataset.dvScene;
  }
  window.addEventListener('dv:driver-changing',event=>{renderToken+=1;showFallback(event.detail?.driverName||'Driver');clearScene()});
  window.addEventListener('dv:dashboard-rendered',event=>{renderScene(event.detail);resolveHero(event.detail).catch(()=>showFallback(event.detail?.driver?.display_name||'Driver'))});
  window.DV_GAME_DV03=Object.freeze({FALLBACK_URL,DERIVATIVE_FILENAME,derivativePath,showFallback,renderScene,resolveHero});
})();
