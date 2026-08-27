// Public browser configuration. Supabase publishable keys are designed for client-side use with RLS.
window.DV_APP_CONFIG = {
  supabaseUrl: 'https://cayoyqwrmouxuttloemc.supabase.co',
  publishableKey: 'sb_publishable_7RzACdnPmj_QiYSqzJRlfw_YaXyMws6',
};

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

// BKLG-0078: layer operator-only search and bounded repair UX over the
// existing shared driver dashboard after its normal scripts are ready.
window.addEventListener('load', () => {
  if (document.querySelector('script[data-dv-operator-support]')) return;
  const script = document.createElement('script');
  script.src = '/assets/js/log-operator-support.js?v=20260827-0078';
  script.dataset.dvOperatorSupport = 'true';
  document.body.appendChild(script);
});
