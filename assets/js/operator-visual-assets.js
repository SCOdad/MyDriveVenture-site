(() => {
  const cfg=window.DV_APP_CONFIG||{};
  const registry=window.DV03_VISUAL_ASSET_REGISTRY;
  const checking=document.getElementById('visual-checking');
  const denied=document.getElementById('visual-denied');
  const shell=document.getElementById('visual-shell');
  const grid=document.getElementById('asset-grid');
  const detail=document.getElementById('asset-detail');
  const layerFilter=document.getElementById('layer-filter');
  const themeFilter=document.getElementById('theme-filter');
  const search=document.getElementById('asset-search');
  let selectedId=null;
  let calendarTheme='normal';
  let questMetadata=new Map();

  const show=(el,value)=>{if(el)el.hidden=!value};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function themeName(id){return registry.themes.find(theme=>theme.id===id)?.label||id}
  function layerName(id){return registry.layers.find(layer=>layer.id===id)?.label||id}
  function hasQuestMapping(asset){return asset.layer!=='background'||(asset.questKeys||[]).length>0}
  function questMarkup(asset){
    const keys=asset.questKeys||[];
    if(asset.layer!=='background')return 'Not applicable';
    if(!keys.length)return '<span class="construction-text">NOT CONNECTED TO A QUEST</span>';
    return keys.map(key=>{
      const q=questMetadata.get(key);
      if(!q)return `<span class="quest-missing">${esc(key)} · definition not found</span>`;
      return `<span class="${q.active===false?'quest-inactive':''}">${esc(key)} · ${esc(q.name||'Unnamed quest')}${q.active===false?' (inactive)':''}</span>`;
    }).join('<br>');
  }
  function codePreview(asset){
    if(asset.composer?.type==='sky-day')return '<div class="code-thumb">Code-native<br>Day sky</div>';
    if(asset.composer?.type==='milestone-sign')return '<div class="code-thumb">Code-native<br>Milestone sign</div>';
    if(asset.composer?.type==='hud')return '<div class="code-thumb">Code-native<br>HUD</div>';
    return '<div class="code-thumb">Code-native asset</div>';
  }
  function previewMarkup(asset,large=false){
    if(asset.kind==='image'&&asset.src)return `<img src="${esc(asset.src)}" alt="${esc(asset.name)} preview" loading="${large?'eager':'lazy'}">`;
    return codePreview(asset);
  }
  function filteredAssets(){
    const layer=layerFilter.value,theme=themeFilter.value,q=search.value.trim().toLowerCase();
    let result=registry.assets.filter(asset=>{
      if(layer!=='all'&&asset.layer!==layer)return false;
      if(theme!=='all'&&theme!=='calendar'&&asset.theme!==theme)return false;
      if(theme==='calendar'&&asset.theme!==calendarTheme&&asset.theme!=='normal')return false;
      if(q&&!([asset.assetId,asset.name,asset.status,asset.file,asset.slot,asset.notes].join(' ').toLowerCase().includes(q)))return false;
      return true;
    });
    if(theme==='calendar'&&calendarTheme!=='normal'){const themed=new Set(result.filter(a=>a.theme===calendarTheme).map(a=>a.layer+'|'+(a.slot||a.name)));result=result.filter(a=>a.theme===calendarTheme||!themed.has(a.layer+'|'+(a.slot||a.name)));}
    return result.sort((a,b)=>{
      const la=(registry.layers.find(x=>x.id===a.layer)?.order||99)-(registry.layers.find(x=>x.id===b.layer)?.order||99);
      return la||String(a.slot||a.name).localeCompare(String(b.slot||b.name));
    });
  }
  function renderGallery(){
    const assets=filteredAssets();
    grid.innerHTML=assets.length?assets.map(asset=>`<button type="button" class="asset-card ${asset.assetId===selectedId?'selected':''}" data-asset-id="${esc(asset.assetId)}">
      <div class="asset-thumb">${previewMarkup(asset)}</div>
      <div class="asset-title">${esc(asset.slot?asset.slot+' · ':'')}${esc(asset.name)}</div>
      <div class="asset-sub">${esc(layerName(asset.layer))} · ${esc(themeName(asset.theme))}</div>
      ${hasQuestMapping(asset)?`<span class="badge ${asset.locked?'locked':''}">${esc(asset.status)}</span>`:'<span class="badge construction">NOT CONNECTED TO A QUEST</span>'}
    </button>`).join(''):'<div class="empty">No assets match these filters. Halloween and later seasonal variants will appear here as they are registered.</div>';
    grid.querySelectorAll('[data-asset-id]').forEach(card=>card.onclick=()=>selectAsset(card.dataset.assetId));
    const visible=assets.some(asset=>asset.assetId===selectedId);
    if(!visible&&assets[0])selectAsset(assets[0].assetId,false);
    document.getElementById('asset-count').textContent=`${assets.length} shown · ${registry.assets.length} registered`;
  }
  function variantsFor(asset){
    return registry.assets.filter(candidate=>candidate.assetId!==asset.assetId&&(candidate.parentAssetId===asset.assetId||candidate.baseAssetId===asset.assetId||asset.parentAssetId===candidate.assetId||candidate.name===asset.name&&candidate.layer===asset.layer));
  }
  function selectAsset(assetId,rerender=true){
    const asset=registry.find(assetId);if(!asset)return;
    selectedId=assetId;
    const variants=variantsFor(asset);
    detail.innerHTML=`<h2>${esc(asset.name)}</h2>
      <div class="detail-preview">${previewMarkup(asset,true)}</div>
      <dl class="detail-grid">
        <dt>Asset ID</dt><dd><code>${esc(asset.assetId)}</code></dd>
        <dt>Layer</dt><dd>${esc(layerName(asset.layer))}</dd>
        <dt>Theme</dt><dd>${esc(themeName(asset.theme))}</dd>
        <dt>Status</dt><dd>${esc(asset.status||'—')}</dd>
        <dt>Slot</dt><dd>${esc(asset.slot||'—')}</dd>
        <dt>File</dt><dd>${esc(asset.file||'Code-native / no standalone file')}</dd>
        <dt>Dimensions</dt><dd>${esc(asset.dimensions||'—')}</dd>
        <dt>Aspect</dt><dd>${esc(asset.aspect||'—')}</dd>
        <dt>Background</dt><dd>${esc(asset.background||'—')}</dd>
        <dt>Locked</dt><dd>${asset.locked?'Yes':'No / reference'}</dd>
        <dt>Seasonal Hero?</dt><dd>${asset.layer==='hero'?'No — Hero identity remains canonical':'Not applicable'}</dd>
        <dt>Related variants</dt><dd>${variants.length?variants.map(v=>esc(themeName(v.theme))).join(', '):'None registered yet'}</dd>
        <dt>Quest mapping</dt><dd>${questMarkup(asset)}</dd>
        <dt>Notes</dt><dd>${esc(asset.notes||'—')}</dd>
      </dl>
      <div class="detail-actions">
        ${asset.src?`<a class="buttonish" href="${esc(asset.src)}" target="_blank" rel="noopener">Open actual asset</a>`:''}
        <button class="buttonish" id="use-in-composer" type="button">Use in composer</button>
      </div>`;
    document.getElementById('use-in-composer').onclick=()=>setComposerAsset(asset);
    if(rerender)renderGallery();
  }
  function setupFilters(){
    layerFilter.innerHTML='<option value="all">All layers</option>'+registry.layers.map(layer=>`<option value="${esc(layer.id)}">${esc(layer.label)}</option>`).join('');
    themeFilter.innerHTML='<option value="all">All themes</option><option value="calendar">Calendar preview</option>'+registry.themes.map(theme=>`<option value="${esc(theme.id)}">${esc(theme.label)}${theme.future?' (future)':''}</option>`).join('');
    document.getElementById('theme-strip').innerHTML=registry.themes.map(theme=>`<span class="theme-chip ${theme.future?'future':''}" data-level="${esc(theme.level)}">${esc(theme.label)} · ${registry.assets.filter(asset=>asset.theme===theme.id).length}</span>`).join('');
    layerFilter.onchange=renderGallery;themeFilter.onchange=renderGallery;search.oninput=renderGallery;
  }

  const composerSelects=new Map();
  function setupComposer(){
    const host=document.getElementById('composer-controls');
    host.innerHTML=registry.layers.map(layer=>`<label>${esc(layer.label)}<select data-composer-layer="${esc(layer.id)}"></select></label>`).join('');
    host.querySelectorAll('[data-composer-layer]').forEach(select=>{
      const layer=select.dataset.composerLayer;
      composerSelects.set(layer,select);
      const assets=registry.byLayer(layer);
      select.innerHTML='<option value="">None</option>'+assets.map(asset=>`<option value="${esc(asset.assetId)}">${esc(themeName(asset.theme))} · ${esc(asset.name)}</option>`).join('');
      select.onchange=renderComposer;
    });
    const defaults={
      sky:'DV-UX-DV03-SKY-DAY-CODE',
      background:'DV-UX-DV03-BACKGROUND-PARK',
      sign:'DV-UX-DV03-MILESTONE-SIGN',
      cockpit:'DV-UX-DV03-COCKPIT-FRAME',
      hud:'DV-UX-DV03-HUD',
      hero:'DV-CHAR-PARKER-DV03-HERO'
    };
    Object.entries(defaults).forEach(([layer,id])=>{const select=composerSelects.get(layer);if(select&&[...select.options].some(option=>option.value===id))select.value=id});
    renderComposer();
  }
  function setComposerAsset(asset){
    const select=composerSelects.get(asset.layer);if(!select)return;
    select.value=asset.assetId;renderComposer();
    document.getElementById('composer-title').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function layerZ(layer){return registry.layers.find(item=>item.id===layer)?.order||0}
  function renderComposer(){
    const stage=document.getElementById('composer-stage');
    const selected=[...composerSelects.entries()].map(([layer,select])=>registry.find(select.value)).filter(Boolean).sort((a,b)=>layerZ(a.layer)-layerZ(b.layer));
    const pieces=[];
    selected.forEach(asset=>{
      const z=layerZ(asset.layer);
      if(asset.kind==='image'&&asset.src){
        const cls=['stage-layer',asset.layer==='cockpit'?'cockpit':'',asset.layer==='hero'?'hero':''].filter(Boolean).join(' ');
        pieces.push(`<img class="${cls}" style="z-index:${z}" src="${esc(asset.src)}" alt="" aria-hidden="true">`);
      }else if(asset.composer?.type==='sky-day'){
        pieces.push(`<div class="stage-code-sky" style="z-index:${z}" aria-hidden="true"></div>`);
      }else if(asset.composer?.type==='milestone-sign'){
        pieces.push(`<div class="stage-sign" style="z-index:${z}"><span>NEXT LICENSE MILESTONE</span><strong>12.5 HOURS TO GO</strong></div>`);
      }else if(asset.composer?.type==='hud'){
        pieces.push(`<div class="stage-hud" style="z-index:${z}"><span>JOURNEY 75%</span><span>NIGHT 4.2 HRS</span></div>`);
      }
    });
    stage.innerHTML=pieces.join('');
    document.getElementById('composer-summary').textContent=selected.length?selected.map(asset=>`${layerName(asset.layer)}: ${asset.name} [${themeName(asset.theme)}]`).join(' · '):'No layers selected.';
  }


  const CAL_KEY='dv03-theme-calendar-v1';
  let calendarRules=[];
  function loadCalendar(){try{calendarRules=JSON.parse(localStorage.getItem(CAL_KEY)||'[]')}catch(_){calendarRules=[]}}
  function saveCalendar(){localStorage.setItem(CAL_KEY,JSON.stringify(calendarRules))}
  function calendarLabel(theme){return registry.themes.find(t=>t.id===theme)?.label||theme}
  function setupCalendar(){
    loadCalendar();
    const year=document.getElementById('calendar-year'),date=document.getElementById('calendar-date');
    year.value=new Date().getFullYear();date.value=new Date().toISOString().slice(0,10);
    year.onchange=renderCalendar;date.onchange=()=>{year.value=date.value.slice(0,4);renderCalendar();themeFilter.value='calendar';renderGallery()};
    document.getElementById('calendar-add').onclick=showCalendarEditor;
    renderCalendar();
  }
  function showCalendarEditor(){
    const host=document.getElementById('calendar-editor');host.hidden=false;
    const choices=registry.themes.filter(t=>t.id!=='normal').map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');
    host.innerHTML=`<label>Theme<select id="cal-theme">${choices}</select></label><label>Rule<select id="cal-rule"><option value="fixed">Fixed annual dates</option><option value="thanksgiving">Thanksgiving (4th Thursday)</option></select></label><label id="cal-start-wrap">Start (MM-DD)<input id="cal-start" value="10-15" pattern="\\d{2}-\\d{2}"></label><label id="cal-end-wrap">End (MM-DD)<input id="cal-end" value="10-31" pattern="\\d{2}-\\d{2}"></label><label id="cal-before-wrap" hidden>Days before<input id="cal-before" type="number" value="7" min="0" max="60"></label><label id="cal-after-wrap" hidden>Days after<input id="cal-after" type="number" value="3" min="0" max="60"></label><button id="cal-save" class="buttonish" type="button">Save Theme</button><button id="cal-cancel" class="buttonish" type="button">Cancel</button>`;
    const mode=document.getElementById('cal-rule');
    mode.onchange=()=>{const moving=mode.value==='thanksgiving';['cal-start-wrap','cal-end-wrap'].forEach(id=>document.getElementById(id).hidden=moving);['cal-before-wrap','cal-after-wrap'].forEach(id=>document.getElementById(id).hidden=!moving)};
    document.getElementById('cal-cancel').onclick=()=>host.hidden=true;
    document.getElementById('cal-save').onclick=()=>{
      const theme=document.getElementById('cal-theme').value;let rule;
      if(mode.value==='thanksgiving')rule=window.DV_THEME_CALENDAR.thanksgivingRule(-Math.abs(+document.getElementById('cal-before').value),Math.abs(+document.getElementById('cal-after').value));
      else{const s=document.getElementById('cal-start').value.match(/^(\d{2})-(\d{2})$/),e=document.getElementById('cal-end').value.match(/^(\d{2})-(\d{2})$/);if(!s||!e){document.getElementById('calendar-message').textContent='Use MM-DD for fixed annual dates.';return}try{rule=window.DV_THEME_CALENDAR.normalizeRule({mode:'fixed',startMonth:s[1],startDay:s[2],endMonth:e[1],endDay:e[2]})}catch(_){document.getElementById('calendar-message').textContent='Enter real fixed annual dates in MM-DD format.';return}}
      const candidate={id:'theme-'+Date.now(),theme,label:calendarLabel(theme),enabled:true,rule};
      const year=+document.getElementById('calendar-year').value;
      const test=window.DV_THEME_CALENDAR.resolveCalendar(year,[...calendarRules,candidate]);
      if(!test.valid){document.getElementById('calendar-message').textContent='Theme overlaps an existing range. Resolve the conflict before saving.';renderCalendar([...calendarRules,candidate]);return}
      calendarRules.push(candidate);saveCalendar();host.hidden=true;document.getElementById('calendar-message').textContent='';renderCalendar();
    };
  }

  async function loadQuestMetadata(client){
    const keys=registry.questKeys?.()||[];
    if(!keys.length)return;
    const {data,error}=await client.from('quest_definitions').select('quest_key,name,active').in('quest_key',keys);
    if(error)throw new Error(error.message||'Unable to load quest definitions.');
    questMetadata=new Map((data||[]).map(row=>[row.quest_key,row]));
  }
  function renderCalendar(override){
    const api=window.DV_THEME_CALENDAR,year=+document.getElementById('calendar-year').value||new Date().getFullYear(),rules=override||calendarRules;
    const cal=api.resolveCalendar(year,rules),body=document.getElementById('calendar-body'),dateValue=document.getElementById('calendar-date').value;
    calendarTheme=api.themeForDate(year,rules,dateValue||year+'-01-01');
    document.getElementById('calendar-status').textContent=cal.valid?`· ${year} · preview: ${calendarLabel(calendarTheme)}`:'· INVALID · BASE fallback';
    if(!cal.valid){
      const conflictIds=new Set(cal.conflicts.flat());
      body.innerHTML=rules.map(r=>{const rr=api.resolveRule(year,r.rule);return `<tr class="${conflictIds.has(r.id)?'conflict':''}"><td>${esc(r.label)}</td><td>${api.fmt(rr.start)}</td><td>${api.fmt(rr.end)}</td><td>Conflict</td></tr>`}).join('');
      calendarTheme='normal';return;
    }
    body.innerHTML=cal.rows.map(r=>`<tr class="${r.base?'base':''} ${dateValue&&dateValue>=api.iso(r.start)&&dateValue<=api.iso(r.end)?'active':''}"><td>${esc(r.label)}</td><td>${api.fmt(r.start)}</td><td>${api.fmt(r.end)}</td><td>${r.base?'':`<button class="buttonish" data-delete-rule="${esc(r.id)}" type="button">Delete</button>`}</td></tr>`).join('');
    body.querySelectorAll('[data-delete-rule]').forEach(btn=>btn.onclick=()=>{calendarRules=calendarRules.filter(r=>r.id!==btn.dataset.deleteRule);saveCalendar();renderCalendar();renderGallery()});
  }

  async function authorize(){
    if(!registry)throw new Error('DV03 visual asset registry is unavailable.');
    if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey)throw new Error('Supabase configuration is unavailable.');
    const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    window.DV_SUPABASE_CLIENT=client;
    const {data:{session}}=await client.auth.getSession();
    if(!session){
      show(checking,false);show(denied,true);
      document.getElementById('visual-denied-detail').innerHTML='Sign in through the <a href="/log/">Driver Console</a>, then return to this tool.';
      return;
    }
    const {data,error}=await client.rpc('get_authenticated_dashboard_v1');
    if(error||!data?.ok)throw new Error(error?.message||data?.error||'Unable to verify operator access.');
    if(data.is_operator!==true){show(checking,false);show(denied,true);return}
    await loadQuestMetadata(client);
    setupFilters();setupCalendar();setupComposer();renderGallery();
    show(checking,false);show(denied,false);show(shell,true);
  }

  authorize().catch(error=>{
    show(checking,false);show(denied,true);
    document.getElementById('visual-denied-detail').textContent=error.message||'Unable to verify operator access.';
  });
})();
