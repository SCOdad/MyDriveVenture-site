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
  }

  window.addEventListener('dv:driver-changing',()=>{
    overridePalette=null;
    overrideScene=null;
    clearScene();
    paletteApi.apply(document.body,'YELLOW');
    const host=document.getElementById('dv-palette-preview');
    if(host){host.hidden=true;host.innerHTML=''}
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
})();