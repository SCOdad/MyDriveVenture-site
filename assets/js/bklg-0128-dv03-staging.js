(() => {
  if(document.documentElement.dataset.dvRoute!=='bklg0128uat')return;
  const cfg=window.DV_APP_CONFIG||{};
  const checking=document.getElementById('uat-checking');
  const denied=document.getElementById('uat-denied');
  const shell=document.getElementById('uat-shell');
  const frame=document.getElementById('uat-frame');
  const status=document.getElementById('uat-scene-status');
  const buttons=[...document.querySelectorAll('[data-uat-scene]')];
  const RECENCY_MS=14*86400000;
  const SCENES=Object.freeze({
    park:{questKey:'Q000035',label:'Park',src:'/assets/images/dv03/world/l1-park.png',priority:1},
    construction:{questKey:'Q000012',label:'Construction',src:'/assets/images/dv03/world/r7-construction.png',priority:2}
  });
  let override='auto';
  let frameReady=false;

  const setStatus=text=>{if(status)status.textContent=text||''};
  const show=(element,visible)=>{if(element)element.hidden=!visible};
  const parseTime=value=>{const time=Date.parse(value||'');return Number.isFinite(time)?time:0};

  function currentFrameModel(){return frame?.contentWindow?.DV_LOG_APP?.getModel?.()||null}
  function currentDriverId(){return frame?.contentWindow?.DV_LOG_APP?.getDriverId?.()||''}
  function eligibleAwards(model,driverId){
    const cutoff=Date.now()-RECENCY_MS;
    const keys=new Set(Object.values(SCENES).map(scene=>scene.questKey));
    return (model?.quest_awards||[]).filter(row=>row.driver_id===driverId&&keys.has(row.quest_key)&&parseTime(row.awarded_at)>=cutoff);
  }
  function automaticScene(model,driverId){
    const rows=eligibleAwards(model,driverId).sort((a,b)=>{
      const dateDiff=parseTime(b.awarded_at)-parseTime(a.awarded_at);if(dateDiff)return dateDiff;
      const pa=Object.values(SCENES).find(scene=>scene.questKey===a.quest_key)?.priority||0;
      const pb=Object.values(SCENES).find(scene=>scene.questKey===b.quest_key)?.priority||0;
      if(pb!==pa)return pb-pa;
      return String(a.quest_key).localeCompare(String(b.quest_key));
    });
    if(!rows.length)return null;
    return Object.entries(SCENES).find(([,scene])=>scene.questKey===rows[0].quest_key)?.[0]||null;
  }
  function resolvedScene(){
    if(override==='neutral')return null;
    if(override!=='auto')return SCENES[override]?override:null;
    return automaticScene(currentFrameModel(),currentDriverId());
  }
  function ensureFrameSafety(doc){
    if(doc.getElementById('bklg-0128-uat-style'))return;
    const style=doc.createElement('style');
    style.id='bklg-0128-uat-style';
    style.textContent='.dv03-scene-layer{overflow:hidden;z-index:5}.dv03-scene-layer .bklg0128-scene{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;image-rendering:pixelated}.dv03-scene-layer[data-bklg0128-scene="neutral"]{display:block}';
    doc.head.appendChild(style);
    doc.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();window.alert('Drive/vehicle writes are disabled in the BKLG-0128 scenery UAT route.');},true);
    doc.addEventListener('click',event=>{
      if(event.target.closest?.('[data-archive-vehicle],[data-delete-drive],[data-soft-delete-drive]')){event.preventDefault();event.stopImmediatePropagation();window.alert('Destructive actions are disabled in the BKLG-0128 scenery UAT route.');}
    },true);
  }
  function render(){
    if(!frameReady)return;
    const doc=frame.contentDocument;if(!doc)return;
    ensureFrameSafety(doc);
    const layer=doc.getElementById('dv03-scene-layer');if(!layer)return;
    const sceneKey=resolvedScene();
    layer.replaceChildren();
    layer.dataset.bklg0128Scene=sceneKey||'neutral';
    if(sceneKey){
      const scene=SCENES[sceneKey];
      const image=doc.createElement('img');image.className='bklg0128-scene';image.src=scene.src;image.alt='';image.dataset.bklg0128Asset=sceneKey;layer.appendChild(image);
    }
    const driver=currentFrameModel()?.drivers?.find(row=>row.id===currentDriverId());
    const mode=override==='auto'?'auto/live':'manual preview';
    setStatus(`${driver?.display_name||'Driver'} · ${sceneKey?SCENES[sceneKey].label:'Neutral'} · ${mode}`);
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.uatScene===override)));
  }
  function bindFrame(){
    frameReady=true;
    const win=frame.contentWindow;
    ensureFrameSafety(frame.contentDocument);
    win.addEventListener('dv:dashboard-rendered',()=>render());
    win.addEventListener('dv:driver-changing',()=>setTimeout(render,0));
    render();
  }
  buttons.forEach(button=>button.addEventListener('click',()=>{override=button.dataset.uatScene||'auto';render()}));
  frame.addEventListener('load',bindFrame);

  async function authorize(){
    if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey)throw new Error('Supabase configuration is unavailable.');
    const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    window.DV_SUPABASE_CLIENT=client;
    const {data:{session}}=await client.auth.getSession();
    if(!session){show(checking,false);show(denied,true);document.getElementById('uat-denied-detail').innerHTML='Sign in through the <a href="/log/">current Driver Console</a>, then return to this UAT URL.';return}
    const {data,error}=await client.rpc('get_authenticated_dashboard_v1');
    if(error||!data?.ok)throw new Error(error?.message||data?.error||'Unable to verify operator access.');
    if(data.is_operator!==true){show(checking,false);show(denied,true);return}
    document.documentElement.dataset.bklg0128Authorized='true';
    show(checking,false);show(denied,false);show(shell,true);
    frame.src='/log/';
  }
  authorize().catch(error=>{show(checking,false);show(denied,true);document.getElementById('uat-denied-detail').textContent=error.message||'Unable to verify operator access.'});
  window.DV_BKLG_0128_UAT=Object.freeze({SCENES,eligibleAwards,automaticScene,render});
})();
