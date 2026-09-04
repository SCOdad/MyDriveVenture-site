// Public browser configuration. Environment selection is host-pinned.
if (!window.DV_ENVIRONMENT_CONFIG) throw new Error('Drive Venture environment configuration was not loaded');
window.DV_APP_CONFIG = Object.freeze({
  supabaseUrl: window.DV_ENVIRONMENT_CONFIG.supabaseUrl,
  publishableKey: window.DV_ENVIRONMENT_CONFIG.publishableKey,
});

// BKLG-0151: the visible Michigan skill checkboxes are the authoritative
// browser selection surface. The hidden <select multiple> remains a compatibility
// mirror, but late context refreshes must never make a checked skill disappear
// from the payload that log-drive-rpc sends to drive-ops / drive-skill-ops.
window.addEventListener('load', () => {
  const api = window.DV_DRIVING_LOG;
  if (api && !api.__checkboxSelectionAuthoritative) {
    const fallback = api.getSelectedLessonIds?.bind(api);
    api.getSelectedLessonIds = () => {
      const grid = document.getElementById('drive-lesson-options');
      if (grid) return [...grid.querySelectorAll('input[type=checkbox]:checked')].map(box => box.value).filter(Boolean);
      return fallback ? fallback() : [];
    };
    api.__checkboxSelectionAuthoritative = true;
  }

  // Belt-and-suspenders UAT guard: after a successful drive create/edit, make
  // the many-to-many assignments authoritative, then re-read the drive before
  // returning success to the form layer. This is intentionally idempotent with
  // the same verification already present in log-driving-log-v1.
  const client = window.DV_LOG_APP?.client;
  if (!client?.functions || client.functions.__bklg0151VerifiedSave) return;
  const invoke = client.functions.invoke.bind(client.functions);
  const sameIds = (a, b) => JSON.stringify([...(a || [])].map(String).sort()) === JSON.stringify([...(b || [])].map(String).sort());
  client.functions.invoke = async (slug, options = {}) => {
    if (slug !== 'drive-ops' || !['log_drive', 'edit_drive'].includes(options?.body?.action)) return invoke(slug, options);
    const requestedIds = Array.isArray(options?.body?.lesson_ids)
      ? [...new Set(options.body.lesson_ids.filter(Boolean).map(String))]
      : (window.DV_DRIVING_LOG?.getSelectedLessonIds?.() || []);
    const result = await invoke(slug, options);
    const drive = result?.data?.drive, driverId = options?.body?.driver_id;
    if (result?.error || !result?.data?.ok || !drive?.id || !driverId) return result;
    const synced = await invoke('drive-skill-ops', { body: {
      action: 'set', driver_id: driverId, drive_id: drive.id, lesson_ids: requestedIds,
      ...(options?.body?.reason ? { reason: options.body.reason } : {})
    }});
    if (synced?.error || !synced?.data?.ok) {
      result.data.ok = false;
      result.data.error = 'Drive details changed, but Skills Practiced could not be saved. Reopen the drive before trying again.';
      return result;
    }
    const verified = await invoke('drive-detail-api', { body: { driver_id: driverId, drive_id: drive.id } });
    const verifiedDrive = verified?.data?.drive, verifiedIds = verified?.data?.lesson_ids || verifiedDrive?.lesson_ids || [];
    if (verified?.error || !verified?.data?.ok || !verifiedDrive || !sameIds(requestedIds, verifiedIds)) {
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
  };
  client.functions.__bklg0151VerifiedSave = true;
});

// BKLG-0081: accept the onboarding handoff email, prefill the shared login
// form used by both skins, then remove the email from the visible URL so it is
// not retained in bookmarks or copied links.
(() => {
  const field = document.getElementById('login-email');
  if (!field) return;
  const url = new URL(window.location.href);
  const email = String(url.searchParams.get('email') || '').trim();
  if (!email) return;
  field.value = email;
  field.focus();
  url.searchParams.delete('email');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next);
})();

