(() => {
  const app = window.DV_LOG_APP;
  if (!app?.client) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt','"':'&quot;',"'":'&#39;'}[c]));
  const hours = minutes => `${(Number(minutes || 0) / 60).toFixed(1)} h`;
  const optional = (label, value) => value == null || value === '' ? '' : `<div class="drive-detail-fact"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
  const dialog = document.createElement('dialog');
  dialog.className = 'drive-detail-dialog';
  dialog.innerHTML = '<button class="drive-detail-close" type="button" aria-label="Close drive detail">×</button><div class="drive-detail-content" aria-live="polite"></div>';
  document.body.appendChild(dialog);
  const content = dialog.querySelector('.drive-detail-content');
  let detailToken = 0;
  dialog.querySelector('.drive-detail-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  const EDIT_FIELDS={drive_date:'date',start_time:'start time',end_time:'finish time',vehicle_id:'vehicle',lesson_id:'skills practiced',lesson_ids:'skills practiced',lesson_notes:'skills practiced',supervisor_person_id:'supervisor',external_supervisor_name:'supervisor',destination:'destination',notes:'road notes',night_minutes:'night credit',weather:'weather'};
  function changedFields(edit){const before=edit.before_state||{},after=edit.after_state||{};return [...new Set(Object.entries(EDIT_FIELDS).filter(([key])=>JSON.stringify(before[key]??null)!==JSON.stringify(after[key]??null)).map(([,label])=>label))]}
  function editHistoryMarkup(history){
    if(!history?.length)return '';
    const latestOperator=history.find(h=>h.actor_kind==='OPERATOR');
    const notice=latestOperator?`<div class="drive-edit-notice"><strong>Administrator modification</strong><p>An administrator modified this drive on ${esc(new Date(latestOperator.created_at).toLocaleString())}.${latestOperator.reason?` Reason: ${esc(latestOperator.reason)}.`:''}</p></div>`:'';
    const rows=history.map(h=>{const who=h.actor_kind==='OPERATOR'?'Drive Venture administrator':h.actor_display_name||String(h.actor_kind||'Authorized user').toLowerCase(),changed=changedFields(h);return `<li><strong>${esc(who)}</strong> · ${esc(new Date(h.created_at).toLocaleString())}<br><small>${changed.length?`Changed: ${esc(changed.join(', '))}`:'Drive record updated'}${h.reason?` · Reason: ${esc(h.reason)}`:''}</small></li>`}).join('');
    return `${notice}<details class="drive-edit-history"><summary>Edit history (${history.length})</summary><ul>${rows}</ul></details>`;
  }
  function accessMode(driverId){const model=app.getModel?.()||{};return app.getAccessMode?.(driverId)||(model.driver_access||[]).find(row=>row.driver_id===driverId)?.mode||(model.is_operator===true?'VIEW':'MANAGE')}
  function isOperatorView(driverId){const model=app.getModel?.()||{};return model.is_operator===true&&accessMode(driverId)==='VIEW'}
  function canEditDrive(driverId){const model=app.getModel?.()||{};return accessMode(driverId)!=='VIEW'||model.is_operator===true}

  function render(detail) {
    const drive = detail.drive, vehicle = detail.vehicle, awards = detail.awards || [], history=detail.edit_history||[],lessons=detail.lessons||drive.lessons||[];
    app.detailDrives = app.detailDrives || {};
    drive.lesson_ids=detail.lesson_ids||drive.lesson_ids||[];
    drive.lessons=lessons;
    app.detailDrives[drive.id] = drive;
    const weather = drive.weather?.conditions?.length ? drive.weather.conditions.map(v=>String(v).replaceAll('_',' ')).join(', ') : null;
    const skillText=lessons.length?lessons.map(x=>`${x.lesson_code} · ${x.title}`).join('; '):(drive.lesson_notes||null);
    const supervisor=detail.supervisor?.display_name||drive.external_supervisor_name||null;
    const model=app.getModel?.()||{};
    const driver = (model.drivers || []).find(row => row.id === drive.driver_id);
    const zip = drive.classification_zip || driver?.home_zip;
    const home = driver?.home_city ? `Home: ${driver.home_city}${driver.home_state ? `, ${driver.home_state}` : ''}` : null;
    const locationBasis = [zip, home].filter(Boolean).join(' · ');
    const overlap=((model.recent_drives||[]).find(row=>String(row.id)===String(drive.id))||{}).overlap||null;
    const overlapNotice=overlap?.conflict_count?`<div class="drive-overlap-notice"><strong>⚠ Potential time conflict</strong><p>This drive overlaps ${Number(overlap.conflict_count)} other drive${Number(overlap.conflict_count)===1?'':'s'}. The recorded hours still count; review the conflicting times and edit or delete a drive if needed.</p></div>`:'';
    const editLabel=isOperatorView(drive.driver_id)?'Admin edit this drive':'Edit this drive';
    const editAction=canEditDrive(drive.driver_id)?`<div class="drive-detail-actions"><button class="button subtle-button button-small drive-detail-edit" type="button" data-edit-drive="${esc(drive.id)}">${editLabel}</button></div>`:'';
    const certified=drive.certification_status==='CERTIFIED'&&!!drive.certified_by_person_id;
    const certifier=certified?(detail.certified_by?.display_name||'Authorized grown-up'):null;
    const certText=certified?`CERTIFIED · ${esc(certifier)}`:'NOT CERTIFIED · Awaiting grown-up certification';
    const isPA=String(driver?.home_state||'').toUpperCase()==='PA';
    const activeWeather=drive.weather?.observation||drive.weather||{};
    const conditions=Array.isArray(activeWeather.conditions)&&activeWeather.conditions.length?
      activeWeather.conditions.map(x=>String(x).replaceAll('_',' ').toLowerCase()).join(', '):null;
    const actualObservation=drive.weather_classification_status==='CLASSIFIED'&&!!conditions;
    const weatherSummary=actualObservation?conditions:'Unavailable';
    const nightValue=Math.round(Number(drive.night_minutes||0));
    const duration=Math.round(Number(drive.duration_minutes||0));
    const awardsMarkup=`<section class="drive-detail-awards" aria-labelledby="drive-detail-awards-heading"><h3 id="drive-detail-awards-heading">Achievements earned on this drive</h3>${awards.length?`<ul>${awards.map(award=>`<li><div><strong>${esc(award.quest?.name||award.quest_key)}</strong>${award.quest?.description?`<small>${esc(award.quest.description)}</small>`:''}</div><span class="pill">+${Number(award.xp_awarded||0)} XP</span></li>`).join('')}</ul>`:''}</section>`;
    const rule=(label,value)=>`<div class="drive-detail-rule"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
    content.innerHTML=`
      <header class="drive-detail-header">
        <div><p class="panel-label">TRIP DETAIL</p>
          <h2>${esc(drive.drive_date)} · ${esc(String(drive.start_time||'').slice(0,5))}–${esc(String(drive.end_time||'').slice(0,5))}</h2>
          <p class="drive-detail-certification ${certified?'is-certified':'is-pending'}">${certText}</p>
        </div>${editAction}
      </header>
      ${overlapNotice}${editHistoryMarkup(history)}
      <div class="drive-detail-primary-grid">
        <section class="drive-detail-tile drive-detail-duration">
          <h3>DURATION</h3><p class="drive-detail-main-duration">${duration} min (${hours(duration)})</p>
          <p>Night <strong>${nightValue} min</strong></p>
          <p>Inclement <strong data-drive-inclement-minutes>${isPA?'Loading…':'Not applicable'}</strong></p>
        </section>
        <section class="drive-detail-tile drive-detail-observed"><h3>WEATHER</h3>
          <p data-drive-observed-weather>${esc(weatherSummary)}</p><small>Drive Venture observed · read-only</small>
        </section>
        <section class="drive-detail-tile drive-detail-destination"><h3>DESTINATION</h3>
          <p>${esc(drive.destination||'—')}</p></section>
        <section class="drive-detail-tile"><h3>LOGGED BY</h3><p>${esc(detail.logged_by?.display_name||drive.source||'Unavailable')}</p></section>
        <section class="drive-detail-tile"><h3>SUPERVISED BY</h3><p>${esc(supervisor||'Unavailable')}</p></section>
        <section class="drive-detail-tile drive-detail-notes"><h3>ROAD NOTES</h3>
          <p>${esc(drive.notes||'No notes recorded')}</p></section>
      </div>
      ${awardsMarkup}
      <section class="drive-detail-rules"><h3>Driving rules & calculations</h3><dl>
        ${rule('Night rule',drive.night_rule_version||'Not available')}
        ${rule('Inclement rule',isPA?'Pennsylvania · reported inclement designation; observed weather retained separately':'Not applicable')}
        ${rule('Location basis',locationBasis||'Unresolved')}
      </dl></section>
      ${editAction}`;
  }

  async function showPaWeatherSummary(drive,driverId,token){
    const model=app.getModel?.()||{},driver=(model.drivers||[]).find(d=>d.id===driverId);
    if(String(driver?.home_state||'').toUpperCase()!=='PA')return;
    const {data,error}=await app.client.rpc('get_drive_weather_status_v1',{p_drive_id:drive.id});
    if(token!==detailToken||!dialog.open)return;
    const record=!error&&Array.isArray(data)?data[0]:null;
    const minutes=content.querySelector('[data-drive-inclement-minutes]');
    const weather=content.querySelector('[data-drive-observed-weather]');
    if(!record){if(minutes)minutes.textContent='Unavailable';return;}
    if(minutes)minutes.textContent=`${Math.round(Number(record.effective_minutes||0))} min`;
    const obs=record.weather_observation?.observation||record.weather_observation||{};
    const conditions=Array.isArray(obs.conditions)&&obs.conditions.length?
      obs.conditions.map(x=>String(x).replaceAll('_',' ').toLowerCase()).join(', '):null;
    const classified=drive.weather_classification_status==='CLASSIFIED'&&!!conditions;
    if(weather)weather.textContent=classified?conditions:'Unavailable';
    const rules=content.querySelector('.drive-detail-rules dl');
    if(rules)rules.insertAdjacentHTML('beforeend',
      `<div class="drive-detail-rule"><dt>Reported conditions</dt><dd>${record.effective_minutes==null?'Unreported':Number(record.effective_minutes)>0?'Inclement':'Not inclement'} · ${record.user_selected?'User selected':'DV default'}; DV assessment: ${esc(record.classification||'UNKNOWN')}</dd></div>`);
  }

  document.addEventListener('click', async event => {
    if (event.target.closest('[data-edit-drive]') && dialog.open) dialog.close();
    const trigger = event.target.closest('[data-drive-detail-id]');
    if (!trigger) return;
    event.preventDefault();
    const driverId = app.getDriverId(),generation=app.getRenderGeneration?.(),mine=++detailToken;
    if (!driverId) return;
    content.innerHTML = '<p class="drive-detail-loading">Loading drive details…</p>';
    dialog.showModal();
    try{
      const {data, error} = await app.client.functions.invoke('drive-detail-api', {body:{driver_id:driverId, drive_id:trigger.dataset.driveDetailId}});
      if(mine!==detailToken||app.getDriverId()!==driverId||(generation!=null&&app.getRenderGeneration?.()!==generation))return;
      if (error || !data?.ok) { content.innerHTML = '<p class="drive-detail-error">Drive details are not available right now. Please try again.</p>'; return; }
      render(data);
      await showPaWeatherSummary(data.drive,driverId,mine);
    }catch(_){if(mine===detailToken&&app.getDriverId()===driverId)content.innerHTML = '<p class="drive-detail-error">Drive details are not available right now. Please try again.</p>'}
  });
  window.addEventListener('dv:driver-changing',()=>{detailToken+=1;if(dialog.open)dialog.close();content.innerHTML=''});
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const trigger = event.target.closest('[data-drive-detail-id]');
    if (!trigger) return;
    event.preventDefault();
    trigger.click();
  });
})();
