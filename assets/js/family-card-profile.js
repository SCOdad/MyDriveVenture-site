(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let session=null,subjects=[],subjectByPerson=new Map(),subjectByDriver=new Map(),licenseByDriver=new Map(),smsByPerson=new Map();const expandedDrivers=new Set();

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const prettyPhone=v=>{const d=String(v||'').replace(/\D/g,'');return d.length===11&&d.startsWith('1')?`(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`:v||'Not set'};
  const fmtDate=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return v||'Not set';const [y,m,d]=String(v).split('-');return `${m}/${d}/${y}`};
  const labelFor=t=>({
    MinimumPracticeHours:'Total hours',MinimumNightHours:'Night hours',MinimumAgeYears:'Minimum age',
    PriorStageMonths:'Time in stage',DrivingLogRequired:'Driving log',ParentCertificationRequired:'Parent certification',
    Segment2Required:'Segment 2',SkillsTestRequired:'Skills test',ViolationFreeDays:'Violation-free period',
    AtFaultCrashFreeDays:'Crash-free period',DriverEducationRequired:'Driver education',
    ParentAuthorizationRequired:'Parent authorization',PracticeAffidavitRequired:'Practice affidavit'
  }[t]||String(t||'Requirement').replace(/([a-z])([A-Z])/g,'$1 $2'));
  const HOUR_TYPES=new Set(['MinimumPracticeHours','MinimumNightHours']);

  async function ensureSession(){if(session?.access_token)return session;session=(await client.auth.getSession()).data.session;if(!session)throw new Error('Please sign in again.');return session}
  async function api(slug,action,payload={}){const s=await ensureSession(),r=await fetch(`${cfg.supabaseUrl}/functions/v1/${slug}`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${s.access_token}`,apikey:cfg.publishableKey},body:JSON.stringify({action,...payload})}),b=await r.json().catch(()=>({}));if(!r.ok||b.ok!==true)throw new Error(typeof b.error==='string'?b.error:'Update failed');return b}
  async function avatarCall(form){const s=await ensureSession(),r=await fetch(`${cfg.supabaseUrl}/functions/v1/avatar-request-api`,{method:'POST',headers:{authorization:`Bearer ${s.access_token}`,apikey:cfg.publishableKey},body:form}),b=await r.json().catch(()=>({}));if(!r.ok||b.ok!==true)throw new Error(b.error||'Avatar request failed');return b}

  async function loadSubjects(){
    const out=await api('profile-api','overview');
    subjects=out.subjects||[];
    subjectByPerson=new Map(subjects.map(s=>[String(s.person_id),s]));
    subjectByDriver=new Map(subjects.filter(s=>s.driver_id).map(s=>[String(s.driver_id),s]));
  }

  function locationText(s){return [s?.home_city,s?.home_state,s?.home_zip].filter(Boolean).join(s?.home_city?', ':' ')||s?.home_zip||'Not set'}
  function setVerification(card,type,verified,hasValue){
    const badge=card.querySelector(`[data-card-verify="${type}"]`);
    if(!badge)return;
    badge.textContent=hasValue?(verified?'Verified':'Not verified'):'';
    badge.classList.toggle('is-verified',!!hasValue&&!!verified);
    badge.classList.toggle('is-unverified',!!hasValue&&!verified);
  }
  function numericRequirement(r,effective){
    const required=Number(r?.required),raw=Number(r?.actual);let actual=Number.isFinite(raw)?raw:null;
    if(r?.requirement_type==='PriorStageMonths'&&/^\d{4}-\d{2}-\d{2}$/.test(String(r.actual||''))&&/^\d{4}-\d{2}-\d{2}$/.test(String(effective||''))){
      const start=new Date(`${r.actual}T00:00:00Z`),end=new Date(`${effective}T00:00:00Z`);actual=end>=start?(end-start)/86400000/30.4375:null;
    }
    return Number.isFinite(required)&&required>0&&actual!==null?{required,actual,pct:Math.max(0,Math.min(100,(actual/required)*100))}:null;
  }
  function renderHourRow(card,target,type){
    const row=card.querySelector(`[data-hours-progress="${type==='MinimumPracticeHours'?'total':'night'}"]`),r=(target?.requirements||[]).find(x=>x.requirement_type===type);if(!row||!r)return;
    const n=numericRequirement(r,target.effective_date);if(!n)return;
    row.querySelector('.family-card-progress-track>span').style.width=`${n.pct.toFixed(1)}%`;
    row.querySelector('strong').textContent=`${Number(n.actual.toFixed(1))} / ${n.required} hrs`;
  }
  function requirementDetail(r,effective){
    const n=numericRequirement(r,effective);
    if(n){const unit=r.unit?String(r.unit).toLowerCase():'';return `${Number(n.actual.toFixed(1))} / ${n.required}${unit?' '+unit:''}`}
    if(r.met)return 'Complete';
    if(r.actual&&r.actual!=='not confirmed')return String(r.actual);
    return 'Needed';
  }
  function renderLicenseSummary(card,license){
    const target=(license?.targets||[])[0],summary=card.querySelector('[data-other-requirements]'),expanded=card.querySelector('[data-expanded-requirements]');
    if(!target){if(summary)summary.textContent='No next-stage requirements';if(expanded)expanded.innerHTML='<p class="meta">No next licensing stage is configured.</p>';return}
    renderHourRow(card,target,'MinimumPracticeHours');renderHourRow(card,target,'MinimumNightHours');
    const other=(target.requirements||[]).filter(r=>!HOUR_TYPES.has(r.requirement_type)),met=other.filter(r=>r.met).length;
    if(summary)summary.textContent=`${met} / ${other.length} met`;
    if(expanded)expanded.innerHTML=other.map(r=>{const confirmable=!r.met&&/needs confirmation/i.test(r.reason||'');return `<div class="family-expanded-requirement"><span>${esc(labelFor(r.requirement_type))}</span><div><strong class="${r.met?'is-met':'is-unmet'}">${esc(requirementDetail(r,target.effective_date))}</strong>${confirmable?`<button class="family-requirement-confirm" data-confirm-requirement="${esc(r.requirement_type)}" data-target-stage="${esc(target.target_stage)}" type="button">Confirm</button>`:''}</div></div>`}).join('')||'<p class="meta">No additional requirements.</p>';
    const action=card.querySelector('[data-expanded-license-action]'),eligible=(license?.eligible_targets||[]).find(x=>x.target_stage===target.target_stage);
    if(action)action.innerHTML=eligible?`<div class="family-license-advance-inline"><span class="meta">Eligible for ${esc(eligible.target_stage_display||eligible.target_stage)}</span><button class="button secondary" data-advance-stage="${esc(eligible.target_stage)}" type="button">Record stage</button></div>`:'';
  }
  function renderSms(card,sms){
    const state=String(sms?.state||''),value=card.querySelector('[data-card-value="sms_state"]'),detail=card.querySelector('[data-card-sms-detail]'),button=card.querySelector('[data-card-sms-action]');
    const labels={NO_MOBILE:['Unavailable','Add a mobile number first.'],VERIFICATION_PENDING:['Unavailable','Mobile verification pending.'],MOBILE_UNVERIFIED:['Unavailable','Verify the mobile number first.'],VERIFIED_NOT_ENROLLED:['Off',''],OPTED_IN:['On',''],OPTED_OUT:['Off','']};
    const label=labels[state]||['Unavailable',''];if(value)value.textContent=label[0];if(detail)detail.textContent=label[1];
    const actionable=['VERIFIED_NOT_ENROLLED','OPTED_IN','OPTED_OUT'].includes(state);
    if(button){button.hidden=!actionable;button.textContent=state==='OPTED_IN'?'Turn off':'Turn on';button.dataset.smsDesired=state==='OPTED_IN'?'OPT_OUT':'OPT_IN'}
  }
  function applyCardPalette(card,value){
    const lib=window.DV_DRIVER_PALETTES;if(!lib?.resolve)return;const p=lib.resolve(value);
    card.style.setProperty('--family-accent-shadow',p.shadow);card.style.setProperty('--family-accent-base',p.base);card.style.setProperty('--family-accent-bright',p.bright);card.style.setProperty('--family-accent-highlight',p.highlight);card.classList.add('has-driver-accent');
  }
  function renderColorPicker(card,s){
    const host=card.querySelector('[data-expanded-color-picker]');if(!host||host.dataset.ready==='true')return;host.dataset.ready='true';
    const lib=window.DV_DRIVER_PALETTES;if(!lib?.palettes){host.innerHTML='<p class="meta">Color choices unavailable.</p>';return}
    host.innerHTML=`<div class="family-expanded-color-swatches">${lib.palettes.map(p=>lib.swatchMarkup(p,true)).join('')}</div>`;
    const setSelected=value=>host.querySelectorAll('[data-dv-palette-id]').forEach(b=>{const on=b.dataset.dvPaletteId===lib.normalize(value);b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
    setSelected(s.favorite_color);
    host.querySelectorAll('[data-dv-palette-id]').forEach(button=>button.addEventListener('click',async e=>{e.stopPropagation();const chosen=button.dataset.dvPaletteId,status=card.querySelector('[data-expanded-color-status]');button.disabled=true;if(status)status.textContent='Saving…';try{await api('profile-api','update_basic',{person_id:s.person_id,name:s.name,home_zip:s.home_zip,favorite_color:chosen});s.favorite_color=chosen;setSelected(chosen);applyCardPalette(card,chosen);if(status){status.textContent='Color updated.';status.classList.add('family-success')}}catch(err){if(status){status.textContent=err.message||String(err);status.classList.add('family-error')}}finally{button.disabled=false}}));
  }

  async function enrichDriver(card){
    const id=String(card.dataset.driverId||''),s=subjectByDriver.get(id);if(!s)return;
    const set=(field,value)=>{const el=card.querySelector(`[data-card-value="${field}"]`);if(el)el.textContent=value};
    set('name',s.name||'Driver');set('home',locationText(s));set('email',s.email||'Not set');set('mobile',prettyPhone(s.mobile));
    setVerification(card,'email',s.email_verified,!!s.email);setVerification(card,'mobile',s.mobile_verified,!!s.mobile);
    const stateEl=card.querySelector('[data-license-state]');if(stateEl)stateEl.textContent=s.home_state||'—';
    try{
      const [licenseOut,smsOut]=await Promise.all([api('profile-api','license_overview',{driver_id:id}),api('contact-endpoint-api','sms_consent_state',{person_id:s.person_id})]);
      const license=licenseOut.license||{},sms=smsOut.sms||{};licenseByDriver.set(id,license);smsByPerson.set(String(s.person_id),sms);
      const nameEl=card.querySelector('[data-license-name]');if(nameEl)nameEl.textContent=license.current_stage_display||s.license_stage||'Driver';
      const start=license?.targets?.[0]?.drive_totals_contract?.license_stage_start_date||s.license_effective_date||null;
      set('license_effective_date',fmtDate(start));card.dataset.licenseStage=String(license.current_stage||s.license_stage||'');card.dataset.licenseEffectiveDate=String(start||'');
      const datePencil=card.querySelector('[data-inline-edit="license_effective_date"]');if(datePencil&&String(card.dataset.licenseStage).toUpperCase()!=='LEVEL_1'){datePencil.hidden=true;datePencil.title='Later-stage dates are retained as audited transition history.'}
      renderLicenseSummary(card,license);renderSms(card,sms);renderColorPicker(card,s);
    }catch(err){const summary=card.querySelector('[data-other-requirements]');if(summary)summary.textContent='Unavailable';console.warn('Driver card enrichment unavailable',err)}
  }

  async function enrichCards(){
    try{await loadSubjects()}catch(err){console.warn('Card profile data unavailable',err);return}
    await Promise.all([...document.querySelectorAll('.family-grownup-card[data-person-id]')].map(async card=>{const s=subjectByPerson.get(String(card.dataset.personId||''));if(!s||!card.dataset.profilePersonId)return;const set=(field,value)=>{const el=card.querySelector(`[data-card-value="${field}"]`);if(el)el.textContent=value};set('name',s.name||'Grown-up');set('email',s.email||'Not set');set('mobile',prettyPhone(s.mobile));setVerification(card,'email',s.email_verified,!!s.email);setVerification(card,'mobile',s.mobile_verified,!!s.mobile);try{const out=await api('contact-endpoint-api','sms_consent_state',{person_id:s.person_id});smsByPerson.set(String(s.person_id),out.sms||{});renderSms(card,out.sms||{})}catch(err){console.warn('Grown-up Text Parker status unavailable',err)}}));
    await Promise.all([...document.querySelectorAll('.family-driver-card[data-driver-id]')].map(enrichDriver));for(const id of expandedDrivers){const panel=document.querySelector(`.family-driver-card[data-driver-id="${CSS.escape(id)}"] [data-driver-expanded]`),button=document.querySelector(`.family-driver-card[data-driver-id="${CSS.escape(id)}"] [data-expand-driver]`);if(panel&&button){panel.hidden=false;button.setAttribute('aria-expanded','true');button.textContent='Collapse full profile'}}
  }

  function fieldConfig(field,s,card){
    if(field==='name')return{type:'text',value:s?.name||'',label:'Name'};
    if(field==='home_zip')return{type:'text',value:s?.home_zip||'',label:'Home ZIP',attrs:'inputmode="numeric" maxlength="5" pattern="[0-9]{5}"'};
    if(field==='email')return{type:'email',value:s?.email||'',label:'Email'};
    if(field==='mobile')return{type:'tel',value:s?.mobile||'',label:'Phone'};
    if(field==='license_effective_date')return{type:'date',value:card.dataset.licenseEffectiveDate||'',label:'Issue / effective date'};
    return null;
  }
  async function saveField(card,field,value,msg){
    const driverId=String(card.dataset.driverId||''),personId=String(card.dataset.personId||''),s=driverId?subjectByDriver.get(driverId):subjectByPerson.get(personId);if(!s)throw new Error('Profile data is unavailable.');
    if(field==='name'){const payload={person_id:s.person_id,name:value.trim()};if(s.kind==='DRIVER')payload.home_zip=s.home_zip;await api('profile-api','update_basic',payload)}
    else if(field==='home_zip'){if(!/^\d{5}$/.test(value.trim()))throw new Error('ZIP code must be 5 digits.');await api('profile-api','update_basic',{person_id:s.person_id,name:s.name,home_zip:value.trim()})}
    else if(field==='email'||field==='mobile'){const type=field==='email'?'EMAIL':'MOBILE',out=await api('contact-endpoint-api','request_contact_change',{person_id:s.person_id,endpoint_type:type,value:value.trim()});if(out.change?.status==='ALREADY_CURRENT'){msg.textContent='That value is already current.';return false}msg.textContent='Verification sent. Current verified value remains active until verification completes.';return false}
    else if(field==='license_effective_date'){await api('profile-api','update_license_effective_date',{driver_id:driverId,effective_date:value})}
    await window.DVFamily?.refresh?.();return true;
  }
  function beginEdit(button){
    const card=button.closest('.family-grownup-card,.family-driver-card'),field=button.dataset.inlineEdit;if(!card||!field)return;
    const driverId=String(card.dataset.driverId||''),personId=String(card.dataset.personId||''),s=driverId?subjectByDriver.get(driverId):subjectByPerson.get(personId),config=fieldConfig(field,s,card);if(!config)return;
    const row=button.closest('.family-inline-field'),valueEl=row?.querySelector(`[data-card-value="${field==='home_zip'?'home':field}"]`);if(!row||!valueEl)return;const original=row.innerHTML;
    row.innerHTML=`<span class="field-label">${esc(config.label)}</span><div class="family-inline-editor"><input type="${config.type}" value="${esc(config.value)}" ${config.attrs||''}><button class="button secondary" type="button" data-inline-save>Save</button><button class="button secondary" type="button" data-inline-cancel>Cancel</button><small class="family-inline-message" role="status"></small></div>`;
    const input=row.querySelector('input'),msg=row.querySelector('.family-inline-message');input?.focus();input?.select?.();
    row.querySelector('[data-inline-cancel]').onclick=e=>{e.stopPropagation();row.innerHTML=original};
    row.querySelector('[data-inline-save]').onclick=async e=>{e.stopPropagation();const save=e.currentTarget;save.disabled=true;msg.textContent='Saving…';msg.classList.remove('is-error');try{const refresh=await saveField(card,field,input.value,msg);if(refresh!==false)return;save.disabled=false}catch(err){msg.textContent=err.message||String(err);msg.classList.add('is-error');save.disabled=false}};
    input?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();row.innerHTML=original}});
  }
  async function toggleExpanded(driverId){
    const card=document.querySelector(`.family-driver-card[data-driver-id="${CSS.escape(String(driverId))}"]`);if(!card)return;const panel=card.querySelector('[data-driver-expanded]'),button=card.querySelector('[data-expand-driver]');if(!panel||!button)return;
    const opening=panel.hidden;panel.hidden=!opening;button.setAttribute('aria-expanded',String(opening));button.textContent=opening?'Collapse full profile':'Expand full profile';if(opening)expandedDrivers.add(String(driverId));else expandedDrivers.delete(String(driverId));
  }
  async function toggleSms(button){
    const card=button.closest('.family-driver-card,.family-grownup-card'),driverId=String(card?.dataset.driverId||''),personId=String(card?.dataset.personId||''),s=driverId?subjectByDriver.get(driverId):subjectByPerson.get(personId),sms=s?smsByPerson.get(String(s.person_id)):null;if(!card||!s||!sms)return;
    const turningOn=button.dataset.smsDesired==='OPT_IN';if(!confirm(turningOn?`Turn on Text Parker for ${sms.mobile||'this verified mobile'}? Message frequency varies; message and data rates may apply. Reply HELP for help or STOP to opt out.`:`Turn off Text Parker for ${sms.mobile||'this mobile'}?`))return;
    button.disabled=true;try{const out=await api('contact-endpoint-api','set_sms_consent',{person_id:s.person_id,event_type:turningOn?'OPT_IN':'OPT_OUT'});const next=out.sms||{};smsByPerson.set(String(s.person_id),next);renderSms(card,next)}catch(err){alert(err.message||String(err))}finally{button.disabled=false}
  }

  document.addEventListener('click',async e=>{
    const pencil=e.target.closest?.('[data-inline-edit]');if(pencil){e.preventDefault();e.stopPropagation();beginEdit(pencil);return}
    const sms=e.target.closest?.('[data-card-sms-action]');if(sms){e.preventDefault();e.stopPropagation();void toggleSms(sms);return}
    const upload=e.target.closest?.('[data-expanded-avatar-upload]');if(upload){e.preventDefault();e.stopPropagation();const card=upload.closest('.family-driver-card'),driverId=String(card?.dataset.driverId||''),file=card?.querySelector('[data-expanded-avatar-file]')?.files?.[0],status=card?.querySelector('[data-expanded-avatar-status]');if(!driverId||!file){if(status)status.textContent='Choose a photo first.';return}if(file.size>4*1024*1024){if(status)status.textContent='Photo must be 4 MB or smaller.';return}upload.disabled=true;if(status)status.textContent='Uploading…';try{const form=new FormData();form.append('action','upload_photo');form.append('driver_id',driverId);form.append('photo',file);await avatarCall(form);if(status){status.textContent='Avatar request started.';status.classList.add('family-success')}}catch(err){if(status){status.textContent=err.message||String(err);status.classList.add('family-error')}}finally{upload.disabled=false}return}
    const confirmButton=e.target.closest?.('[data-confirm-requirement]');if(confirmButton){e.preventDefault();e.stopPropagation();const card=confirmButton.closest('.family-driver-card'),driverId=String(card?.dataset.driverId||''),stage=confirmButton.dataset.targetStage,requirement=confirmButton.dataset.confirmRequirement,license=licenseByDriver.get(driverId),date=license?.effective_date||new Date().toISOString().slice(0,10);if(!driverId||!stage||!requirement)return;if(!confirm(`Confirm ${labelFor(requirement)} as satisfied on ${date}?`))return;confirmButton.disabled=true;try{await api('profile-api','record_license_requirement',{driver_id:driverId,target_stage:stage,requirement_type:requirement,satisfied_on:date});await enrichDriver(card)}catch(err){alert(err.message||String(err));confirmButton.disabled=false}return}
    const advance=e.target.closest?.('[data-advance-stage]');if(advance){e.preventDefault();e.stopPropagation();const card=advance.closest('.family-driver-card'),driverId=String(card?.dataset.driverId||''),target=advance.dataset.advanceStage,license=licenseByDriver.get(driverId),date=prompt('Effective date for this licensing stage:',license?.effective_date||new Date().toISOString().slice(0,10));if(!date)return;if(!confirm(`Record ${target} effective ${date}? This creates an auditable licensing transition.`))return;advance.disabled=true;try{await api('profile-api','advance_license_stage',{driver_id:driverId,target_stage:target,effective_date:date});await window.DVFamily?.refresh?.()}catch(err){alert(err.message||String(err));advance.disabled=false}}
  });
  window.addEventListener('dv:driver-expand-toggle',e=>void toggleExpanded(e.detail?.driver_id));
  window.addEventListener('dv:family-rendered',()=>void enrichCards());
  client.auth.onAuthStateChange((_e,next)=>{session=next});
  void ensureSession().catch(()=>{});
})();
