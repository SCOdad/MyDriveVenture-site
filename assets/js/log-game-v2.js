(() => {
  const paletteApi=window.DV_DRIVER_PALETTES;
  const env=window.DV_ENVIRONMENT_CONFIG;
  if(!paletteApi)return;

  const SCENE_RECENCY_DAYS=14;
  const SCENE_RULES=Object.freeze({
    Q000035:'PARK',
    Q000012:'CONSTRUCTION'
  });
  const SCENE_MARKUP=Object.freeze({
    PARK:'<div class="dv-scene-park"><div class="dv-park-tree tree-a"></div><div class="dv-park-tree tree-b"></div><div class="dv-park-tree tree-c"></div><div class="dv-park-sign">PARK</div></div>',
    CONSTRUCTION:'<div class="dv-scene-construction"><div class="dv-cone cone-a"></div><div class="dv-cone cone-b"></div><div class="dv-cone cone-c"></div><div class="dv-roadwork-sign">ROAD<br>WORK</div></div>'
  });

  let overridePalette=null;
  let overrideScene=null;
  let lastDetail=null;
  let paletteOpen=false;
  let paletteSaving=false;

  function paletteElements(){
    return {
      panel:document.getElementById('dv-driver-palette'),
      toggle:document.getElementById('dv-palette-toggle'),
      close:document.getElementById('dv-palette-close'),
      swatches:document.querySelector('[data-dv-console-swatches]'),
      status:document.getElementById('dv-palette-status')
    };
  }

  function setPaletteStatus(message,kind=''){
    const el=paletteElements().status;
    if(!el)return;
    el.textContent=message||'';
    el.className=`dv-palette-status${kind?` ${kind}`:''}`;
  }

  function setPaletteOpen(open,{returnFocus=false}={}){
    const {panel,toggle}=paletteElements();
    if(!panel||!toggle)return;
    paletteOpen=!!open;
    panel.hidden=!paletteOpen;
    toggle.setAttribute('aria-expanded',String(paletteOpen));
    toggle.setAttribute('aria-label','Color palette settings');
    if(paletteOpen)panel.querySelector('[data-dv-palette-id]')?.focus();
    else if(returnFocus)toggle.focus();
  }

  function renderConsoleSelection(){
    const {swatches}=paletteElements();
    if(!swatches)return;
    const selected=paletteApi.normalize(lastDetail?.driver?.favorite_color);
    swatches.querySelectorAll('[data-dv-palette-id]').forEach(button=>{
      const active=button.dataset.dvPaletteId===selected;
      button.classList.toggle('selected',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  function canPersistPalette(){
    if(lastDetail?.model?.mock_preview===true)return false;
    const access=(lastDetail?.model?.driver_access||[]).find(row=>row.driver_id===lastDetail?.driverId)?.mode;
    return access!=='VIEW';
  }

  async function persistPalette(id){
    if(!lastDetail?.driver||paletteSaving)return;
    const previous=lastDetail.driver.favorite_color||'';
    overridePalette=null;
    lastDetail.driver.favorite_color=id;
    applyTheme(lastDetail);
    renderConsoleSelection();

    if(lastDetail.model?.mock_preview===true){
      setPaletteStatus(`${paletteApi.resolve(id).label} preview selected. This mock choice is not saved.`,'success');
      return;
    }
    if(!canPersistPalette()){
      lastDetail.driver.favorite_color=previous;
      applyTheme(lastDetail);
      renderConsoleSelection();
      setPaletteStatus('This driver is view-only. Open a driver you manage to change its color.','error');
      return;
    }

    const cfg=window.DV_APP_CONFIG||{};
    const client=window.DV_SUPABASE_CLIENT;
    const personId=lastDetail.driver.person_id;
    if(!cfg.supabaseUrl||!cfg.publishableKey||!client||!personId){
      lastDetail.driver.favorite_color=previous;
      applyTheme(lastDetail);
      renderConsoleSelection();
      setPaletteStatus('Color could not be saved. Please try again from Profile.','error');
      return;
    }

    paletteSaving=true;
    paletteElements().swatches?.querySelectorAll('button').forEach(button=>button.disabled=true);
    setPaletteStatus(`Saving ${paletteApi.resolve(id).label}…`);
    try{
      const {data}=await client.auth.getSession();
      const token=data?.session?.access_token;
      if(!token)throw new Error('Please sign in again.');
      const response=await fetch(`${cfg.supabaseUrl}/functions/v1/profile-api`,{
        method:'POST',
        headers:{'content-type':'application/json','authorization':`Bearer ${token}`,'apikey':cfg.publishableKey},
        body:JSON.stringify({
          action:'update_basic',
          person_id:personId,
          name:lastDetail.driver.display_name,
          home_zip:lastDetail.driver.home_zip,
          favorite_color:id
        })
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok||body.ok!==true)throw new Error(body.error||'Profile update failed.');
      setPaletteStatus(`${paletteApi.resolve(id).label} saved.`,'success');
    }catch(error){
      lastDetail.driver.favorite_color=previous;
      applyTheme(lastDetail);
      renderConsoleSelection();
      setPaletteStatus(error?.message||'Color could not be saved.','error');
    }finally{
      paletteSaving=false;
      paletteElements().swatches?.querySelectorAll('button').forEach(button=>button.disabled=false);
    }
  }

  function mountConsolePalette(){
    const radio=document.querySelector('.radio-panel');
    const controls=radio?.querySelector('.radio-controls');
    const dots=controls?.querySelectorAll('i');
    if(!radio||!controls||!dots?.length||document.getElementById('dv-palette-toggle'))return;

    const toggle=document.createElement('button');
    toggle.id='dv-palette-toggle';
    toggle.className='dv-palette-toggle';
    toggle.type='button';
    toggle.setAttribute('aria-label','Color palette settings');
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls','dv-driver-palette');
    toggle.innerHTML='<span aria-hidden="true">⚙</span>';
    dots[dots.length-1].replaceWith(toggle);

    const panel=document.createElement('section');
    panel.id='dv-driver-palette';
    panel.className='dv-driver-palette';
    panel.setAttribute('aria-label','Driver color palette');
    panel.hidden=true;
    panel.innerHTML='<div class="dv-driver-palette-head"><strong>COLOR PALETTE</strong><button id="dv-palette-close" class="dv-palette-close" type="button" aria-label="Close color palette">X</button></div><p id="dv-palette-help">Choose a color to update this driver’s experience.</p><div class="dv-palette-swatches" data-dv-console-swatches role="group" aria-describedby="dv-palette-help"></div><div id="dv-palette-status" class="dv-palette-status" role="status" aria-live="polite"></div>';
    radio.appendChild(panel);

    const swatches=panel.querySelector('[data-dv-console-swatches]');
    swatches.innerHTML=paletteApi.palettes.map(p=>paletteApi.swatchMarkup(p,false)).join('');
    swatches.querySelectorAll('[data-dv-palette-id]').forEach(button=>button.addEventListener('click',()=>persistPalette(button.dataset.dvPaletteId)));
    toggle.addEventListener('click',()=>setPaletteOpen(!paletteOpen,{returnFocus:paletteOpen}));
    panel.querySelector('#dv-palette-close')?.addEventListener('click',()=>setPaletteOpen(false,{returnFocus:true}));
    panel.addEventListener('keydown',event=>{
      const buttons=[...swatches.querySelectorAll('[data-dv-palette-id]')];
      const index=buttons.indexOf(document.activeElement);
      if(index<0||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();
      const delta=event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1;
      buttons[(index+delta+buttons.length)%buttons.length].focus();
    });
    document.addEventListener('pointerdown',event=>{
      if(paletteOpen&&!panel.contains(event.target)&&!toggle.contains(event.target))setPaletteOpen(false);
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&paletteOpen)setPaletteOpen(false,{returnFocus:true});
    });
  }

  function clearScene(){
    const layer=document.getElementById('dv-scene-layer');
    if(!layer)return;
    layer.innerHTML='';
    delete layer.dataset.dvScene;
  }

  function latestEligibleAward(detail){
    const cutoff=Date.now()-(SCENE_RECENCY_DAYS*86400000);
    return (detail?.model?.quest_awards||[])
      .filter(a=>a.driver_id===detail.driverId && SCENE_RULES[a.quest_key] && Number.isFinite(Date.parse(a.awarded_at)) && Date.parse(a.awarded_at)>=cutoff)
      .sort((a,b)=>Date.parse(b.awarded_at)-Date.parse(a.awarded_at))[0]||null;
  }

  function renderScene(detail){
    const layer=document.getElementById('dv-scene-layer');
    if(!layer)return;
    const award=latestEligibleAward(detail);
    const scene=overrideScene||(award?SCENE_RULES[award.quest_key]:null);
    layer.innerHTML=scene?SCENE_MARKUP[scene]:'';
    if(scene)layer.dataset.dvScene=scene.toLowerCase();else delete layer.dataset.dvScene;
  }

  function resolvedPaletteValue(detail){
    return overridePalette||detail?.driver?.favorite_color||'';
  }

  function applyTheme(detail){
    const resolved=paletteApi.apply(document.body,resolvedPaletteValue(detail),'YELLOW');
    const consoleEl=document.querySelector('.dashboard-console');
    if(consoleEl)paletteApi.apply(consoleEl,resolved.id,'YELLOW');
    return resolved;
  }

  function updateHarnessSelection(host,resolved){
    host.querySelectorAll('[data-dv-palette-id]').forEach(button=>{
      const active=overridePalette===button.dataset.dvPaletteId;
      button.classList.toggle('selected',active);
      button.setAttribute('aria-pressed',String(active));
    });
    const auto=host.querySelector('[data-dv-palette-auto]');
    if(auto){
      const active=!overridePalette;
      auto.classList.toggle('selected',active);
      auto.setAttribute('aria-pressed',String(active));
      auto.title=`Use driver setting (${resolved.label})`;
    }
  }

  function renderPaletteHarness(detail,resolved){
    const host=document.getElementById('dv-palette-preview');
    if(!host)return;
    const show=env?.name==='dev' && detail?.model?.is_operator===true;
    if(!show){
      host.hidden=true;
      host.innerHTML='';
      return;
    }
    host.hidden=false;
    host.innerHTML='<span class="dv-palette-preview-label">DEV COLOR</span><button type="button" class="dv-palette-auto" data-dv-palette-auto aria-pressed="false">AUTO</button>'+
      paletteApi.palettes.map(p=>paletteApi.swatchMarkup(p,true)).join('')+
      '<div class="dv-scene-preview"><span class="dv-palette-preview-label">DEV SCENE</span><button type="button" class="dv-palette-auto" data-dv-scene-preview="AUTO" aria-pressed="false">AUTO</button><button type="button" class="dv-palette-auto" data-dv-scene-preview="PARK" aria-pressed="false">PARK</button><button type="button" class="dv-palette-auto" data-dv-scene-preview="CONSTRUCTION" aria-pressed="false">WORK</button></div>';

    host.querySelector('[data-dv-palette-auto]')?.addEventListener('click',()=>{
      overridePalette=null;
      const current=applyTheme(lastDetail);
      updateHarnessSelection(host,current);
    });
    host.querySelectorAll('[data-dv-palette-id]').forEach(button=>{
      button.addEventListener('click',()=>{
        overridePalette=button.dataset.dvPaletteId;
        const current=applyTheme(lastDetail);
        updateHarnessSelection(host,current);
      });
    });
    host.querySelectorAll('[data-dv-scene-preview]').forEach(button=>{
      button.addEventListener('click',()=>{
        overrideScene=button.dataset.dvScenePreview==='AUTO'?null:button.dataset.dvScenePreview;
        host.querySelectorAll('[data-dv-scene-preview]').forEach(candidate=>{
          const active=(candidate.dataset.dvScenePreview==='AUTO'&&!overrideScene)||candidate.dataset.dvScenePreview===overrideScene;
          candidate.classList.toggle('selected',active);
          candidate.setAttribute('aria-pressed',String(active));
        });
        renderScene(lastDetail);
      });
    });
    host.querySelector('[data-dv-scene-preview="AUTO"]')?.classList.add('selected');
    host.querySelector('[data-dv-scene-preview="AUTO"]')?.setAttribute('aria-pressed','true');
    updateHarnessSelection(host,resolved);
  }

  function render(detail){
    if(!detail?.driverId||!detail?.driver)return;
    lastDetail=detail;
    const resolved=applyTheme(detail);
    renderScene(detail);
    renderPaletteHarness(detail,resolved);
    renderConsoleSelection();
    const readonly=!detail.model?.mock_preview&&!canPersistPalette();
    paletteElements().swatches?.querySelectorAll('button').forEach(button=>button.disabled=readonly);
    if(readonly)setPaletteStatus('View-only driver: color changes are unavailable.');
    else setPaletteStatus('');
  }

  window.addEventListener('dv:driver-changing',()=>{
    overridePalette=null;
    overrideScene=null;
    clearScene();
    paletteApi.apply(document.body,'YELLOW');
    const host=document.getElementById('dv-palette-preview');
    if(host){host.hidden=true;host.innerHTML=''}
    setPaletteOpen(false);
    setPaletteStatus('');
  });
  window.addEventListener('dv:dashboard-rendered',event=>render(event.detail));

  window.DV_GAME_V2=Object.freeze({
    sceneRecencyDays:SCENE_RECENCY_DAYS,
    sceneRules:SCENE_RULES,
    renderMockPreview(detail){
      lastDetail=detail;
      const resolved=applyTheme(detail);
      renderScene(detail);
      renderPaletteHarness(detail,resolved);
      renderConsoleSelection();
      setPaletteStatus('');
      return {palette:resolved.id,scene:document.getElementById('dv-scene-layer')?.dataset.dvScene||null};
    },
    scenePreview(scene){
      overrideScene=scene||null;
      if(lastDetail)renderScene(lastDetail);
    },
    getActiveScene:()=>document.getElementById('dv-scene-layer')?.dataset.dvScene||null,
    getPaletteOverride:()=>overridePalette,
    getSceneOverride:()=>overrideScene
  });
  mountConsolePalette();
})();
