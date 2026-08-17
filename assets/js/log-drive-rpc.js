(() => {
  const cfg = window.DV_APP_CONFIG || {};
  const form = document.getElementById('drive-form');
  const statusEl = document.getElementById('drive-status');
  if (!form || !statusEl || !window.supabase || !cfg.supabaseUrl || !cfg.publishableKey) return;

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const submissionKey = 'dv:web-drive:submission-id';

  function setStatus(text, kind = '') {
    statusEl.textContent = text || '';
    statusEl.className = `app-status${kind ? ` ${kind}` : ''}`;
  }

  function stableSubmissionId() {
    try {
      let value = sessionStorage.getItem(submissionKey);
      if (!value) {
        value = `web-drive-${crypto.randomUUID()}`;
        sessionStorage.setItem(submissionKey, value);
      }
      return value;
    } catch (_) {
      return `web-drive-${crypto.randomUUID()}`;
    }
  }

  function clearSubmissionId() {
    try { sessionStorage.removeItem(submissionKey); } catch (_) {}
  }

  // Capture phase deliberately intercepts the older Edge Function submit handler.
  // Canonical WEB drive writes now use the authenticated PostgreSQL RPC directly.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!form.reportValidity()) return;

    const driverId = document.getElementById('driver-select')?.value || '';
    if (!driverId) {
      setStatus('No driver is selected.', 'error');
      return;
    }

    setStatus('Logging drive…');
    const sourceEventId = stableSubmissionId();
    const { data, error } = await client.rpc('log_authenticated_drive_v1', {
      p_driver_id: driverId,
      p_source_event_id: sourceEventId,
      p_drive_date: document.getElementById('drive-date').value,
      p_start_time: document.getElementById('drive-start').value,
      p_end_time: document.getElementById('drive-end').value,
      p_vehicle_id: document.getElementById('drive-vehicle').value || null,
      p_destination: document.getElementById('drive-destination').value.trim() || null,
      p_notes: document.getElementById('drive-notes').value.trim() || null,
    });

    if (error) {
      setStatus(`Drive write: ${error.message || 'Request failed'}. You can retry safely.`, 'error');
      return;
    }
    if (!data || data.ok !== true) {
      setStatus(`Drive write: ${data?.error || 'Request failed'}. You can retry safely.`, 'error');
      return;
    }

    clearSubmissionId();
    const awards = data.quests?.awarded || [];
    const awardText = awards.length ? ` Earned: ${awards.map(q => q.name || q.quest_key).join(', ')}.` : '';
    const nightText = data.night_classification?.status === 'PENDING' ? ' Night credit is pending classification.' : '';
    setStatus(`Drive logged.${awardText}${nightText}`, 'success');
    document.getElementById('drive-destination').value = '';
    document.getElementById('drive-notes').value = '';

    // Reload canonical dashboard data after the success state is visible briefly.
    setTimeout(() => window.location.reload(), 900);
  }, true);
})();
