(() => {
  const app=window.DV_LOG_APP,form=document.getElementById('drive-form'),status=document.getElementById('drive-status');
  if(!app?.client||!form||form.dataset.dvDriveReviewBound==='true')return;
  form.dataset.dvDriveReviewBound='true';
  if(!document.querySelector('link[data-dv-drive-review-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/log-drive-edit.css?v=20260906-soft-delete1';l.dataset.dvDriveReviewCss='true';document.head.appendChild(l)}
  let current={active:false,driverId:null,driveId:null};
  const clean=v=>v==null?'':String(v).trim();
  function setReviewMode(active){document.body.classList.toggle('dv-drive-review-active',!!active);if(active){setTimeout(()=>{const card=form.closest('.app-card');card?.scrollIntoView({behavior:'smooth',block:'center'});const context=document.getElementById('drive-edit-context');context?.setAttribute('tabindex','-1');context?.focus({preventScroll:true})},80)}}
  function removeInactiveDrives(model){const byId=new Map((model?.recent_drives||[]).map(d=>[String(d.id),d]));document.querySelectorAll('#drive-list [data-drive-detail-id]').forEach(link=>{const drive=byId.get(String(link.dataset.driveDetailId));if(!drive||drive.status!=='COMPLETE')link.closest('li')?.remove()});const list=document.getElementById('drive-list');if(list&&!list.children.length)list.innerHTML='<li class="empty-state">No drives logged yet.</li>'}
  function ensureDeleteButton(){let b=document.getElementById('drive-delete');if(b)return b;b=document.createElement('button');b.id='drive-delete';b.type='button';b.className='button subtle-button button-small drive-delete-button';b.textContent='Delete drive';b.hidden=true;const cancel=document.getElementById('drive-edit-cancel');(cancel||form.querySelector('button[type=submit]'))?.after(b);return b}
  const del=ensureDeleteButton();
  window.addEventListener('dv:dashboard-rendered',e=>removeInactiveDrives(e.detail?.model));
  window.addEventListener('dv:drive-edit-mode',e=>{const active=!!form.dataset.editDrive||!!e.detail?.active;current={active,driverId:e.detail?.driverId||app.getDriverId?.()||null,driveId:form.dataset.editDrive||e.detail?.driveId||null};setReviewMode(active);del.hidden=!active});
  if(form.dataset.editDrive){current={active:true,driverId:app.getDriverId?.()||null,driveId:form.dataset.editDrive};setReviewMode(true);del.hidden=false}
  del.addEventListener('click',async()=>{
    const driverId=app.getDriverId?.()||current.driverId,driveId=form.dataset.editDrive||current.driveId;if(!driverId||!driveId)return;
    if(!window.confirm('Delete this drive?\n\nIt will be removed from your driving totals, achievements, printable log, and certification queue. Drive Venture will retain an audit record so the deletion can be traced.'))return;
    const reason=window.prompt('Optional: Why are you deleting this drive?','')??null;
    del.disabled=true;if(status){status.textContent='Deleting drive…';status.className='app-status'}
    const {data,error}=await app.client.functions.invoke('drive-delete',{body:{driver_id:driverId,drive_id:driveId,reason:clean(reason)||null}});
    if(error||!data?.ok){del.disabled=false;if(status){status.textContent=`Delete drive: ${data?.error||error?.message||'Unable to delete drive.'}`;status.className='app-status error'}return}
    if(!['DELETED','ALREADY_DELETED'].includes(String(data.outcome||''))||data.drive?.status!=='VOID'){
      del.disabled=false;if(status){status.textContent=`Delete drive: Drive Venture could not verify that this drive is inactive (${data.outcome||'unknown result'}).`;status.className='app-status error'}return
    }
    try{await app.refreshDashboard()}catch(error){del.disabled=false;if(status){status.textContent='Drive was deleted, but the dashboard could not refresh. Reload the page to confirm the updated totals.';status.className='app-status error'}return}
    const stillOperational=(app.getModel?.().recent_drives||[]).some(d=>String(d.id)===String(driveId)&&d.status==='COMPLETE');
    if(stillOperational){del.disabled=false;if(status){status.textContent='Drive was deleted, but it is still present in the operational dashboard response. Please reload and contact support if it remains visible.';status.className='app-status error'}return}
    removeInactiveDrives(app.getModel?.());
    const u=new URL(location.href);u.searchParams.delete('editDrive');u.searchParams.set('driver',driverId);history.replaceState(history.state,'',u.pathname+u.search+u.hash);
    const cancel=document.getElementById('drive-edit-cancel');if(cancel&&!cancel.hidden)cancel.click();else{delete form.dataset.editDrive;current={active:false,driverId:null,driveId:null};setReviewMode(false);del.hidden=true}
    del.disabled=false;if(status){status.textContent=data.outcome==='ALREADY_DELETED'?'This drive was already inactive. Dashboard data has been refreshed.':'Drive deleted. Dashboard totals, progress, achievements, and drive history have been refreshed.';status.className='app-status success'}
  });
  if(status){new MutationObserver(async()=>{
    if(!form.dataset.editDrive||!status.textContent?.startsWith('Drive updated and verified'))return;
    const driverId=app.getDriverId?.(),driveId=form.dataset.editDrive;if(!driverId||!driveId)return;
    const {data,error}=await app.client.functions.invoke('drive-detail-api',{body:{driver_id:driverId,drive_id:driveId}});if(error||!data?.drive)return;
    const notes=document.getElementById('drive-notes');if(notes&&notes.value!==clean(data.drive.notes)){notes.value=clean(data.drive.notes);notes.dispatchEvent(new Event('input',{bubbles:true}))}
    app.detailDrives=app.detailDrives||{};app.detailDrives[driveId]=data.drive;
  }).observe(status,{childList:true,subtree:true,characterData:true})}
})();
