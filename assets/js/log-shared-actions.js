(() => {
  const app = window.DV_LOG_APP;
  if (!app?.client) return;
  const client = app.client;

  if (!document.querySelector('link[data-dv-shared-log-fixes]')) {
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/assets/css/log-shared-fixes.css?v=20260818-1215';
    link.dataset.dvSharedLogFixes='true';
    document.head.appendChild(link);
  }

  const vehicleStatus = () => document.getElementById('vehicle-status');
  const setStatus = (text, kind='') => {
    const el=vehicleStatus(); if(!el)return;
    el.textContent=text||''; el.className=`app-status${kind?` ${kind}`:''}`;
  };

  // Garage actions are shared by every visual skin.
  const oldForm=document.getElementById('vehicle-form');
  if(oldForm){
    const form=oldForm.cloneNode(true); oldForm.replaceWith(form);
    form.addEventListener('submit',async event=>{
      event.preventDefault(); if(!form.reportValidity())return;
      const driverId=app.getDriverId(); if(!driverId)return setStatus('No active driver is selected.','error');
      setStatus('Adding vehicle…');
      const {data,error}=await client.rpc('add_authenticated_vehicle_v1',{
        p_driver_id:driverId,
        p_name:document.getElementById('vehicle-name').value.trim(),
        p_vehicle_class:document.getElementById('vehicle-class').value,
        p_color:document.getElementById('vehicle-color').value.trim()||null,
        p_is_primary:app.getActiveVehicles().length===0
      });
      if(error||!data?.ok)return setStatus(`Garage: ${error?.message||data?.error||'Unable to add vehicle.'}`,'error');
      form.reset(); setStatus('Vehicle added.','success');
      try{await app.refreshDashboard()}catch(_){setStatus('Vehicle added. Refresh to update the Garage.','success')}
    });
  }

  const oldList=document.getElementById('vehicle-list');
  if(oldList){
    const list=oldList.cloneNode(true); oldList.replaceWith(list);
    list.addEventListener('click',async event=>{
      const button=event.target.closest('[data-archive-vehicle]'); if(!button)return;
      const driverId=app.getDriverId(); if(!driverId)return;
      setStatus('Updating Garage…');
      const {data,error}=await client.rpc('archive_authenticated_vehicle_v1',{p_driver_id:driverId,p_vehicle_id:button.dataset.archiveVehicle});
      if(error||!data?.ok)return setStatus(`Garage: ${error?.message||data?.error||'Unable to archive vehicle.'}`,'error');
      setStatus('Vehicle archived.','success');
      try{await app.refreshDashboard()}catch(_){setStatus('Vehicle archived. Refresh to update the Garage.','success')}
    });
  }

  const achievements=document.getElementById('quest-list')?.closest('.app-card');
  if(achievements)achievements.id='achievements';

  function applyHelp(item,nameEl,description,name){
    if(!item||!nameEl||!description)return;
    item.dataset.questHelp=description;
    nameEl.classList.add('quest-help-target');
    nameEl.setAttribute('tabindex','0');
    nameEl.setAttribute('title',description);
    nameEl.setAttribute('aria-label',`${name||nameEl.textContent}. ${description}`);
  }

  function annotateAchievementHistory(model,driverId){
    const help=new Map((model.quest_awards||[]).filter(q=>q.driver_id===driverId).map(q=>[q.quest?.name||q.quest_key,q.quest?.description||'']));
    document.querySelectorAll('#quest-list .quest-item').forEach(item=>{
      const nameEl=item.querySelector('strong');
      const name=(nameEl?.textContent||'').trim();
      applyHelp(item,nameEl,help.get(name),name);
    });
  }

  function esc(value){return String(value??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#39;','\"':'&quot;'}[c]));}
  let recommendationToken=0;
  async function renderMissionControl(driverId){
    const radio=document.querySelector('.radio-display'); if(!radio||!driverId)return;
    const token=++recommendationToken;
    radio.innerHTML='<span>ON AIR / MISSION CONTROL</span><p class="mission-loading">Tuning recommended quests…</p>';
    const {data,error}=await client.rpc('get_authenticated_quest_recommendations_v1',{p_driver_id:driverId});
    if(token!==recommendationToken)return;
    if(error||!data?.ok){radio.innerHTML='<span>ON AIR / MISSION CONTROL</span><p class="mission-loading">Recommendations unavailable right now.</p><a class="mission-all" href="#achievements">VIEW ALL ACHIEVEMENTS ↓</a>';return;}
    const quests=data.quests||[];
    if(!quests.length){radio.innerHTML='<span>ON AIR / MISSION CONTROL</span><p class="mission-loading">No recommended quests right now. Keep driving!</p><a class="mission-all" href="#achievements">VIEW ALL ACHIEVEMENTS ↓</a>';return;}
    const featured=quests[0]; const extras=quests.slice(1,8);
    radio.innerHTML=`<span>ON AIR / MISSION CONTROL</span>
      <div class="mission-featured" data-quest-help="${esc(featured.description)}">
        <small>FEATURED QUEST</small>
        <strong class="quest-help-target" tabindex="0" title="${esc(featured.description)}">${esc(featured.name)}</strong>
        <em>${esc(featured.progress_text||featured.description)}</em>
        <div class="mission-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Number(featured.progress_percent||0)}"><i style="width:${Math.max(3,Number(featured.progress_percent||0))}%"></i></div>
      </div>
      ${extras.length?`<ol id="radio-quest-list" class="mission-list">${extras.map(q=>`<li data-quest-help="${esc(q.description)}"><strong class="quest-help-target" tabindex="0" title="${esc(q.description)}">${esc(q.name)}</strong><small>${esc(q.progress_text||q.description)}</small></li>`).join('')}</ol>`:''}
      <a class="mission-all" href="#achievements">VIEW ALL ACHIEVEMENTS ↓</a>`;
  }

  window.addEventListener('dv:dashboard-rendered',event=>{
    const {model,driverId}=event.detail||{};
    if(!model||!driverId)return;
    annotateAchievementHistory(model,driverId);
    renderMissionControl(driverId);
  });

  // Mobile/touch equivalent of desktop hover help.
  function isTouchHelp(){return window.matchMedia('(hover: none)').matches||window.matchMedia('(pointer: coarse)').matches||window.innerWidth<=760;}
  document.addEventListener('click',event=>{
    const target=event.target.closest('.quest-help-target'); if(!target||!isTouchHelp())return;
    const item=target.closest('[data-quest-help]'); if(!item)return;
    document.querySelectorAll('.quest-help-open').forEach(el=>{if(el!==item)el.classList.remove('quest-help-open')});
    item.classList.toggle('quest-help-open');
  });
  document.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    const target=event.target.closest?.('.quest-help-target'); if(!target)return;
    const item=target.closest('[data-quest-help]'); if(!item)return;
    event.preventDefault(); item.classList.toggle('quest-help-open');
  });

  // If dashboard rendered before this shared module loaded, hydrate immediately.
  const model=app.getModel(); const driverId=app.getDriverId();
  if(driverId){annotateAchievementHistory(model,driverId);renderMissionControl(driverId)}
})();