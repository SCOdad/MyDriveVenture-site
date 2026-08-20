(() => {
  const originalForm = document.getElementById('drive-form');
  const app = window.DV_LOG_APP;
  if (!originalForm || !app?.client) return;

  const form = originalForm.cloneNode(true);
  originalForm.replaceWith(form);
  const client = app.client;
  const statusEl = document.getElementById('drive-status');
  const submissionKey = 'dv:web-drive:submission-id';
  const setStatus = (text, kind='') => { statusEl.textContent=text||''; statusEl.className=`app-status${kind?` ${kind}`:''}`; };
  function stableSubmissionId(){try{const existing=sessionStorage.getItem(submissionKey);if(existing)return existing;const id=`web-drive-${crypto.randomUUID()}`;sessionStorage.setItem(submissionKey,id);return id}catch(_){return `web-drive-${crypto.randomUUID()}`}}
  function clearSubmissionId(){try{sessionStorage.removeItem(submissionKey)}catch(_){}}
  function nightMessage(result){
    if(result?.status==='CLASSIFIED') return result.minutes>0 ? ` ${result.minutes} night minute${result.minutes===1?'':'s'} credited.` : '';
    if(result?.status==='LOCATION_PENDING') return ' Drive saved, but night credit could not be verified because location information is incomplete.';
    if(result?.status==='LOOKUP_PENDING') return ' Drive saved, but night credit could not be verified right now.';
    return '';
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const driverId = app.getDriverId();
    if (!driverId) return setStatus('No active driver is selected.','error');
    setStatus('Logging drive…');
    const {data,error}=await client.functions.invoke('drive-ops',{body:{
      action:'log_drive',
      driver_id:driverId,
      source_event_id:stableSubmissionId(),
      drive_date:document.getElementById('drive-date').value,
      start_time:document.getElementById('drive-start').value,
      end_time:document.getElementById('drive-end').value,
      vehicle_id:document.getElementById('drive-vehicle').value||null,
      destination:document.getElementById('drive-destination').value.trim()||null,
      notes:document.getElementById('drive-notes').value.trim()||null
    }});
    if(error)return setStatus(`Drive: ${error.message||'Request failed'}. You can retry safely.`,'error');
    if(!data?.ok)return setStatus(`Drive: ${data?.error||'Request failed'}. You can retry safely.`,'error');

    clearSubmissionId();
    const awards=data.quests?.awarded||[];
    const earned=awards.length?` Earned: ${awards.map(q=>q.name||q.quest_key).join(', ')}.`:'';
    setStatus(`Drive logged.${nightMessage(data.night_classification)}${earned}`,'success');
    document.getElementById('drive-destination').value='';
    document.getElementById('drive-notes').value='';
    try { await app.refreshDashboard(); } catch (_) {}
  });

  function loadOnce(src,attr){
    if(document.querySelector(`script[${attr}]`))return;
    const s=document.createElement('script');s.src=src;s.setAttribute(attr,'true');document.body.appendChild(s);
  }
  loadOnce('/assets/js/log-skin-presenter.js?v=20260820-0007','data-dv-skin-presenter');
  loadOnce('/assets/js/log-shared-actions.js?v=20260820-0007','data-dv-shared-actions');
})();