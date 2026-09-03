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
  const exportButton=document.getElementById('drive-log-export');
  const exportStatus=document.getElementById('drive-log-export-status');
  let contextToken=0;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function setExportStatus(text,kind=''){if(exportStatus){exportStatus.textContent=text||'';exportStatus.className=`app-status${kind?` ${kind}`:''}`}}
  function toggleOther(){
    const active=supervisor?.value==='OTHER';
    if(otherWrap)otherWrap.hidden=!active;
    if(other){other.required=active;if(!active)other.value=''}
  }
  supervisor?.addEventListener('change',toggleOther);

  async function loadContext(driverId){
    const mine=++contextToken;
    const previousSupervisor=supervisor?.value||'';
    const previousLesson=lesson?.value||'';
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
      if(lessonWrap)lessonWrap.hidden=false;
      if(lessonNotesWrap)lessonNotesWrap.hidden=true;
      if(lesson){
        lesson.innerHTML='<option value="">Choose a lesson</option>'+data.lessons.map(x=>`<option value="${esc(x.id)}">Lesson ${esc(x.lesson_code)} · ${esc(x.title)}</option>`).join('');
        if(previousLesson&&[...lesson.options].some(o=>o.value===previousLesson))lesson.value=previousLesson;
      }
      if(lessonNotes)lessonNotes.required=false;
    }else if(mode==='FREE_TEXT'){
      if(lessonWrap)lessonWrap.hidden=true;
      if(lessonNotesWrap)lessonNotesWrap.hidden=false;
      if(lesson)lesson.value='';
      if(lessonNotes)lessonNotes.required=false;
    }else{
      if(lessonWrap)lessonWrap.hidden=true;
      if(lessonNotesWrap)lessonNotesWrap.hidden=true;
    }
    window.dispatchEvent(new CustomEvent('dv:driving-log-context',{detail:{driverId,...data}}));
  }

  window.addEventListener('dv:driver-changing',()=>{contextToken+=1});
  window.addEventListener('dv:dashboard-rendered',e=>{const driverId=e.detail?.driverId||app.getDriverId?.();if(driverId)loadContext(driverId)});

  exportButton?.addEventListener('click',async()=>{
    const driverId=app.getDriverId?.();
    if(!driverId)return;
    const permit=window.prompt('Permit / license number for this PDF (optional; Drive Venture will not store it):','');
    if(permit===null)return;
    setExportStatus('Building driving log…');
    const {data:sessionData}=await client.auth.getSession(),session=sessionData?.session,cfg=window.DV_APP_CONFIG||{};
    if(!session?.access_token||!cfg.supabaseUrl||!cfg.publishableKey){setExportStatus('Please sign in again before exporting.','error');return}
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(`${cfg.supabaseUrl.replace(/\/$/,'')}/functions/v1/driving-log-renderer`,{method:'POST',headers:{authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey,'content-type':'application/json'},body:JSON.stringify({driver_id:driverId,permit_number:permit.trim()||null}),signal:controller.signal});
      if(!response.ok){setExportStatus('Driving log could not be generated.','error');return}
      const blob=await response.blob();
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='drive-venture-driving-log.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setExportStatus('Driving log downloaded.','success');
    }catch(error){
      setExportStatus(error?.name==='AbortError'?'Driving log generation timed out. Please try again.':'Driving log could not be generated. Please try again.','error');
    }finally{
      clearTimeout(timeout);
    }
  });
})();