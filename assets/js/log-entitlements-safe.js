(() => {
  const app = window.DV_LOG_APP;
  if (!app?.client || window.DV_ENTITLEMENTS) return;
  const client = app.client;
  const EXHAUSTED_CODE = 'DV_FREE_DRIVE_LIMIT_REACHED';
  const DEFAULT_EXHAUSTED_MESSAGE = 'You have used your free Drive Venture drives. Your dashboard, edit/delete tools, and driving-log PDF remain available, but new drives and Text Parker logging are paused until a family license is active.';
  let lastStatus = null;
  const originalControlState = new WeakMap();

  const clean = v => v == null ? '' : String(v).trim();
  const form = () => document.getElementById('drive-form');
  const submit = () => form()?.querySelector('button[type="submit"]') || null;
  const editMode = () => !!form()?.dataset.editDrive;
  const exhausted = status => clean(status?.commercial_state) === 'FREE_EXHAUSTED';
  const message = status => clean(status?.message) || DEFAULT_EXHAUSTED_MESSAGE;

  function panel() {
    const f = form();
    if (!f) return null;
    let p = document.getElementById('drive-entitlement-status');
    if (!p) {
      p = document.createElement('div');
      p.id = 'drive-entitlement-status';
      p.className = 'app-status drive-entitlement-status';
      p.setAttribute('role', 'status');
      p.hidden = true;
      f.prepend(p);
    }
    return p;
  }

  function readableError(value) {
    if (value == null) return '';
    if (typeof value === 'string') return clean(value);
    if (Array.isArray(value)) return value.map(readableError).filter(Boolean).join('; ');
    if (typeof value === 'object') return clean(value.message) || clean(value.error) || clean(value.details) || clean(value.detail) || clean(value.code) || 'Driving log could not be generated.';
    return String(value);
  }

  function writeDriveStatus() {
    const s = document.getElementById('drive-status');
    if (!s) return;
    s.textContent = message(lastStatus);
    s.className = 'app-status error';
  }

  function driveControls() {
    const f = form();
    if (!f) return [];
    return [...f.querySelectorAll('input, select, textarea')];
  }

  function rememberControl(el) {
    if (originalControlState.has(el)) return;
    originalControlState.set(el, {
      disabled: !!el.disabled,
      readOnly: !!el.readOnly,
      ariaDisabled: el.getAttribute('aria-disabled'),
    });
  }

  function restoreControl(el) {
    const state = originalControlState.get(el);
    if (!state) return;
    el.disabled = state.disabled;
    if ('readOnly' in el) el.readOnly = state.readOnly;
    if (state.ariaDisabled == null) el.removeAttribute('aria-disabled');
    else el.setAttribute('aria-disabled', state.ariaDisabled);
    originalControlState.delete(el);
  }

  function setFieldsBlocked(unavailable) {
    for (const el of driveControls()) {
      if (unavailable) {
        rememberControl(el);
        el.disabled = true;
        if ('readOnly' in el) el.readOnly = true;
        el.setAttribute('aria-disabled', 'true');
      } else {
        restoreControl(el);
      }
    }
  }

  function setElementHidden(el, hidden) {
    if (!el) return;
    el.hidden = hidden;
    el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    if (hidden) el.style.setProperty('display', 'none', 'important');
    else el.style.removeProperty('display');
  }

  function setActionControlsBlocked(unavailable) {
    const b = submit();
    if (b) {
      b.disabled = unavailable;
      b.setAttribute('aria-disabled', unavailable ? 'true' : 'false');
      b.dataset.dvEntitlementBlocked = unavailable ? 'true' : 'false';
      setElementHidden(b, unavailable);
    }
    const deleteButton = document.getElementById('drive-delete');
    if (deleteButton && unavailable) {
      deleteButton.dataset.dvEntitlementHidden = 'true';
      setElementHidden(deleteButton, true);
    } else if (deleteButton?.dataset.dvEntitlementHidden === 'true' && !unavailable && editMode()) {
      delete deleteButton.dataset.dvEntitlementHidden;
      setElementHidden(deleteButton, false);
    }
  }

  function blockNewDrive(blocked) {
    const unavailable = !!blocked && !editMode();
    const f = form();
    if (f) f.dataset.dvEntitlementBlocked = unavailable ? 'true' : 'false';
    setFieldsBlocked(unavailable);
    setActionControlsBlocked(unavailable);
    if (unavailable) writeDriveStatus();
  }

  function render(status = lastStatus) {
    lastStatus = status || lastStatus;
    const p = panel();
    if (!p || !lastStatus) return;
    const isExhausted = exhausted(lastStatus);
    p.hidden = false;
    p.className = `app-status drive-entitlement-status${isExhausted ? ' error' : ' success'}`;
    if (isExhausted) {
      p.textContent = message(lastStatus);
      blockNewDrive(true);
      return;
    }
    const remaining = Number(lastStatus.accepted_drives_remaining ?? NaN);
    const used = Number(lastStatus.accepted_drive_count ?? NaN);
    const usedText = Number.isFinite(used) ? `${used} accepted drive${used === 1 ? '' : 's'} logged` : '';
    if (clean(lastStatus.commercial_state) === 'FREE' && Number.isFinite(remaining)) {
      const freeText = `${remaining} free drive${remaining === 1 ? '' : 's'} remaining`;
      p.textContent = usedText ? `${freeText} · ${usedText}.` : `${freeText}.`;
    } else if (clean(lastStatus.commercial_state) === 'PAID') {
      p.textContent = usedText ? `Family license active · ${usedText}.` : 'Family license active.';
    } else {
      p.textContent = usedText ? `Drive logging available · ${usedText}.` : 'Drive logging available.';
    }
    blockNewDrive(false);
  }

  async function refresh() {
    if (!app.getDriverId?.()) return null;
    try {
      const { data, error } = await client.rpc('get_family_entitlement_status_v1', {});
      if (error) throw error;
      lastStatus = data || null;
      render(lastStatus);
      return lastStatus;
    } catch (_) {
      const p = panel();
      if (p) {
        p.hidden = false;
        p.className = 'app-status drive-entitlement-status error';
        p.textContent = 'Drive Venture could not load family entitlement status. New drive logging may be unavailable until this refreshes.';
      }
      return null;
    }
  }

  function isDenial(info) {
    if (!info) return false;
    if (clean(info.code) === EXHAUSTED_CODE) return true;
    const text = readableError(info.message || info.error || info.details || info.detail || info);
    return text.includes(EXHAUSTED_CODE) || text.includes('free drives') || text.includes('FREE_EXHAUSTED');
  }

  function patchInvoke() {
    const functions = client.functions;
    if (!functions?.invoke || functions.invoke.__dvEntitlementPatched) return;
    const original = functions.invoke.bind(functions);
    const patched = async (name, options) => {
      const result = await original(name, options);
      if (name === 'drive-ops' && (isDenial(result?.data) || isDenial(result?.error))) {
        return { data: { ok: false, code: EXHAUSTED_CODE, error: message(lastStatus) }, error: null };
      }
      return result;
    };
    patched.__dvEntitlementPatched = true;
    functions.invoke = patched;
  }

  function patchRecovery() {
    const recovery = window.DV_DRIVE_SAVE_RECOVERY;
    if (!recovery?.isAmbiguous || recovery.isAmbiguous.__dvEntitlementPatched) return;
    const original = recovery.isAmbiguous.bind(recovery);
    const patched = info => isDenial(info) ? false : original(info);
    patched.__dvEntitlementPatched = true;
    recovery.isAmbiguous = patched;
  }

  function guard(e) {
    if (!exhausted(lastStatus) || editMode()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    render(lastStatus);
    writeDriveStatus();
    window.DV_DRIVE_SAVE_RECOVERY?.clear?.();
  }

  function resync() {
    if (lastStatus) render(lastStatus);
  }

  const observer = new MutationObserver(() => resync());
  const observeWhenReady = () => {
    const f = form();
    if (!f) return;
    observer.observe(f, { attributes: true, childList: true, subtree: true, attributeFilter: ['disabled', 'hidden', 'style', 'data-edit-drive'] });
  };

  window.DV_ENTITLEMENTS = { refresh, render, getStatus: () => lastStatus, isEntitlementDenial: isDenial, code: EXHAUSTED_CODE };
  patchInvoke();
  patchRecovery();
  document.addEventListener('submit', event => { if (event.target === form()) guard(event); }, true);
  document.addEventListener('click', event => { if (event.target?.closest?.('#drive-form button[type="submit"], #drive-delete')) guard(event); }, true);
  window.addEventListener('dv:driving-log-context', () => { patchRecovery(); refresh().then(resync); observeWhenReady(); });
  window.addEventListener('dv:drive-edit-mode', () => setTimeout(resync, 0));
  window.addEventListener('dv:dashboard-rendered', () => { setTimeout(resync, 0); observeWhenReady(); });
  window.addEventListener('dv:driver-changing', () => { lastStatus = null; const p = panel(); if (p) p.hidden = true; blockNewDrive(false); });
  observeWhenReady();
  queueMicrotask(refresh);
})();
