(() => {
  const style = document.createElement('style');
  style.textContent = `.dv-driver-identity{display:flex;align-items:center;gap:14px}.dv-driver-avatar{width:76px;height:76px;object-fit:cover;border:3px solid var(--dv-yellow,#f8ba20);background:#111;border-radius:8px;box-shadow:3px 3px 0 #050707}.dv-avatar-new{display:inline-block;margin-top:6px;padding:4px 7px;background:var(--dv-yellow,#f8ba20);color:#101416;font:800 10px/1.1 Orbitron,Arial,sans-serif;letter-spacing:.06em}.dv-avatar-hidden{display:none!important}@media(max-width:760px){.dv-driver-avatar{width:62px;height:62px}}`;
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
    const access = (model.driver_access || []).find(a => a.driver_id === driverId);
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

  window.addEventListener('dv:dashboard-rendered', event => { renderAvatar(event.detail).catch(error => console.error('Avatar render failed', error)); });
})();
