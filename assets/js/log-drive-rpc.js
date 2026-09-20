(() => {
  const form=document.getElementById('drive-form'),app=window.DV_LOG_APP;
  if(!form||!app?.client||form.dataset.dvDriveRpcBound==='true')return;
  form.dataset.dvDriveRpcBound='true';
  const client=app.client,statusEl=document.getElementById('drive-status'),submissionKey='dv:web-drive:submission-id',recovery=window.DV_DRIVE_SAVE_RECOVERY;
  if(!recovery)return;
  const DRIVE_SAFETY_RESEARCH_URL='/research/teen-drowsy-driving/';
  let edit=null,preEditDraft=null,saveLifecycleActive=false;
  if(!document.querySelector('link[data-dv-drive-edit-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/log-drive-edit.css?v=20260824-5';l.dataset.dvDriveEditCss='true';document.head.appendChild(l)}
  const field=id=>document.getElementById(id),clean=v=>v==null?'':String(v).trim(),time=v=>clean(v).slice(0,5),lessonIds=()=>window.DV_DRIVING_LOG?.getSelectedLessonIds?.()||[];
  const editFieldIds=new Set(['drive-date','drive-start','drive-end','drive-vehicle','drive-lesson','drive-lesson-notes','drive-supervisor','drive-supervisor-other','drive-destination','drive-notes']);
  const setStatus=(text,kind='',researchUrl='')=>{statusEl.textContent=text||'';statusEl.className=`app-status${kind?` ${kind}`:''}`;if(researchUrl){statusEl.append(document.createTextNode(' '));const a=document.createElement('a');a.href=researchUrl;a.textContent='Why does Drive Venture limit long drives?';statusEl.append(a)}};
  const lockStates=new Map();
  function ensureRecoveryButton(){let button=document.getElementById('drive-save-recover');if(button)return button;button=document.createElement('button');button.id='drive-save-recover';button.type='button';button.className='button secondary button-small app-hidden';button.textContent='Check unfinished save';button.hidden=true;statusEl.before(button);return button}
  function setSubmitting(active){for(const el of form.querySelectorAll('input,select,textarea,button')){if(el.id==='drive-save-recover')continue;if(active){if(!lockStates.has(el))lockStates.set(el,el.disabled);el.disabled=true}else if(lockStates.has(el)){el.disabled=lockStates.get(el);lockStates.delete(el)}}form.setAttribute('aria-busy',active?'true':'false');const recover=ensureRecoveryButton();if(active&& !recover.hidden)recover.disabled=false}
  function pendingForCurrentDriver(){const pending=recovery.load();return pending&&pending.driver_id===app.getDriverId?.()?pending:null}
  function setRecoveryPending(active){const button=ensureRecoveryButton();button.hidden=!active;button.classList.toggle('app-hidden',!active);button.disabled=false;if(active)setSubmitting(true)}
  function savePending(pending){recovery.save(pending)}
  function clearPending(){recovery.clear();setRecoveryPending(false)}
  function offerPendingRecovery(){const pending=pendingForCurrentDriver();if(!pending)return false;if(saveLifecycleActive)return false;setRecoveryPending(true);setStatus(`Drive Venture could not confirm whether your ${pending.operation==='CREATE'?'drive':'edit'} finished. Your original submission is protected and will not be changed. Choose “Check unfinished save” to resolve it safely.`,'error');return true}
  const sortedIds=v=>[...(v||[])].filter(Boolean).map(String).sort();
  const comparable=d=>({drive_date:clean(d?.drive_date),start_time:time(d?.start_time),end_time:time(d?.end_time),vehicle_id:d?.vehicle_id||null,lesson_ids:sortedIds(d?.lesson_ids||(d?.lesson_id?[d.lesson_id]:[])),lesson_notes:clean(d?.lesson_notes)||null,supervisor_person_id:d?.supervisor_person_id||null,external_supervisor_name:clean(d?.external_supervisor_name)||null,destination:clean(d?.destination)||null,notes:clean(d?.notes)||null});
  const values=()=>{const supervisor=field('drive-supervisor')?.value||'',ids=lessonIds();return comparable({drive_date:field('drive-date')?.value,start_time:field('drive-start')?.value,end_time:field('drive-end')?.value,vehicle_id:field('drive-vehicle')?.value,lesson_ids:ids,lesson_id:ids[0]||null,lesson_notes:field('drive-lesson-notes')?.value||null,supervisor_person_id:supervisor&&supervisor!=='OTHER'?supervisor:null,external_supervisor_name:supervisor==='OTHER'?(field('drive-supervisor-other')?.value||null):null,destination:field('drive-destination')?.value,notes:field('drive-notes')?.value})};
  const setFields=d=>{const raw=d,dv=comparable(d);field('drive-date').value=dv.drive_date;field('drive-start').value=dv.start_time;field('drive-end').value=dv.end_time;field('drive-vehicle').value=dv.vehicle_id||'';window.DV_DRIVING_LOG?.setLessonSelection?.(dv.lesson_ids);field('drive-lesson-notes').value=dv.lesson_notes||'';const supervisor=field('drive-supervisor');if(supervisor){supervisor.value=dv.supervisor_person_id||(dv.external_supervisor_name?'OTHER':'');supervisor.dispatchEvent(new Event('change',{bubbles:true}))}field('drive-supervisor-other').value=dv.external_supervisor_name||'';field('drive-destination').value=dv.destination||'';field('drive-notes').value=dv.notes||'';window.DV_DRIVING_LOG?.updateNoteCount?.();if(raw?.lesson_ids)queueMicrotask(()=>window.DV_DRIVING_LOG?.setLessonSelection?.(raw.lesson_ids))};
  const equalValue=(k,a,b)=>k==='lesson_ids'?JSON.stringify(a)===JSON.stringify(b):a===b;
  const same=(a,b)=>{a=comparable(a);b=comparable(b);return Object.keys(a).every(k=>equalValue(k,a[k],b[k]))};
  const sameChanged=(requested,saved,original)=>{requested=comparable(requested);saved=comparable(saved);original=comparable(original);const changed=Object.keys(requested).filter(k=>!equalValue(k,requested[k],original[k]));return changed.length>0&&changed.every(k=>equalValue(k,requested[k],saved[k]))};
  function minutes(d){if(Number.isFinite(Number(d?.duration_minutes)))return Math.round(Number(d.duration_minutes));const[sh,sm]=time(d?.start_time).split(':').map(Number),[eh,em]=time(d?.end_time).split(':').map(Number);if([sh,sm,eh,em].some(Number.isNaN))return 0;let n=eh*60+em-sh*60-sm;if(n<=0)n+=1440;return n}
  const summary=d=>`${clean(d?.drive_date)} · ${time(d?.start_time)}–${time(d?.end_time)} · ${minutes(d)} min`;
  function stableSubmissionId(){try{const old=sessionStorage.getItem(submissionKey);if(old)return old;const id=`web-drive-${crypto.randomUUID()}`;sessionStorage.setItem(submissionKey,id);return id}catch(_){return `web-drive-${crypto.randomUUID()}`}}
  function clearSubmissionId(){try{sessionStorage.removeItem(submissionKey)}catch(_){}}
  function nightMessage(r,saved=false){if(r?.status==='CLASSIFIED')return r.minutes>0?` ${r.minutes} night minute${r.minutes===1?'':'s'} credited.`:'';if(r?.status==='LOCATION_PENDING')return saved?' Drive saved, but night credit could not be verified because location information is incomplete.':' Night credit could not be verified because location information is incomplete.';if(r?.status==='LOOKUP_PENDING')return saved?' Drive saved, but night credit could not be verified right now.':' Night credit could not be verified right now.';return ''}
  function researchFor(info){const code=clean(info?.code),message=clean(info?.message).toLowerCase();if(code==='DRIVE_DURATION_LIMIT')return info?.research_url||DRIVE_SAFETY_RESEARCH_URL;if(message.includes('2 hours 15 minutes'))return info?.research_url||DRIVE_SAFETY_RESEARCH_URL;return ''}
  async function errorInfo(error,data){if(error?.code==='DV_SAVE_TIMEOUT')return{message:'Drive Venture could not confirm the save before the connection timed out.',code:'DV_SAVE_TIMEOUT',research_url:''};if(data?.error)return{message:data.error,code:data.code||'',research_url:data.research_url||''};try{if(error?.context?.json){const body=await error.context.json();if(body?.error)return{message:body.error,code:body.code||'',research_url:body.research_url||''}}}catch(_){}return{message:error?.message||'Unable to save changes.',code:'NETWORK_UNCERTAIN',research_url:''}}
  async function withSaveTimeout(promise,message='Drive save outcome is unknown.'){
    let timeoutId;
    try{return await Promise.race([
      Promise.resolve(promise),
      new Promise((_,reject)=>{timeoutId=setTimeout(()=>{const error=new Error(message);error.code='DV_SAVE_TIMEOUT';reject(error)},recovery.timeoutMs())}),
    ])}finally{clearTimeout(timeoutId)}
  }
  async function invokeDriveOps(body){return withSaveTimeout(client.functions.invoke('drive-ops',{body}))}
  async function settleHydration(promise){try{return await withSaveTimeout(promise,'Drive refresh timed out.')}catch(_){return null}}
  async function ensureVerifiedSkills(data,driverId,requestedIds,reason=null){
    const ids=sortedIds(requestedIds),returnedIds=sortedIds(data?.lesson_ids||data?.drive?.lesson_ids||[]);
    if(data?.drive&&JSON.stringify(ids)===JSON.stringify(returnedIds))return{ok:true,drive:data.drive,lesson_ids:returnedIds,supervisor:data.supervisor||null};
    return{ok:false,error:'Drive save did not return the adopted Skills Practiced. Reopen the drive before trying again.'};
  }
  async function authoritativeDrive(driverId,driveId){
    let result;try{result=await withSaveTimeout(client.functions.invoke('drive-detail-api',{body:{driver_id:driverId,drive_id:driveId}}),'Drive verification timed out.')}catch(_){return{ok:false,error:'Drive save could not be verified yet. Use the unfinished-save recovery before trying again.'}}
    const{data,error}=result||{};
    if(error||!data?.ok||!data?.drive)return{ok:false,error:'Drive edit was saved, but the authoritative drive could not be reread. Reopen the drive before trying again.'};
    const ids=sortedIds(data.lesson_ids||data.drive.lesson_ids||[]);
    data.drive.lesson_ids=ids;data.drive.lessons=data.lessons||data.drive.lessons||[];data.drive.lesson_id=ids[0]||null;
    return{ok:true,drive:data.drive};
  }
  async function authoritativeDriveAfterSave(driverId,driveId,{attempts=4,delayMs=700}={}){
    let result={ok:false,error:'Drive verification is still pending.'};
    for(let attempt=1;attempt<=attempts;attempt++){
      result=await authoritativeDrive(driverId,driveId);
      if(result.ok)return result;
      if(attempt<attempts){
        setStatus('Drive saved. Still verifying the saved drive…');
        await new Promise(resolve=>setTimeout(resolve,delayMs*attempt));
      }
    }
    return result;
  }
  function localDurationIssue(d){const duration=minutes(d);return duration>135?{message:'Drive Venture can only count up to 2 hours 15 minutes for one drive',code:'DRIVE_DURATION_LIMIT',research_url:DRIVE_SAFETY_RESEARCH_URL}:null}
  function context(d=edit?.draft){if(!edit)return;let box=document.getElementById('drive-edit-context');if(!box){box=document.createElement('div');box.id='drive-edit-context';box.className='drive-edit-context';form.before(box)}const labels={drive_date:'date',start_time:'start time',end_time:'finish time',vehicle_id:'vehicle',lesson_ids:'skills practiced',lesson_notes:'skills',supervisor_person_id:'supervisor',external_supervisor_name:'supervisor',destination:'destination',notes:'road notes'},draft=comparable(d),changed=Object.keys(edit.original).filter(k=>!equalValue(k,draft[k],edit.original[k])).map(k=>labels[k]);box.textContent=`Editing: ${summary(draft)}${changed.length?` · Unsaved changes: ${[...new Set(changed)].join(', ')}`:''}`;box.hidden=false}
  function isOperatorView(){const model=app.getModel?.()||{},driverId=app.getDriverId?.();return !!edit&&model.is_operator===true&&app.getAccessMode?.(driverId)==='VIEW'}
  function ensureAdminReason(){let wrap=document.getElementById('drive-admin-reason-wrap');if(!wrap){wrap=document.createElement('label');wrap.id='drive-admin-reason-wrap';wrap.hidden=true;wrap.innerHTML='<span>Administrator edit reason</span><textarea id="drive-admin-reason" maxlength="500" placeholder="Why is this administrator correction needed?"></textarea>';form.querySelector('button[type=submit]')?.before(wrap)}const input=document.getElementById('drive-admin-reason'),active=isOperatorView();wrap.hidden=!active;wrap.style.display=active?'grid':'none';if(input){input.required=active;input.disabled=!active;if(!active)input.value=''}return input}
  function emitEditMode(active){window.dispatchEvent(new CustomEvent('dv:drive-edit-mode',{detail:{active,driverId:app.getDriverId?.()||null,driveId:edit?.id||null,driveRevision:edit?.revision??null}}))}
  function enterEdit(d,{scroll=true,preservePriorDraft=true,allowPending=false}={}){if(!allowPending&&pendingForCurrentDriver()){setRecoveryPending(true);setStatus('Finish checking the unfinished save before editing another drive.','error');ensureRecoveryButton().scrollIntoView({behavior:'smooth',block:'center'});return false}if(preservePriorDraft&&!edit)preEditDraft=values();const canonical=comparable(d);edit={id:d.id,revision:d.drive_revision??null,original:canonical,draft:{...canonical}};setFields(d);form.dataset.editDrive=d.id;form.closest('.app-card')?.classList.add('drive-edit-active');form.querySelector('button[type=submit]').textContent='Save changes';let cancel=document.getElementById('drive-edit-cancel');if(!cancel){cancel=document.createElement('button');cancel.id='drive-edit-cancel';cancel.type='button';cancel.className='button subtle-button button-small';cancel.textContent='Exit edit · log a new drive';form.querySelector('button[type=submit]').after(cancel)}cancel.hidden=false;context();ensureAdminReason();emitEditMode(true);if(scroll)form.scrollIntoView({behavior:'smooth',block:'start'});return true}
  function keepRequestedLoaded(requested){if(!edit)return;edit.draft=comparable(requested);setFields(edit.draft);context(edit.draft)}
  function clearEditUi(){edit=null;preEditDraft=null;delete form.dataset.editDrive;form.closest('.app-card')?.classList.remove('drive-edit-active');form.querySelector('button[type=submit]').textContent=document.documentElement.dataset.experience==='game'?'Save drive':'Log drive';const cancel=document.getElementById('drive-edit-cancel'),box=document.getElementById('drive-edit-context');if(cancel)cancel.hidden=true;if(box)box.hidden=true;const reasonWrap=document.getElementById('drive-admin-reason-wrap'),reason=document.getElementById('drive-admin-reason');if(reasonWrap){reasonWrap.hidden=true;reasonWrap.style.display='none'}if(reason){reason.required=false;reason.disabled=true;reason.value=''}emitEditMode(false)}
  function resetNewDriveForm(){clearEditUi();['drive-start','drive-end','drive-destination','drive-notes'].forEach(id=>{const el=field(id);if(el)el.value=''});window.DV_DRIVING_LOG?.setLessonSelection?.([]);window.DV_DRIVING_LOG?.updateNoteCount?.()}
  function resetAfterCreate(){if(edit)return;resetNewDriveForm()}
  function resetAfterEdit(){resetNewDriveForm()}
  function cancelEdit(){const restore=preEditDraft;clearEditUi();if(restore)setFields(restore);setStatus('Edit mode closed. Your prior drive-log draft was restored.');form.scrollIntoView({behavior:'smooth',block:'start'})}
  function resetEditForDriverChange(){if(edit||form.dataset.editDrive)clearEditUi();['drive-start','drive-end','drive-destination','drive-notes'].forEach(id=>{const el=field(id);if(el)el.value=''});window.DV_DRIVING_LOG?.setLessonSelection?.([]);window.DV_DRIVING_LOG?.updateNoteCount?.();const date=field('drive-date');if(date)delete date.dataset.dvUserEdited;setStatus('')}
  document.addEventListener('click',e=>{const trigger=e.target.closest?.('[data-edit-drive]');if(!trigger||!pendingForCurrentDriver())return;e.preventDefault();e.stopImmediatePropagation();const dialog=trigger.closest?.('dialog');if(dialog?.open)dialog.close();setRecoveryPending(true);setStatus('Finish checking the unfinished save before editing another drive.','error');ensureRecoveryButton().scrollIntoView({behavior:'smooth',block:'center'})},true);
  document.addEventListener('click',async e=>{if(e.target.id==='drive-edit-cancel'){cancelEdit();return}const trigger=e.target.closest?.('button[data-edit-drive]');if(!trigger)return;const id=trigger.dataset.editDrive,driverId=app.getDriverId?.();if(!id||!driverId)return;if(edit?.id===id){form.scrollIntoView({behavior:'smooth',block:'start'});return}setStatus('Opening drive…');const{data,error}=await client.functions.invoke('drive-detail-api',{body:{driver_id:driverId,drive_id:id}});if(error||!data?.drive)return setStatus('Drive details could not be opened.','error');app.detailDrives=app.detailDrives||{};app.detailDrives[id]=data.drive;enterEdit(data.drive);setStatus('')});
  function captureEditField(target){if(!edit||!editFieldIds.has(target?.id))return;edit.draft=values();context()}
  form.addEventListener('input',e=>captureEditField(e.target));form.addEventListener('change',e=>captureEditField(e.target));
  window.addEventListener('dv:driver-changing',e=>{const detail=e.detail||{};if(detail.driverId&&detail.previousDriverId===detail.driverId)return;setSubmitting(false);resetEditForDriverChange()});
  window.addEventListener('dv:driving-log-context',()=>{if(edit){setFields(edit.draft);context()}offerPendingRecovery()});
  async function recoverPendingMutation(){
    const pending=pendingForCurrentDriver();if(!pending)return setStatus('There is no unfinished save for this driver.');
    const driverId=pending.driver_id;saveLifecycleActive=true;setSubmitting(true);setRecoveryPending(true);setStatus('Checking the unfinished save…');
    try{
      if(pending.operation==='CREATE'){
        const{data,error}=await invokeDriveOps(pending.body);
        if(error||!data?.ok){
          const info=await errorInfo(error,data);
          if(recovery.isAmbiguous(info))return setStatus('Drive Venture still cannot confirm this save. Your original submission is protected; no different drive was sent. Try “Check unfinished save” again when the connection is stable.','error');
          if(info.code==='CONFLICT')return setStatus('Drive Venture found a save-identity conflict and stopped rather than risk a duplicate. Check Recent drives for this trip before taking any further action.','error');
          clearPending();setSubmitting(false);return setStatus(`Drive: ${info.message}`,'error',researchFor(info));
        }
        const verified=await ensureVerifiedSkills(data,driverId,pending.requested.lesson_ids);
        if(!verified.ok)return setStatus(`Drive: ${verified.error}`,'error');
        const id=verified.drive?.id;
        if(!id)return setStatus('The save was acknowledged, but Drive Venture could not identify the saved drive. The recovery record is still protected.','error');
        app.detailDrives=app.detailDrives||{};app.detailDrives[id]=verified.drive;
        await settleHydration(app.refreshDashboard?.())
        if(app.getDriverId()!==driverId)return;
        await settleHydration(window.DV_DRIVING_LOG?.refreshContext?.(driverId));
        const reread=await authoritativeDrive(driverId,id);
        if(!reread.ok||!same(pending.requested,reread.drive))return setStatus('The drive exists, but Drive Venture could not finish verifying the saved values. The recovery record is still protected.','error');
        app.detailDrives[id]=reread.drive;clearPending();
        try{if(sessionStorage.getItem(submissionKey)===pending.source_event_id)clearSubmissionId()}catch(_){}
        resetAfterCreate();setSubmitting(false);
        return setStatus(`Drive save recovered and verified: ${summary(reread.drive)}.`,'success');
      }

      const initial=await authoritativeDrive(driverId,pending.drive_id);
      if(!initial.ok)return setStatus('Drive Venture could not reread the drive yet. The unfinished edit is still protected; try again when the connection is stable.','error');
      const action=recovery.editRecoveryAction({expectedRevision:pending.expected_revision,currentRevision:initial.drive.drive_revision,payloadMatches:same(pending.requested,initial.drive)});
      if(action==='ADOPT'){
        app.detailDrives=app.detailDrives||{};app.detailDrives[pending.drive_id]=initial.drive;clearPending();resetAfterEdit();setSubmitting(false);
        return setStatus(`Drive edit recovered and verified: ${summary(initial.drive)}. Ready to log another drive.`,'success');
      }
      if(action==='CONFLICT'){
        app.detailDrives=app.detailDrives||{};app.detailDrives[pending.drive_id]=initial.drive;clearPending();enterEdit(initial.drive,{scroll:false,preservePriorDraft:false});setSubmitting(false);
        return setStatus('Another saved change is now authoritative for this drive. Drive Venture did not retry your older edit. Review the current values before making another change.','error');
      }

      const{data,error}=await invokeDriveOps(pending.body);
      if(error||!data?.ok){
        const info=await errorInfo(error,data);
        if(recovery.isAmbiguous(info))return setStatus('Drive Venture still cannot confirm this edit. The original edit remains protected for another recovery check.','error');
        if(info.code==='CONFLICT'){
          const latest=await authoritativeDrive(driverId,pending.drive_id);
          if(latest.ok){app.detailDrives=app.detailDrives||{};app.detailDrives[pending.drive_id]=latest.drive;clearPending();enterEdit(latest.drive,{scroll:false,preservePriorDraft:false});setSubmitting(false)}
          return setStatus('The drive changed while recovery was in progress. Drive Venture stopped the retry and reopened the latest saved version.','error');
        }
        clearPending();setSubmitting(false);return setStatus(`Drive edit: ${info.message}`,'error',researchFor(info));
      }
      const verified=await ensureVerifiedSkills(data,driverId,pending.requested.lesson_ids);
      if(!verified.ok)return setStatus(`Drive edit: ${verified.error}`,'error');
      await settleHydration(app.refreshDashboard?.())
      await settleHydration(window.DV_DRIVING_LOG?.refreshContext?.(driverId));
      const reread=await authoritativeDrive(driverId,pending.drive_id);
      if(!reread.ok||!same(pending.requested,reread.drive))return setStatus('The edit was acknowledged, but Drive Venture could not finish verifying it. The recovery record is still protected.','error');
      app.detailDrives=app.detailDrives||{};app.detailDrives[pending.drive_id]=reread.drive;clearPending();resetAfterEdit();setSubmitting(false);
      return setStatus(`Drive edit recovered and verified: ${summary(reread.drive)}. Ready to log another drive.`,'success');
    }catch(error){
      const info=await errorInfo(error,null);
      return setStatus(`Drive Venture still cannot confirm this save: ${info.message} Your original submission remains protected.`,'error');
    }finally{saveLifecycleActive=false;if(pendingForCurrentDriver())setRecoveryPending(true)}
  }

  ensureRecoveryButton().addEventListener('click',recoverPendingMutation);

  form.addEventListener('submit',async e=>{
    e.preventDefault();if(!form.reportValidity())return;const driverId=app.getDriverId(),generation=app.getRenderGeneration?.();if(!driverId)return setStatus('No active driver is selected.','error');
    if(pendingForCurrentDriver())return offerPendingRecovery();
    if(edit)edit.draft=values();
    const requested=values();requested.lesson_id=requested.lesson_ids?.[0]||null;
    const durationIssue=localDurationIssue(requested);if(durationIssue)return setStatus(durationIssue.message,'error',durationIssue.research_url);
    if(edit){
      if(same(requested,edit.original))return setStatus('No changes to save. The selected drive is still loaded.');
      const original={...edit.original};
      let reason=null;
      if(isOperatorView()){const reasonInput=ensureAdminReason();reason=clean(reasonInput?.value);if(!reason){reasonInput?.focus();return setStatus('Administrator edit reason is required.','error')}const driver=app.getModel?.().drivers?.find?.(x=>x.id===driverId);if(!window.confirm(`Modify ${driver?.display_name||'this driver'}’s drive as an administrator?\n\nReason: ${reason}`))return setStatus('Administrator edit cancelled.')}
      const id=edit.id,body={action:'mutate_drive',operation:'EDIT',driver_id:driverId,drive_id:id,expected_revision:edit.revision,...requested,...(reason?{reason}:{})};
      savePending(recovery.makePending({operation:'EDIT',driverId,driveId:id,expectedRevision:edit.revision,requested,body}));
      saveLifecycleActive=true;setSubmitting(true);setStatus('Saving changes…');
      try{
        const{data,error}=await invokeDriveOps(body);
        if(app.getDriverId()!==driverId||(generation!=null&&app.getRenderGeneration?.()!==generation))return;
        if(error||!data?.ok){const info=await errorInfo(error,data);if(recovery.isAmbiguous(info)){setRecoveryPending(true);return setStatus('Drive Venture could not confirm whether the edit finished. Your exact edit is protected; choose “Check unfinished save” to resolve it safely.','error')}clearPending();if(info.code==='CONFLICT'){const latest=await authoritativeDrive(driverId,id);if(latest.ok){app.detailDrives=app.detailDrives||{};app.detailDrives[id]=latest.drive;enterEdit(latest.drive,{scroll:false,preservePriorDraft:false})}return setStatus('This drive changed before your edit could be accepted. Drive Venture reopened the latest saved version; review it before editing again.','error')}return setStatus(`Drive edit: ${info.message}`,'error',researchFor(info))}
        setStatus('Drive saved. Verifying the saved edit…');
        const verified=await ensureVerifiedSkills(data,driverId,requested.lesson_ids,reason);
        if(!verified.ok){setRecoveryPending(true);return setStatus(`Drive edit: ${verified.error}`,'error')}
        data.drive=verified.drive;data.lesson_ids=verified.lesson_ids;data.supervisor=verified.supervisor;
        if(!data.drive||!sameChanged(requested,data.drive,edit.original)){keepRequestedLoaded(requested);setRecoveryPending(true);return setStatus('Drive edit was acknowledged but could not be verified. Your requested values and recovery record are protected.','error')}
        const adminReason=field('drive-admin-reason');if(adminReason)adminReason.value='';
        app.detailDrives=app.detailDrives||{};app.detailDrives[id]=data.drive;
        await settleHydration(app.refreshDashboard?.())
        if(app.getDriverId()!==driverId)return;
        await settleHydration(window.DV_DRIVING_LOG?.refreshContext?.(driverId));const reread=await authoritativeDriveAfterSave(driverId,id);
        if(!reread.ok){keepRequestedLoaded(requested);setRecoveryPending(true);return setStatus(`Drive edit: ${reread.error}`,'error')}
        if(!sameChanged(requested,reread.drive,original)){keepRequestedLoaded(requested);setRecoveryPending(true);return setStatus('Drive edit could not be verified after refresh. Your requested values and recovery record are protected.','error')}
        app.detailDrives[id]=reread.drive;
        if(app.getDriverId()!==driverId)return;
        clearPending();resetAfterEdit();setSubmitting(false);
        return setStatus(`Drive updated and verified: ${summary(reread.drive)}. Progress and quests were recalculated. Ready to log another drive.${nightMessage(data.night_classification)}`,'success')
      }catch(error){
        const info=await errorInfo(error,null);
        if(recovery.isAmbiguous(info)){setRecoveryPending(true);return setStatus('Drive Venture could not confirm whether the edit finished. Your exact edit is protected; choose “Check unfinished save” to resolve it safely.','error')}
        clearPending();return setStatus(`Drive edit: ${info.message}`,'error',researchFor(info))
      }finally{saveLifecycleActive=false;if(!pendingForCurrentDriver())setSubmitting(false)}
    }

    const sourceEventId=stableSubmissionId(),body={action:'mutate_drive',operation:'CREATE',driver_id:driverId,source_event_id:sourceEventId,...requested};
    savePending(recovery.makePending({operation:'CREATE',driverId,sourceEventId,requested,body}));
    saveLifecycleActive=true;setSubmitting(true);setStatus('Logging drive…');
    try{
      const{data,error}=await invokeDriveOps(body);
      if(app.getDriverId()!==driverId||(generation!=null&&app.getRenderGeneration?.()!==generation))return;
      if(error||!data?.ok){const info=await errorInfo(error,data);if(recovery.isAmbiguous(info)){setRecoveryPending(true);return setStatus('Drive Venture could not confirm whether the drive finished saving. Your exact submission is protected; choose “Check unfinished save” to resolve it without creating a duplicate.','error')}if(info.code==='CONFLICT'){setRecoveryPending(true);return setStatus('Drive Venture found a save-identity conflict and stopped rather than risk creating a duplicate. Check Recent drives for this trip before taking further action.','error')}clearPending();return setStatus(`Drive: ${info.message}. You can fix the values and try again.`,'error',researchFor(info))}
      setStatus('Drive saved. Verifying the saved drive…');
      const verified=await ensureVerifiedSkills(data,driverId,requested.lesson_ids);if(!verified.ok){setRecoveryPending(true);return setStatus(`Drive: ${verified.error}`,'error')}data.drive=verified.drive;data.lesson_ids=verified.lesson_ids;data.supervisor=verified.supervisor;
      const awards=data.quests?.awarded||[],earned=awards.length?` Earned: ${awards.map(q=>q.name||q.quest_key).join(', ')}.`:'',successMessage=`Drive logged and verified.${nightMessage(data.night_classification,true)}${earned}`,id=data.drive?.id;
      if(!id){setFields(requested);setRecoveryPending(true);return setStatus('Drive was acknowledged, but the saved record could not be reopened. Your submitted values and recovery record remain protected.','error')}
      app.detailDrives=app.detailDrives||{};app.detailDrives[id]=data.drive;await settleHydration(app.refreshDashboard?.());if(app.getDriverId()!==driverId)return;
      await settleHydration(window.DV_DRIVING_LOG?.refreshContext?.(driverId));const reread=await authoritativeDriveAfterSave(driverId,id);
      if(!reread.ok){setFields(requested);setRecoveryPending(true);return setStatus(`Drive: ${reread.error}`,'error')}
      if(!same(requested,reread.drive)){setFields(requested);setRecoveryPending(true);return setStatus('Drive was saved, but the authoritative values did not match your submission. Your submitted values and recovery record remain protected.','error')}
      app.detailDrives[id]=reread.drive;clearPending();clearSubmissionId();resetAfterCreate();setSubmitting(false);setStatus(successMessage,'success')
    }catch(error){
      const info=await errorInfo(error,null);
      if(recovery.isAmbiguous(info)){setRecoveryPending(true);return setStatus('Drive Venture could not confirm whether the drive finished saving. Your exact submission is protected; choose “Check unfinished save” to resolve it without creating a duplicate.','error')}
      clearPending();setStatus(`Drive: ${info.message}. You can fix the values and try again.`,'error',researchFor(info))
    }finally{saveLifecycleActive=false;if(!pendingForCurrentDriver())setSubmitting(false)}
  });
  let linkedEditHandled=false;
  window.addEventListener('dv:dashboard-rendered',async()=>{offerPendingRecovery();if(linkedEditHandled)return;const p=new URLSearchParams(location.search),targetDriver=p.get('driver'),targetDrive=p.get('editDrive');if(!targetDriver||!targetDrive)return;linkedEditHandled=true;try{if(app.getDriverId()!==targetDriver)await app.selectDriver(targetDriver);const{data,error}=await client.functions.invoke('drive-detail-api',{body:{driver_id:targetDriver,drive_id:targetDrive}});if(error||!data?.drive)throw new Error(data?.error||error?.message||'Drive unavailable');app.detailDrives=app.detailDrives||{};app.detailDrives[targetDrive]=data.drive;enterEdit(data.drive);p.delete('driver');p.delete('editDrive');history.replaceState(null,'',location.pathname+(p.toString()?('?'+p.toString()):'')+location.hash)}catch(e){setStatus('That secure edit link could not open the drive. Please choose it from Recent drives.','error')}});
  if(!window.DV_DRIVING_LOG&&!document.querySelector('script[data-dv-driving-log-v1]')){const s=document.createElement('script');s.src='/assets/js/log-driving-log-v1.js?v=20260917-0180-summary2';s.dataset.dvDrivingLogV1='true';document.body.appendChild(s)}
  if(![...document.scripts].some(s=>s.src.includes('/assets/js/log-skin-presenter.js'))){const s=document.createElement('script');s.src='/assets/js/log-skin-presenter.js?v=20260820-0007';s.dataset.dvSkinPresenter='true';document.body.appendChild(s)}
})();
