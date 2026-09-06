(() => {
  const app=window.DV_LOG_APP,form=document.getElementById('drive-form'),status=document.getElementById('drive-status');
  if(!app?.client||!form||form.dataset.dvDriveReviewBound==='true')return;
  form.dataset.dvDriveReviewBound='true';
  if(!document.querySelector('link[data-dv-drive-review-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/log-drive-edit.css?v=20260906-soft-delete1';l.dataset.dvDriveReviewCss='true';document.head.appendChild(l)}
  let current={active:false,driverId:null,driveId:null};
  const clean=v=>v==null?'':String(v).trim();
  function setReviewMode(active){document.body.classList.toggle('dv-drive-review-active',!!active);if(active){setTimeout(()=>{const card=form.closest('.app-card');card?.scrollIntoView({behavior:'smooth',block:'center'});const context=document.getElementById('drive-edit-context');context?.setAttribute('tabindex','-1');context?.focus({preventScroll:true})},80)}}
  function ensureDeleteButton(){let b=document.getElementById('drive-delete');if(b)return b;b=document.createElement('button');b.id='drive-delete';b.type='button';b.className='button subtle-button button-small drive-delete-button';b.textContent='Delete drive';b.hidden=true;const cancel=document.getElementById('drive-edit-cancel');(cancel||form.querySelector('button[type=submit]'))?.after(b);return b}
  const del=ensureDeleteButton();
  window.addEventListener('dv:drive-edit-mode',e=>{current={active:!!e.detail?.active,driverId:e.detail?.driverId||null,driveId:e.detail?.driveId||null};setReviewMode(current.active);del.hidden=!current.active});
  if(form.dataset.editDrive){current={active:true,driverId:app.getDriverId?.()||null,driveId:form.dataset.editDrive};setReviewMode(true);del.hidden=false}
  del.addEventListener('click',async()=>{
    const driverId=app.getDriverId?.()||current.driverId,driveId=form.dataset.editDrive||current.driveId;if(!driverId||!driveId)return;
    if(!window.confirm('Delete this drive?\n\nIt will be removed from your driving totals, achievements, printable log, and certification queue. Drive Venture will retain an audit record so the deletion can be traced.'))return;
    const reason=window.prompt('Optional: Why are you deleting this drive?','')??null;
    del.disabled=true;if(status){status.textContent='Deleting drive…';status.className='app-status'}
    const {data,error}=await app.client.functions.invoke('drive-delete',{body:{driver_id:driverId,drive_id:driveId,reason:clean(reason)||null}});
    if(error||!data?.ok){del.disabled=false;if(status){status.textContent=`Delete drive: ${data?.error||error?.message||'Unable to delete drive.'}`;status.className='app-status error'}return}
    const u=new URL(location.href);u.searchParams.delete('editDrive');u.searchParams.set('driver',driverId);location.assign(u.toString());
  });
  if(status){new MutationObserver(async()=>{
    if(!form.dataset.editDrive||!status.textContent?.startsWith('Drive updated and verified'))return;
    const driverId=app.getDriverId?.(),driveId=form.dataset.editDrive;if(!driverId||!driveId)return;
    const {data,error}=await app.client.functions.invoke('drive-detail-api',{body:{driver_id:driverId,drive_id:driveId}});if(error||!data?.drive)return;
    const notes=document.getElementById('drive-notes');if(notes&&notes.value!==clean(data.drive.notes)){notes.value=clean(data.drive.notes);notes.dispatchEvent(new Event('input',{bubbles:true}))}
    app.detailDrives=app.detailDrives||{};app.detailDrives[driveId]=data.drive;
  }).observe(status,{childList:true,subtree:true,characterData:true})}
})();
