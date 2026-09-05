(() => {
  if (window.DV_DRIVING_LOG_V1_BOUND) return;
  const app = window.DV_LOG_APP;
  if (!app?.client) return;
  window.DV_DRIVING_LOG_V1_BOUND = true;

  const client = app.client;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function ensureControls() {
    const form = document.getElementById('drive-form');
    if (!form) return;
    const vehicle = document.getElementById('drive-vehicle');
    const vehicleLabel = vehicle?.closest('label');
    if (!document.getElementById('drive-lesson-select-wrap')) {
      const label = document.createElement('label');
      label.id = 'drive-lesson-select-wrap';
      label.innerHTML = '<span>Skills Practiced</span><select id="drive-lesson"><option value="">Choose a skill</option></select>';
      vehicleLabel?.after(label);
    }
    const lessonWrap = document.getElementById('drive-lesson-select-wrap');
    if (!document.getElementById('drive-lesson-notes-wrap')) {
      const label = document.createElement('label');
      label.id = 'drive-lesson-notes-wrap';
      label.hidden = true;
      label.innerHTML = '<span>Skills practiced</span><input id="drive-lesson-notes" maxlength="200">';
      lessonWrap?.after(label);
    }
    const lessonNotesWrap = document.getElementById('drive-lesson-notes-wrap');
    if (!document.getElementById('drive-supervisor')) {
      const label = document.createElement('label');
      label.innerHTML = '<span>Supervisor</span><select id="drive-supervisor" required><option value="">Choose a grown-up</option></select>';
      lessonNotesWrap?.after(label);
    }
    const supervisor = document.getElementById('drive-supervisor');
    if (!document.getElementById('drive-supervisor-other-wrap')) {
      const label = document.createElement('label');
      label.id = 'drive-supervisor-other-wrap';
      label.hidden = true;
      label.innerHTML = '<span>Other supervisor</span><input id="drive-supervisor-other" maxlength="100" placeholder="Name of supervising adult">';
      supervisor?.closest('label')?.after(label);
    }
    const notes = document.getElementById('drive-notes');
    if (notes) notes.maxLength = 500;

    const list = document.getElementById('drive-list');
    const card = list?.closest('.app-card');
    if (card && !document.getElementById('drive-log-export')) {
      const button = document.createElement('button');
      button.id = 'drive-log-export';
      button.className = 'button secondary button-small';
      button.type = 'button';
      button.textContent = 'Download driving log PDF';
      const status = document.createElement('div');
      status.id = 'drive-log-export-status';
      status.className = 'app-status';
      list.before(button, status);
    }
  }

  function normalizeExperienceUi() {
    const route = document.documentElement.dataset.dvRoute || '';
    const bar = document.querySelector('.experience-bar');
    const classicSwitch = document.querySelector('.concept-switch');
    if (route === 'dv03' && bar) bar.innerHTML = '<span><b>Default Experience</b> · DV03</span><a href="/log/DV02/">Prior Experience</a>';
    if (route === 'dv02' && bar) bar.innerHTML = '<span><b>Prior Experience</b> · DV02</span><a href="/log/">Default Experience</a>';
    if (route === 'dv00' && classicSwitch) classicSwitch.innerHTML = '<strong>Classic</strong> · No-frills base experience <a href="/log/">Default Experience →</a>';
  }

  ensureControls();
  normalizeExperienceUi();

  const supervisor = document.getElementById('drive-supervisor');
  const otherWrap = document.getElementById('drive-supervisor-other-wrap');
  const other = document.getElementById('drive-supervisor-other');
  const lessonWrap = document.getElementById('drive-lesson-select-wrap');
  const lesson = document.getElementById('drive-lesson');
  const lessonNotesWrap = document.getElementById('drive-lesson-notes-wrap');
  const lessonNotes = document.getElementById('drive-lesson-notes');
  const notes = document.getElementById('drive-notes');
  const exportButton = document.getElementById('drive-log-export');
  const exportStatus = document.getElementById('drive-log-export-status');
  let contextToken = 0;
  let exportController = null;

  const lessonSetEqual = (a, b) => JSON.stringify([...(a || [])].map(String).sort()) === JSON.stringify([...(b || [])].map(String).sort());
  const selectedLessonIds = () => lesson?.multiple ? [...lesson.options].filter(o => o.selected && o.value).map(o => o.value) : (lesson?.value ? [lesson.value] : []);
  function setLessonSelection(ids) {
    if (!lesson) return;
    const wanted = new Set((ids || []).map(String));
    [...lesson.options].forEach(o => { o.selected = !!o.value && wanted.has(o.value); });
    document.querySelectorAll('#drive-lesson-options input[type=checkbox]').forEach(box => { box.checked = wanted.has(box.value); });
  }
  function setExportStatus(text, kind = '') {
    if (!exportStatus) return;
    exportStatus.textContent = text || '';
    exportStatus.className = `app-status${kind ? ` ${kind}` : ''}`;
  }
  function safeDownloadPart(value) {
    return String(value || 'driver').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'driver';
  }
  function localDownloadDate(now = new Date()) {
    const pad = value => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  function fallbackDownloadFilename(driverId) {
    const model = app.getModel?.() || {};
    const driver = (model.drivers || []).find(row => row.id === driverId);
    return `drive-venture-${safeDownloadPart(driver?.display_name || 'driver')}-driving-log-${localDownloadDate()}.pdf`;
  }
  function responseDownloadFilename(response, driverId) {
    const disposition = response?.headers?.get?.('content-disposition') || '';
    const extended = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (extended?.[1]) {
      try { return decodeURIComponent(extended[1].trim()); } catch (_) {}
    }
    const basic = disposition.match(/filename="([^"]+)"|filename=([^;]+)/i);
    return (basic?.[1] || basic?.[2] || '').trim() || fallbackDownloadFilename(driverId);
  }
  function toggleOther() {
    const active = supervisor?.value === 'OTHER';
    if (otherWrap) { otherWrap.hidden = !active; otherWrap.style.display = active ? 'grid' : 'none'; }
    if (other) { other.required = active; other.disabled = !active; if (!active) other.value = ''; }
  }
  supervisor?.addEventListener('change', toggleOther);
  toggleOther();

  function ensureStyle() {
    if (document.getElementById('dv-driving-log-v1-style')) return;
    const style = document.createElement('style');
    style.id = 'dv-driving-log-v1-style';
    style.textContent = `
      .drive-skill-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem .6rem;margin-top:.35rem;width:100%;min-width:0}
      .drive-skill-option{box-sizing:border-box;display:flex!important;align-items:flex-start!important;gap:.55rem!important;width:100%!important;min-width:0!important;min-height:0!important;padding:.55rem .65rem!important;border:1px solid rgba(160,170,176,.55)!important;border-radius:.35rem!important;background:rgba(255,255,255,.07)!important;font-size:.82rem!important;line-height:1.25!important;overflow:hidden!important}
      .drive-skill-option>input[type=checkbox]{appearance:auto!important;-webkit-appearance:checkbox!important;display:block!important;flex:0 0 auto!important;width:1rem!important;height:1rem!important;min-width:1rem!important;margin:.08rem 0 0!important;padding:0!important;position:static!important;opacity:1!important}
      .drive-skill-option>span{box-sizing:border-box!important;display:block!important;position:static!important;flex:1 1 auto!important;width:auto!important;min-width:0!important;max-width:100%!important;margin:0!important;padding:0!important;white-space:normal!important;overflow:visible!important;overflow-wrap:anywhere!important;text-align:left!important;color:inherit!important;background:transparent!important}
      .drive-note-meta{display:flex;justify-content:space-between;gap:.75rem;margin-top:.25rem;font-size:.72rem;opacity:.82}
      .drive-note-meta [data-limit=true]{font-weight:700}
      @media(max-width:620px){.drive-skill-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }
  ensureStyle();

  function renderLessonGrid(rows) {
    if (!lesson || !lessonWrap) return;
    lesson.hidden = true;
    lesson.style.display = 'none';
    let grid = document.getElementById('drive-lesson-options');
    if (!grid) {
      grid = document.createElement('div');
      grid.id = 'drive-lesson-options';
      grid.className = 'drive-skill-grid';
      lesson.after(grid);
    }
    grid.hidden = false;
    const selected = new Set(selectedLessonIds());
    grid.innerHTML = (rows || []).map(x => `<label class="drive-skill-option"><input type="checkbox" value="${esc(x.id)}"><span><strong>${esc(x.lesson_code)}</strong> · ${esc(x.title)}</span></label>`).join('');
    grid.querySelectorAll('input[type=checkbox]').forEach(box => {
      box.checked = selected.has(box.value);
      box.addEventListener('change', () => {
        const option = [...lesson.options].find(o => o.value === box.value);
        if (option) option.selected = box.checked;
        lesson.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }
  function hideLessonGrid() {
    const grid = document.getElementById('drive-lesson-options');
    if (grid) grid.hidden = true;
    if (lesson) { lesson.hidden = true; lesson.style.display = 'none'; }
  }

  function updateNoteCount() {
    if (!notes) return;
    let meta = document.getElementById('drive-notes-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.id = 'drive-notes-meta';
      meta.className = 'drive-note-meta';
      notes.after(meta);
    }
    const max = Number(notes.maxLength || 500), count = notes.value.length, atLimit = count >= max;
    meta.innerHTML = `<span>Road notes · ${max} character maximum</span><span data-limit="${atLimit ? 'true' : 'false'}">${count} / ${max}${atLimit ? ' · maximum reached' : ''}</span>`;
  }
  notes?.addEventListener('input', updateNoteCount);
  updateNoteCount();

  window.DV_DRIVING_LOG = { getSelectedLessonIds: selectedLessonIds, setLessonSelection, lessonSetEqual, updateNoteCount };

  const originalInvoke = client.functions.invoke.bind(client.functions);
  client.functions.invoke = async (slug, options = {}) => {
    if (slug === 'drive-detail-api') {
      const result = await originalInvoke(slug, options), drive = result?.data?.drive;
      if (!result?.error && drive?.id) {
        const ids = result.data.lesson_ids || drive.lesson_ids || [];
        drive.lesson_ids = ids;
        drive.lessons = result.data.lessons || [];
        if (ids.length) drive.lesson_id = ids[0];
      }
      return result;
    }
    if (slug === 'drive-ops' && ['log_drive', 'edit_drive'].includes(options?.body?.action)) {
      const requestedLessonIds = Array.isArray(options?.body?.lesson_ids) ? [...new Set(options.body.lesson_ids.filter(Boolean).map(String))] : selectedLessonIds();
      const result = await originalInvoke(slug, options), drive = result?.data?.drive, driverId = options?.body?.driver_id;
      if (result?.error || !result?.data?.ok || !drive?.id || !driverId) return result;
      const synced = await originalInvoke('drive-skill-ops', { body: { action: 'set', driver_id: driverId, drive_id: drive.id, lesson_ids: requestedLessonIds, ...(options?.body?.reason ? { reason: options.body.reason } : {}) } });
      if (synced.error || !synced.data?.ok) {
        result.data.ok = false;
        result.data.error = 'Drive details changed, but Skills Practiced could not be saved. Reopen the drive before trying again.';
        return result;
      }
      const verified = await originalInvoke('drive-detail-api', { body: { driver_id: driverId, drive_id: drive.id } });
      const verifiedDrive = verified?.data?.drive, verifiedIds = verified?.data?.lesson_ids || verifiedDrive?.lesson_ids || [];
      if (verified.error || !verified.data?.ok || !verifiedDrive || !lessonSetEqual(requestedLessonIds, verifiedIds)) {
        result.data.ok = false;
        result.data.error = 'Drive save could not be verified. Reopen the drive before trying again.';
        return result;
      }
      verifiedDrive.lesson_ids = verifiedIds;
      verifiedDrive.lessons = verified.data.lessons || [];
      verifiedDrive.lesson_id = verifiedIds[0] || null;
      result.data.drive = verifiedDrive;
      result.data.lesson_ids = verifiedIds;
      result.data.supervisor = verified.data.supervisor || null;
      return result;
    }
    return originalInvoke(slug, options);
  };

  async function loadContext(driverId) {
    const mine = ++contextToken, previousSupervisor = supervisor?.value || '';
    const { data, error } = await client.functions.invoke('drive-ops', { body: { action: 'form_context', driver_id: driverId } });
    if (mine !== contextToken || app.getDriverId() !== driverId || error || !data?.ok) return;
    const liveLessons = selectedLessonIds();
    if (supervisor) {
      supervisor.innerHTML = '<option value="">Choose a grown-up</option>' + data.supervisors.map(g => `<option value="${esc(g.person_id)}">${esc(g.display_name)}${g.is_primary ? ' · Primary' : ''}</option>`).join('') + '<option value="OTHER">Other</option>';
      if (previousSupervisor && [...supervisor.options].some(o => o.value === previousSupervisor)) supervisor.value = previousSupervisor;
      else supervisor.value = data.default_supervisor_person_id || data.primary_supervisor_person_id || '';
      toggleOther();
    }
    const mode = data.lesson_set?.selection_mode || null;
    if (mode === 'ENUMERATED') {
      if (lessonWrap) { lessonWrap.hidden = false; lessonWrap.style.display = 'grid'; const label = lessonWrap.querySelector('span'); if (label) label.textContent = 'Skills Practiced'; }
      if (lessonNotesWrap) { lessonNotesWrap.hidden = true; lessonNotesWrap.style.display = 'none'; }
      if (lesson) {
        lesson.multiple = true;
        lesson.innerHTML = data.lessons.map(x => `<option value="${esc(x.id)}">${esc(x.lesson_code)} · ${esc(x.title)}</option>`).join('');
        setLessonSelection(liveLessons);
        renderLessonGrid(data.lessons);
        setLessonSelection(liveLessons);
      }
      if (lessonNotes) lessonNotes.required = false;
    } else if (mode === 'FREE_TEXT') {
      if (lessonWrap) { lessonWrap.hidden = true; lessonWrap.style.display = 'none'; }
      hideLessonGrid();
      if (lessonNotesWrap) { lessonNotesWrap.hidden = false; lessonNotesWrap.style.display = 'grid'; }
      if (lesson) { lesson.multiple = false; lesson.value = ''; }
      if (lessonNotes) lessonNotes.required = false;
    } else {
      if (lessonWrap) { lessonWrap.hidden = true; lessonWrap.style.display = 'none'; }
      hideLessonGrid();
      if (lessonNotesWrap) { lessonNotesWrap.hidden = true; lessonNotesWrap.style.display = 'none'; }
    }
    window.dispatchEvent(new CustomEvent('dv:driving-log-context', { detail: { driverId, ...data } }));
  }

  function buildOverlay() {
    let overlay = document.getElementById('drive-log-building-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'drive-log-building-overlay';
    overlay.hidden = true;
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = '<div><strong>Building your driving log…</strong><span>Please wait while Drive Venture prepares the PDF.</span></div>';
    Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '10000', background: 'rgba(20,24,28,.72)', display: 'none', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '18vh' });
    const box = overlay.firstElementChild;
    Object.assign(box.style, { background: '#fff', color: '#161616', border: '3px solid #1d1d1d', boxShadow: '8px 8px 0 rgba(0,0,0,.35)', padding: '22px 26px', maxWidth: '360px', width: 'calc(100% - 40px)', textAlign: 'center' });
    box.querySelector('strong').style.display = 'block';
    box.querySelector('strong').style.fontSize = '1.15rem';
    box.querySelector('span').style.display = 'block';
    box.querySelector('span').style.marginTop = '8px';
    document.body.appendChild(overlay);
    return overlay;
  }
  function showBuild(active) {
    const overlay = buildOverlay();
    overlay.hidden = !active;
    overlay.style.display = active ? 'flex' : 'none';
    document.documentElement.style.pointerEvents = active ? 'none' : '';
    overlay.style.pointerEvents = 'auto';
  }

  window.addEventListener('dv:driver-changing', () => {
    contextToken += 1;
    exportController?.abort();
    exportController = null;
    setExportStatus('');
    showBuild(false);
  });
  window.addEventListener('dv:dashboard-rendered', e => { const driverId = e.detail?.driverId || app.getDriverId?.(); if (driverId) loadContext(driverId); });
  window.addEventListener('dv:drive-edit-mode', e => { if (!e.detail?.active) return; const drive = app.detailDrives?.[e.detail.driveId]; if (drive?.lesson_ids) queueMicrotask(() => setLessonSelection(drive.lesson_ids)); queueMicrotask(updateNoteCount); });
  window.addEventListener('dv:driving-log-context', () => { const id = document.getElementById('drive-form')?.dataset?.editDrive, drive = id ? app.detailDrives?.[id] : null; if (drive?.lesson_ids) setLessonSelection(drive.lesson_ids); updateNoteCount(); });

  exportButton?.addEventListener('click', async () => {
    const driverId = app.getDriverId?.();
    if (!driverId) return;
    const permit = window.prompt('Permit / license number for this PDF (optional; Drive Venture will not store it):', '');
    if (permit === null) return;
    setExportStatus('Building driving log…');
    showBuild(true);
    const { data: sessionData } = await client.auth.getSession(), session = sessionData?.session, cfg = window.DV_APP_CONFIG || {};
    if (!session?.access_token || !cfg.supabaseUrl || !cfg.publishableKey) { showBuild(false); setExportStatus('Please sign in again before exporting.', 'error'); return; }
    const controller = new AbortController();
    exportController = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${cfg.supabaseUrl.replace(/\/$/, '')}/functions/v1/driving-log-renderer`, { method: 'POST', headers: { authorization: `Bearer ${session.access_token}`, apikey: cfg.publishableKey, 'content-type': 'application/json' }, body: JSON.stringify({ driver_id: driverId, permit_number: permit.trim() || null }), signal: controller.signal });
      if (!response.ok) {
        let message = 'Driving log could not be generated.';
        try { const body = await response.json(); if (body?.error) message = body.error; } catch (_) {}
        setExportStatus(message, 'error');
        return;
      }
      const blob = await response.blob(), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url;
      a.download = responseDownloadFilename(response, driverId);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportStatus('Driving log downloaded.', 'success');
    } catch (error) {
      if (controller.signal.aborted && exportController !== controller) return;
      setExportStatus(error?.name === 'AbortError' ? 'Driving log generation timed out. Please try again.' : 'Driving log could not be generated. Please try again.', 'error');
    } finally {
      clearTimeout(timeout);
      if (exportController === controller) {
        exportController = null;
        showBuild(false);
      }
    }
  });
})();
