(() => {
  const app = window.DV_LOG_APP;
  if (!app?.client || window.DV_ENTITLEMENTS) return;

  const client = app.client;
  const EXHAUSTED_CODE = 'DV_FREE_DRIVE_LIMIT_REACHED';
  const DEFAULT_EXHAUSTED_MESSAGE = 'You have used your free Drive Venture drives. Your dashboard, edit/delete tools, and driving-log PDF remain available, but new drives and Text Parker logging are paused until a family license is active.';
  let lastStatus = null;
  let originalSubmitText = null;

  function clean(v) { return v == null ? '' : String(v).trim(); }
  function isFreeTrialStatus(status) { return clean(status?.commercial_state) === 'FREE'; }
  function isPaidStatus(status) { return clean(status?.commercial_state) === 'PAID'; }
  function isExhaustedStatus(status) { return clean(status?.commercial_state) === 'FREE_EXHAUSTED'; }
  function isEntitlementCode(code) { return clean(code) === EXHAUSTED_CODE; }
  function entitlementMessage(status) { return clean(status?.message) || DEFAULT_EXHAUSTED_MESSAGE; }

  function readableError(value) {
    if (value == null) return '';
    if (typeof value === 'string') return clean(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(readableError).filter(Boolean).join('; ');
    if (typeof value === 'object') {
      return clean(value.message) || clean(value.error) || clean(value.details) || clean(value.detail) || clean(value.code) || 'Driving log could not be generated.';
    }
    return clean(value);
  }

  function ensurePanel() {
    const form = document.getElementById('drive-form');
    if (!form) return null;
    let panel = document.getElementById('drive-entitlement-status');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'drive-entitlement-status';
    panel.className = 'app-status drive-entitlement-status';
    panel.setAttribute('role', 'status');
    panel.hidden = true;
    form.prepend(panel);
    return panel;
  }

  function getSubmitButton() {
    return document.getElementById('drive-form')?.querySelector('button[type="submit"]') || null;
  }

  function isEditMode() {
    return !!document.getElementById('drive-form')?.dataset.editDrive;
  }

  function setSubmitBlocked(blocked) {
    const submit = getSubmitButton();
    if (!submit) return;
    if (originalSubmitText == null) originalSubmitText = submit.textContent || 'Log drive';
    const unavailable = !!blocked && !isEditMode();
    submit.disabled = unavailable;
    submit.hidden = unavailable;
    submit.setAttribute('aria-hidden', unavailable ? 'true' : 'false');
    submit.setAttribute('aria-disabled', unavailable ? 'true' : 'false');
    submit.dataset.dvEntitlementBlocked = unavailable ? 'true' : 'false';
    if (!unavailable && originalSubmitText != null && submit.textContent === 'Logging paused') submit.textContent = originalSubmitText;
  }

  function render(status = lastStatus) {
    lastStatus = status || lastStatus;
    const panel = ensurePanel();
    if (!panel || !lastStatus) return;
    const exhausted = isExhaustedStatus(lastStatus);
    panel.hidden = false;
    panel.className = `app-status drive-entitlement-status${exhausted ? ' error' : ' success'}`;
    if (exhausted) {
      panel.textContent = entitlementMessage(lastStatus);
      setSubmitBlocked(true);
      return;
    }
    const remaining = Number(lastStatus.accepted_drives_remaining ?? NaN);
    const used = Number(lastStatus.accepted_drive_count ?? NaN);
    const usedText = Number.isFinite(used) ? `${used} accepted drive${used === 1 ? '' : 's'} logged` : '';
    if (isFreeTrialStatus(lastStatus) && Number.isFinite(remaining)) {
      const freeText = `${remaining} free drive${remaining === 1 ? '' : 's'} remaining`;
      panel.textContent = usedText ? `${freeText} · ${usedText}.` : `${freeText}.`;
    } else if (isPaidStatus(lastStatus)) {
      panel.textContent = usedText ? `Family license active · ${usedText}.` : 'Family license active.';
    } else {
      panel.textContent = usedText ? `Drive logging available · ${usedText}.` : 'Drive logging available.';
    }
    setSubmitBlocked(false);
  }

  async function refresh() {
    if (!app.getDriverId?.()) return null;
    try {
      const { data, error } = await client.rpc('get_family_entitlement_status_v1', {});
      if (error) throw error;
      lastStatus = data || null;
      render(lastStatus);
      return lastStatus;
    } catch (error) {
      const panel = ensurePanel();
      if (panel) {
        panel.hidden = false;
        panel.className = 'app-status drive-entitlement-status error';
        panel.textContent = 'Drive Venture could not load family entitlement status. New drive logging may be unavailable until this refreshes.';
      }
      return null;
    }
  }

  function isEntitlementDenial(info) {
    if (!info) return false;
    if (isEntitlementCode(info.code)) return true;
    const message = readableError(info.message || info.error || info.details || info.detail || info);
    return message.includes(EXHAUSTED_CODE) || message.includes('free drives') || message.includes('FREE_EXHAUSTED');
  }

  function normalizeInvokeResult(name, result) {
    if (name !== 'drive-ops') return result;
    const data = result?.data;
    const error = result?.error;
    if (isEntitlementDenial(data) || isEntitlementDenial(error)) {
      const message = entitlementMessage(lastStatus);
      return { data: { ok: false, code: EXHAUSTED_CODE, error: message }, error: null };
    }
    return result;
  }

  function patchInvoke() {
    const functions = client.functions;
    if (!functions?.invoke || functions.invoke.__dvEntitlementPatched) return;
    const original = functions.invoke.bind(functions);
    const patched = async (name, options) => normalizeInvokeResult(name, await original(name, options));
    patched.__dvEntitlementPatched = true;
    functions.invoke = patched;
  }

  function patchRecovery() {
    const recovery = window.DV_DRIVE_SAVE_RECOVERY;
    if (!recovery?.isAmbiguous || recovery.isAmbiguous.__dvEntitlementPatched) return;
    const original = recovery.isAmbiguous.bind(recovery);
    const patched = info => isEntitlementDenial(info) ? false : original(info);
    patched.__dvEntitlementPatched = true;
    recovery.isAmbiguous = patched;
  }

  function patchPdfFetch() {
    if (window.fetch?.__dvEntitlementPdfPatched) return;
    const original = window.fetch.bind(window);
    const patched = async (input, options) => {
      const response = await original(input, options);
      const url = typeof input === 'string' ? input : input?.url || '';
      if (!url.includes('/functions/v1/driving-log-renderer') || response.ok) return response;
      try {
        const body = await response.clone().json();
        const message = readableError(body?.error || body?.message || body);
        if (!message || message === '[object Object]') return response;
        const headers = new Headers(response.headers);
        headers.set('content-type', 'application/json');
        return new Response(JSON.stringify({ ...body, error: message }), {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch (_) {
        return response;
      }
    };
    patched.__dvEntitlementPdfPatched = true;
    window.fetch = patched;
  }

  function guardSubmit(e) {
    const form = document.getElementById('drive-form');
    if (!form || form.dataset.editDrive || !isExhaustedStatus(lastStatus)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    render(lastStatus);
    const statusEl = document.getElementById('drive-status');
    if (statusEl) {
      statusEl.textContent = entitlementMessage(lastStatus);
      statusEl.className = 'app-status error';
    }
    window.DV_DRIVE_SAVE_RECOVERY?.clear?.();
  }

  function resyncSubmitState() {
    if (lastStatus) render(lastStatus);
  }

  window.DV_ENTITLEMENTS = {
    refresh,
    render,
    getStatus: () => lastStatus,
    isEntitlementDenial,
    code: EXHAUSTED_CODE,
  };

  patchInvoke();
  patchRecovery();
  patchPdfFetch();
  document.addEventListener('submit', guardSubmit, true);
  document.addEventListener('click', event => {
    const button = event.target?.closest?.('#drive-form button[type="submit"]');
    if (!button || isEditMode() || !isExhaustedStatus(lastStatus)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    render(lastStatus);
  }, true);
  window.addEventListener('dv:driving-log-context', () => { patchRecovery(); refresh().then(resyncSubmitState); });
  window.addEventListener('dv:drive-edit-mode', () => { queueMicrotask(resyncSubmitState); setTimeout(resyncSubmitState, 0); });
  window.addEventListener('dv:dashboard-rendered', () => { queueMicrotask(resyncSubmitState); });
  window.addEventListener('dv:driver-changing', () => { lastStatus = null; const panel = ensurePanel(); if (panel) panel.hidden = true; setSubmitBlocked(false); });
  queueMicrotask(refresh);
})();
