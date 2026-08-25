(()=>{if(document.querySelector('.site-header')&&!document.querySelector('script[data-dv-canonical-header]')){const h=document.createElement('script');h.src='/assets/js/canonical-header.js?v=20260825-0062b';h.defer=true;h.dataset.dvCanonicalHeader='true';document.head.appendChild(h)}})();
(()=>{
  const cfg=window.DV_APP_CONFIG||{}
  const loading=document.getElementById('profile-loading'),app=document.getElementById('profile-app'),authNeeded=document.getElementById('profile-auth-needed')
  if(!cfg.supabaseUrl||!cfg.publishableKey){loading.innerHTML='<p>Profile settings are not configured.</p>';return}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
  const MAX_AVATAR_BYTES=4*1024*1024
  let session=null,subjects=[],pendingChanges=[],avatarState=null,licenseState=null
  const subjectSelect=document.getElementById('profile-subject')
  const nameInput=document.getElementById('profile-name'),zipInput=document.getElementById('profile-zip')
  const zipRequired=document.getElementById('profile-zip-required'),zipHelp=document.getElementById('profile-zip-help')
  const emailEl=document.getElementById('profile-email'),mobileEl=document.getElementById('profile-mobile')
  const emailStatus=document.getElementById('profile-email-status'),mobileStatus=document.getElementById('profile-mobile-status')
  const changeEmail=document.getElementById('change-email'),changeMobile=document.getElementById('change-mobile')
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
  function renderSubject(){const s=selected();if(!s)return;const driver=s.kind==='DRIVER';const pe=pendingFor(s.person_id,'EMAIL'),pm=pendingFor(s.person_id,'MOBILE');nameInput.value=s.name||'';zipInput.value=s.home_zip||'';zipInput.required=driver;zipRequired.hidden=!driver;zipHelp.textContent=driver?'Required for driver location, weather, and night calculations.':'Optional for your profile.';emailEl.textContent=pe?.proposed_value||s.email||'Not set';mobileEl.textContent=pm?.proposed_value||s.mobile||'Not set';emailStatus.textContent=pe?`Pending verification — current: ${s.email||'not set'}`:(s.email?`${s.email_verified?'Verified':'Not verified'}`:'');mobileStatus.textContent=pm?`Pending verification — current: ${s.mobile||'not set'}`:(s.mobile?`${s.mobile_verified?'Verified':'Not verified'}`:'');scopeNote.textContent=s.relation==='SELF'?'You are editing your own profile.':'You are editing a driver profile you are authorized to manage.';changeEmail.disabled=false;changeMobile.disabled=false;changeEmail.setAttribute('aria-disabled','false');changeMobile.setAttribute('aria-disabled','false');status('profile-status','');status('contact-status','');refreshAvatar();refreshLicense()}
  function render(){subjectSelect.innerHTML=subjects.map(s=>`<option value="${esc(s.person_id)}">${esc(s.name)}${s.relation==='SELF'?' (you)':''}</option>`).join('');renderSubject()}
  async function refresh(keepPersonId=null){const [result,pending]=await Promise.all([call('overview'),contactCall({action:'pending_changes'})]);subjects=result.subjects||[];pendingChanges=pending.pending_changes||[];if(!subjects.length)throw new Error('No editable profiles are available to this account.');render();if(keepPersonId&&subjects.some(s=>String(s.person_id)===String(keepPersonId))){subjectSelect.value=String(keepPersonId);renderSubject()}}
  async function init(){const result=await client.auth.getSession();session=result.data.session;if(!session){loading.hidden=true;authNeeded.hidden=false;return}try{await refresh();loading.hidden=true;app.hidden=false}catch(e){loading.innerHTML=`<p>${esc(e.message||e)}</p>`}}
  subjectSelect?.addEventListener('change',renderSubject)
  document.getElementById('profile-form')?.addEventListener('submit',async e=>{e.preventDefault();const s=selected();if(!s)return;const button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;status('profile-status','Saving…');try{await call('update_basic',{person_id:s.person_id,name:nameInput.value,home_zip:zipInput.value});await refresh(s.person_id);status('profile-status','Profile saved.','success')}catch(err){status('profile-status',err.message||String(err),'error')}finally{button.disabled=false}})
  licenseEffective?.addEventListener('change',()=>refreshLicense())
  licenseTarget?.addEventListener('change',()=>{licenseAdvance.disabled=!licenseTarget.value})
  licenseRequirements?.addEventListener('click',async e=>{const button=e.target.closest('.license-confirm');if(!button)return;const s=selected(),stage=button.dataset.stage,requirement=button.dataset.requirement;if(!s?.driver_id||!stage||!requirement)return;const ok=confirm(`Confirm that ${requirementLabel(requirement)} was satisfied by ${licenseEffective.value}? This confirmation is recorded in the driver's licensing history.`);if(!ok)return;button.disabled=true;status('license-status','Recording confirmation…');try{await call('record_license_requirement',{driver_id:s.driver_id,target_stage:stage,requirement_type:requirement,satisfied_on:licenseEffective.value});await refreshLicense();status('license-status','Requirement confirmed.','success')}catch(err){status('license-status',err.message||String(err),'error');button.disabled=false}})
  document.getElementById('license-advance-form')?.addEventListener('submit',async e=>{e.preventDefault();const s=selected(),target=licenseTarget.value,date=licenseEffective.value;if(!s?.driver_id||!target||!date)return;const targetData=(licenseState?.eligible_targets||[]).find(t=>t.target_stage===target),label=targetData?.target_stage_display||target;if(!confirm(`Record ${label} effective ${date}? This creates an auditable licensing-stage transition and cannot be edited from the profile.`))return;licenseAdvance.disabled=true;status('license-status','Recording licensing stage…');try{await call('advance_license_stage',{driver_id:s.driver_id,target_stage:target,effective_date:date});await refreshLicense();status('license-status',`Licensing stage advanced to ${label}.`,'success')}catch(err){status('license-status',err.message||String(err),'error');licenseAdvance.disabled=!licenseTarget.value}})
  async function contactChange(kind){const s=selected();if(!s)return;const current=kind==='email'?s.email:s.mobile;const label=kind==='email'?'email address':'mobile number';const value=prompt(`Enter the new ${label} for ${s.name}:`,current||'');if(value===null)return;if(!value.trim()){status('contact-status',`Enter a ${label}.`,'error');return}if(kind==='mobile'&&current){const ok=confirm('Changing this mobile number will opt the old number out of Drive Venture SMS. The new number will not inherit SMS consent and must explicitly opt in again to use Text Parker. Continue?');if(!ok)return}status('contact-status',`Sending ${label} verification…`);try{const out=await contactCall({action:'request_contact_change',person_id:s.person_id,endpoint_type:kind.toUpperCase(),value:value.trim()});const change=out.change||{};if(change.status==='ALREADY_CURRENT'){status('contact-status',`That ${label} is already current.`);return}await refresh(s.person_id);const suffix=kind==='mobile'?' After verification, the old number will be opted out of SMS. To use Text Parker from the new number, text JOIN to Parker.':'';status('contact-status',`Verification sent to the new ${label}. It will remain pending until you verify it.${suffix}`,'success')}catch(err){status('contact-status',err.message||'Unable to start contact change.','error')}}
  changeEmail?.addEventListener('click',()=>contactChange('email'))
  changeMobile?.addEventListener('click',()=>contactChange('mobile'))
  document.getElementById('avatar-upload-form')?.addEventListener('submit',async e=>{e.preventDefault();const s=selected(),file=avatarPhoto?.files?.[0];if(!s?.driver_id)return;if(!file){status('avatar-status','Choose a photo first.','error');return}if(file.size>MAX_AVATAR_BYTES){status('avatar-status','Photo must be 4 MB or smaller.','error');return}const button=document.getElementById('avatar-upload');button.disabled=true;status('avatar-status','Uploading photo…');try{const form=new FormData();form.append('action','upload_photo');form.append('driver_id',s.driver_id);form.append('photo',file);const out=await avatarCall({},form);await refreshAvatar();status('avatar-status',out.replacement?'Replacement avatar request started. Your current avatar stays active until the new one is ready.':'Avatar request started. Parker has the photo.','success');avatarPhoto.value=''}catch(err){status('avatar-status',err.message||String(err),'error');button.disabled=false}})
  avatarParker?.addEventListener('click',async()=>{const s=selected();if(!s?.driver_id||avatarState?.parker_mms_reopt_required||avatarState?.parker_mms_one_time)return;avatarParker.disabled=true;status('avatar-status','Asking Parker to text for the photo…');try{await avatarCall({action:'request_parker_photo',driver_id:s.driver_id});await refreshAvatar();status('avatar-status','Parker sent the photo request. Reply to that text with one clear photo.','success')}catch(err){status('avatar-status',err.message||String(err),'error');avatarParker.disabled=false}})
  document.getElementById('profile-sign-out')?.addEventListener('click',async()=>{await client.auth.signOut();location.replace('/log/')})
  client.auth.onAuthStateChange((_event,next)=>{session=next})
  init()
})()
