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
  const notes=document.getElementById('drive-notes');
  const exportButton=document.getElementById('drive-log-export');
  const exportStatus=document.getElementById('drive-log-export-status');
  let contextToken=0;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lessonSetEqual=(a,b)=>JSON.stringify([...(a||[])].map(String).sort())===JSON.stringify([...(b||[])].map(String).sort());
  const selectedLessonIds=()=>lesson?.multiple?[...lesson.options].filter(o=>o.selected&&o.value).map(o=>o.value):(lesson?.value?[lesson.value]:[]);
  function setLessonSelection(ids){if(!lesson)return;const wanted=new Set((ids||[]).map(String));[...lesson.options].forEach(o=>{o.selected=!!o.value&&wanted.has(o.value)});document.querySelectorAll('#drive-lesson-options input[type=checkbox]').forEach(box=>{box.checked=wanted.has(box.value)})}
  function setExportStatus(text,kind=''){if(exportStatus){exportStatus.textContent=text||'';exportStatus.className=`app-status${kind?` ${kind}`:''}`}}
  function toggleOther(){const active=supervisor?.value==='OTHER';if(otherWrap){otherWrap.hidden=!active;otherWrap.style.display=active?'grid':'none'}if(other){other.required=active;other.disabled=!active;if(!active)other.value=''}}
  supervisor?.addEventListener('change',toggleOther);toggleOther();

  function ensureStyle(){if(document.getElementById('dv-driving-log-v1-style'))return;const style=document.createElement('style');style.id='dv-driving-log-v1-style';style.textContent='.drive-skill-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.35rem .6rem;margin-top:.3rem}.drive-skill-option{display:flex!important;align-items:flex-start;gap:.45rem;padding:.38rem .45rem;border:1px solid rgba(0,0,0,.16);border-radius:.3rem;background:rgba(255,255,255,.5);font-size:.82rem;line-height:1.2}.drive-skill-option input{flex:0 0 auto;margin:.12rem 0 0}.drive-note-meta{display:flex;justify-content:space-between;gap:.75rem;margin-top:.2rem;font-size:.72rem;opacity:.78}.drive-note-meta [data-limit=true]{font-weight:700}@media(max-width:620px){.drive-skill-grid{grid-template-columns:1fr}}';document.head.appendChild(style)}
  ensureStyle();

  function renderLessonGrid(rows){if(!lesson||!lessonWrap)return;lesson.hidden=true;lesson.style.display='none';let grid=document.getElementById('drive-lesson-options');if(!grid){grid=document.createElement('div');grid.id='drive-lesson-options';grid.className='drive-skill-grid';lesson.after(grid)}const selected=new Set(selectedLessonIds());grid.innerHTML=(rows||[]).map(x=>`<label class="drive-skill-option"><input type="checkbox" value="${esc(x.id)}"><span><strong>${esc(x.lesson_code)}</strong> · ${esc(x.title)}</span></label>`).join('');grid.querySelectorAll('input[type=checkbox]').forEach(box=>{box.checked=selected.has(box.value);box.addEventListener('change',()=>{const option=[...lesson.options].find(o=>o.value===box.value);if(option)option.selected=box.checked;lesson.dispatchEvent(new Event('change',{bubbles:true}))})})}
  function hideLessonGrid(){const grid=document.getElementById('drive-lesson-options');if(grid)grid.hidden=true;if(lesson){lesson.hidden=true;lesson.style.display='none'}}

  function updateNoteCount(){if(!notes)return;let meta=document.getElementById('drive-notes-meta');if(!meta){meta=document.createElement('div');meta.id='drive-notes-meta';meta.className='drive-note-meta';notes.after(meta)}const max=Number(notes.maxLength||500),count=notes.value.length,atLimit=count>=max;meta.innerHTML=`<span>Road notes · ${max} character maximum</span><span data-limit="${atLimit?'true':'false'}">${count} / ${max}${atLimit?' · maximum reached':''}</span>`}
  notes?.addEventListener('input',updateNoteCount);updateNoteCount();

  window.DV_DRIVING_LOG={getSelectedLessonIds:selectedLessonIds,setLessonSelection,lessonSetEqual,updateNoteCount};

  const originalInvoke=client.functions.invoke.bind(client.functions);
  client.functions.invoke=async(slug,options={})=>{
    if(slug==='drive-detail-api'){
      const result=await originalInvoke(slug,options),drive=result?.data?.drive;
      if(!result?.error&&drive?.id){const ids=result.data.lesson_ids||drive.lesson_ids||[];drive.lesson_ids=ids;drive.lessons=result.data.lessons||[];if(ids.length)drive.lesson_id=ids[0]}
      return result;
    }
    if(slug==='drive-ops'&&['log_drive','edit_drive'].includes(options?.body?.action)){
      const requestedLessonIds=selectedLessonIds(),result=await originalInvoke(slug,options),drive=result?.data?.drive,driverId=options?.body?.driver_id;
      if(result?.error||!result?.data?.ok||!drive?.id||!driverId)return result;
      const synced=await originalInvoke('drive-skill-ops',{body:{action:'set',driver_id:driverId,drive_id:drive.id,lesson_ids:requestedLessonIds,...(options?.body?.reason?{reason:options.body.reason}:{})}});
      if(synced.error||!synced.data?.ok){result.data.ok=false;result.data.error='Drive details changed, but Skills Practiced could not be saved. Reopen the drive before trying again.';return result}
      const verified=await originalInvoke('drive-detail-api',{body:{driver_id:driverId,drive_id:drive.id}}),verifiedDrive=verified?.data?.drive,verifiedIds=verified?.data?.lesson_ids||verifiedDrive?.lesson_ids||[];
      if(verified.error||!verified.data?.ok||!verifiedDrive||!lessonSetEqual(requestedLessonIds,verifiedIds)){result.data.ok=false;result.data.error='Drive save could not be verified. Reopen the drive before trying again.';return result}
      verifiedDrive.lesson_ids=verifiedIds;verifiedDrive.lessons=verified.data.lessons||[];verifiedDrive.lesson_id=verifiedIds[0]||null;result.data.drive=verifiedDrive;result.data.lesson_ids=verifiedIds;result.data.supervisor=verified.data.supervisor||null;return result;
    }
    return originalInvoke(slug,options);
  };

  async function loadContext(driverId){
    const mine=++contextToken,previousSupervisor=supervisor?.value||'',{data,error}=await client.functions.invoke('drive-ops',{body:{action:'form_context',driver_id:driverId}});
    if(mine!==contextToken||app.getDriverId()!==driverId||error||!data?.ok)return;
    const liveLessons=selectedLessonIds();
    if(supervisor){supervisor.innerHTML='<option value="">Choose a grown-up</option>'+data.supervisors.map(g=>`<option value="${esc(g.person_id)}">${esc(g.display_name)}${g.is_primary?' · Primary':''}</option>`).join('')+'<option value="OTHER">Other</option>';if(previousSupervisor&&[...supervisor.options].some(o=>o.value===previousSupervisor))supervisor.value=previousSupervisor;else supervisor.value=data.default_supervisor_person_id||data.primary_supervisor_person_id||'';toggleOther()}
    const mode=data.lesson_set?.selection_mode||null;
    if(mode==='ENUMERATED'){
      if(lessonWrap){lessonWrap.hidden=false;lessonWrap.style.display='grid';const label=lessonWrap.querySelector('span');if(label)label.textContent='Skills Practiced'}
      if(lessonNotesWrap){lessonNotesWrap.hidden=true;lessonNotesWrap.style.display='none'}
      if(lesson){lesson.multiple=true;lesson.innerHTML=data.lessons.map(x=>`<option value="${esc(x.id)}">${esc(x.lesson_code)} · ${esc(x.title)}</option>`).join('');setLessonSelection(liveLessons);renderLessonGrid(data.lessons);setLessonSelection(liveLessons)}
      if(lessonNotes)lessonNotes.required=false;
    }else if(mode==='FREE_TEXT'){
      if(lessonWrap){lessonWrap.hidden=true;lessonWrap.style.display='none'}hideLessonGrid();if(lessonNotesWrap){lessonNotesWrap.hidden=false;lessonNotesWrap.style.display='grid'}if(lesson){lesson.multiple=false;lesson.value=''}if(lessonNotes)lessonNotes.required=false;
    }else{if(lessonWrap){lessonWrap.hidden=true;lessonWrap.style.display='none'}hideLessonGrid();if(lessonNotesWrap){lessonNotesWrap.hidden=true;lessonNotesWrap.style.display='none'}}
    window.dispatchEvent(new CustomEvent('dv:driving-log-context',{detail:{driverId,...data}}));
  }
  window.addEventListener('dv:driver-changing',()=>{contextToken+=1});
  window.addEventListener('dv:dashboard-rendered',e=>{const driverId=e.detail?.driverId||app.getDriverId?.();if(driverId)loadContext(driverId)});
  window.addEventListener('dv:drive-edit-mode',e=>{if(!e.detail?.active)return;const drive=app.detailDrives?.[e.detail.driveId];if(drive?.lesson_ids)queueMicrotask(()=>setLessonSelection(drive.lesson_ids));queueMicrotask(updateNoteCount)});
  window.addEventListener('dv:driving-log-context',()=>{const id=document.getElementById('drive-form')?.dataset?.editDrive,drive=id?app.detailDrives?.[id]:null;if(drive?.lesson_ids)setLessonSelection(drive.lesson_ids);updateNoteCount()});

  function buildOverlay(){let overlay=document.getElementById('drive-log-building-overlay');if(overlay)return overlay;overlay=document.createElement('div');overlay.id='drive-log-building-overlay';overlay.hidden=true;overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');overlay.innerHTML='<div><strong>Building your driving log…</strong><span>Please wait while Drive Venture prepares the PDF.</span></div>';Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'10000',background:'rgba(20,24,28,.72)',display:'none',alignItems:'flex-start',justifyContent:'center',paddingTop:'18vh'});const box=overlay.firstElementChild;Object.assign(box.style,{background:'#fff',color:'#161616',border:'3px solid #1d1d1d',boxShadow:'8px 8px 0 rgba(0,0,0,.35)',padding:'22px 26px',maxWidth:'360px',width:'calc(100% - 40px)',textAlign:'center'});box.querySelector('strong').style.display='block';box.querySelector('strong').style.fontSize='1.15rem';box.querySelector('span').style.display='block';box.querySelector('span').style.marginTop='8px';document.body.appendChild(overlay);return overlay}
  function showBuild(active){const overlay=buildOverlay();overlay.hidden=!active;overlay.style.display=active?'flex':'none';document.documentElement.style.pointerEvents=active?'none':'';overlay.style.pointerEvents='auto'}

  exportButton?.addEventListener('click',async()=>{
    const driverId=app.getDriverId?.();if(!driverId)return;const permit=window.prompt('Permit / license number for this PDF (optional; Drive Venture will not store it):','');if(permit===null)return;setExportStatus('Building driving log…');showBuild(true);
    const {data:sessionData}=await client.auth.getSession(),session=sessionData?.session,cfg=window.DV_APP_CONFIG||{};if(!session?.access_token||!cfg.supabaseUrl||!cfg.publishableKey){showBuild(false);setExportStatus('Please sign in again before exporting.','error');return}
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
    try{const response=await fetch(`${cfg.supabaseUrl.replace(/\/$/,'')}/functions/v1/driving-log-renderer`,{method:'POST',headers:{authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey,'content-type':'application/json'},body:JSON.stringify({driver_id:driverId,permit_number:permit.trim()||null}),signal:controller.signal});if(!response.ok){let message='Driving log could not be generated.';try{const b=await response.json();if(b?.error)message=b.error}catch(_){}setExportStatus(message,'error');return}const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='drive-venture-driving-log.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setExportStatus('Driving log downloaded.','success')}catch(error){setExportStatus(error?.name==='AbortError'?'Driving log generation timed out. Please try again.':'Driving log could not be generated. Please try again.','error')}finally{clearTimeout(timeout);showBuild(false)}
  });
})();
