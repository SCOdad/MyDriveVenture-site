(() => {
  const form = document.getElementById('lifecycle-form');
  const status = document.getElementById('lifecycle-status');
  const result = document.getElementById('lifecycle-result');
  const transitionPanel = document.getElementById('driver-transition-panel');
  const transitionForm = document.getElementById('driver-transition-form');
  const transitionStatus = document.getElementById('driver-transition-result');
  const config = window.DV_APP_CONFIG;
  const endpoint = window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-lifecycle');
  const client = window.supabase.createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  let preview = null;
  let selectedId = '';
  let busy = false;

  function resetTransition() {
    preview = null;
    selectedId = '';
    transitionPanel.hidden = true;
    transitionForm.reset();
    transitionStatus.textContent = '';
  }

  async function invoke(input) {
    const auth = await client.auth.getSession();
    let token = auth.data.session?.access_token;
    if (!token) throw new Error('Sign in to your operator account first.');
    const send = currentToken => fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentToken,
        'apikey': config.publishableKey
      },
      body: JSON.stringify(input)
    });
    let response = await send(token);
    if (response.status === 401) {
      const refreshed = await client.auth.refreshSession();
      token = refreshed.data.session?.access_token;
      if (!token) throw new Error('Operator session expired. Sign in again.');
      response = await send(token);
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.error || 'Lifecycle request failed');
    return body;
  }

  async function loadPreview() {
    resetTransition();
    selectedId = document.getElementById('lifecycle-id').value.trim();
    const kind = document.getElementById('lifecycle-kind').value;
    status.textContent = 'Loading preview…';
    result.textContent = '';
    const response = await invoke({action: 'preview_' + kind, id: selectedId});
    preview = response.preview;
    result.textContent = JSON.stringify(preview, null, 2);
    status.textContent = 'Preview loaded. No records changed.';
    const driver = kind === 'driver' ? preview?.driver : null;
    if (driver && ['ACTIVE', 'INACTIVE'].includes(driver.status)) {
      document.getElementById('selected-driver-name').textContent = driver.display_name;
      document.getElementById('selected-driver-status').textContent = driver.status;
      document.getElementById('driver-transition-action').value =
        driver.status === 'ACTIVE' ? 'INACTIVATE' : 'REACTIVATE';
      transitionPanel.hidden = false;
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    try { await loadPreview(); }
    catch (error) {
      resetTransition();
      status.textContent = error.message || 'Preview unavailable';
      result.textContent = 'No preview available.';
    }
    finally { busy = false; }
  });

  transitionForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !preview?.driver || !selectedId || transitionPanel.hidden) return;
    const driver = preview.driver;
    const transition = document.getElementById('driver-transition-action').value;
    const confirmation = document.getElementById('driver-transition-confirm').value;
    const reason = document.getElementById('driver-transition-reason').value.trim();
    if (confirmation !== driver.display_name) {
      transitionStatus.textContent = 'Exact driver-name confirmation does not match.';
      return;
    }
    if (reason.length < 8) {
      transitionStatus.textContent = 'Provide a reason with at least 8 characters.';
      return;
    }
    if (transition !== (driver.status === 'ACTIVE' ? 'INACTIVATE' : 'REACTIVATE')) {
      transitionStatus.textContent = 'Requested action is inconsistent with the preview. Refresh first.';
      return;
    }
    busy = true;
    document.getElementById('driver-transition-submit').disabled = true;
    transitionStatus.textContent = 'Applying audited driver status change…';
    try {
      const reply = await invoke({
        action: 'transition_driver', id: selectedId,
        transition, expected_status: driver.status, confirmation, reason
      });
      transitionStatus.textContent = 'Status changed. Audit ID: ' + reply.result.audit_id;
      await loadPreview();
      status.textContent = 'Driver status updated. Current preview refreshed.';
    } catch (error) {
      transitionStatus.textContent = error.message || 'Status change failed. No success was reported.';
    } finally {
      document.getElementById('driver-transition-submit').disabled = false;
      busy = false;
    }
  });

  document.getElementById('lifecycle-id').addEventListener('input', resetTransition);
  document.getElementById('lifecycle-kind').addEventListener('change', resetTransition);
})();
