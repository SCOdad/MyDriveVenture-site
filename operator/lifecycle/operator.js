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
  let selectedKind = '';
  let capabilities = {};
  let busy = false;
  let operatorAuthorized = false;
  const app = document.getElementById('lifecycle-app');
  const gate = document.getElementById('lifecycle-auth-gate');
  const gateMessage = document.getElementById('lifecycle-auth-message');
  const signInLink = document.getElementById('lifecycle-signin-link');

  function showGate(message) {
    operatorAuthorized = false;
    app.hidden = true;
    gate.hidden = false;
    gateMessage.textContent = message;
    signInLink.hidden = false;
    resetTransition();
  }
  async function checkOperator() {
    gateMessage.textContent = 'Verifying your operator session…';
    const auth = await client.auth.getSession();
    if (!auth.data.session?.access_token) {
      showGate('Sign in with an authorized operator account to access Lifecycle Management.');
      return;
    }
    try {
      const response = await invoke({action:'authorize'});
      if (!response.authorized) throw new Error('Operator access required.');
      operatorAuthorized = true;
      gate.hidden = true;
      app.hidden = false;
    } catch(error) {
      showGate('Access denied. Sign in with an authorized operator account.');
    }
  }

  function resetTransition() {
    preview = null;
    selectedId = '';
    selectedKind = '';
    capabilities = {};
    transitionPanel.hidden = true;
    document.getElementById('family-transition-panel').hidden = true;
    document.getElementById('purge-panel').hidden = true;
    transitionForm.reset();
    transitionStatus.textContent = '';
    document.getElementById('family-transition-form').reset();
    document.getElementById('purge-form').reset();
    document.getElementById('family-transition-result').textContent = '';
    document.getElementById('purge-result').textContent = '';
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
    if (response.status === 401 || response.status === 403) {
      showGate('Your operator session is invalid or no longer authorized. Sign in again.');
      throw new Error('Operator authentication required.');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.error || 'Lifecycle request failed');
    return body;
  }

  function showSummary(kind, data) {
    const target = document.getElementById('lifecycle-summary');
    target.replaceChildren();
    const title = document.createElement('h3');
    title.textContent = kind === 'driver' ? 'Driver impact' : 'Family impact';
    target.append(title);
    const warning = document.createElement('p');
    warning.textContent = 'Permanent purge is unavailable; this preview does not authorize deletion.';
    target.append(warning);
    const list = document.createElement('ul');
    const row = (name, value) => {
      const item = document.createElement('li');
      item.textContent = name + ': ' + String(value);
      list.append(item);
    };
    if (kind === 'driver') {
      row('Simple purge candidate', data.simple_purge_candidate === true ? 'Yes, subject to explicit confirmation' : 'No');
      row('Unsupported purge dependencies', (data.simple_purge_blockers || []).length);
      row('Driver', data.driver?.display_name || data.driver?.id || 'Unknown');
      row('Status', data.driver?.status || 'Unknown');
      row('Families', (data.family_memberships || []).length);
      for (const [index, family] of (data.family_memberships || []).entries()) {
        row('Family ' + (index+1) + ' ID', family.family_id || 'Unknown');
        row('Family ' + (index+1) + ' status', family.family_status || 'Unknown');
        row('Family ' + (index+1) + ' membership', family.membership_status || 'Unknown');
      }
      row('Guardian relationships', (data.guardian_relationships || []).length);
      const dependencies = Object.entries(data.direct_fk_dependencies || {});
      for (const [table, detail] of dependencies) {
        if (Number(detail?.count || 0) > 0) row(table, detail.count);
      }
      row('Direct FK blockers', (data.direct_fk_blockers || []).length);
      row('Coverage', data.completeness || 'Partial');
    } else {
      row('Family', data.family_code || data.family_id || 'Unknown');
      row('Status', data.family_status || 'Unknown');
      const counts = data.counts || {};
      for (const [name, count] of Object.entries(counts)) row(name.replaceAll('_', ' '), count);
      row('Shared people requiring review', (data.shared_people || []).length);
      row('Storage objects requiring review', (data.storage_objects || []).length);
    }
    target.append(list);
  }

  async function loadPreview() {
    resetTransition();
    selectedId = document.getElementById('lifecycle-id').value.trim();
    const kind = document.getElementById('lifecycle-kind').value;
    selectedKind=kind;
    status.textContent = 'Loading preview…';
    result.textContent = '';
    document.getElementById('lifecycle-summary').replaceChildren();
    const response = await invoke({action: 'preview_' + kind, id: selectedId});
    preview = response.preview;
    capabilities = response.capabilities || {};
    result.textContent = JSON.stringify(preview, null, 2);
    showSummary(kind, preview);
    status.textContent = 'Preview loaded. No records changed.';
    const driver = kind === 'driver' ? preview?.driver : null;
    if (driver && ['ACTIVE', 'INACTIVE'].includes(driver.status)) {
      document.getElementById('selected-driver-name').textContent = driver.display_name;
      document.getElementById('selected-driver-status').textContent = driver.status;
      document.getElementById('driver-transition-action').value =
        driver.status === 'ACTIVE' ? 'INACTIVATE' : 'REACTIVATE';
      transitionPanel.hidden = false;
    }
    const family = kind === 'family' ? preview : null;
    if (family && capabilities.transition && ['ACTIVE', 'INACTIVE'].includes(family.family_status)) {
      document.getElementById('selected-family-code').textContent = family.family_code || '';
      document.getElementById('selected-family-status').textContent = family.family_status;
      document.getElementById('family-transition-action').value =
        family.family_status === 'ACTIVE' ? 'INACTIVATE' : 'REACTIVATE';
      document.getElementById('family-transition-panel').hidden = false;
    }
    const eligible = kind === 'driver'
      ? preview?.simple_purge_candidate === true
      : family?.family_status === 'INACTIVE' && (family?.shared_people || []).length === 0;
    if (capabilities.purge && eligible && (
      kind === 'driver' ? driver?.status === 'INACTIVE' : family?.family_status === 'INACTIVE'
    )) {
      document.getElementById('purge-warning').textContent = kind === 'driver'
        ? 'Only the simple-driver/no-history purge is supported. Shared person and contact records are retained.'
        : 'Family deletion is irreversible and may leave Auth/Storage companion cleanup pending.';
      document.getElementById('purge-panel').hidden = false;
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !operatorAuthorized) return;
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
    if (busy || !operatorAuthorized || !preview?.driver || !selectedId || transitionPanel.hidden) return;
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
      await loadPreview();
      status.textContent = 'Driver status updated. Audit ID: ' + reply.result.audit_id + '. Current preview refreshed.';
    } catch (error) {
      transitionStatus.textContent = error.message || 'Status change failed. No success was reported.';
    } finally {
      document.getElementById('driver-transition-submit').disabled = false;
      busy = false;
    }
  });

  document.getElementById('family-transition-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !operatorAuthorized || selectedKind !== 'family' || !capabilities.transition || !preview ||
        document.getElementById('family-transition-panel').hidden) return;
    const family=preview;
    const transition=document.getElementById('family-transition-action').value;
    const confirmation=document.getElementById('family-transition-confirm').value;
    const reason=document.getElementById('family-transition-reason').value.trim();
    const out=document.getElementById('family-transition-result');
    if(confirmation!==family.family_code || reason.length<8 ||
       transition!==(family.family_status==='ACTIVE'?'INACTIVATE':'REACTIVATE')){
      out.textContent='Family code, action or reason does not match the current preview.';
      return;
    }
    busy=true;
    document.getElementById('family-transition-submit').disabled=true;
    try{
      const response=await invoke({
        action:'transition_family',id:selectedId,transition,
        expected_status:family.family_status,confirmation,reason
      });
      await loadPreview();
      status.textContent='Family status updated. Audit ID: '+response.result.audit_id;
    }catch(error){out.textContent=error.message||'Family status change failed.';}
    finally{busy=false;document.getElementById('family-transition-submit').disabled=false;}
  });

  document.getElementById('purge-form').addEventListener('submit', async event => {
    event.preventDefault();
    if(busy || !operatorAuthorized || !capabilities.purge || document.getElementById('purge-panel').hidden ||
       !preview || !selectedId) return;
    const id=document.getElementById('purge-id').value.trim();
    const confirmation=document.getElementById('purge-confirm').value;
    const reason=document.getElementById('purge-reason').value.trim();
    const acknowledge=document.getElementById('purge-acknowledge').checked;
    const expectedName=selectedKind==='driver'?preview.driver?.display_name:preview.family_code;
    const expectedStatus=selectedKind==='driver'?preview.driver?.status:preview.family_status;
    const out=document.getElementById('purge-result');
    if(!acknowledge||id!==selectedId||confirmation!==expectedName||
       reason.length<12||expectedStatus!=='INACTIVE'){
      out.textContent='Exact UUID, name/code, inactive status, reason and acknowledgment are required.';
      return;
    }
    busy=true;
    document.getElementById('purge-submit').disabled=true;
    out.textContent='Executing confirmed purge…';
    try{
      const response=await invoke({
        action:'purge_'+selectedKind,id:selectedId,
        confirm_id:id,confirmation,reason,expected_status:expectedStatus
      });
      resetTransition();
      result.textContent=JSON.stringify(response.result,null,2);
      document.getElementById('lifecycle-summary').replaceChildren();
      status.textContent='Purge completed in database. Audit ID: '+response.result.audit_id+
        (response.result.requires_companion_cleanup?' — Auth/Storage companion cleanup remains required.':'');
    }catch(error){out.textContent=error.message||'Purge failed. No success was reported.';}
    finally{busy=false;document.getElementById('purge-submit').disabled=false;}
  });

  client.auth.onAuthStateChange((_event,session)=>{
    if (!session) showGate('Session ended. Sign in to access Lifecycle Management.');
  });
  checkOperator();
  document.getElementById('lifecycle-id').addEventListener('input', resetTransition);
  document.getElementById('lifecycle-kind').addEventListener('change', resetTransition);
})();
