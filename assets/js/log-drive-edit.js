(() => {
  const app = window.DV_LOG_APP;
  if (!app?.client) return;
  const client = app.client;
  const FIELD_MAP = {
    'drive-date': 'drive_date',
    'drive-start': 'start_time',
    'drive-end': 'end_time',
    'drive-vehicle': 'vehicle_id',
    'drive-destination': 'destination',
    'drive-notes': 'notes'
  };
  let activeEdit = null;
  let preEditDraft = null;
  let committingNativePicker = false;

  if (!document.querySelector('link[data-dv-drive-edit-css]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = '/assets/css/log-drive-edit.css?v=20260824-3';
    l.dataset.dvDriveEditCss = 'true';
    document.head.appendChild(l);
  }

  const clean = v => v == null ? '' : String(v).trim();
  const time = v => clean(v).slice(0, 5);
  const currentForm = () => document.getElementById('drive-form');
  const field = id => document.getElementById(id);
  const value = id => field(id)?.value ?? '';
  const statusEl = () => document.getElementById('drive-status');

  function domDraft() {
    return {
      drive_date: value('drive-date'),
      start_time: value('drive-start'),
      end_time: value('drive-end'),
      vehicle_id: value('drive-vehicle') || null,
      destination: clean(value('drive-destination')) || null,
      notes: clean(value('drive-notes')) || null
    };
  }

  function comparable(d) {
    return {
      drive_date: clean(d?.drive_date),
      start_time: time(d?.start_time),
      end_time: time(d?.end_time),
      vehicle_id: d?.vehicle_id || null,
      destination: clean(d?.destination) || null,
      notes: clean(d?.notes) || null
    };
  }

  function same(a, b) {
    const x = comparable(a), y = comparable(b);
    return Object.keys(x).every(k => x[k] === y[k]);
  }

  function changedKeys() {
    if (!activeEdit) return [];
    const labels = {
      drive_date: 'date', start_time: 'start time', end_time: 'finish time',
      vehicle_id: 'vehicle', destination: 'destination', notes: 'road notes'
    };
    const original = activeEdit.original, draft = comparable(activeEdit.draft);
    return Object.keys(original).filter(k => original[k] !== draft[k]).map(k => labels[k]);
  }

  function durationMinutes(d) {
    if (Number.isFinite(Number(d?.duration_minutes))) return Math.round(Number(d.duration_minutes));
    const [sh, sm] = time(d?.start_time).split(':').map(Number);
    const [eh, em] = time(d?.end_time).split(':').map(Number);
    if ([sh, sm, eh, em].some(Number.isNaN)) return 0;
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) mins += 1440;
    return mins;
  }

  function summary(d) {
    return `${clean(d?.drive_date)} · ${time(d?.start_time)}–${time(d?.end_time)} · ${durationMinutes(d)} min`;
  }

  function context() {
    if (!activeEdit) return;
    const form = currentForm();
    if (!form) return;
    let box = document.getElementById('drive-edit-context');
    if (!box) {
      box = document.createElement('div');
      box.id = 'drive-edit-context';
      box.className = 'drive-edit-context';
      form.before(box);
    }
    const changed = changedKeys();
    box.textContent = `Editing: ${summary(activeEdit.draft)}${changed.length ? ` · Unsaved changes: ${changed.join(', ')}` : ''}`;
    box.hidden = false;
  }

  function setFields(d) {
    const values = {
      'drive-date': d?.drive_date || '',
      'drive-start': time(d?.start_time),
      'drive-end': time(d?.end_time),
      'drive-vehicle': d?.vehicle_id || '',
      'drive-destination': d?.destination || '',
      'drive-notes': d?.notes || ''
    };
    for (const [id, v] of Object.entries(values)) {
      const el = field(id);
      if (el) el.value = v;
    }
  }

  function decorateEditMode() {
    const form = currentForm();
    if (!form || !activeEdit) return;
    form.dataset.editDrive = activeEdit.id;
    const submit = form.querySelector('button[type=submit]');
    if (submit) submit.textContent = 'Save changes';
    let cancel = document.getElementById('drive-edit-cancel');
    if (!cancel) {
      cancel = document.createElement('button');
      cancel.id = 'drive-edit-cancel';
      cancel.type = 'button';
      cancel.className = 'button subtle-button button-small';
      cancel.textContent = 'Cancel edit';
      submit?.after(cancel);
    }
    cancel.hidden = false;
    context();
  }

  function enterEdit(d, {scroll = true, preservePriorDraft = true} = {}) {
    if (preservePriorDraft && !activeEdit) preEditDraft = domDraft();
    activeEdit = {
      id: d.id,
      original: comparable(d),
      draft: comparable(d)
    };
    setFields(activeEdit.draft);
    decorateEditMode();
    if (scroll) currentForm()?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  function exitEditMode() {
    const form = currentForm();
    if (form) {
      delete form.dataset.editDrive;
      const submit = form.querySelector('button[type=submit]');
      if (submit) submit.textContent = document.documentElement.dataset.experience === 'game' ? 'Save drive' : 'Log drive';
    }
    const cancel = document.getElementById('drive-edit-cancel');
    if (cancel) cancel.hidden = true;
    const box = document.getElementById('drive-edit-context');
    if (box) box.hidden = true;
    activeEdit = null;
  }

  function cancelEdit() {
    const restore = preEditDraft;
    exitEditMode();
    if (restore) setFields(restore);
    preEditDraft = null;
    const s = statusEl();
    if (s) {
      s.textContent = 'Edit cancelled. Your prior drive-log draft was restored.';
      s.className = 'app-status';
    }
  }

  function updateDraftFromTarget(target) {
    if (!activeEdit || !target?.id || !(target.id in FIELD_MAP)) return;
    const key = FIELD_MAP[target.id];
    let v = target.value;
    if (key === 'vehicle_id') v = v || null;
    if (key === 'destination' || key === 'notes') v = clean(v) || null;
    if (key === 'start_time' || key === 'end_time') v = time(v);
    activeEdit.draft[key] = v;
    context();
  }

  function syncDraftFromDom() {
    if (!activeEdit) return;
    const d = domDraft();
    for (const key of Object.values(FIELD_MAP)) activeEdit.draft[key] = d[key];
    context();
  }

  function restoreEditDraft() {
    if (!activeEdit) return;
    setFields(activeEdit.draft);
    decorateEditMode();
  }

  function nightMessage(result) {
    if (result?.status === 'CLASSIFIED') return result.minutes > 0 ? ` ${result.minutes} night minute${result.minutes === 1 ? '' : 's'} credited.` : '';
    if (result?.status === 'LOCATION_PENDING') return ' Night credit could not be verified because location information is incomplete.';
    if (result?.status === 'LOOKUP_PENDING') return ' Night credit could not be verified right now.';
    return '';
  }

  async function errorText(error, data) {
    if (data?.error) return data.error;
    try {
      if (error?.context?.json) {
        const body = await error.context.json();
        if (body?.error) return body.error;
      }
    } catch (_) {}
    return error?.message || 'Unable to save changes.';
  }

  document.addEventListener('click', e => {
    const edit = e.target.closest?.('[data-edit-drive]');
    if (edit) {
      const d = app.detailDrives?.[edit.dataset.editDrive] || app.getModel().recent_drives.find(x => x.id === edit.dataset.editDrive);
      if (d) enterEdit(d);
      return;
    }
    if (e.target.id === 'drive-edit-cancel') cancelEdit();
  }, true);

  document.addEventListener('input', e => updateDraftFromTarget(e.target), true);
  document.addEventListener('change', e => updateDraftFromTarget(e.target), true);
  document.addEventListener('focusout', e => {
    if (!activeEdit || e.target?.type !== 'time') return;
    setTimeout(() => updateDraftFromTarget(e.target), 0);
  }, true);

  document.addEventListener('pointerdown', e => {
    if (!activeEdit || committingNativePicker) return;
    const form = e.target.closest?.('#drive-form');
    const submit = e.target.closest?.('#drive-form button[type=submit]');
    const active = document.activeElement;
    if (!form || !submit || !active || active.type !== 'time' || !form.contains(active)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    committingNativePicker = true;
    const s = statusEl();
    if (s) {
      s.textContent = 'Applying time selection…';
      s.className = 'app-status';
    }
    active.blur();
    setTimeout(() => {
      committingNativePicker = false;
      updateDraftFromTarget(active);
      const liveForm = currentForm();
      const liveSubmit = liveForm?.querySelector('button[type=submit]');
      if (liveForm && liveSubmit) {
        if (typeof liveForm.requestSubmit === 'function') liveForm.requestSubmit(liveSubmit);
        else liveSubmit.click();
      }
    }, 350);
  }, true);

  document.addEventListener('submit', async e => {
    const form = e.target;
    if (!activeEdit || form?.id !== 'drive-form') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!form.reportValidity()) return;

    syncDraftFromDom();
    const requested = {...activeEdit.draft};
    const s = statusEl();
    if (same(requested, activeEdit.original)) {
      if (s) {
        s.textContent = 'No changes to save. The selected drive is still loaded.';
        s.className = 'app-status';
      }
      restoreEditDraft();
      return;
    }

    if (s) {
      s.textContent = 'Saving changes…';
      s.className = 'app-status';
    }

    const {data, error} = await client.functions.invoke('drive-ops', {body: {
      action: 'edit_drive',
      driver_id: app.getDriverId(),
      drive_id: activeEdit.id,
      ...requested
    }});

    if (error || !data?.ok) {
      if (s) {
        s.textContent = `Drive edit: ${await errorText(error, data)}`;
        s.className = 'app-status error';
      }
      restoreEditDraft();
      return;
    }

    if (!data.drive || !same(requested, data.drive)) {
      if (s) {
        s.textContent = 'Drive edit could not be verified. Your requested values are still loaded; please try saving again.';
        s.className = 'app-status error';
      }
      restoreEditDraft();
      return;
    }

    app.detailDrives = app.detailDrives || {};
    app.detailDrives[activeEdit.id] = data.drive;
    try { await app.refreshDashboard(); } catch (_) {}
    enterEdit(data.drive, {scroll: false, preservePriorDraft: false});
    if (s) {
      s.textContent = `Drive updated: ${summary(data.drive)}. Progress and quests were recalculated.${nightMessage(data.night_classification)}`;
      s.className = 'app-status success';
    }
  }, true);
})();
