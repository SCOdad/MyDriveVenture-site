(() => {
  const cfg = window.DV_APP_CONFIG || {};
  const loginCard = document.getElementById('app-login');
  const appMain = document.getElementById('app-main');
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginStatus = document.getElementById('login-status');
  const signOut = document.getElementById('sign-out');
  const driverSelect = document.getElementById('driver-select');
  const driveForm = document.getElementById('drive-form');
  const vehicleForm = document.getElementById('vehicle-form');
  const driveStatus = document.getElementById('drive-status');
  const vehicleStatus = document.getElementById('vehicle-status');
  const driveSubmissionKey = 'dv:web-drive:submission-id';
  let memoryDriveSubmissionId = '';

  function status(el, text, kind = '') {
    el.textContent = text || '';
    el.className = `app-status${kind ? ` ${kind}` : ''}`;
  }

  if (!window.supabase || !cfg.supabaseUrl || !cfg.publishableKey) {
    status(loginStatus, 'The web pilot login is not activated yet.', 'error');
    if (loginForm) loginForm.querySelector('button').disabled = true;
    return;
  }

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  let model = { drivers: [], vehicles: [], progress: [], recent_drives: [], quest_awards: [], license_requirements: [] };
  let currentDriverId = '';

  function hours(minutes) { return (Number(minutes || 0) / 60).toFixed(1); }
  function esc(value) { return String(value ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c])); }
  function currentDriver() { return model.drivers.find(d => d.id === currentDriverId) || model.drivers[0] || null; }
  function currentProgress() { return model.progress.find(p => p.driver_id === currentDriverId) || {}; }
  function currentVehicles() { return model.vehicles.filter(v => v.driver_id === currentDriverId && v.status !== 'ARCHIVED'); }
  function currentDrives() { return model.recent_drives.filter(d => d.driver_id === currentDriverId); }
  function currentAwards() { return model.quest_awards.filter(q => q.driver_id === currentDriverId); }

  function requirement(type, fallback) {
    const row = (model.license_requirements || []).find(r => r.license_stage === 'LEVEL_2' && r.requirement_type === type);
    const n = Number(row?.value_text);
    return Number.isFinite(n) ? n : fallback;
  }

  function stableDriveSubmissionId() {
    if (memoryDriveSubmissionId) return memoryDriveSubmissionId;
    try {
      const stored = sessionStorage.getItem(driveSubmissionKey);
      if (stored) return (memoryDriveSubmissionId = stored);
    } catch (_) {}
    memoryDriveSubmissionId = `web-drive-${crypto.randomUUID()}`;
    try { sessionStorage.setItem(driveSubmissionKey, memoryDriveSubmissionId); } catch (_) {}
    return memoryDriveSubmissionId;
  }

  function clearDriveSubmissionId() {
    memoryDriveSubmissionId = '';
    try { sessionStorage.removeItem(driveSubmissionKey); } catch (_) {}
  }

  async function invoke(name, body) {
    const { data, error } = await client.functions.invoke(name, { body });
    if (error) {
      let detail = error.message || 'Request failed';
      try { const j = await error.context.json(); if (j?.error) detail = j.error; } catch (_) {}
      throw new Error(detail);
    }
    if (!data || data.ok !== true) throw new Error(data?.error || 'Request failed');
    return data;
  }

  function render() {
    const driver = currentDriver();
    if (!driver) return;
    currentDriverId = driver.id;
    const progress = currentProgress();
    const practiceTarget = requirement('MinimumPracticeHours', 50);
    const nightTarget = requirement('MinimumNightHours', 10);
    document.getElementById('driver-heading').textContent = driver.display_name || 'Drive Venture';
    document.getElementById('kpi-hours').textContent = `${hours(progress.total_minutes)} h`;
    document.getElementById('kpi-night').textContent = `${hours(progress.night_minutes)} h`;
    document.getElementById('kpi-drives').textContent = String(progress.total_drives || 0);
    document.getElementById('kpi-xp').textContent = String(progress.xp || 0);
    document.getElementById('license-stage').textContent = driver.license_stage || '—';
    document.getElementById('license-date').textContent = driver.level1_license_date || '—';
    document.getElementById('license-hours').textContent = `${hours(progress.total_minutes)} / ${practiceTarget.toFixed(1)} h`;
    document.getElementById('license-night-hours').textContent = `${hours(progress.night_minutes)} / ${nightTarget.toFixed(1)} h`;

    const vehicleList = document.getElementById('vehicle-list');
    const vehicles = currentVehicles();
    vehicleList.innerHTML = vehicles.length ? vehicles.map(v => `<li class="vehicle-item"><div><strong>${esc(v.name)}</strong><br><small>${esc(v.vehicle_class)}${v.color ? ` · ${esc(v.color)}` : ''}${v.is_primary ? ' · Primary' : ''}</small></div><button class="button subtle-button button-small" type="button" data-archive-vehicle="${esc(v.id)}">Archive</button></li>`).join('') : '<li class="empty-state">No vehicles yet.</li>';

    const driveVehicle = document.getElementById('drive-vehicle');
    const prior = driveVehicle.value;
    driveVehicle.innerHTML = '<option value="">Choose a vehicle</option>' + vehicles.map(v => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('');
    if (vehicles.some(v => v.id === prior)) driveVehicle.value = prior;
    else {
      const primary = vehicles.find(v => v.is_primary) || vehicles[0];
      if (primary) driveVehicle.value = primary.id;
    }

    const driveList = document.getElementById('drive-list');
    const drives = currentDrives();
    driveList.innerHTML = drives.length ? drives.map(d => {
      const v = vehicles.find(x => x.id === d.vehicle_id);
      return `<li class="drive-item"><div><strong>${esc(d.drive_date)} · ${esc(d.start_time).slice(0,5)}–${esc(d.end_time).slice(0,5)}</strong><br><small>${esc(v?.name || 'Vehicle')} · ${Math.round(Number(d.duration_minutes || 0))} min${d.destination ? ` · ${esc(d.destination)}` : ''}</small></div><span class="pill">${esc(d.source)}</span></li>`;
    }).join('') : '<li class="empty-state">No drives logged yet.</li>';

    const questList = document.getElementById('quest-list');
    const awards = currentAwards();
    questList.innerHTML = awards.length ? awards.map(q => `<li class="quest-item"><div><strong>${esc(q.quest?.name || q.quest_key)}</strong><br><small>${esc(q.awarded_at).slice(0,10)}</small></div><span class="pill">+${Number(q.xp_awarded || 0)} XP</span></li>`).join('') : '<li class="empty-state">Quest awards will appear here as drives earn them.</li>';
  }

  async function loadDashboard() {
    const data = await invoke('driver-api', { action: 'dashboard' });
    model = data;
    if (!currentDriverId || !model.drivers.some(d => d.id === currentDriverId)) currentDriverId = model.drivers[0]?.id || '';
    if (!currentDriverId) throw new Error('No active driver is linked to this account yet.');
    driverSelect.innerHTML = model.drivers.map(d => `<option value="${esc(d.id)}">${esc(d.display_name || 'Driver')}</option>`).join('');
    driverSelect.value = currentDriverId;
    render();
  }

  async function establishAccess() {
    // Claim access with the authenticated browser client so PostgreSQL receives
    // the user's JWT and auth.uid(). Do not proxy this RPC through a service-role
    // Edge Function: that would replace the caller identity and make auth.uid() null.
    const { data, error } = await client.rpc('claim_authenticated_access_v1');
    if (error) throw new Error(error.message || 'Unable to resolve access');
    if (!data || data.ok !== true) throw new Error(data?.error || 'Unable to resolve access');
    await loadDashboard();
    loginCard.classList.add('app-hidden');
    appMain.classList.remove('app-hidden');
  }

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    status(loginStatus, 'Sending sign-in link…');
    const email = loginEmail.value.trim();
    if (!email) return;
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/log/` } });
    if (error) status(loginStatus, error.message, 'error');
    else status(loginStatus, 'Check your email for a secure sign-in link.', 'success');
  });

  signOut.addEventListener('click', async () => {
    await client.auth.signOut();
    appMain.classList.add('app-hidden');
    loginCard.classList.remove('app-hidden');
    status(loginStatus, 'Signed out.');
  });

  driverSelect.addEventListener('change', () => { currentDriverId = driverSelect.value; render(); });

  driveForm.addEventListener('input', () => {
    if (!driveStatus.classList.contains('error') && driveStatus.classList.contains('success')) clearDriveSubmissionId();
  });

  driveForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!driveForm.reportValidity()) return;
    status(driveStatus, 'Logging drive…');
    try {
      const result = await invoke('driver-api', {
        action: 'log_drive', driver_id: currentDriverId, source_event_id: stableDriveSubmissionId(),
        drive_date: document.getElementById('drive-date').value,
        start_time: document.getElementById('drive-start').value,
        end_time: document.getElementById('drive-end').value,
        vehicle_id: document.getElementById('drive-vehicle').value || null,
        destination: document.getElementById('drive-destination').value.trim(),
        notes: document.getElementById('drive-notes').value.trim(),
      });
      const awards = result.quests?.awarded || [];
      const awardText = awards.length ? ` Earned: ${awards.map(q => q.name).join(', ')}.` : '';
      status(driveStatus, `Drive logged.${awardText}`, 'success');
      clearDriveSubmissionId();
      document.getElementById('drive-destination').value = '';
      document.getElementById('drive-notes').value = '';
      await loadDashboard();
    } catch (err) {
      status(driveStatus, `${err.message || 'Unable to log drive.'} You can retry safely.`, 'error');
    }
  });

  vehicleForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!vehicleForm.reportValidity()) return;
    status(vehicleStatus, 'Adding vehicle…');
    try {
      await invoke('driver-api', {
        action: 'add_vehicle', driver_id: currentDriverId,
        name: document.getElementById('vehicle-name').value.trim(),
        vehicle_class: document.getElementById('vehicle-class').value,
        color: document.getElementById('vehicle-color').value.trim(),
        is_primary: currentVehicles().length === 0,
      });
      vehicleForm.reset();
      status(vehicleStatus, 'Vehicle added.', 'success');
      await loadDashboard();
    } catch (err) { status(vehicleStatus, err.message || 'Unable to add vehicle.', 'error'); }
  });

  document.getElementById('vehicle-list').addEventListener('click', async e => {
    const button = e.target.closest('[data-archive-vehicle]');
    if (!button) return;
    try {
      await invoke('driver-api', { action:'archive_vehicle', driver_id:currentDriverId, vehicle_id:button.dataset.archiveVehicle });
      await loadDashboard();
    } catch (err) { status(vehicleStatus, err.message || 'Unable to archive vehicle.', 'error'); }
  });

  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  document.getElementById('drive-date').value = localToday;

  client.auth.onAuthStateChange((_event, session) => {
    if (session) setTimeout(() => establishAccess().catch(err => status(loginStatus, err.message, 'error')), 0);
  });

  client.auth.getSession().then(({data}) => {
    if (data.session) establishAccess().catch(err => status(loginStatus, err.message, 'error'));
  });
})();
