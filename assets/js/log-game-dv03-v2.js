(() => {
  if (document.documentElement.dataset.dvRoute !== 'dv03v2') return;

  const RECENCY_MS = 14 * 86400000;
  const STORAGE_KEY = 'dv.dv03v2.scene-overrides';
  const ZONES = Object.freeze([
    {key:'sky',label:'Sky',assets:['S1']},
    {key:'weather',label:'Weather',assets:['S2','S3']},
    {key:'accent',label:'Sky accent',assets:['S4']},
    {key:'road',label:'Road surface',assets:['R1','R2','R3']},
    {key:'destination',label:'Destination',assets:['L1','L2','L3','L4','L5','L6','L7','L8','L9','L10']},
    {key:'billboard',label:'Billboard',assets:['M2']},
    {key:'roadwork',label:'Road work',assets:['R7']}
  ]);
  const ASSETS = Object.freeze([
    {id:'S1',zone:'sky',label:'Night sky',src:'/assets/images/dv03/world/s1-night-sky.png'},
    {id:'S2',zone:'weather',label:'Rain',src:'/assets/images/dv03/world/s2-rain.png'},
    {id:'S3',zone:'weather',label:'Snow',src:'/assets/images/dv03/world/s3-snow.png'},
    {id:'S4',zone:'accent',label:'Night Owl',src:'/assets/images/dv03/world/s4-night-owl.png'},
    {id:'R1',zone:'road',label:'Wet road',src:'/assets/images/dv03/world/r1-wet-road.svg'},
    {id:'R2',zone:'road',label:'Snow / slush road',src:'/assets/images/dv03/world/r2-snow-road.png'},
    {id:'R3',zone:'road',label:'Icy / slick road',src:'/assets/images/dv03/world/r3-ice-road.png'},
    {id:'R7',zone:'roadwork',label:'Construction',src:'/assets/images/dv03/world/r7-construction.png',questKeys:['Q000012'],tier:3},
    {id:'M2',zone:'billboard',label:'Achievement billboard',src:'/assets/images/dv03/world/m2-billboard.png',tier:4},
    {id:'L1',zone:'destination',label:'Park',src:'/assets/images/dv03/world/l1-park.png',questKeys:['Q000035'],tier:2},
    {id:'L2',zone:'destination',label:'School',src:'/assets/images/dv03/world/l2-school.png',questKeys:['Q000036'],tier:2},
    {id:'L3',zone:'destination',label:"Grandma's house",src:'/assets/images/dv03/world/l3-grandmas-house.png',questKeys:['Q000037'],tier:2},
    {id:'L4',zone:'destination',label:'Grocery store',src:'/assets/images/dv03/world/l4-grocery-store.png',questKeys:['Q000038'],tier:2},
    {id:'L5',zone:'destination',label:'Library',src:'/assets/images/dv03/world/l5-library.png',questKeys:['Q000039'],tier:2},
    {id:'L6',zone:'destination',label:'Snack stop',src:'/assets/images/dv03/world/l6-snack-stop.png',questKeys:['Q000017','Q000043'],tier:2},
    {id:'L7',zone:'destination',label:'Car wash',src:'/assets/images/dv03/world/l7-car-wash.png',questKeys:['Q000044'],tier:2},
    {id:'L8',zone:'destination',label:'Gas station',src:'/assets/images/dv03/world/l8-gas-station.png',questKeys:['Q000046'],tier:2},
    {id:'L9',zone:'destination',label:'Neighborhood',src:'/assets/images/dv03/world/l9-neighborhood.png',questKeys:['Q000065'],tier:2},
    {id:'L10',zone:'destination',label:'Adventure horizon',src:'/assets/images/dv03/world/l10-adventure-horizon.png',questKeys:['Q000068','Q000069','Q000070'],tier:2}
  ]);
  const byId = new Map(ASSETS.map(asset => [asset.id,asset]));
  const state = {
    detail:null,
    weather:{available:false,summary:'Weather pending',road:'Conditions pending',skyMode:'clear',roadMode:'normal'},
    night:{available:false,isNight:false},
    overrides:loadOverrides()
  };

  function loadOverrides(){
    try {
      const value=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'null');
      return value&&typeof value==='object'?value:{};
    } catch (_) {
      return {};
    }
  }
  function saveOverrides(){
    try {
      if(Object.keys(state.overrides).length)sessionStorage.setItem(STORAGE_KEY,JSON.stringify(state.overrides));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }
  function esc(value){
    return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function recentAwards(){
    const cutoff=Date.now()-RECENCY_MS,detail=state.detail;
    return (detail?.model?.quest_awards||[]).filter(row=>row.driver_id===detail.driverId&&Date.parse(row.awarded_at)>=cutoff);
  }
  function awardTier(row){
    const key=String(row.quest_key||'');
    if(['Q000001','Q000002','Q000003','Q000004','Q000005','Q000006','Q000007','Q000008','Q000009','Q000010'].includes(key))return 4;
    if(['Q000012','Q000014','Q000028','Q000048','Q000049'].includes(key))return 3;
    return 1;
  }
  function rankAwards(rows){
    return [...rows].sort((a,b)=>{
      const tierDiff=awardTier(b)-awardTier(a);if(tierDiff)return tierDiff;
      const dateDiff=Date.parse(b.awarded_at)-Date.parse(a.awarded_at);if(dateDiff)return dateDiff;
      const rarityDiff=Number(b.quest?.repeatable===false)-Number(a.quest?.repeatable===false);if(rarityDiff)return rarityDiff;
      const xpDiff=Number(b.xp_awarded||b.quest?.xp||0)-Number(a.xp_awarded||a.quest?.xp||0);if(xpDiff)return xpDiff;
      return String(a.quest_key||'').localeCompare(String(b.quest_key||''));
    });
  }
  function matchingAsset(zone,row){
    return ASSETS.find(asset=>asset.zone===zone&&asset.questKeys?.includes(row.quest_key))||null;
  }
  function autoSelection(){
    const awards=recentAwards(),used=new Set();
    const destinationRows=rankAwards(awards.filter(row=>matchingAsset('destination',row)));
    const destinationAward=destinationRows[0]||null;
    const destination=destinationAward?matchingAsset('destination',destinationAward).id:null;
    if(destinationAward)used.add(destinationAward);
    const roadworkAward=rankAwards(awards.filter(row=>matchingAsset('roadwork',row)))[0]||null;
    if(roadworkAward)used.add(roadworkAward);
    const billboardAward=rankAwards(awards.filter(row=>!used.has(row)))[0]||null;
    return {
      sky:state.night.isNight?'S1':null,
      weather:state.weather.skyMode==='snow'?'S3':(state.weather.skyMode==='rain'?'S2':null),
      accent:state.night.isNight?'S4':null,
      road:state.weather.roadMode==='ice'?'R3':(state.weather.roadMode==='snow'?'R2':(state.weather.roadMode==='wet'?'R1':null)),
      destination,
      billboard:billboardAward?'M2':null,
      billboardAward,
      roadwork:roadworkAward?'R7':null
    };
  }
  function resolvedSelection(){
    const auto=autoSelection(),result={...auto};
    for(const zone of ZONES){
      const override=state.overrides[zone.key];
      if(override===undefined||override==='auto')continue;
      result[zone.key]=override==='none'?null:override;
    }
    return result;
  }
  function renderAsset(layerId,assetId,copy){
    const layer=document.getElementById(layerId);if(!layer)return;
    layer.replaceChildren();delete layer.dataset.dvAsset;
    if(!assetId)return;
    const asset=byId.get(assetId);if(!asset)return;
    const image=document.createElement('img');
    image.className='dv03-world-asset';
    image.src=asset.src;image.alt='';image.dataset.dvAssetImage=asset.id;
    image.addEventListener('error',()=>{image.hidden=true;layer.dataset.dvAssetMissing='true'},{once:true});
    layer.appendChild(image);layer.dataset.dvAsset=asset.id;delete layer.dataset.dvAssetMissing;
    if(assetId==='M2'){
      const label=document.createElement('span');
      label.className='dv03-billboard-copy';
      label.textContent=copy||'ACHIEVEMENT';
      layer.appendChild(label);
    }
  }
  function render(){
    const selection=resolvedSelection(),windshield=document.querySelector('.dv03-windshield');
    renderAsset('dv03-sky-treatment-layer',selection.sky);
    renderAsset('dv03-weather-layer',selection.weather);
    renderAsset('dv03-accent-layer',selection.accent);
    renderAsset('dv03-road-treatment-layer',selection.road);
    renderAsset('dv03-destination-layer',selection.destination);
    renderAsset('dv03-billboard-layer',selection.billboard,selection.billboardAward?.quest?.name||selection.billboardAward?.quest_key);
    renderAsset('dv03-scene-layer',selection.roadwork);
    if(windshield){
      windshield.dataset.dvSceneMode=Object.keys(state.overrides).length?'override':'driver';
      windshield.dataset.dvSceneAssets=ZONES.map(zone=>selection[zone.key]).filter(Boolean).join(',');
    }
    syncHarness(selection);
  }
  function currentEnvironmentLabel(){
    const phase=state.night.available?(state.night.isNight?'Night':'Day'):'Day/night unavailable';
    const weather=state.weather.summary||'Weather unavailable';
    const road=state.weather.road||'Road unavailable';
    return phase+' · '+weather+' · '+road;
  }
  function buildHarness(){
    const fields=document.getElementById('dv03-harness-fields');if(!fields)return;
    fields.innerHTML=ZONES.map(zone=>{
      const options=zone.assets.map(id=>'<option value="'+id+'">'+esc(id+' — '+byId.get(id).label)+'</option>').join('');
      return '<label><span>'+esc(zone.label)+'</span><select data-dv-zone="'+esc(zone.key)+'"><option value="auto">Auto</option><option value="none">None</option>'+options+'</select></label>';
    }).join('');
    fields.querySelectorAll('select').forEach(select=>select.addEventListener('change',()=>{
      const zone=select.dataset.dvZone;
      if(select.value==='auto')delete state.overrides[zone];else state.overrides[zone]=select.value;
      saveOverrides();render();
    }));
  }
  function syncHarness(){
    const label=document.getElementById('dv03-current-environment');if(label)label.textContent=currentEnvironmentLabel();
    document.querySelectorAll('[data-dv-zone]').forEach(select=>{select.value=state.overrides[select.dataset.dvZone]||'auto'});
  }
  function setPanel(open){
    const panel=document.getElementById('dv03-harness-panel'),toggle=document.getElementById('dv03-harness-toggle');
    if(panel)panel.hidden=!open;if(toggle)toggle.setAttribute('aria-expanded',String(open));
  }
  function resetBase(){
    state.overrides=Object.fromEntries(ZONES.map(zone=>[zone.key,'none']));
    saveOverrides();render();
  }
  function resetDriver(){
    state.overrides={};saveOverrides();render();
  }

  buildHarness();
  document.getElementById('dv03-harness-toggle')?.addEventListener('click',event=>setPanel(event.currentTarget.getAttribute('aria-expanded')!=='true'));
  document.getElementById('dv03-harness-close')?.addEventListener('click',()=>setPanel(false));
  document.getElementById('dv03-reset-base')?.addEventListener('click',resetBase);
  document.getElementById('dv03-reset-driver')?.addEventListener('click',resetDriver);
  window.addEventListener('dv:driver-changing',()=>{state.detail=null;state.weather={available:false,summary:'Weather pending',road:'Conditions pending',skyMode:'clear',roadMode:'normal'};state.night={available:false,isNight:false};resetDriver()});
  window.addEventListener('dv:dashboard-rendered',event=>{state.detail=event.detail;render()});
  window.addEventListener('dv:environment-weather',event=>{if(state.detail&&event.detail?.driverId!==state.detail.driverId)return;state.weather={...state.weather,...event.detail};render()});
  window.addEventListener('dv:environment-night',event=>{if(state.detail&&event.detail?.driverId!==state.detail.driverId)return;state.night={...state.night,...event.detail};render()});
  window.DV_GAME_DV03_V2=Object.freeze({ASSETS,ZONES,autoSelection,resolvedSelection,render,resetBase,resetDriver});
})();
