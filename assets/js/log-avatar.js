(() => {
  const style = document.createElement('style');
  style.textContent = `.dv-driver-identity{display:flex;align-items:center;gap:14px}.dv-driver-avatar{width:76px;height:76px;object-fit:cover;border:3px solid var(--dv-yellow,#f8ba20);background:#111;border-radius:8px;box-shadow:3px 3px 0 #050707}.dv-avatar-new{display:inline-block;margin-top:6px;padding:4px 7px;background:var(--dv-yellow,#f8ba20);color:#101416;font:800 10px/1.1 Orbitron,Arial,sans-serif;letter-spacing:.06em}.dv-avatar-hidden{display:none!important}.dv-access-badge{display:inline-flex;align-items:center;min-height:30px;padding:5px 9px;border:1px solid currentColor;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}.dv-access-badge.view{opacity:.82}@media(max-width:760px){.dv-driver-avatar{width:62px;height:62px}.dv-access-badge{white-space:normal}}`;
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

  function setFormReadOnly(formId, readOnly, hideCard) {
    const form = document.getElementById(formId);
    if (!form) return;
    if (hideCard) {
      const card = form.closest('.app-card');
      if (card) card.hidden = readOnly;
    } else {
      form.hidden = readOnly;
      const heading = form.previousElementSibling;
      if (heading && heading.tagName === 'H3') heading.hidden = readOnly;
    }
  }

  function applyOperatorView(detail) {
    const access = getAccess(detail);
    if (!access) return;
    const readOnly = access.mode === 'VIEW';
    setFormReadOnly('drive-form', readOnly, true);
    setFormReadOnly('vehicle-form', readOnly, false);
    document.querySelectorAll('[data-archive-vehicle]').forEach(button => { button.hidden = readOnly; });

    const model = detail?.model || {};
    const select = document.getElementById('driver-select');
    if (select) {
      Array.from(select.options).forEach(option => {
        const driver = (model.drivers || []).find(d => d.id === option.value);
        const driverAccess = (model.driver_access || []).find(a => a.driver_id === option.value);
        if (driver) option.textContent = `${driver.display_name || 'Driver'}${driverAccess?.mode === 'VIEW' ? ' · View only' : ''}`;
      });
    }

    const badge = ensureAccessBadge();
    if (badge) {
      badge.textContent = readOnly ? 'Operator view · read only' : 'Family access';
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
