(() => {
  if (window.DV_ENTITLEMENTS || window.DV_ENTITLEMENTS_INSTALLING) return;
  window.DV_ENTITLEMENTS_INSTALLING = true;

  const EXHAUSTED_CODE = 'DV_FREE_DRIVE_LIMIT_REACHED';
  const DEFAULT_EXHAUSTED_MESSAGE = 'You have used your free Drive Venture drives. Your dashboard, edit/delete tools, and driving-log PDF remain available, but new drives and Text Parker logging are paused until a family license is active.';
  const MAX_READY_ATTEMPTS = 100;
  const READY_RETRY_MS = 100;
  const MAX_DRIVER_ATTEMPTS = 100;
  const DRIVER_RETRY_MS = 150;

  let readyAttempts = 0;

  const clean = v => v == null ? '' : String(v).trim();

  function getApp() { return window.DV_LOG_APP; }
  function getForm() { return document.getElementById('drive-form'); }

  function installWhenReady() {
    const app = getApp();
    const form = getForm();
    if (!app?.client || !form) {
      if (readyAttempts++ < MAX_READY_ATTEMPTS) setTimeout(installWhenReady, READY_RETRY_MS);
      else window.DV_ENTITLEMENTS_INSTALLING = false;
      return;
    }
    install(app);
  }

  function install(app) {
    if (window.DV_ENTITLEMENTS) {
      window.DV_ENTITLEMENTS_INSTALLING = false;
      return;
    }

    const client = app.client;
    let lastStatus = null;
    let driverRefreshAttempts = 0;
    let refreshTimer = null;
    let resyncQueued = false;
    const originalControlState = new WeakMap();

    const submit = () => getForm()?.querySelector('button[type="submit"]') || null;
    const editContext = () => document.getElementById('drive-edit-context');
    const activeEditDrive = () => clean(getForm()?.dataset.editDrive);
    const exhausted = status => clean(status?.commercial_state) === 'FREE_EXHAUSTED';
    const message = status => clean(status?.message) || DEFAULT_EXHAUSTED_MESSAGE;

    function hasVisibleEditContext() {
      const context = editContext();
      if (!context || context.hidden) return false;
      if (context.offsetParent === null && getComputedStyle(context).display === 'none') return false;
      return clean(context.textContent).startsWith('Editing:');
    }

    function hasVisibleCancelEdit() {
      const cancel = document.getElementById('drive-edit-cancel');
      if (!cancel || cancel.hidden || cancel.disabled) return false;
      if (cancel.offsetParent === null && getComputedStyle(cancel).display === 'none') return false;
      return clean(cancel.textContent).includes('Exit edit');
    }

    function editMode() {
      return !!activeEditDrive() && (hasVisibleEditContext() || hasVisibleCancelEdit());
    }

    function ensurePanel() {
      const form = getForm();
      if (!form) return null;
      let panel = document.getElementById('drive-entitlement-status');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'drive-entitlement-status';
        panel.className = 'app-status drive-entitlement-status';
        panel.setAttribute('role', 'status');
        panel.hidden = true;
        form.prepend(panel);
      }
      return panel;
    }

    function readableError(value) {
      if (value == null) return '';
      if (typeof value === 'string') return clean(value);
      if (Array.isArray(value)) return value.map(readableError).filter(Boolean).join('; ');
      if (typeof value === 'object') return clean(value.message) || clean(value.error) || clean(value.details) || clean(value.detail) || clean(value.code) || 'Driving log could not be generated.';
      return String(value);
    }

    function writeDriveStatus() {
      const statusEl = document.getElementById('drive-status');
      if (!statusEl) return;
      statusEl.textContent = message(lastStatus);
      statusEl.className = 'app-status error';
    }

    function driveControls() {
      const form = getForm();
      if (!form) return [];
      return [...form.querySelectorAll('input, select, textarea')];
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

    function setFieldsBlocked(blocked) {
      for (const el of driveControls()) {
        if (blocked) {
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
      const hiddenValue = hidden ? 'true' : 'false';
      if (el.hidden !== hidden) el.hidden = hidden;
      if (el.getAttribute('aria-hidden') !== hiddenValue) el.setAttribute('aria-hidden', hiddenValue);
      if (hidden) {
        if (el.style.getPropertyValue('display') !== 'none') el.style.setProperty('display', 'none', 'important');
      } else {
        if (el.style.getPropertyValue('display')) el.style.removeProperty('display');
      }
    }

    function setActionControlsBlocked(blocked) {
      const saveButton = submit();
      if (saveButton) {
        saveButton.disabled = blocked;
        saveButton.setAttribute('aria-disabled', blocked ? 'true' : 'false');
        saveButton.dataset.dvEntitlementBlocked = blocked ? 'true' : 'false';
        setElementHidden(saveButton, blocked);
      }
      const deleteButton = document.getElementById('drive-delete');
      if (deleteButton) {
        deleteButton.dataset.dvEntitlementHidden = blocked ? 'true' : 'false';
        setElementHidden(deleteButton, blocked);
      }
    }

    function blockNewDrive(blocked) {
      const unavailable = !!blocked && !editMode();
      const form = getForm();
      if (form) form.dataset.dvEntitlementBlocked = unavailable ? 'true' : 'false';
      setFieldsBlocked(unavailable);
      setActionControlsBlocked(unavailable);
      if (unavailable) writeDriveStatus();
    }

    function render(status = lastStatus) {
      lastStatus = status || lastStatus;
      const panel = ensurePanel();
      if (!panel || !lastStatus) return;

      const isExhausted = exhausted(lastStatus);
      panel.hidden = false;
      panel.className = `app-status drive-entitlement-status${isExhausted ? ' error' : ' success'}`;
      if (isExhausted) {
        panel.textContent = message(lastStatus);
        blockNewDrive(true);
        return;
      }

      const remaining = Number(lastStatus.accepted_drives_remaining ?? NaN);
      const used = Number(lastStatus.accepted_drive_count ?? NaN);
      const usedText = Number.isFinite(used) ? `${used} accepted drive${used === 1 ? '' : 's'} logged` : '';
      if (clean(lastStatus.commercial_state) === 'FREE' && Number.isFinite(remaining)) {
        const freeText = `${remaining} free drive${remaining === 1 ? '' : 's'} remaining`;
        panel.textContent = usedText ? `${freeText} · ${usedText}.` : `${freeText}.`;
      } else if (clean(lastStatus.commercial_state) === 'PAID') {
        panel.textContent = 'Family license active.';
      } else {
        panel.textContent = usedText ? `Drive logging available · ${usedText}.` : 'Drive logging available.';
      }
      blockNewDrive(false);
    }

    function scheduleRefresh(delay = DRIVER_RETRY_MS) {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => refresh(), delay);
    }

    async function refresh() {
      const driverId = app.getDriverId?.();
      if (!driverId) {
        if (driverRefreshAttempts++ < MAX_DRIVER_ATTEMPTS) scheduleRefresh();
        return null;
      }
      driverRefreshAttempts = 0;
      try {
        const { data, error } = await client.rpc('get_family_entitlement_status_v1', {});
        if (error) throw error;
        lastStatus = data || null;
        render(lastStatus);
        return lastStatus;
      } catch (_) {
        const panel = ensurePanel();
        if (panel) {
          panel.hidden = false;
          panel.className = 'app-status drive-entitlement-status error';
          panel.textContent = 'Drive Venture could not load family entitlement status. New drive logging may be unavailable until this refreshes.';
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

    function guard(event) {
      if (!exhausted(lastStatus) || editMode()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      render(lastStatus);
      writeDriveStatus();
      window.DV_DRIVE_SAVE_RECOVERY?.clear?.();
    }

    function queueResync() {
      if (resyncQueued) return;
      resyncQueued = true;
      setTimeout(() => {
        resyncQueued = false;
        if (lastStatus) render(lastStatus);
      }, 0);
    }

    const observer = new MutationObserver(queueResync);
    function observeWhenReady() {
      const form = getForm();
      if (!form || form.dataset.dvEntitlementObserved === 'true') return;
      form.dataset.dvEntitlementObserved = 'true';
      observer.observe(form, { attributes: true, childList: true, subtree: true, attributeFilter: ['disabled', 'hidden', 'style', 'data-edit-drive'] });
    }

    window.DV_ENTITLEMENTS = { refresh, render, getStatus: () => lastStatus, isEntitlementDenial: isDenial, code: EXHAUSTED_CODE };
    window.DV_ENTITLEMENTS_INSTALLING = false;
    patchInvoke();
    patchRecovery();
    document.addEventListener('submit', event => { if (event.target === getForm()) guard(event); }, true);
    document.addEventListener('click', event => { if (event.target?.closest?.('#drive-form button[type="submit"], #drive-delete')) guard(event); }, true);
    window.addEventListener('dv:driving-log-context', () => { patchRecovery(); refresh(); observeWhenReady(); });
    window.addEventListener('dv:drive-edit-mode', () => queueResync());
    window.addEventListener('dv:dashboard-rendered', () => { refresh(); observeWhenReady(); });
    window.addEventListener('popstate', () => refresh());
    window.addEventListener('dv:driver-changing', () => {
      lastStatus = null;
      driverRefreshAttempts = 0;
      const panel = ensurePanel();
      if (panel) panel.hidden = true;
      blockNewDrive(false);
      scheduleRefresh(0);
    });

    ensurePanel();
    observeWhenReady();
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installWhenReady, { once: true });
  installWhenReady();
})();
