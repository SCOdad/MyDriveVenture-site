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

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const driverId = app.getDriverId();
    if (!driverId) return setStatus('No active driver is selected.','error');
    setStatus('Logging drive…');
    const {data,error}=await client.rpc('log_authenticated_drive_v1',{
      p_driver_id:driverId,
      p_source_event_id:stableSubmissionId(),
      p_drive_date:document.getElementById('drive-date').value,
      p_start_time:document.getElementById('drive-start').value,
      p_end_time:document.getElementById('drive-end').value,
      p_vehicle_id:document.getElementById('drive-vehicle').value||null,
      p_destination:document.getElementById('drive-destination').value.trim()||null,
      p_notes:document.getElementById('drive-notes').value.trim()||null
    });
    if(error)return setStatus(`Drive RPC: ${error.message||'Request failed'}. You can retry safely.`,'error');
    if(!data?.ok)return setStatus(`Drive RPC: ${data?.error||'Request failed'}. You can retry safely.`,'error');

    clearSubmissionId();
    const awards=data.quests?.awarded||[];
    const earned=awards.length?` Earned: ${awards.map(q=>q.name||q.quest_key).join(', ')}.`:'';
    setStatus(`Drive logged. Night credit is pending classification.${earned}`,'success');
    document.getElementById('drive-destination').value='';
    document.getElementById('drive-notes').value='';
    try { await app.refreshDashboard(); } catch (_) {}
  });

  function loadOnce(src,attr){
    if(document.querySelector(`script[${attr}]`))return;
    const s=document.createElement('script');s.src=src;s.setAttribute(attr,'true');document.body.appendChild(s);
  }
  loadOnce('/assets/js/log-skin-presenter.js?v=20260818-1215','data-dv-skin-presenter');
  loadOnce('/assets/js/log-shared-actions.js?v=20260818-1215','data-dv-shared-actions');
})();