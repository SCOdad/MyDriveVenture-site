// Public browser configuration. Environment selection is host-pinned.
if (!window.DV_ENVIRONMENT_CONFIG) throw new Error('Drive Venture environment configuration was not loaded');
window.DV_APP_CONFIG = Object.freeze({
  supabaseUrl: window.DV_ENVIRONMENT_CONFIG.supabaseUrl,
  publishableKey: window.DV_ENVIRONMENT_CONFIG.publishableKey,
});

// BKLG-0151: the visible Michigan skill checkboxes are the authoritative
// browser selection surface. The hidden <select multiple> remains a compatibility
// mirror, but late context refreshes must never make a checked skill disappear
// from the payload that log-drive-rpc sends to the authoritative save path.
window.addEventListener('load', () => {
  const api = window.DV_DRIVING_LOG;
  if (!api || api.__checkboxSelectionAuthoritative) return;
  const fallback = api.getSelectedLessonIds?.bind(api);
  api.getSelectedLessonIds = () => {
    const grid = document.getElementById('drive-lesson-options');
    if (grid) return [...grid.querySelectorAll('input[type=checkbox]:checked')].map(box => box.value).filter(Boolean);
    return fallback ? fallback() : [];
  };
  api.__checkboxSelectionAuthoritative = true;
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

