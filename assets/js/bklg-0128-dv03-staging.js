(() => {
  if(document.documentElement.dataset.dvRoute!=='bklg0128uat')return;
  const cfg=window.DV_APP_CONFIG||{};
  const checking=document.getElementById('uat-checking');
  const denied=document.getElementById('uat-denied');
  const shell=document.getElementById('uat-shell');
  const frame=document.getElementById('uat-frame');
  const status=document.getElementById('uat-scene-status');
  const rows=document.getElementById('uat-layer-rows');
  const harness=document.getElementById('uat-harness');
  const collapse=document.getElementById('uat-collapse');
  let frameReady=false;
  let mode='manual';
  let anchorRaf=0;

  const LAYERS=Object.freeze([
    {key:'01',id:'sky',label:'Sky / Atmosphere',options:[
      {value:'off',label:'OFF'},
      {value:'base',label:'Base Sky',sortKey:'01-SKY-BASE'},
      {value:'night',label:'Night',sortKey:'01-SKY-NIGHT',assetId:'DV-UX-DV03-SKY-NIGHT',src:'/assets/images/dv03/layers/night.png'}]},
    {key:'02',id:'road',label:'Road / Ground',options:[
      {value:'off',label:'OFF'},
      {value:'base',label:'Base Ground / Approach',sortKey:'02-ROAD-GROUND-BASE'}]},
    {key:'03',id:'background',label:'Background',options:[
      {value:'off',label:'OFF'},
      {value:'base',label:'Base World',sortKey:'03-BACKGROUND-BASE'},
      {value:'park',label:'Park',sortKey:'03-BACKGROUND-PARK',assetId:'DV-UX-DV03-BACKGROUND-PARK',src:'/assets/images/dv03/layers/park.png'},
      {value:'school',label:'School',sortKey:'03-BACKGROUND-SCHOOL',src:'/assets/images/dv03/layers/DV03-L2-SCHOOL-BACKGROUND-DRAFT-v1.png',draft:true},
      {value:'grocery-store',label:'Grocery Store',sortKey:'03-BACKGROUND-GROCERY-STORE',src:'/assets/images/dv03/layers/DV03-L4-GROCERY-STORE-BACKGROUND-DRAFT-v1.png',draft:true},
      {value:'library',label:'Library',sortKey:'03-BACKGROUND-LIBRARY',src:'/assets/images/dv03/layers/DV03-L5-LIBRARY-BACKGROUND-DRAFT-v1.png',draft:true},
      {value:'snack-run',label:'Snack Run',sortKey:'03-BACKGROUND-SNACK-RUN',src:'/assets/images/dv03/layers/DV03-L6-SNACK-RUN-BACKGROUND-DRAFT-v1.png',draft:true},
      {value:'car-wash',label:'Car Wash',sortKey:'03-BACKGROUND-CAR-WASH',src:'/assets/images/dv03/layers/DV03-L7-CAR-WASH-BACKGROUND-DRAFT-v1.png',draft:true},
      {value:'gas-station',label:'Gas Station',sortKey:'03-BACKGROUND-GAS-STATION',src:'/assets/images/dv03/layers/DV03-L8-GAS-STATION-BACKGROUND-DRAFT-v1.png',draft:true}]},
    {key:'04',id:'sign',label:'Sign',options:[{value:'off',label:'OFF'},{value:'base',label:'Milestone',sortKey:'04-SIGN-MILESTONE',assetId:'DV-UX-DV03-MILESTONE-SIGN'}]},
    {key:'05',id:'cockpit',label:'Cockpit',options:[{value:'off',label:'OFF'},{value:'base',label:'Default',sortKey:'05-COCKPIT-STANDARD',assetId:'DV-UX-DV03-COCKPIT-FRAME'}]},
    {key:'06',id:'hud',label:'HUD',options:[{value:'off',label:'OFF'},{value:'base',label:'Default',sortKey:'06-HUD-STANDARD'}]},
    {key:'07',id:'hero',label:'Hero',options:[{value:'off',label:'OFF'},{value:'base',label:'Current Driver',sortKey:'07-HERO-CURRENT'}]}
  ]);
  const state=Object.fromEntries(LAYERS.map(layer=>[layer.id,'base']));
  const show=(element,visible)=>{if(element)element.hidden=!visible};
  const setStatus=text=>{if(status)status.textContent=text||''};
  const currentFrameModel=()=>frame?.contentWindow?.DV_LOG_APP?.getModel?.()||null;
  const currentDriverId=()=>frame?.contentWindow?.DV_LOG_APP?.getDriverId?.()||'';
  const optionFor=(layerId,value)=>LAYERS.find(layer=>layer.id===layerId)?.options.find(option=>option.value===value)||null;

  function syncHarnessToUX(){
    if(!frameReady||!harness||!frame?.contentDocument)return;
    cancelAnimationFrame(anchorRaf);
    anchorRaf=requestAnimationFrame(()=>{
      const windshield=frame.contentDocument.querySelector('.dv03-windshield');
      if(!windshield){harness.classList.remove('is-ux-anchored');return}
      const frameRect=frame.getBoundingClientRect();
      const uxRect=windshield.getBoundingClientRect();
      const visible=uxRect.bottom>0&&uxRect.top<frameRect.height;
      harness.classList.toggle('is-ux-anchored',visible);
      if(!visible)return;
      const margin=window.innerWidth<=760?6:12;
      const top=frameRect.top+uxRect.top+margin;
      const right=frameRect.left+uxRect.right-margin;
      const width=harness.offsetWidth||Math.min(390,window.innerWidth-2*margin);
      const maxLeft=Math.max(margin,window.innerWidth-width-margin);
      harness.style.top=`${Math.max(margin,top)}px`;
      harness.style.left=`${Math.max(margin,Math.min(maxLeft,right-width))}px`;
    });
  }

  function renderHarness(){
    rows.innerHTML=LAYERS.map(layer=>`<section class="uat-layer-row" data-layer-row="${layer.id}"><div class="uat-layer-label"><b>${layer.key} · ${layer.label}</b><small>${optionFor(layer.id,state[layer.id])?.sortKey||'OFF'}</small></div><div class="uat-layer-options">${layer.options.map(option=>`<button type="button" class="uat-option" data-layer="${layer.id}" data-value="${option.value}" aria-pressed="${state[layer.id]===option.value}">${option.label}${option.draft?' · DRAFT':''}</button>`).join('')}</div></section>`).join('');
    rows.querySelectorAll('.uat-option').forEach(button=>button.addEventListener('click',()=>{mode='manual';state[button.dataset.layer]=button.dataset.value;applyLayers();renderHarness()}));
    syncHarnessToUX();
  }

  function ensureFrameSafety(doc){
    if(doc.getElementById('bklg-0128-uat-style'))return;
    const style=doc.createElement('style');
    style.id='bklg-0128-uat-style';
    style.textContent=`
      .dv03-windshield{background:#000!important}
      .dv03-sky,.dv03-landscape,.dv03-scene-layer{background-repeat:no-repeat!important;background-position:center!important;background-size:100% 100%!important;image-rendering:pixelated}
      .dv03-sky{z-index:1!important}
      .bklg0128-road-layer{position:absolute;inset:0;z-index:2!important;pointer-events:none}
      .bklg0128-road-layer .dv03-road{display:block!important}
      .dv03-landscape,.dv03-scene-layer{z-index:3!important;overflow:hidden}
      .dv03-sign-layer{z-index:4!important}
      .dv03-cockpit-frame-layer{z-index:5!important}
      .dv03-hero-layer{z-index:7!important}
    `;
    doc.head.appendChild(style);
    doc.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();window.alert('Drive/vehicle writes are disabled in the BKLG-0128 layer UAT route.');},true);
    doc.addEventListener('click',event=>{if(event.target.closest?.('[data-archive-vehicle],[data-delete-drive],[data-soft-delete-drive]')){event.preventDefault();event.stopImmediatePropagation();window.alert('Destructive actions are disabled in the BKLG-0128 layer UAT route.');}},true);
  }

  function ensureRoadLayer(doc){
    let layer=doc.getElementById('bklg0128-road-layer');
    if(layer)return layer;
    const windshield=doc.querySelector('.dv03-windshield');
    const source=doc.querySelector('.dv03-road');
    if(!windshield||!source)return null;
    layer=doc.createElement('div');layer.id='bklg0128-road-layer';layer.className='bklg0128-road-layer';
    const clone=source.cloneNode(true);clone.removeAttribute('id');layer.appendChild(clone);
    const scene=doc.getElementById('dv03-scene-layer');
    const landscape=doc.querySelector('.dv03-landscape');
    windshield.insertBefore(layer,scene||landscape||null);
    source.style.display='none';
    return layer;
  }

  function setLayerBackground(container,option){
    if(!container)return;
    container.querySelectorAll('.bklg0128-layer-image').forEach(node=>node.remove());
    container.style.backgroundImage=option?.src?`url("${option.src}")`:'';
  }

  function applyLayers(){
    if(!frameReady)return;
    const doc=frame.contentDocument;if(!doc)return;
    ensureFrameSafety(doc);
    const sky=doc.querySelector('.dv03-sky');
    const landscape=doc.querySelector('.dv03-landscape');
    const scene=doc.getElementById('dv03-scene-layer');
    const roadLayer=ensureRoadLayer(doc);
    const sign=doc.querySelector('.dv03-sign-layer');
    const cockpit=doc.querySelector('.dv03-cockpit-frame-layer');
    const hero=doc.querySelector('.dv03-hero-layer');
    const hud=[doc.querySelector('.cockpit-title'),doc.querySelector('.dash-status'),doc.querySelector('.cockpit-controls')].filter(Boolean);
    const skyValue=state.sky,backgroundValue=state.background;

    if(sky){
      sky.style.display=skyValue==='off'?'none':'block';
      sky.querySelectorAll('.dv03-cloud').forEach(node=>node.style.display=skyValue==='base'?'':'none');
      setLayerBackground(sky,skyValue==='night'?optionFor('sky','night'):null);
    }
    if(roadLayer)roadLayer.style.display=state.road==='base'?'block':'none';
    if(landscape)landscape.style.display=backgroundValue==='base'?'block':'none';
    if(scene){
      scene.style.display=backgroundValue==='off'?'none':'block';
      const selectedBackground=backgroundValue==='base'||backgroundValue==='off'?null:optionFor('background',backgroundValue);
      setLayerBackground(scene,selectedBackground);
    }
    if(sign)sign.style.display=state.sign==='base'?'block':'none';
    if(cockpit)cockpit.style.display=state.cockpit==='base'?'block':'none';
    hud.forEach(node=>node.style.display=state.hud==='base'?'':'none');
    if(hero)hero.style.display=state.hero==='base'?'block':'none';

    const driver=currentFrameModel()?.drivers?.find(row=>row.id===currentDriverId());
    const selected=LAYERS.map(layer=>`${layer.key}:${state[layer.id]}`).join(' · ');
    setStatus(`${driver?.display_name||'Driver'} · ${mode==='live'?'Driver/live':'manual'} · ${selected}`);
    syncHarnessToUX();
  }

  function resetBase(live=false){LAYERS.forEach(layer=>state[layer.id]='base');mode=live?'live':'manual';applyLayers();renderHarness()}
  function bindFrame(){
    frameReady=true;
    ensureFrameSafety(frame.contentDocument);
    ensureRoadLayer(frame.contentDocument);
    const win=frame.contentWindow;
    win.addEventListener('dv:dashboard-rendered',()=>{applyLayers();syncHarnessToUX()});
    win.addEventListener('dv:driver-changing',()=>setTimeout(()=>{applyLayers();syncHarnessToUX()},0));
    win.addEventListener('scroll',syncHarnessToUX,{passive:true});
    win.addEventListener('resize',syncHarnessToUX,{passive:true});
    window.addEventListener('resize',syncHarnessToUX,{passive:true});
    const windshield=frame.contentDocument.querySelector('.dv03-windshield');
    if(windshield&&window.ResizeObserver)new ResizeObserver(syncHarnessToUX).observe(windshield);
    applyLayers();syncHarnessToUX();
  }

  document.querySelectorAll('[data-uat-preset]').forEach(button=>button.addEventListener('click',()=>resetBase(button.dataset.uatPreset==='live')));
  collapse?.addEventListener('click',()=>{const collapsed=harness.classList.toggle('is-collapsed');collapse.textContent=collapsed?'+':'−';collapse.setAttribute('aria-expanded',String(!collapsed));syncHarnessToUX()});
  frame.addEventListener('load',bindFrame);
  renderHarness();

  async function authorize(){
    if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey)throw new Error('Supabase configuration is unavailable.');
    const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.DV_SUPABASE_CLIENT=client;
    const {data:{session}}=await client.auth.getSession();
    if(!session){show(checking,false);show(denied,true);document.getElementById('uat-denied-detail').innerHTML='Sign in through the <a href="/log/">current Driver Console</a>, then return to this UAT URL.';return}
    const {data,error}=await client.rpc('get_authenticated_dashboard_v1');
    if(error||!data?.ok)throw new Error(error?.message||data?.error||'Unable to verify operator access.');
    if(data.is_operator!==true){show(checking,false);show(denied,true);return}
    document.documentElement.dataset.bklg0128Authorized='true';show(checking,false);show(denied,false);show(shell,true);frame.src='/log/';
  }
  authorize().catch(error=>{show(checking,false);show(denied,true);document.getElementById('uat-denied-detail').textContent=error.message||'Unable to verify operator access.'});
  window.DV_BKLG_0128_UAT=Object.freeze({LAYERS,state,applyLayers,resetBase,syncHarnessToUX});
})();
