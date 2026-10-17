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
    content.innerHTML = `<p class="panel-label">TRIP DETAIL</p><h2>${esc(drive.drive_date)} · ${esc(String(drive.start_time || '').slice(0,5))}–${esc(String(drive.end_time || '').slice(0,5))}</h2>${overlapNotice}${editHistoryMarkup(history)}<dl class="drive-detail-facts">${optional('Duration', `${Math.round(Number(drive.duration_minutes || 0))} min (${hours(drive.duration_minutes)})`)}${optional('Vehicle', vehicle?.name ? `${vehicle.name}${vehicle.vehicle_class ? ` · ${vehicle.vehicle_class}` : ''}` : null)}${optional('Logged via', drive.source)}${optional('Logged by', detail.logged_by?.display_name)}${optional('Supervisor', supervisor)}${optional('Skills Practiced', skillText)}${optional('Destination', drive.destination)}${optional('Road notes', drive.notes || 'None')}${optional('Weather', weather)}${optional('Night credit', `${Math.round(Number(drive.night_minutes || 0))} min`)}${optional('Night rule', drive.night_rule_version||'v1 · Jul 2, 2026')}${optional('Location basis', locationBasis)}</dl><section class="drive-detail-awards" aria-labelledby="drive-detail-awards-heading"><h3 id="drive-detail-awards-heading">Achievements earned on this drive</h3>${awards.length ? `<ul>${awards.map(award => `<li><div><strong>${esc(award.quest?.name || award.quest_key)}</strong>${award.quest?.description ? `<small>${esc(award.quest.description)}</small>` : ''}</div><span class="pill">+${Number(award.xp_awarded || 0)} XP</span></li>`).join('')}</ul>` : ''}</section>${editAction}`;
  }

  // BKLG-0263: PA weather confirmation is per-drive, not a dashboard redesign.
  // The backend RPC verifies guardian identity, home state and drive revision.
  async function showPaWeatherReview(drive, driverId, token) {
    const model=app.getModel?.()||{}, driver=(model.drivers||[]).find(d=>d.id===driverId);
    if(String(driver?.home_state||'').toUpperCase()!=='PA')return;
    const {data,error}=await app.client.rpc('get_pa_drive_weather_reviews_v1',{p_driver_id:driverId});
    if(token!==detailToken||!dialog.open||error)return;
    const record=(data||[]).find(x=>String(x.drive_id)===String(drive.id));
    if(!record)return;
    const section=document.createElement('section');
    section.className='drive-detail-weather-review';
    section.setAttribute('aria-label','Pennsylvania inclement weather review');
    section.innerHTML=`<h3>PA inclement-weather review</h3>
      <p>Drive Venture suggestion: <strong>${esc(record.determination)}</strong>.
      Suggested time: ${record.suggested_minutes==null?'Needs confirmation':esc(record.suggested_minutes+' min')}.
      ${record.parent_override==null?'Not yet overridden':('Parent setting: '+(record.parent_override?'Counts':'Does not count'))}.
      </p><p class="dv-muted">Weather classification is a Drive Venture interpretation, not an official PennDOT determination. Parent review does not replace signed DL-180C.</p>
      <label for="pa-weather-reason">Reason for correction (required when changing a system No to Yes)</label>
      <input id="pa-weather-reason" type="text" maxlength="500" value="${esc(record.parent_reason||'')}" placeholder="e.g. freezing fog along route">
      <div class="drive-detail-actions">
        <button class="button subtle-button button-small" type="button" data-pa-weather-set="true">Count this drive</button>
        <button class="button subtle-button button-small" type="button" data-pa-weather-set="false">Do not count</button>
      </div><p class="pa-weather-review-result" role="status" aria-live="polite"></p>`;
    section.dataset.driveId=String(drive.id);
    section.dataset.revision=String(drive.drive_revision);
    section.dataset.system=String(record.determination);
    content.appendChild(section);
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-pa-weather-set]');
    if(!button||!dialog.open)return;
    const section=button.closest('.drive-detail-weather-review'),status=section?.querySelector('.pa-weather-review-result');
    if(!section||!status)return;
    const yes=button.dataset.paWeatherSet==='true';
    const reason=String(section.querySelector('#pa-weather-reason')?.value||'').trim();
    if(yes&&section.dataset.system==='NO'&&!reason){status.textContent='Please describe the weather you experienced.';return}
    const buttons=section.querySelectorAll('button');
    buttons.forEach(b=>b.disabled=true);
    status.textContent='Saving weather review…';
    try{
      const {data,error}=await app.client.rpc('review_pa_drive_weather_v1',{
        p_drive_id:section.dataset.driveId,
        p_override:yes,
        p_expected_drive_revision:Number(section.dataset.revision),
        p_reason:reason||null
      });
      if(error||!data?.ok){status.textContent=data?.outcome==='STALE_DRIVE'||data?.outcome==='STALE_CLASSIFICATION'?'Drive changed. Reopen this trip and review again.':'Review could not be saved. Please try again.';return}
      status.textContent=yes?'This drive now counts as parent-confirmed inclement weather.':'This drive no longer counts as inclement weather.';
    }catch(_){status.textContent='Review could not be saved. Please try again.'}
    finally{buttons.forEach(b=>b.disabled=false)}
  });

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
      await showPaWeatherReview(data.drive,driverId,mine);
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
