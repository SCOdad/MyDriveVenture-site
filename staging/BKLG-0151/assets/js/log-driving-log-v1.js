(() => {
  const app=window.DV_LOG_APP;
  if(!app?.client)return;
  const client=app.client;
  const supervisor=document.getElementById('drive-supervisor');
  const otherWrap=document.getElementById('drive-supervisor-other-wrap');
  const other=document.getElementById('drive-supervisor-other');
  const lessonWrap=document.getElementById('drive-lesson-select-wrap');
  const lesson=document.getElementById('drive-lesson');
  const lessonNotesWrap=document.getElementById('drive-lesson-notes-wrap');
  const lessonNotes=document.getElementById('drive-lesson-notes');
  const form=document.getElementById('drive-form');
  const driveStatus=document.getElementById('drive-status');
  const exportButton=document.getElementById('drive-log-export');
  const exportStatus=document.getElementById('drive-log-export-status');
  let contextToken=0;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const selectedLessonIds=()=>lesson?.multiple?[...lesson.options].filter(o=>o.selected&&o.value).map(o=>o.value):(lesson?.value?[lesson.value]:[]);
  const lessonSetEqual=(a,b)=>JSON.stringify([...(a||[])].sort())===JSON.stringify([...(b||[])].sort());
  function setLessonSelection(ids){if(!lesson)return;const wanted=new Set((ids||[]).map(String));[...lesson.options].forEach(o=>{o.selected=!!o.value&&wanted.has(o.value)})}
  function setExportStatus(text,kind=''){if(exportStatus){exportStatus.textContent=text||'';exportStatus.className=`app-status${kind?` ${kind}`:''}`}}
  function toggleOther(){
    const active=supervisor?.value==='OTHER';
    if(otherWrap){otherWrap.hidden=!active;otherWrap.style.display=active?'grid':'none'}
    if(other){other.required=active;other.disabled=!active;if(!active)other.value=''}
  }
  supervisor?.addEventListener('change',toggleOther);toggleOther();

  const originalInvoke=client.functions.invoke.bind(client.functions);
  client.functions.invoke=async(slug,options={})=>{
    if(slug==='drive-detail-api'){
      const result=await originalInvoke(slug,options);
      const drive=result?.data?.drive,body=options?.body||{};
      if(!result?.error&&drive?.id&&body.driver_id){
        const skills=await originalInvoke('drive-skill-ops',{body:{action:'get',driver_id:body.driver_id,drive_id:drive.id}});
        if(!skills.error&&skills.data?.ok){drive.lesson_ids=skills.data.lesson_ids||[];drive.lessons=skills.data.lessons||[];if(drive.lesson_ids.length)drive.lesson_id=drive.lesson_ids[0]}
      }
      return result;
    }
    if(slug==='drive-ops'&&['log_drive','edit_drive'].includes(options?.body?.action)){
      const requestedLessonIds=selectedLessonIds();
      const result=await originalInvoke(slug,options);
      const drive=result?.data?.drive,driverId=options?.body?.driver_id;
      if(!result?.error&&result?.data?.ok&&drive?.id&&driverId){
        const synced=await originalInvoke('drive-skill-ops',{body:{action:'set',driver_id:driverId,drive_id:drive.id,lesson_ids:requestedLessonIds}});
        if(!synced.error&&synced.data?.ok){drive.lesson_ids=synced.data.lesson_ids||requestedLessonIds;drive.lesson_id=drive.lesson_ids[0]||null}
        else result.data.skill_sync_warning='Drive saved, but skills could not be updated. Please reopen the drive and try again.';
      }
      return result;
    }
    return originalInvoke(slug,options);
  };

  async function loadContext(driverId){
    const mine=++contextToken;
    const previousSupervisor=supervisor?.value||'';
    const previousLessons=selectedLessonIds();
    const {data,error}=await client.functions.invoke('drive-ops',{body:{action:'form_context',driver_id:driverId}});
    if(mine!==contextToken||app.getDriverId()!==driverId)return;
    if(error||!data?.ok)return;
    if(supervisor){
      supervisor.innerHTML='<option value="">Choose a grown-up</option>'+data.supervisors.map(g=>`<option value="${esc(g.person_id)}">${esc(g.display_name)}${g.is_primary?' · Primary':''}</option>`).join('')+'<option value="OTHER">Other</option>';
      if(previousSupervisor&&[...supervisor.options].some(o=>o.value===previousSupervisor))supervisor.value=previousSupervisor;
      else supervisor.value=data.default_supervisor_person_id||data.primary_supervisor_person_id||'';
      toggleOther();
    }
    const mode=data.lesson_set?.selection_mode||null;
    if(mode==='ENUMERATED'){
      if(lessonWrap){lessonWrap.hidden=false;lessonWrap.style.display='grid';const label=lessonWrap.querySelector('span');if(label)label.textContent='Skills Practiced (choose all that apply)'}
      if(lessonNotesWrap){lessonNotesWrap.hidden=true;lessonNotesWrap.style.display='none'}
      if(lesson){
        lesson.multiple=true;lesson.size=Math.min(6,Math.max(3,data.lessons.length));
        lesson.innerHTML=data.lessons.map(x=>`<option value="${esc(x.id)}">${esc(x.lesson_code)} · ${esc(x.title)}</option>`).join('');
        setLessonSelection(previousLessons);
      }
      if(lessonNotes)lessonNotes.required=false;
    }else if(mode==='FREE_TEXT'){
      if(lessonWrap){lessonWrap.hidden=true;lessonWrap.style.display='none'}
      if(lessonNotesWrap){lessonNotesWrap.hidden=false;lessonNotesWrap.style.display='grid'}
      if(lesson){lesson.multiple=false;lesson.value=''}
      if(lessonNotes)lessonNotes.required=false;
    }else{
      if(lessonWrap){lessonWrap.hidden=true;lessonWrap.style.display='none'}
      if(lessonNotesWrap){lessonNotesWrap.hidden=true;lessonNotesWrap.style.display='none'}
    }
    window.dispatchEvent(new CustomEvent('dv:driving-log-context',{detail:{driverId,...data}}));
  }

  window.addEventListener('dv:driver-changing',()=>{contextToken+=1});
  window.addEventListener('dv:dashboard-rendered',e=>{const driverId=e.detail?.driverId||app.getDriverId?.();if(driverId)loadContext(driverId)});
  window.addEventListener('dv:drive-edit-mode',e=>{if(!e.detail?.active)return;const drive=app.detailDrives?.[e.detail.driveId];if(drive?.lesson_ids)queueMicrotask(()=>setLessonSelection(drive.lesson_ids))});
  window.addEventListener('dv:driving-log-context',()=>{const id=form?.dataset?.editDrive,drive=id?app.detailDrives?.[id]:null;if(drive?.lesson_ids)setLessonSelection(drive.lesson_ids)});

  form?.addEventListener('submit',async e=>{
    const driveId=form.dataset.editDrive,driverId=app.getDriverId?.();if(!driveId||!driverId||!lesson?.multiple)return;
    const original=app.detailDrives?.[driveId];if(!original)return;
    const currentIds=selectedLessonIds(),originalIds=original.lesson_ids||(original.lesson_id?[original.lesson_id]:[]);if(lessonSetEqual(currentIds,originalIds))return;
    const clean=v=>String(v??'').trim(),time=v=>clean(v).slice(0,5),sup=supervisor?.value||'';
    const unchanged=
      clean(document.getElementById('drive-date')?.value)===clean(original.drive_date)&&
      time(document.getElementById('drive-start')?.value)===time(original.start_time)&&
      time(document.getElementById('drive-end')?.value)===time(original.end_time)&&
      (document.getElementById('drive-vehicle')?.value||null)===(original.vehicle_id||null)&&
      (sup&&sup!=='OTHER'?sup:null)===(original.supervisor_person_id||null)&&
      (sup==='OTHER'?clean(other?.value)||null:null)===(clean(original.external_supervisor_name)||null)&&
      (clean(document.getElementById('drive-destination')?.value)||null)===(clean(original.destination)||null)&&
      (clean(document.getElementById('drive-notes')?.value)||null)===(clean(original.notes)||null);
    if(!unchanged)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(driveStatus){driveStatus.textContent='Saving skills…';driveStatus.className='app-status'}
    const {data,error}=await originalInvoke('drive-skill-ops',{body:{action:'set',driver_id:driverId,drive_id:driveId,lesson_ids:currentIds}});
    if(error||!data?.ok){if(driveStatus){driveStatus.textContent='Skills could not be updated.';driveStatus.className='app-status error'};return}
    original.lesson_ids=data.lesson_ids||currentIds;original.lesson_id=original.lesson_ids[0]||null;
    if(driveStatus){driveStatus.textContent='Skills updated.';driveStatus.className='app-status success'}
    try{await app.refreshDashboard()}catch(_){}
  },true);

  function buildOverlay(){let overlay=document.getElementById('drive-log-building-overlay');if(overlay)return overlay;overlay=document.createElement('div');overlay.id='drive-log-building-overlay';overlay.hidden=true;overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');overlay.innerHTML='<div><strong>Building your driving log…</strong><span>Please wait while Drive Venture prepares the PDF.</span></div>';Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'10000',background:'rgba(20,24,28,.72)',display:'none',alignItems:'flex-start',justifyContent:'center',paddingTop:'18vh'});const box=overlay.firstElementChild;Object.assign(box.style,{background:'#fff',color:'#161616',border:'3px solid #1d1d1d',boxShadow:'8px 8px 0 rgba(0,0,0,.35)',padding:'22px 26px',maxWidth:'360px',width:'calc(100% - 40px)',textAlign:'center'});box.querySelector('strong').style.display='block';box.querySelector('strong').style.fontSize='1.15rem';box.querySelector('span').style.display='block';box.querySelector('span').style.marginTop='8px';document.body.appendChild(overlay);return overlay}
  function showBuild(active){const overlay=buildOverlay();overlay.hidden=!active;overlay.style.display=active?'flex':'none';document.documentElement.style.pointerEvents=active?'none':'';overlay.style.pointerEvents='auto'}

  exportButton?.addEventListener('click',async()=>{
    const driverId=app.getDriverId?.();if(!driverId)return;
    const permit=window.prompt('Permit / license number for this PDF (optional; Drive Venture will not store it):','');if(permit===null)return;
    setExportStatus('Building driving log…');showBuild(true);
    const {data:sessionData}=await client.auth.getSession(),session=sessionData?.session,cfg=window.DV_APP_CONFIG||{};
    if(!session?.access_token||!cfg.supabaseUrl||!cfg.publishableKey){showBuild(false);setExportStatus('Please sign in again before exporting.','error');return}
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(`${cfg.supabaseUrl.replace(/\/$/,'')}/functions/v1/driving-log-renderer`,{method:'POST',headers:{authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey,'content-type':'application/json'},body:JSON.stringify({driver_id:driverId,permit_number:permit.trim()||null}),signal:controller.signal});
      if(!response.ok){let message='Driving log could not be generated.';try{const b=await response.json();if(b?.error)message=b.error}catch(_){}setExportStatus(message,'error');return}
      const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='drive-venture-driving-log.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setExportStatus('Driving log downloaded.','success');
    }catch(error){setExportStatus(error?.name==='AbortError'?'Driving log generation timed out. Please try again.':'Driving log could not be generated. Please try again.','error')}
    finally{clearTimeout(timeout);showBuild(false)}
  });
})();
