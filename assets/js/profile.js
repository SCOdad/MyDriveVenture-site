(()=>{if(document.querySelector('.site-header')&&!document.querySelector('script[data-dv-canonical-header]')){const h=document.createElement('script');h.src='/assets/js/canonical-header.js?v=20260825-0062b';h.defer=true;h.dataset.dvCanonicalHeader='true';document.head.appendChild(h)}})();
(()=>{
  const cfg=window.DV_APP_CONFIG||{}
  const embedded=document.body?.dataset?.familyProfile==='true'
  const loading=document.getElementById('profile-loading'),app=document.getElementById('profile-app'),authNeeded=document.getElementById('profile-auth-needed')
  if(!cfg.supabaseUrl||!cfg.publishableKey){loading.innerHTML='<p>Profile settings are not configured.</p>';return}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
  const MAX_AVATAR_BYTES=4*1024*1024
  let session=null,subjects=[],pendingChanges=[],avatarState=null,licenseState=null,smsState=null,contactChangesAvailable=false
  const subjectSelect=document.getElementById('profile-subject')
  const nameInput=document.getElementById('profile-name'),zipInput=document.getElementById('profile-zip')
  const zipWrap=document.getElementById('profile-zip-wrap'),zipRequired=document.getElementById('profile-zip-required'),zipHelp=document.getElementById('profile-zip-help'),selectedName=document.getElementById('profile-selected-name')
  const colorWrap=document.getElementById('profile-color-wrap'),colorInput=document.getElementById('profile-favorite-color')
  const colorPicker=colorWrap?(colorWrap._dvPalettePicker||window.DV_DRIVER_PALETTES?.mountPicker(colorWrap,{allowEmpty:true})):null
  let colorDirty=false
  colorWrap?.addEventListener('dv:palette-change',event=>{colorDirty=true;window.DV_DRIVER_PALETTES?.apply(document.body,event.detail?.value||'YELLOW')})
  const emailEl=document.getElementById('profile-email'),mobileEl=document.getElementById('profile-mobile')
  const emailStatus=document.getElementById('profile-email-status'),mobileStatus=document.getElementById('profile-mobile-status')
  const changeEmail=document.getElementById('change-email'),changeMobile=document.getElementById('change-mobile')
  const smsStateEl=document.getElementById('profile-sms-state'),smsDetail=document.getElementById('profile-sms-detail'),smsAction=document.getElementById('profile-sms-action')
  const scopeNote=document.getElementById('profile-scope-note')
  const avatarCard=document.getElementById('avatar-card'),avatarSummary=document.getElementById('avatar-summary'),avatarPending=document.getElementById('avatar-pending'),avatarPhoto=document.getElementById('avatar-photo'),avatarParker=document.getElementById('avatar-parker'),avatarParkerHelp=document.getElementById('avatar-parker-help'),avatarParkerRow=document.getElementById('avatar-parker-row'),avatarParkerReopt=document.getElementById('avatar-parker-reopt')
  const licenseCard=document.getElementById('license-card'),licenseEffective=document.getElementById('license-effective-date'),licenseTarget=document.getElementById('license-target'),licenseAdvance=document.getElementById('license-advance'),licenseRequirements=document.getElementById('license-requirements')
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  const localDate=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
  const REQUIREMENT_LABELS={
    MinimumAgeYears:'Minimum age',
    MinimumPracticeHours:'Supervised practice hours',
    MinimumNightHours:'Night driving hours',
    PriorStageMonths:'Time in current licensing stage',
    DrivingLogRequired:'Driving log',
    DriverEducationRequired:'Driver education',
    ParentAuthorizationRequired:'Parent / grownup authorization',
    PracticeAffidavitRequired:'Practice-hours affidavit',
    PracticeAffidavitRequiredUnderAgeYears:'Practice-hours affidavit',
    GoodDrivingRecordRequired:'Good driving record',
    AtFaultCrashFreeDays:'At-fault-crash-free period',
    ParentCertificationRequired:'Parent certification',
    Segment2Required:'Segment 2 driver education',
    SkillsTestRequired:'Road skills test',
    ViolationFreeDays:'Violation-free period'
  }
  const REQUIREMENT_EXPLAINERS={
    MinimumAgeYears:'Driver must reach the minimum age for this licensing stage.',
    MinimumPracticeHours:'Complete the required supervised practice driving hours.',
    MinimumNightHours:'Complete the required supervised night-driving hours.',
    PriorStageMonths:'Remain in the current licensing stage for the required amount of time.',
    DrivingLogRequired:'Keep completed drives in the Drive Venture driving log.',
    DriverEducationRequired:'Complete the driver-education requirement for this stage.',
    ParentAuthorizationRequired:'A parent or grownup must authorize this licensing step.',
    PracticeAffidavitRequired:'A parent or grownup must confirm the required practice-hours affidavit.',
    PracticeAffidavitRequiredUnderAgeYears:'A practice-hours affidavit is required below the configured age.',
    GoodDrivingRecordRequired:'The driver must meet the jurisdiction’s good-driving-record requirement.',
    AtFaultCrashFreeDays:'The driver must complete the required period without an at-fault crash.',
    ParentCertificationRequired:'A parent or grownup must provide the required certification.',
    Segment2Required:'Complete Segment 2 driver education.',
    SkillsTestRequired:'Pass the required road skills test.',
    ViolationFreeDays:'The driver must complete the required violation-free period.'
  }
  const GROWNUP_ONLY_REQUIREMENTS=new Set(['ParentAuthorizationRequired','ParentCertificationRequired','PracticeAffidavitRequired','PracticeAffidavitRequiredUnderAgeYears'])
  const requirementLabel=s=>REQUIREMENT_LABELS[s]||String(s||'Requirement').replace(/([a-z0-9])([A-Z])/g,'$1 $2').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
  const requirementExplainer=s=>REQUIREMENT_EXPLAINERS[s]||''
  const numericValue=v=>{const n=Number(v);return Number.isFinite(n)?n:null}
  const formatNumber=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:2})
  function requirementProgress(r,effectiveDate){
    const required=numericValue(r.required)
    if(required===null)return null
    let actual=numericValue(r.actual)
    if(r.requirement_type==='PriorStageMonths'&&typeof r.actual==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.actual)&&effectiveDate){
      const start=new Date(`${r.actual}T00:00:00Z`),end=new Date(`${effectiveDate}T00:00:00Z`)
      if(!Number.isNaN(start.getTime())&&!Number.isNaN(end.getTime())&&end>=start)actual=(end-start)/86400000/30.4375
    }
    if(actual===null)return null
    if(required<=0)return{actual,required,pct:100,notRequired:true}
    return{actual,required,pct:Math.max(0,Math.min(100,(actual/required)*100)),notRequired:false}
  }
  function requirementDetail(r,effectiveDate){
    const progress=requirementProgress(r,effectiveDate),unit=r.unit?String(r.unit).toLowerCase():''
    if(r.requirement_type==='DrivingLogRequired'){
      const count=numericValue(r.actual)
      return count===null?'Driving log required':`${formatNumber(count)} completed drive${count===1?'':'s'} logged`
    }
    if(progress){
      const unitText=unit?` ${unit}`:''
      if(progress.notRequired)return `${formatNumber(progress.actual)}${unitText} (${formatNumber(progress.required)} required — not required for this stage)`
      return `${formatNumber(progress.actual)} of ${formatNumber(progress.required)}${unitText}`
    }
    if(r.met)return r.actual&&r.actual!=='not confirmed'?`Requirement satisfied · ${r.actual}${r.unit?` ${String(r.unit).toLowerCase()}`:''}`:'Requirement satisfied'
    return r.reason||'Not yet satisfied'
  }
  function requirementProgressHtml(r,effectiveDate){
    const progress=requirementProgress(r,effectiveDate)
    if(!progress||progress.notRequired)return''
    const label=`${requirementLabel(r.requirement_type)}: ${formatNumber(progress.actual)} of ${formatNumber(progress.required)} ${String(r.unit||'').toLowerCase()}`.trim()
    return `<div class="license-progress" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${esc(progress.required)}" aria-valuenow="${esc(Math.min(progress.actual,progress.required))}"><span style="width:${progress.pct.toFixed(1)}%"></span></div>`
  }
  async function call(action,payload={}){const token=session?.access_token;if(!token)throw new Error('Please sign in again.');const r=await fetch(`${cfg.supabaseUrl}/functions/v1/profile-api`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`,'apikey':cfg.publishableKey},body:JSON.stringify({action,...payload})});const body=await r.json().catch(()=>({}));if(!r.ok||body.ok!==true)throw new Error(body.error||'Profile update failed');return body}
  async function contactCall(payload){const token=session?.access_token;if(!token)throw new Error('Please sign in again.');const r=await fetch(`${cfg.supabaseUrl}/functions/v1/contact-endpoint-api`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`,'apikey':cfg.publishableKey},body:JSON.stringify(payload)});const body=await r.json().catch(()=>({}));if(!r.ok||body.ok!==true)throw new Error(body.error||'Contact change failed');return body}
  async function avatarCall(payload,form=null){const token=session?.access_token;if(!token)throw new Error('Please sign in again.');const headers={'authorization':`Bearer ${token}`,'apikey':cfg.publishableKey};if(!form)headers['content-type']='application/json';const r=await fetch(`${cfg.supabaseUrl}/functions/v1/avatar-request-api`,{method:'POST',headers,body:form||JSON.stringify(payload)});const body=await r.json().catch(()=>({}));if(!r.ok||body.ok!==true)throw new Error(body.error||'Avatar request failed');return body}
  function status(id,message,type=''){const el=document.getElementById(id);if(!el)return;el.textContent=message||'';el.classList.toggle('profile-success',type==='success');el.classList.toggle('profile-error',type==='error')}
  function selected(){return subjects.find(s=>String(s.person_id)===String(subjectSelect.value))||subjects[0]||null}
  function pendingFor(personId,type){return pendingChanges.find(p=>String(p.person_id)===String(personId)&&String(p.endpoint_type)===type)||null}
  function renderAvatar(){const s=selected();if(!avatarCard)return;if(!s?.driver_id){avatarCard.hidden=true;avatarState=null;return}avatarCard.hidden=false;const current=avatarState?.current_avatar,pending=avatarState?.pending_request,reoptRequired=Boolean(avatarState?.parker_mms_reopt_required||avatarState?.parker_mms_one_time);if(current)avatarSummary.textContent='A custom avatar is active. Upload a new photo or ask Parker for one to replace it; the current avatar stays live until the replacement is published.';else avatarSummary.textContent='Create a custom Drive Venture avatar from a clear photo.';avatarPending.textContent=pending?`Avatar request in progress — ${String(pending.status||'REQUESTED').replaceAll('_',' ').toLowerCase()}.`:'';const locked=Boolean(pending);if(avatarPhoto)avatarPhoto.disabled=locked;if(avatarParkerHelp)avatarParkerHelp.textContent='Parker can ask you for the photo by text.';if(avatarParkerRow)avatarParkerRow.hidden=reoptRequired;if(avatarParkerReopt)avatarParkerReopt.hidden=!reoptRequired;if(avatarParker){avatarParker.disabled=locked||reoptRequired||!avatarState?.parker_mms_available;avatarParker.setAttribute('aria-disabled',String(avatarParker.disabled));avatarParker.textContent=current?'Text me to replace it':'Text me for a photo'}const upload=document.getElementById('avatar-upload');if(upload){upload.disabled=locked;upload.textContent=current?'Upload replacement photo':'Upload photo'}}
  async function refreshAvatar(){const s=selected();avatarState=null;status('avatar-status','');if(!s?.driver_id){renderAvatar();return}try{avatarState=await avatarCall({action:'overview',driver_id:s.driver_id});renderAvatar()}catch(err){avatarState=null;if(avatarCard)avatarCard.hidden=true;console.warn('Avatar settings unavailable',err)}}
  function renderLicense(){
    const s=selected()
    if(!licenseCard)return
    if(!s?.driver_id){licenseCard.hidden=true;licenseState=null;return}
    licenseCard.hidden=false
    if(!licenseState){
      document.getElementById('license-current-stage').textContent='Loading…'
      document.getElementById('license-jurisdiction').textContent=''
      licenseRequirements.innerHTML=''
      licenseTarget.innerHTML='<option value="">Loading…</option>'
      licenseAdvance.disabled=true
      return
    }
    document.getElementById('license-current-stage').textContent=licenseState.current_stage_display||licenseState.current_stage||'—'
    document.getElementById('license-jurisdiction').textContent=licenseState.jurisdiction||''
    const targets=licenseState.targets||[]
    if(!targets.length){
      licenseTarget.innerHTML='<option value="">No later stage configured</option>'
      licenseAdvance.disabled=true
      licenseRequirements.innerHTML='<p class="meta">There is no later ordinary licensing stage configured from the current stage.</p>'
      return
    }
    const nextTarget=targets[0],laterTargets=targets.slice(1)
    const nextEligible=(licenseState.eligible_targets||[]).find(t=>t.target_stage===nextTarget.target_stage)
    licenseTarget.innerHTML=nextEligible
      ?`<option value="">Choose the next eligible stage</option><option value="${esc(nextEligible.target_stage)}">${esc(nextEligible.target_stage_display||nextEligible.target_stage)}</option>`
      :'<option value="">Next stage is not yet eligible</option>'
    licenseAdvance.disabled=true
    const renderTarget=(t,{interactive=false,kicker='' }={})=>{
      const reqs=t.requirements||[],unmet=t.unmet_requirements||[]
      return `<div class="license-target-block">
        <div class="license-target-head">
          <div>${kicker?`<small class="license-target-kicker">${esc(kicker)}</small>`:''}<strong>${esc(t.target_stage_display||t.target_stage)}</strong></div>
          <span class="${t.eligible?'license-met':'license-unmet'}">${t.eligible?'Eligible':'Not yet eligible'}</span>
        </div>
        <div class="license-requirement-list">
          ${reqs.map(r=>{
            const confirmable=interactive&&!r.met&&/needs confirmation/i.test(r.reason||'')
            const grownupOnly=GROWNUP_ONLY_REQUIREMENTS.has(r.requirement_type)
            const actorCanConfirm=!(s.relation==='SELF'&&grownupOnly)
            const progress=requirementProgress(r,t.effective_date||licenseState.effective_date)
            const neutral=Boolean(progress?.notRequired)
            const stateClass=neutral?'license-neutral':(r.met?'license-met':'license-unmet')
            const explainer=requirementExplainer(r.requirement_type)
            const detail=requirementDetail(r,t.effective_date||licenseState.effective_date)
            return `<div class="license-requirement">
              <div class="license-requirement-copy">
                <div class="license-requirement-title"><span>${esc(requirementLabel(r.requirement_type))}</span><small class="${stateClass}">${neutral?'Not required':(r.met?'Satisfied':'Needed')}</small></div>
                ${explainer?`<small class="license-requirement-explainer">${esc(explainer)}</small>`:''}
                <small class="license-requirement-progress-copy">${esc(detail)}</small>
                ${confirmable&&grownupOnly&&!actorCanConfirm?'<small class="license-requirement-actor-note">A parent or grownup must confirm this requirement.</small>':''}
                ${requirementProgressHtml(r,t.effective_date||licenseState.effective_date)}
              </div>
              ${confirmable&&actorCanConfirm?`<button type="button" class="button secondary license-confirm" data-stage="${esc(t.target_stage)}" data-requirement="${esc(r.requirement_type)}">Confirm</button>`:''}
            </div>`
          }).join('')}
        </div>
        ${!reqs.length&&unmet.length?`<p class="meta">${esc(unmet.map(x=>x.reason).join(' · '))}</p>`:''}
      </div>`
    }
    const nextHtml=renderTarget(nextTarget,{interactive:true,kicker:'Next stage'})
    const laterHtml=laterTargets.length
      ?`<details class="license-later-stages"><summary>See later licensing stages (${laterTargets.length})</summary><p class="license-later-note">Planning view only. Later-stage requirements may depend on first receiving the next stage, so no confirmations or stage-change controls appear here.</p>${laterTargets.map(t=>renderTarget(t,{interactive:false})).join('')}</details>`
      :''
    licenseRequirements.innerHTML=nextHtml+laterHtml
  }
  async function refreshLicense(){const s=selected();licenseState=null;status('license-status','');if(!s?.driver_id){renderLicense();return}if(!licenseEffective.value)licenseEffective.value=localDate();renderLicense();try{const out=await call('license_overview',{driver_id:s.driver_id,effective_date:licenseEffective.value});licenseState=out.license;renderLicense()}catch(err){licenseState=null;licenseCard.hidden=false;document.getElementById('license-current-stage').textContent='Unavailable';licenseRequirements.innerHTML='';status('license-status',err.message||String(err),'error')}}
  function renderSms(){
    if(!smsStateEl||!smsAction)return
    const state=String(smsState?.state||'')
    const labels={
      NO_MOBILE:['No mobile','Add and verify a mobile number before enrolling in Text Parker.'],
      VERIFICATION_PENDING:['Verification pending',smsState?.pending_mobile?`Verify ${smsState.pending_mobile} before enrolling in Text Parker.`:'Verify the pending mobile number before enrolling in Text Parker.'],
      MOBILE_UNVERIFIED:['Not enrolled','Verify this mobile number before enrolling in Text Parker.'],
      VERIFIED_NOT_ENROLLED:['Off','This verified number is not enrolled in Text Parker.'],
      OPTED_IN:['On','Drive Venture / Text Parker messaging is enabled for this number.'],
      OPTED_OUT:['Off','Text Parker messaging is off for this number.']
    }
    const label=labels[state]||['Unavailable','Text Parker status could not be determined.']
    smsStateEl.textContent=label[0]
    if(smsDetail)smsDetail.textContent=label[1]
    const actionable=state==='VERIFIED_NOT_ENROLLED'||state==='OPTED_OUT'||state==='OPTED_IN'
    smsAction.hidden=!actionable
    smsAction.disabled=!actionable
    if(actionable)smsAction.textContent=state==='OPTED_IN'?'Turn off Text Parker':'Turn on Text Parker'
  }
  async function refreshSms(){
    const s=selected()
    smsState=null
    renderSms()
    if(!s)return
    const personId=String(s.person_id)
    try{
      const out=await contactCall({action:'sms_consent_state',person_id:personId})
      if(String(selected()?.person_id)!==personId)return
      smsState=out.sms||null
      renderSms()
    }catch(err){
      if(String(selected()?.person_id)!==personId)return
      smsState=null
      if(smsStateEl)smsStateEl.textContent='Unavailable'
      if(smsDetail)smsDetail.textContent=err.message||String(err)
      if(smsAction)smsAction.hidden=true
    }
  }
  function renderSubject(){
    const s=selected();if(!s)return
    const driver=s.kind==='DRIVER',pe=pendingFor(s.person_id,'EMAIL'),pm=pendingFor(s.person_id,'MOBILE')
    nameInput.value=s.name||''
    zipInput.value=driver?(s.home_zip||''):''
    if(zipWrap)zipWrap.hidden=!driver
    zipInput.required=driver
    zipRequired.hidden=!driver
    zipHelp.textContent=driver?'Required for driver location, weather, and night calculations.':''
    if(selectedName)selectedName.textContent=s.name||'Profile details'
    if(colorWrap){colorWrap.hidden=!driver;colorPicker?.setValue(driver?(s.favorite_color||''):'');window.DV_DRIVER_PALETTES?.apply(document.body,driver?(s.favorite_color||''):'YELLOW');colorDirty=false}
    emailEl.textContent=pe?.proposed_value||s.email||'Not set'
    mobileEl.textContent=pm?.proposed_value||s.mobile||'Not set'
    emailStatus.textContent=pe?`Pending verification — current: ${s.email||'not set'}`:(s.email?`${s.email_verified?'Verified':'Not verified'}`:'')
    mobileStatus.textContent=pm?`Pending verification — current: ${s.mobile||'not set'}`:(s.mobile?`${s.mobile_verified?'Verified':'Not verified'}`:'')
    scopeNote.textContent=s.relation==='SELF'?(driver?'You are editing your driver profile.':'You are editing your grown-up profile.'):'You are editing a driver profile you are authorized to manage.'
    changeEmail.disabled=!contactChangesAvailable;changeMobile.disabled=!contactChangesAvailable
    changeEmail.setAttribute('aria-disabled',String(!contactChangesAvailable));changeMobile.setAttribute('aria-disabled',String(!contactChangesAvailable))
    status('profile-status','');status('contact-status',contactChangesAvailable?'':'Verified contact changes are not available in this environment.')
    void refreshSms();refreshAvatar();refreshLicense()
    if(embedded){
      const params=new URLSearchParams(location.search);params.set('person',String(s.person_id));if(s.driver_id)params.set('driver',String(s.driver_id));else params.delete('driver')
      history.replaceState(null,'',`${location.pathname}?${params.toString()}${location.hash}`)
    }
  }
  function render(){
    subjectSelect.innerHTML=subjects.map(s=>`<option value="${esc(s.person_id)}">${esc(s.name)}${s.relation==='SELF'?' (you)':''}</option>`).join('')
    const params=new URLSearchParams(location.search),person=params.get('person'),driver=params.get('driver')
    const wanted=subjects.find(s=>(person&&String(s.person_id)===person)||(driver&&String(s.driver_id)===driver))
    if(wanted)subjectSelect.value=String(wanted.person_id)
    renderSubject()
  }
  async function refresh(keepPersonId=null){const result=await call('overview');contactChangesAvailable=result.contact_changes_available===true;subjects=result.subjects||[];if(contactChangesAvailable){const pending=await contactCall({action:'pending_changes'});pendingChanges=pending.pending_changes||[]}else pendingChanges=[];if(!subjects.length)throw new Error('No editable profiles are available to this account.');render();if(keepPersonId&&subjects.some(s=>String(s.person_id)===String(keepPersonId))){subjectSelect.value=String(keepPersonId);renderSubject()}if(embedded){const self=subjects.find(s=>s.relation==='SELF');const driverOnly=Boolean(self?.kind==='DRIVER'&&!subjects.some(s=>s.relation==='SELF'&&s.kind==='PERSON'));document.body.classList.toggle('family-driver-profile-mode',driverOnly);window.dispatchEvent(new CustomEvent('dv:profile-mode',{detail:{driverOnly,subjects}}))}}
  async function init(){const result=await client.auth.getSession();session=result.data.session;if(!session){loading.hidden=true;authNeeded.hidden=false;return}try{await refresh();loading.hidden=true;app.hidden=false}catch(e){loading.innerHTML=`<p>${esc(e.message||e)}</p>`}}
  subjectSelect?.addEventListener('change',renderSubject)
  document.getElementById('profile-form')?.addEventListener('submit',async e=>{e.preventDefault();const s=selected();if(!s)return;const button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;status('profile-status','Saving…');try{const payload={person_id:s.person_id,name:nameInput.value};if(s.kind==='DRIVER')payload.home_zip=zipInput.value;if(s.kind==='DRIVER'&&colorDirty)payload.favorite_color=colorPicker?.getValue()||null;await call('update_basic',payload);await refresh(s.person_id);status('profile-status','Profile saved.','success')}catch(err){status('profile-status',err.message||String(err),'error')}finally{button.disabled=false}})
  licenseEffective?.addEventListener('change',()=>refreshLicense())
  licenseTarget?.addEventListener('change',()=>{licenseAdvance.disabled=!licenseTarget.value})
  licenseRequirements?.addEventListener('click',async e=>{const button=e.target.closest('.license-confirm');if(!button)return;const s=selected(),stage=button.dataset.stage,requirement=button.dataset.requirement;if(!s?.driver_id||!stage||!requirement)return;const ok=confirm(`Confirm that ${requirementLabel(requirement)} was satisfied by ${licenseEffective.value}? This confirmation is recorded in the driver's licensing history.`);if(!ok)return;button.disabled=true;status('license-status','Recording confirmation…');try{await call('record_license_requirement',{driver_id:s.driver_id,target_stage:stage,requirement_type:requirement,satisfied_on:licenseEffective.value});await refreshLicense();status('license-status','Requirement confirmed.','success')}catch(err){status('license-status',err.message||String(err),'error');button.disabled=false}})
  document.getElementById('license-advance-form')?.addEventListener('submit',async e=>{e.preventDefault();const s=selected(),target=licenseTarget.value,date=licenseEffective.value;if(!s?.driver_id||!target||!date)return;const targetData=(licenseState?.eligible_targets||[]).find(t=>t.target_stage===target),label=targetData?.target_stage_display||target;if(!confirm(`Record ${label} effective ${date}? This creates an auditable licensing-stage transition and cannot be edited from the profile.`))return;licenseAdvance.disabled=true;status('license-status','Recording licensing stage…');try{await call('advance_license_stage',{driver_id:s.driver_id,target_stage:target,effective_date:date});await refreshLicense();status('license-status',`Licensing stage advanced to ${label}.`,'success')}catch(err){status('license-status',err.message||String(err),'error');licenseAdvance.disabled=!licenseTarget.value}})
  async function contactChange(kind){const s=selected();if(!s)return;const current=kind==='email'?s.email:s.mobile;const label=kind==='email'?'email address':'mobile number';const value=prompt(`Enter the new ${label} for ${s.name}:`,current||'');if(value===null)return;if(!value.trim()){status('contact-status',`Enter a ${label}.`,'error');return}if(kind==='mobile'&&current){const ok=confirm('Changing this mobile number will opt the old number out of Drive Venture SMS. The new number will not inherit SMS consent and must explicitly opt in again to use Text Parker. Continue?');if(!ok)return}status('contact-status',`Sending ${label} verification…`);try{const out=await contactCall({action:'request_contact_change',person_id:s.person_id,endpoint_type:kind.toUpperCase(),value:value.trim()});const change=out.change||{};if(change.status==='ALREADY_CURRENT'){status('contact-status',`That ${label} is already current.`);return}await refresh(s.person_id);const suffix=kind==='mobile'?' After verification, the old number will be opted out of SMS. To use Text Parker from the new number, text JOIN to Parker.':'';status('contact-status',`Verification sent to the new ${label}. It will remain pending until you verify it.${suffix}`,'success')}catch(err){status('contact-status',err.message||'Unable to start contact change.','error')}}
  changeEmail?.addEventListener('click',()=>contactChange('email'))
  changeMobile?.addEventListener('click',()=>contactChange('mobile'))
  document.getElementById('avatar-upload-form')?.addEventListener('submit',async e=>{e.preventDefault();const s=selected(),file=avatarPhoto?.files?.[0];if(!s?.driver_id)return;if(!file){status('avatar-status','Choose a photo first.','error');return}if(file.size>MAX_AVATAR_BYTES){status('avatar-status','Photo must be 4 MB or smaller.','error');return}const button=document.getElementById('avatar-upload');button.disabled=true;status('avatar-status','Uploading photo…');try{const form=new FormData();form.append('action','upload_photo');form.append('driver_id',s.driver_id);form.append('photo',file);const out=await avatarCall({},form);await refreshAvatar();status('avatar-status',out.replacement?'Replacement avatar request started. Your current avatar stays active until the new one is ready.':'Avatar request started. Parker has the photo.','success');avatarPhoto.value=''}catch(err){status('avatar-status',err.message||String(err),'error');button.disabled=false}})
  avatarParker?.addEventListener('click',async()=>{const s=selected();if(!s?.driver_id||avatarState?.parker_mms_reopt_required||avatarState?.parker_mms_one_time)return;avatarParker.disabled=true;status('avatar-status','Asking Parker to text for the photo…');try{await avatarCall({action:'request_parker_photo',driver_id:s.driver_id});await refreshAvatar();status('avatar-status','Parker sent the photo request. Reply to that text with one clear photo.','success')}catch(err){status('avatar-status',err.message||String(err),'error');avatarParker.disabled=false}})
  smsAction?.addEventListener('click',async()=>{
    const s=selected();if(!s||!smsState)return
    const turningOn=smsState.state!=='OPTED_IN'
    const prompt=turningOn
      ? `Turn on Text Parker for ${smsState.mobile||'this verified mobile'}? By continuing, you agree to receive Drive Venture / Text Parker SMS messages. Message frequency varies; message and data rates may apply. Reply HELP for help or STOP to opt out.`
      : `Turn off Text Parker for ${smsState.mobile||'this mobile'}? Drive commands and other Text Parker messages will stop until you opt in again.`
    if(!confirm(prompt))return
    smsAction.disabled=true
    status('contact-status',turningOn?'Turning on Text Parker…':'Turning off Text Parker…')
    try{
      const out=await contactCall({action:'set_sms_consent',person_id:s.person_id,event_type:turningOn?'OPT_IN':'OPT_OUT'})
      smsState=out.sms||null;renderSms()
      const welcome=out.sms?.welcome
      status('contact-status',turningOn?(welcome?.failed?'Text Parker is on, but the welcome text could not be sent.':'Text Parker is on.'):'Text Parker is off.','success')
      await refreshSms()
    }catch(err){status('contact-status',err.message||String(err),'error')}
    finally{smsAction.disabled=false}
  })
  function selectProfile(detail={}){
    const target=subjects.find(s=>(detail.person_id&&String(s.person_id)===String(detail.person_id))||(detail.driver_id&&String(s.driver_id)===String(detail.driver_id)))
    if(!target)return false
    subjectSelect.value=String(target.person_id);renderSubject()
    document.getElementById('family-profile-editor')?.scrollIntoView({behavior:'smooth',block:'start'})
    return true
  }
  window.DVProfile={select:selectProfile,refresh:()=>refresh(selected()?.person_id)}
  window.addEventListener('dv:profile-select',event=>selectProfile(event.detail||{}))
  window.dispatchEvent(new CustomEvent('dv:profile-ready'))
  document.getElementById('profile-sign-out')?.addEventListener('click',async()=>{await client.auth.signOut();location.replace('/log/')})
  client.auth.onAuthStateChange((_event,next)=>{session=next})
  init()
})()
