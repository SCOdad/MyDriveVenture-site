(() => {
  const FALLBACK_URL='/assets/images/dv03/hero/parker-seated.png';
  const DERIVATIVE_FILENAME='avatar-dv03.png';
  const NIGHT_SKY_URL='/assets/images/dv03/layers/night.png';
  const FEATURE_DURATION_MS=10000;
  const signedUrlCache=new Map();
  let renderToken=0;
  let latestDetail=null;
  let featuredTimer=0;
  let billboardRestore=null;

  function ensureRules(){
    if(window.DV03_PRESENTATION_RULES)return Promise.resolve(window.DV03_PRESENTATION_RULES);
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-dv03-presentation-rules]');
      if(existing){existing.addEventListener('load',()=>resolve(window.DV03_PRESENTATION_RULES),{once:true});existing.addEventListener('error',reject,{once:true});return}
      const script=document.createElement('script');
      script.src='/assets/js/dv03-presentation-rules.js?v=20260911-persistence1';
      script.dataset.dv03PresentationRules='true';
      script.onload=()=>resolve(window.DV03_PRESENTATION_RULES);
      script.onerror=reject;
      document.head.appendChild(script);
    });
  }

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

  function sceneLayer(){return document.getElementById('dv03-scene-layer')}
  function signLayer(){return document.querySelector('.dv03-sign-layer')}
  function signText(){return signLayer()?.querySelector('.hours-sign span')||null}
  function signStrong(){return document.getElementById('hours-sign')}

  function clearScene(){
    const layer=sceneLayer();
    if(layer){layer.innerHTML='';layer.style.backgroundImage='';delete layer.dataset.dvScene}
  }
  function restoreBillboardText(){
    if(!billboardRestore)return;
    const label=signText(),strong=signStrong();
    if(label)label.textContent=billboardRestore.label;
    if(strong)strong.textContent=billboardRestore.strong;
    billboardRestore=null;
  }
  function applySky(detail,rules){
    const sky=document.querySelector('.dv03-sky');if(!sky)return;
    const mode=rules.skyFor(detail?.driver?.timezone||null,new Date());
    sky.dataset.dvSky=mode;
    sky.style.backgroundImage=mode==='night'?`url("${NIGHT_SKY_URL}")`:'';
    sky.querySelectorAll('.dv03-cloud').forEach(node=>node.style.display=mode==='night'?'none':'');
  }
  function enrichAwards(awards,detail){
    const modelAwards=detail?.model?.quest_awards||[],driveId=awards?.[0]?.drive_id||null;
    return (awards||[]).map(award=>{
      const match=modelAwards.find(row=>row.quest_key===award.quest_key&&(!driveId||row.drive_id===driveId))||modelAwards.find(row=>row.quest_key===award.quest_key);
      return {...match,...award,quest:match?.quest||award.quest||null,xp_awarded:award.xp_awarded??award.xp??match?.xp_awarded??0};
    });
  }
  function applyPresentation(detail,featuredAwards=[]){
    const rules=window.DV03_PRESENTATION_RULES;if(!rules)return;
    const layer=sceneLayer(),sign=signLayer();if(!layer)return;
    applySky(detail,rules);
    const presentation=rules.resolvePresentation({awards:detail?.model?.quest_awards||[],driverId:detail?.driverId,featuredAwards,timeZone:detail?.driver?.timezone||null});
    const scenery=presentation.activeScenery;
    layer.innerHTML='';
    layer.style.backgroundImage=scenery?`url("${scenery.src}")`:'';
    layer.style.backgroundRepeat=scenery?'no-repeat':'';
    layer.style.backgroundPosition=scenery?'center':'';
    layer.style.backgroundSize=scenery?'100% 100%':'';
    if(scenery)layer.dataset.dvScene=scenery.scene;else delete layer.dataset.dvScene;
    if(sign)sign.style.display=presentation.showBillboard?'block':'none';
    if(presentation.featuredMode==='billboard'&&presentation.featuredAward){
      const label=signText(),strong=signStrong();
      if(!billboardRestore)billboardRestore={label:label?.textContent||'NEXT LICENSE MILESTONE',strong:strong?.textContent||''};
      if(label)label.textContent='ACHIEVEMENT UNLOCKED';
      if(strong)strong.textContent=presentation.featuredAward?.quest?.name||presentation.featuredAward?.name||presentation.featuredAward?.quest_key||'Achievement';
    }else restoreBillboardText();
    return presentation;
  }
  function renderScene(detail){
    latestDetail=detail||latestDetail;
    if(!latestDetail)return;
    applyPresentation(latestDetail,[]);
  }
  function featureAwards(rawAwards){
    if(!latestDetail||!rawAwards?.length)return;
    clearTimeout(featuredTimer);
    const awards=enrichAwards(rawAwards,latestDetail);
    applyPresentation(latestDetail,awards);
    featuredTimer=window.setTimeout(()=>{featuredTimer=0;restoreBillboardText();renderScene(latestDetail)},FEATURE_DURATION_MS);
  }

  ensureRules().then(()=>{
    window.addEventListener('dv:driver-changing',event=>{renderToken+=1;clearTimeout(featuredTimer);featuredTimer=0;latestDetail=null;restoreBillboardText();showFallback(event.detail?.driverName||'Driver');clearScene()});
    window.addEventListener('dv:dashboard-rendered',event=>{latestDetail=event.detail;renderScene(event.detail);resolveHero(event.detail).catch(()=>showFallback(event.detail?.driver?.display_name||'Driver'))});
    window.addEventListener('dv:drive-awards-earned',event=>featureAwards(event.detail?.awards||[]));
    window.DV_GAME_DV03=Object.freeze({FALLBACK_URL,DERIVATIVE_FILENAME,FEATURE_DURATION_MS,derivativePath,showFallback,renderScene,resolveHero,applyPresentation,featureAwards});
  }).catch(()=>{
    window.addEventListener('dv:dashboard-rendered',event=>resolveHero(event.detail).catch(()=>showFallback(event.detail?.driver?.display_name||'Driver')));
  });
})();
