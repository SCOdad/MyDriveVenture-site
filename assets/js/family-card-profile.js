(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let session=null,subjects=[],subjectByPerson=new Map(),subjectByDriver=new Map();

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const prettyPhone=v=>{const d=String(v||'').replace(/\D/g,'');return d.length===11&&d.startsWith('1')?`(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`:v||'Not set'};
  const fmtDate=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return v||'Not set';const [y,m,d]=String(v).split('-');return `${m}/${d}/${y}`};
  const labelFor=t=>({
    MinimumPracticeHours:'Practice hours',MinimumNightHours:'Night hours',MinimumAgeYears:'Minimum age',
    PriorStageMonths:'Time in stage',DrivingLogRequired:'Driving log',ParentCertificationRequired:'Parent certification',
    Segment2Required:'Segment 2',SkillsTestRequired:'Skills test',ViolationFreeDays:'Violation-free period',
    AtFaultCrashFreeDays:'Crash-free period',DriverEducationRequired:'Driver education',
    ParentAuthorizationRequired:'Parent authorization',PracticeAffidavitRequired:'Practice affidavit'
  }[t]||String(t||'Requirement').replace(/([a-z])([A-Z])/g,'$1 $2'));

  async function ensureSession(){if(session?.access_token)return session;session=(await client.auth.getSession()).data.session;if(!session)throw new Error('Please sign in again.');return session}
  async function api(slug,action,payload={}){const s=await ensureSession(),r=await fetch(`${cfg.supabaseUrl}/functions/v1/${slug}`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${s.access_token}`,apikey:cfg.publishableKey},body:JSON.stringify({action,...payload})}),b=await r.json().catch(()=>({}));if(!r.ok||b.ok!==true)throw new Error(typeof b.error==='string'?b.error:'Update failed');return b}

  async function loadSubjects(){
    const out=await api('profile-api','overview');
    subjects=out.subjects||[];
    subjectByPerson=new Map(subjects.map(s=>[String(s.person_id),s]));
    subjectByDriver=new Map(subjects.filter(s=>s.driver_id).map(s=>[String(s.driver_id),s]));
    return subjects;
  }

  function locationText(s){return [s?.home_city,s?.home_state,s?.home_zip].filter(Boolean).join(s?.home_city?', ':' ')||s?.home_zip||'Not set'}
  function setVerification(card,type,verified,hasValue){
    const badge=card.querySelector(`[data-card-verify="${type}"]`);
    if(!badge)return;
    badge.textContent=hasValue?(verified?'Verified':'Not verified'):'';
    badge.classList.toggle('is-verified',!!hasValue&&!!verified);
    badge.classList.toggle('is-unverified',!!hasValue&&!verified);
  }

  function renderProgress(card,license){
    const host=card.querySelector('[data-license-progress]');if(!host)return;
    const target=(license?.targets||[])[0];
    if(!target){host.innerHTML='<div class="meta">No next licensing stage is configured.</div>';return}
    const effective=String(target.effective_date||license.effective_date||'');
    const requirements=target.requirements||[];
    const rows=requirements.map(r=>{
      const required=Number(r.required),actualNum=Number(r.actual);
      let actual=Number.isFinite(actualNum)?actualNum:null;
      if(r.requirement_type==='PriorStageMonths'&&/^\d{4}-\d{2}-\d{2}$/.test(String(r.actual||''))&&/^\d{4}-\d{2}-\d{2}$/.test(effective)){
        const start=new Date(`${r.actual}T00:00:00Z`),end=new Date(`${effective}T00:00:00Z`);
        actual=end>=start?(end-start)/86400000/30.4375:null;
      }
      const measurable=Number.isFinite(required)&&required>0&&actual!==null;
      if(measurable){
        const pct=Math.max(0,Math.min(100,(actual/required)*100));
        const unit=r.unit?String(r.unit).toLowerCase():'';
        return `<div class="family-card-progress"><span>${esc(labelFor(r.requirement_type))}</span><div class="family-card-progress-track" aria-label="${esc(labelFor(r.requirement_type))} progress"><span style="width:${pct.toFixed(1)}%"></span></div><strong>${esc(Number(actual.toFixed(1)))} / ${esc(required)}${unit?' '+esc(unit):''}</strong></div>`;
      }
      return `<div class="family-card-check"><span>${esc(labelFor(r.requirement_type))}</span><strong class="${r.met?'is-met':'is-unmet'}">${r.met?'✓ Complete':'○ Needed'}</strong></div>`;
    });
    host.innerHTML=`<div class="family-license-target"><span class="meta">Toward</span> <strong>${esc(target.target_stage_display||target.target_stage||'Next stage')}</strong></div>${rows.join('')}`;
  }

  async function enrichDriver(card){
    const id=String(card.dataset.driverId||''),s=subjectByDriver.get(id);if(!s)return;
    const set=(field,value)=>{const el=card.querySelector(`[data-card-value="${field}"]`);if(el)el.textContent=value};
    set('name',s.name||'Driver');set('home',locationText(s));set('email',s.email||'Not set');set('mobile',prettyPhone(s.mobile));
    setVerification(card,'mobile',s.mobile_verified,!!s.mobile);
    const stateEl=card.querySelector('[data-license-state]');if(stateEl)stateEl.textContent=s.home_state||'—';
    try{
      const out=await api('profile-api','license_overview',{driver_id:id}),license=out.license||{};
      const nameEl=card.querySelector('[data-license-name]');if(nameEl)nameEl.textContent=license.current_stage_display||s.license_stage||'Driver';
      const start=license?.targets?.[0]?.drive_totals_contract?.license_stage_start_date||s.license_effective_date||null;
      set('license_effective_date',fmtDate(start));
      card.dataset.licenseStage=String(license.current_stage||s.license_stage||'');
      card.dataset.licenseEffectiveDate=String(start||'');
      const datePencil=card.querySelector('[data-inline-edit="license_effective_date"]');
      if(datePencil&&String(card.dataset.licenseStage).toUpperCase()!=='LEVEL_1'){
        datePencil.hidden=true;
        datePencil.title='Later-stage dates are retained as audited transition history.';
      }
      renderProgress(card,license);
    }catch(err){
      const host=card.querySelector('[data-license-progress]');if(host)host.innerHTML=`<div class="meta">${esc(err.message||err)}</div>`;
    }
  }

  async function enrichCards(){
    try{await loadSubjects()}catch(err){console.warn('Card profile data unavailable',err);return}
    document.querySelectorAll('.family-grownup-card[data-person-id]').forEach(card=>{
      const s=subjectByPerson.get(String(card.dataset.personId||''));if(!s)return;
      if(card.dataset.profilePersonId){
        const set=(field,value)=>{const el=card.querySelector(`[data-card-value="${field}"]`);if(el)el.textContent=value};
        set('name',s.name||'Grown-up');set('email',s.email||'Not set');set('mobile',prettyPhone(s.mobile));
        const emailBadge=card.querySelector('[data-card-value="email"]')?.parentElement?.querySelector('.family-verify-badge');
        if(emailBadge){emailBadge.textContent=s.email?(s.email_verified?'Verified':'Not verified'):'';emailBadge.className='family-verify-badge '+(s.email_verified?'is-verified':'is-unverified')}
        const mobileBadge=card.querySelector('[data-card-value="mobile"]')?.parentElement?.querySelector('.family-verify-badge');
        if(mobileBadge){mobileBadge.textContent=s.mobile?(s.mobile_verified?'Verified':'Not verified'):'';mobileBadge.className='family-verify-badge '+(s.mobile_verified?'is-verified':'is-unverified')}
      }
    });
    await Promise.all([...document.querySelectorAll('.family-driver-card[data-driver-id]')].map(enrichDriver));
  }

  function fieldConfig(field,s,card){
    if(field==='name')return{type:'text',value:s?.name||'',label:'Name'};
    if(field==='home_zip')return{type:'text',value:s?.home_zip||'',label:'Home ZIP',attrs:'inputmode="numeric" maxlength="5" pattern="[0-9]{5}"'};
    if(field==='email')return{type:'email',value:s?.email||'',label:'Email'};
    if(field==='mobile')return{type:'tel',value:s?.mobile||'',label:'Mobile'};
    if(field==='license_effective_date')return{type:'date',value:card.dataset.licenseEffectiveDate||'',label:'Issue / effective date'};
    return null;
  }

  async function saveField(card,field,value,msg){
    const personId=String(card.dataset.personId||''),driverId=String(card.dataset.driverId||''),s=driverId?subjectByDriver.get(driverId):subjectByPerson.get(personId);
    if(!s)throw new Error('Profile data is unavailable.');
    if(field==='name'){
      const payload={person_id:s.person_id,name:value.trim()};
      if(s.kind==='DRIVER')payload.home_zip=s.home_zip;
      await api('profile-api','update_basic',payload);
    }else if(field==='home_zip'){
      if(!/^\d{5}$/.test(value.trim()))throw new Error('ZIP code must be 5 digits.');
      await api('profile-api','update_basic',{person_id:s.person_id,name:s.name,home_zip:value.trim()});
    }else if(field==='email'||field==='mobile'){
      const type=field==='email'?'EMAIL':'MOBILE';
      const out=await api('contact-endpoint-api','request_contact_change',{person_id:s.person_id,endpoint_type:type,value:value.trim()});
      if(out.change?.status==='ALREADY_CURRENT'){msg.textContent='That value is already current.';return false}
      msg.textContent='Verification sent. The current verified value remains active until verification is complete.';
      msg.classList.remove('is-error');
      return false;
    }else if(field==='license_effective_date'){
      await api('profile-api','update_license_effective_date',{driver_id:driverId,effective_date:value});
    }
    await window.DVFamily?.refresh?.();
    await window.DVProfile?.refresh?.();
    return true;
  }

  function beginEdit(button){
    const card=button.closest('.family-grownup-card,.family-driver-card'),field=button.dataset.inlineEdit;if(!card||!field)return;
    const driverId=String(card.dataset.driverId||''),personId=String(card.dataset.personId||''),s=driverId?subjectByDriver.get(driverId):subjectByPerson.get(personId),config=fieldConfig(field,s,card);if(!config)return;
    const row=button.closest('.family-inline-field'),valueEl=row?.querySelector(`[data-card-value="${field==='home_zip'?'home':field}"]`);if(!row||!valueEl)return;
    const original=row.innerHTML;
    row.innerHTML=`<span class="field-label">${esc(config.label)}</span><div class="family-inline-editor"><input type="${config.type}" value="${esc(config.value)}" ${config.attrs||''}><button class="button secondary" type="button" data-inline-save>Save</button><button class="button secondary" type="button" data-inline-cancel>Cancel</button><small class="family-inline-message" role="status"></small></div>`;
    const input=row.querySelector('input'),msg=row.querySelector('.family-inline-message');input?.focus();input?.select?.();
    row.querySelector('[data-inline-cancel]').onclick=e=>{e.stopPropagation();row.innerHTML=original};
    row.querySelector('[data-inline-save]').onclick=async e=>{
      e.stopPropagation();const save=e.currentTarget;save.disabled=true;msg.textContent='Saving…';msg.classList.remove('is-error');
      try{const refresh=await saveField(card,field,input.value,msg);if(refresh!==false)return;save.disabled=false}
      catch(err){msg.textContent=err.message||String(err);msg.classList.add('is-error');save.disabled=false}
    };
    input?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();row.innerHTML=original}});
  }

  document.addEventListener('click',e=>{
    const pencil=e.target.closest?.('[data-inline-edit]');if(pencil){e.preventDefault();e.stopPropagation();beginEdit(pencil)}
  });
  window.addEventListener('dv:family-rendered',()=>void enrichCards());
  client.auth.onAuthStateChange((_e,next)=>{session=next});
  void ensureSession().catch(()=>{});
})();
