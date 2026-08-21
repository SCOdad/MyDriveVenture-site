(() => {
  const style = document.createElement('style');
  style.textContent = `.dv-driver-identity{display:flex;align-items:center;gap:14px}.dv-driver-avatar{width:76px;height:76px;object-fit:cover;border:3px solid var(--dv-yellow,#f8ba20);background:#111;border-radius:8px;box-shadow:3px 3px 0 #050707}.dv-avatar-new{display:inline-block;margin-top:6px;padding:4px 7px;background:var(--dv-yellow,#f8ba20);color:#101416;font:800 10px/1.1 Orbitron,Arial,sans-serif;letter-spacing:.06em}.dv-avatar-hidden{display:none!important}.dv-access-badge{display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-height:30px;padding:7px 10px;border:1px solid currentColor;border-radius:14px;font-size:11px;font-weight:700;line-height:1.35;letter-spacing:0;text-transform:none;max-width:min(760px,92vw)}.dv-access-badge strong{font-size:11px;letter-spacing:.05em;text-transform:uppercase}.dv-access-badge.view{opacity:.9}.dv-access-contact{font-weight:600;overflow-wrap:anywhere}.dv-access-contact b{font-weight:800}.dv-readonly-control:disabled{opacity:.55;cursor:not-allowed;filter:grayscale(.35)}@media(max-width:760px){.dv-driver-avatar{width:62px;height:62px}.dv-access-badge{white-space:normal;width:100%}}`;
  document.head.appendChild(style);

  const cache = new Map();
  let renderToken = 0;
  function ensureUi() {
    const heading = document.getElementById('driver-heading');
    if (!heading || document.getElementById('driver-avatar')) return;
    const host = heading.parentElement;
    if (!host) return;
    const identity = document.createElement('div');
    identity.className = 'dv-driver-identity';
    const image = document.createElement('img');
    image.id = 'driver-avatar';
    image.className = 'dv-driver-avatar dv-avatar-hidden';
    image.alt = '';
    const text = document.createElement('div');
    while (host.firstChild) text.appendChild(host.firstChild);
    const badge = document.createElement('span');
    badge.id = 'driver-avatar-new';
    badge.className = 'dv-avatar-new dv-avatar-hidden';
    badge.textContent = 'NEW AVATAR';
    text.appendChild(badge);
    identity.append(image, text);
    host.appendChild(identity);
  }

  function getAccess(detail) {
    return (detail?.model?.driver_access || []).find(a => a.driver_id === detail?.driverId) || null;
  }

  function getContact(detail) {
    return (detail?.model?.operator_contacts || []).find(a => a.driver_id === detail?.driverId) || null;
  }

  function ensureAccessBadge() {
    const host = document.getElementById('driver-switcher');
    if (!host) return null;
    let badge = document.getElementById('driver-access-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'driver-access-badge';
      badge.className = 'dv-access-badge';
      host.appendChild(badge);
    }
    return badge;
  }

  function smsLabel(value) {
    return value === true ? 'Yes' : value === false ? 'No' : '—';
  }

  function contactLine(label, person) {
    const esc = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return `<span class="dv-access-contact"><b>${label}:</b> ${esc(person?.name)} / ${esc(person?.email)} / ${esc(person?.mobile)} / SMS Opt-In: ${smsLabel(person?.sms_opt_in)}</span>`;
  }

  function setDisabled(control, disabled) {
    if (!control) return;
    control.disabled = disabled;
    control.classList.toggle('dv-readonly-control', disabled);
    if (disabled) control.setAttribute('aria-disabled', 'true');
    else control.removeAttribute('aria-disabled');
  }

  function applyReadOnlyControls(readOnly) {
    const driveForm = document.getElementById('drive-form');
    if (driveForm) {
      driveForm.hidden = false;
      driveForm.closest('.app-card')?.removeAttribute('hidden');
      driveForm.querySelectorAll('input,textarea,button').forEach(control => setDisabled(control, readOnly));
      const vehicleSelect = document.getElementById('drive-vehicle');
      setDisabled(vehicleSelect, false);
    }

    const vehicleForm = document.getElementById('vehicle-form');
    if (vehicleForm) {
      vehicleForm.hidden = false;
      const heading = vehicleForm.previousElementSibling;
      if (heading && heading.tagName === 'H3') heading.hidden = false;
      vehicleForm.querySelectorAll('input,select,textarea,button').forEach(control => setDisabled(control, readOnly));
    }

    document.querySelectorAll('[data-archive-vehicle],[data-primary-vehicle],[data-edit-drive],[data-save-drive-edit],[data-cancel-drive-edit]').forEach(button => {
      button.hidden = false;
      setDisabled(button, readOnly);
    });
  }

  function sortDriverOptions(model, select) {
    if (!select) return;
    const accessByDriver = new Map((model.driver_access || []).map(a => [a.driver_id, a]));
    const driverById = new Map((model.drivers || []).map(d => [d.id, d]));
    const selected = select.value;
    const options = Array.from(select.options);
    options.sort((a, b) => {
      const aa = accessByDriver.get(a.value)?.mode === 'VIEW' ? 1 : 0;
      const bb = accessByDriver.get(b.value)?.mode === 'VIEW' ? 1 : 0;
      if (aa !== bb) return aa - bb;
      const an = driverById.get(a.value)?.display_name || 'Driver';
      const bn = driverById.get(b.value)?.display_name || 'Driver';
      return an.localeCompare(bn, undefined, { sensitivity: 'base' });
    });
    options.forEach(option => {
      const driver = driverById.get(option.value);
      const driverAccess = accessByDriver.get(option.value);
      if (driver) option.textContent = `${driver.display_name || 'Driver'}${driverAccess?.mode === 'VIEW' ? ' · View only' : ''}`;
      select.appendChild(option);
    });
    if (options.some(option => option.value === selected)) select.value = selected;
  }

  function applyOperatorView(detail) {
    const access = getAccess(detail);
    if (!access) return;
    const readOnly = access.mode === 'VIEW';
    applyReadOnlyControls(readOnly);

    const model = detail?.model || {};
    const select = document.getElementById('driver-select');
    sortDriverOptions(model, select);

    const badge = ensureAccessBadge();
    if (badge) {
      if (readOnly) {
        const contact = getContact(detail);
        badge.innerHTML = `<strong>Operator view · read only</strong>${contactLine('Grown-Up', contact?.grown_up)}${contactLine('Driver', contact?.driver)}`;
      } else {
        badge.innerHTML = '<strong>Family access</strong>';
      }
      badge.className = `dv-access-badge${readOnly ? ' view' : ''}`;
    }
  }

  async function renderAvatar(detail) {
    const mine = ++renderToken;
    ensureUi();
    const image = document.getElementById('driver-avatar');
    const badge = document.getElementById('driver-avatar-new');
    if (!image || !badge) return;
    image.classList.add('dv-avatar-hidden');
    badge.classList.add('dv-avatar-hidden');
    image.removeAttribute('src');
    image.alt = '';
    const model = detail?.model || {};
    const driverId = detail?.driverId;
    const access = getAccess(detail);
    const assignment = (model.avatar_assignments || []).find(a => a.driver_id === driverId);
    if (!assignment) return;
    const app = window.DV_LOG_APP;
    const client = app?.client;
    if (!client) return;
    let url = cache.get(assignment.id);
    if (!url) {
      const { data, error } = await client.storage.from(assignment.storage_bucket).createSignedUrl(assignment.storage_path, 3600);
      if (error || !data?.signedUrl) {
        console.error('Unable to resolve driver avatar', error);
        return;
      }
      url = data.signedUrl;
      cache.set(assignment.id, url);
    }
    if (mine !== renderToken || app.getDriverId() !== driverId) return;
    image.src = url;
    image.alt = `${detail?.driver?.display_name || 'Driver'} custom avatar`;
    image.classList.remove('dv-avatar-hidden');
    if (!assignment.first_viewed_at && access?.mode !== 'VIEW') {
      badge.classList.remove('dv-avatar-hidden');
      try {
        const { error } = await client.rpc('mark_avatar_first_viewed_v1', { p_assignment_id: assignment.id });
        if (error) console.error('Unable to mark avatar first viewed', error);
        else assignment.first_viewed_at = new Date().toISOString();
      } catch (error) { console.error('Unable to mark avatar first viewed', error); }
    }
  }

  window.addEventListener('dv:dashboard-rendered', event => {
    applyOperatorView(event.detail);
    renderAvatar(event.detail).catch(error => console.error('Avatar render failed', error));
  });
})();
