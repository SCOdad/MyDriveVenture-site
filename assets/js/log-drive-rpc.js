(() => {
  const legacyForm = document.getElementById('drive-form');
  if (!legacyForm || !window.supabase) return;

  const cfg = window.DV_APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.publishableKey) return;

  // log.js historically attaches a driver-api submit listener directly to the form.
  // Clone/replace the node so those legacy listeners are discarded completely.
  // This makes the authenticated PostgreSQL RPC the sole Log Drive write path.
  const form = legacyForm.cloneNode(true);
  legacyForm.replaceWith(form);

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const statusEl = document.getElementById('drive-status');
  const submissionKey = 'dv:web-drive:submission-id';

  function setStatus(text, kind = '') {
    statusEl.textContent = text || '';
    statusEl.className = `app-status${kind ? ` ${kind}` : ''}`;
  }

  function stableSubmissionId() {
    try {
      const existing = sessionStorage.getItem(submissionKey);
      if (existing) return existing;
      const id = `web-drive-${crypto.randomUUID()}`;
      sessionStorage.setItem(submissionKey, id);
      return id;
    } catch (_) {
      return `web-drive-${crypto.randomUUID()}`;
    }
  }

  function clearSubmissionId() {
    try { sessionStorage.removeItem(submissionKey); } catch (_) {}
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const driverId = document.getElementById('driver-select')?.value || '';
    if (!driverId) {
      setStatus('No active driver is selected.', 'error');
      return;
    }

    setStatus('Logging drive…');

    const args = {
      p_driver_id: driverId,
      p_source_event_id: stableSubmissionId(),
      p_drive_date: document.getElementById('drive-date').value,
      p_start_time: document.getElementById('drive-start').value,
      p_end_time: document.getElementById('drive-end').value,
      p_vehicle_id: document.getElementById('drive-vehicle').value || null,
      p_destination: document.getElementById('drive-destination').value.trim() || null,
      p_notes: document.getElementById('drive-notes').value.trim() || null,
    };

    const { data, error } = await client.rpc('log_authenticated_drive_v1', args);
    if (error) {
      setStatus(`Drive RPC: ${error.message || 'Request failed'}. You can retry safely.`, 'error');
      return;
    }
    if (!data || data.ok !== true) {
      setStatus(`Drive RPC: ${data?.error || 'Request failed'}. You can retry safely.`, 'error');
      return;
    }

    clearSubmissionId();
    const awards = data.quests?.awarded || [];
    const earned = awards.length ? ` Earned: ${awards.map(q => q.name || q.quest_key).join(', ')}.` : '';
    setStatus(`Drive logged. Night credit is pending classification.${earned}`, 'success');

    document.getElementById('drive-destination').value = '';
    document.getElementById('drive-notes').value = '';

    window.setTimeout(() => window.location.reload(), 900);
  });
})();
